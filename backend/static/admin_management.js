let allAdmins = [];
let filteredAdmins = [];
let currentPage = 1;
let pageSize = 10;
let isSuperAdmin = false;
let currentUsername = '';

document.addEventListener('DOMContentLoaded', () => {
    checkSuperAdmin();
    setupPagination();
    setupForms();
});

async function checkSuperAdmin() {
    try {
        const response = await fetch('/api/admins/check-super');
        const data = await response.json();
        isSuperAdmin = data.is_super_admin;
        currentUsername = data.username;
        
        // Update UI based on super admin status
        document.getElementById('current-username').textContent = currentUsername;
        document.getElementById('admin-role').textContent = isSuperAdmin ? 'Super Administrator' : 'Administrator';
        
        if (isSuperAdmin) {
            document.getElementById('super-admin-panel').style.display = 'block';
            document.getElementById('filters-panel').style.display = 'block';
            document.getElementById('admins-list-panel').style.display = 'block';
            loadAdmins();
        }
    } catch (error) {
        console.error('Error checking super admin:', error);
    }
}

function setupForms() {
    // Change password form
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updatePassword();
        });
    }
    
    // Add admin form (super admin only)
    const addAdminForm = document.getElementById('add-admin-form');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addAdmin();
        });
    }
}

function setupPagination() {
    const pageSizeSelect = document.getElementById('admin-page-size-select');
    const prevBtn = document.getElementById('admin-prev-page');
    const nextBtn = document.getElementById('admin-next-page');
    
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value);
            currentPage = 1;
            renderAdminsTable(filteredAdmins);
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAdminsTable(filteredAdmins);
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
            if (currentPage < totalPages) {
                currentPage++;
                renderAdminsTable(filteredAdmins);
            }
        });
    }
}

async function loadAdmins() {
    try {
        const response = await fetch('/api/admins');
        const admins = await response.json();
        allAdmins = admins;
        filteredAdmins = [...admins];
        updateResultsCount(filteredAdmins.length);
        renderAdminsTable(filteredAdmins);
    } catch (error) {
        console.error('Error loading admins:', error);
        alert('Failed to load admins. Please try again.');
    }
}

function renderAdminsTable(admins) {
    const tbody = document.querySelector('#admins-table tbody');
    if (!tbody) return;
    
    // Sort by username
    const sortedAdmins = [...admins].sort((a, b) => {
        if (a.username === 'admin') return -1;
        if (b.username === 'admin') return 1;
        return a.username.localeCompare(b.username);
    });
    
    const totalPages = Math.max(1, Math.ceil(sortedAdmins.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = sortedAdmins.slice(start, start + pageSize);
    updatePageInfo(currentPage, totalPages);
    
    tbody.innerHTML = '';
    
    pageItems.forEach(admin => {
        const row = document.createElement('tr');
        const roleBadge = admin.is_super_admin 
            ? '<span class="status-badge status-resolved">Super Admin</span>'
            : '<span class="status-badge status-pending">Admin</span>';
        
        const createdAt = admin.created_at && admin.created_at !== 'system' 
            ? new Date(admin.created_at).toLocaleDateString()
            : 'System';
        
        const createdBy = admin.created_by || 'System';
        
        const deleteBtn = admin.username === 'admin' || admin.username === currentUsername
            ? ''
            : `<button class="action-btn danger" onclick="confirmDeleteAdmin('${admin.username}')">
                <i class="fas fa-trash"></i>
                Delete
               </button>`;
        
        row.innerHTML = `
            <td><strong>${admin.username}</strong></td>
            <td>${roleBadge}</td>
            <td>${createdAt}</td>
            <td>${createdBy}</td>
            <td>${deleteBtn}</td>
        `;
        tbody.appendChild(row);
    });
}

function updatePageInfo(page, totalPages) {
    const pageInfo = document.getElementById('admin-page-info');
    if (pageInfo) {
        pageInfo.textContent = `Page ${page} of ${totalPages}`;
    }
    
    const prevBtn = document.getElementById('admin-prev-page');
    const nextBtn = document.getElementById('admin-next-page');
    
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
}

function updateResultsCount(count) {
    const countEl = document.getElementById('results-count');
    if (countEl) {
        countEl.textContent = count;
    }
}

function applyAdminFilters() {
    const username = normalize(document.getElementById('filter-username')?.value);
    const role = document.getElementById('filter-role')?.value || '';
    
    filteredAdmins = allAdmins.filter(admin => {
        const usernameMatch = !username || normalize(admin.username).includes(username);
        const roleMatch = !role || 
            (role === 'super' && admin.is_super_admin) ||
            (role === 'admin' && !admin.is_super_admin);
        return usernameMatch && roleMatch;
    });
    
    updateResultsCount(filteredAdmins.length);
    currentPage = 1;
    renderAdminsTable(filteredAdmins);
}

function clearAdminFilters() {
    document.getElementById('filter-username').value = '';
    document.getElementById('filter-role').value = '';
    filteredAdmins = [...allAdmins];
    updateResultsCount(filteredAdmins.length);
    currentPage = 1;
    renderAdminsTable(filteredAdmins);
}

function normalize(text) {
    return (text || '').toLowerCase().trim();
}

async function addAdmin() {
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/admins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message || 'Admin added successfully');
            document.getElementById('add-admin-form').reset();
            loadAdmins();
        } else {
            alert(data.detail || 'Failed to add admin');
        }
    } catch (error) {
        console.error('Error adding admin:', error);
        alert('Failed to add admin. Please try again.');
    }
}

function confirmDeleteAdmin(username) {
    document.getElementById('delete-username').textContent = username;
    document.getElementById('delete-modal').style.display = 'block';
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.onclick = () => deleteAdmin(username);
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
}

async function deleteAdmin(username) {
    try {
        const response = await fetch(`/api/admins/${username}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message || 'Admin deleted successfully');
            closeDeleteModal();
            loadAdmins();
        } else {
            alert(data.detail || 'Failed to delete admin');
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Failed to delete admin. Please try again.');
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/api/admins/update-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message || 'Password updated successfully');
            document.getElementById('change-password-form').reset();
        } else {
            alert(data.detail || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        alert('Failed to update password. Please try again.');
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('delete-modal');
    if (event.target === modal) {
        closeDeleteModal();
    }
});
