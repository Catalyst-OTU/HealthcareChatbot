let allComplaints = [];
let filteredComplaints = [];
let currentPage = 1;
let pageSize = 10;

document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();
    setupModal();
    setupFilters();
    setupPagination();
});

function setupModal() {
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.querySelector('.close');
    const editForm = document.getElementById('edit-form');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const status = document.getElementById('edit-status').value;
            const comment = document.getElementById('edit-comment').value;

            fetch(`/api/complaints/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Status: status,
                    Admin_Comment: comment
                })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                modal.style.display = 'none';
                loadComplaints();
            })
            .catch(error => console.error('Error:', error));
        });
    }
}

function setupFilters() {
    const inputs = [
        'filter-patient',
        'filter-id',
        'filter-type',
        'filter-status',
        'filter-date-from',
        'filter-date-to'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => applyFilters());
            el.addEventListener('change', () => applyFilters());
        }
    });

    // Quick status chips
    const chips = document.querySelectorAll('.quick-filters .chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('chip-active'));
            chip.classList.add('chip-active');
            const status = chip.dataset.status || '';
            const statusSelect = document.getElementById('filter-status');
            if (statusSelect) statusSelect.value = status;
            applyFilters();
        });
    });
}

function loadComplaints() {
    fetch('/api/complaints')
        .then(response => response.json())
        .then(complaints => {
            allComplaints = complaints;
            updateDashboardMetrics(complaints);
            applyFilters(); // render table and counts
        })
        .catch(error => console.error('Error:', error));
}

function updateDashboardMetrics(complaints) {
    // Get unique patients
    const uniquePatients = new Set(complaints.map(c => c.Patient_Name));
    const totalPatients = uniquePatients.size;
    
    // Total complaints
    const totalComplaints = complaints.length;
    
    // Status counts
    const pending = complaints.filter(c => c.Status === 'Pending').length;
    const resolved = complaints.filter(c => c.Status === 'Resolved').length;
    const inProgress = complaints.filter(c => c.Status === 'In Progress').length;
    
    // Today's complaints
    const today = new Date().toISOString().split('T')[0];
    const todayComplaints = complaints.filter(c => c.Date_Submitted === today).length;
    
    // Urgent (assuming complaints with no admin comment might be urgent)
    const urgent = complaints.filter(c => !c.Admin_Comment || c.Admin_Comment === '').length;
    
    // Needs comment (complaints without admin comment)
    const needsComment = complaints.filter(c => !c.Admin_Comment || c.Admin_Comment === '').length;
    
    // Update metric values
    updateMetric('total-patients', totalPatients);
    updateMetric('total-complaints', totalComplaints);
    updateMetric('pending-complaints', pending);
    updateMetric('resolved-complaints', resolved);
    updateMetric('in-progress-complaints', inProgress);
    updateMetric('today-complaints', todayComplaints);
    updateMetric('urgent-complaints', urgent);
    updateMetric('needs-comment', needsComment);
    
    // Calculate percentage changes (simplified - would need historical data for real calculation)
    const calculateChange = (current) => {
        // Simulate percentage change (in real app, compare with previous period)
        const base = current > 0 ? Math.max(1, current - 2) : 0;
        if (base === 0) return '0%';
        const change = ((current - base) / base * 100).toFixed(0);
        return change > 0 ? `+${change}%` : `${change}%`;
    };
    
    updateMetricChange('patients-change', calculateChange(totalPatients));
    updateMetricChange('complaints-change', calculateChange(totalComplaints));
    updateMetricChange('pending-change', calculateChange(pending));
    updateMetricChange('resolved-change', calculateChange(resolved));
    updateMetricChange('in-progress-change', calculateChange(inProgress));
    updateMetricChange('today-change', calculateChange(todayComplaints));
    updateMetricChange('urgent-change', calculateChange(urgent));
    updateMetricChange('needs-comment-change', calculateChange(needsComment));
}

function updateMetric(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateMetricChange(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function applyFilters() {
    const patient = normalize(document.getElementById('filter-patient')?.value);
    const id = normalize(document.getElementById('filter-id')?.value);
    const type = normalize(document.getElementById('filter-type')?.value);
    const status = document.getElementById('filter-status')?.value || '';
    const dateFrom = document.getElementById('filter-date-from')?.value;
    const dateTo = document.getElementById('filter-date-to')?.value;

    filteredComplaints = allComplaints.filter(c => {
        const patientMatch = !patient || normalize(c.Patient_Name).includes(patient);
        const idMatch = !id || normalize(c.id).includes(id);
        const typeMatch = !type || normalize(c.Complaint_Type).includes(type);
        const statusMatch = !status || c.Status === status;
        const dateMatch = withinDateRange(c.Date_Submitted, dateFrom, dateTo);
        return patientMatch && idMatch && typeMatch && statusMatch && dateMatch;
    });

    updateResultsCount(filteredComplaints.length);
    currentPage = 1;
    renderComplaintsTable(filteredComplaints);
}

function withinDateRange(dateString, start, end) {
    if (!start && !end) return true;
    const date = new Date(dateString);
    if (isNaN(date)) return false;
    if (start) {
        const startDate = new Date(start);
        if (date < startDate) return false;
    }
    if (end) {
        const endDate = new Date(end);
        if (date > endDate) return false;
    }
    return true;
}

function normalize(value = '') {
    return String(value).toLowerCase().trim();
}

function updateResultsCount(count) {
    const el = document.getElementById('results-count');
    if (el) el.textContent = count;
}

function renderComplaintsTable(complaints) {
    const tbody = document.querySelector('#complaints-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const sortedComplaints = [...complaints]
        .sort((a, b) => new Date(b.Date_Submitted) - new Date(a.Date_Submitted));

    const totalPages = Math.max(1, Math.ceil(sortedComplaints.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = sortedComplaints.slice(start, start + pageSize);
    updatePageInfo(currentPage, totalPages);
    
    pageItems.forEach(complaint => {
        const row = document.createElement('tr');
        const statusClass = complaint.Status.toLowerCase().replace(' ', '-');
        
        row.innerHTML = `
            <td><strong>#${complaint.id}</strong></td>
            <td>${complaint.Patient_Name}</td>
            <td>${complaint.Complaint_Type}</td>
            <td>${complaint.Date_Submitted}</td>
            <td><span class="status-badge status-${statusClass}">${complaint.Status}</span></td>
            <td>
                <button class="action-btn view" onclick="editComplaint('${complaint.id}', '${complaint.Status}', '${escapeHtml(complaint.Admin_Comment || '')}')">
                    <i class="fas fa-eye"></i>
                    View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function setupPagination() {
    const pageSizeSelect = document.getElementById('page-size-select');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            pageSize = parseInt(pageSizeSelect.value, 10) || 10;
            currentPage = 1;
            renderComplaintsTable(filteredComplaints);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage -= 1;
                renderComplaintsTable(filteredComplaints);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil((filteredComplaints.length || 0) / pageSize));
            if (currentPage < totalPages) {
                currentPage += 1;
                renderComplaintsTable(filteredComplaints);
            }
        });
    }
}

