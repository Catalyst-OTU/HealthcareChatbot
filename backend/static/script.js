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
