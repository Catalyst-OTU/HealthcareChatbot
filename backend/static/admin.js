let allComplaints = [];

document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();

    // Modal elements
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
});

function loadComplaints() {
    fetch('/api/complaints')
        .then(response => response.json())
        .then(complaints => {
            allComplaints = complaints;
            updateDashboardMetrics(complaints);
            displayRecentComplaints(complaints);
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

function displayRecentComplaints(complaints) {
    const tbody = document.querySelector('#complaints-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort by date (most recent first) and take top 10
    const sortedComplaints = [...complaints]
        .sort((a, b) => new Date(b.Date_Submitted) - new Date(a.Date_Submitted))
        .slice(0, 10);
    
    sortedComplaints.forEach(complaint => {
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