function updatePageInfo(page, totalPages) {
    const info = document.getElementById('page-info');
    if (info) info.textContent = `Page ${page} of ${totalPages}`;

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
}

function clearFilters() {
    const fields = ['filter-patient', 'filter-id', 'filter-type', 'filter-status', 'filter-date-from', 'filter-date-to'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const chips = document.querySelectorAll('.quick-filters .chip');
    chips.forEach(c => c.classList.remove('chip-active'));
    const allChip = document.querySelector('.quick-filters .chip[data-status=""]');
    if (allChip) allChip.classList.add('chip-active');

    applyFilters();
    const table = document.getElementById('complaints-table');
    if (table) table.scrollIntoView({ behavior: 'smooth' });
}

function showAllComplaints() {
    clearFilters();
}

function exportData() {
    const data = (filteredComplaints && filteredComplaints.length) ? filteredComplaints : allComplaints;
    if (!data || data.length === 0) {
        alert('No complaints to export.');
        return;
    }

    const headers = ['Complaint ID', 'Patient Name', 'Complaint Type', 'Description', 'Date Submitted', 'Status', 'Admin Comment'];
    const rows = data.map(c => [
        c.id,
        c.Patient_Name,
        c.Complaint_Type,
        c.Description,
        c.Date_Submitted,
        c.Status,
        c.Admin_Comment || ''
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `complaints-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function editComplaint(id, status, comment) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-comment').value = unescapeHtml(comment);
    document.getElementById('edit-modal').style.display = 'block';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function unescapeHtml(text) {
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, m => map[m]);
}