
document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();

    // Modal elements
    const modal = document.getElementById('edit-modal');
    const closeBtn = document.querySelector('.close');
    const editForm = document.getElementById('edit-form');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

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
});

function loadComplaints() {
    fetch('/api/complaints')
        .then(response => response.json())
        .then(complaints => {
            const tbody = document.querySelector('#complaints-table tbody');
            tbody.innerHTML = '';
            complaints.forEach(complaint => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${complaint.id}</td>
                    <td>${complaint.Patient_Name}</td>
                    <td>${complaint.Complaint_Type}</td>
                    <td>${complaint.Description}</td>
                    <td>${complaint.Date_Submitted}</td>
                    <td>${complaint.Status}</td>
                    <td>${complaint.Admin_Comment || 'None'}</td>
                    <td><button onclick="editComplaint('${complaint.id}', '${complaint.Status}', '${complaint.Admin_Comment || ''}')">Edit</button></td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Error:', error));
}

function editComplaint(id, status, comment) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-comment').value = comment;
    document.getElementById('edit-modal').style.display = 'block';
}