const messages = document.getElementById('messages');
const input = document.getElementById('input');

input.addEventListener('keypress', async function(e) {
    if(e.key === 'Enter') {
        const text = input.value;
        addMessage(text, 'user');
        input.value = '';

        // Call backend FastAPI for Dialogflow webhook
        const response = await fetch('http://localhost:8000/submit_complaint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Patient_Name: "John Doe",
                Complaint_Type: "Service Delay",
                Description: text,
                Date_Submitted: new Date().toISOString().split('T')[0]
            })
        });
        const data = await response.json();
        addMessage(data.fulfillmentText, 'bot');
    }
});

function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// Sidebar toggle functionality - defined early and globally
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }
};

// Initialize sidebar on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle);
} else {
    // DOM is already ready
    initSidebarToggle();
}

function initSidebarToggle() {
    // Restore sidebar state
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }

    // Attach click listener
    const btn = document.getElementById('sidebar-toggle');
    if (btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleSidebar();
        });
    }
}
