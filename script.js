import chaiApi from '@api/chai-api';

chaiApi.auth('8527a3fdd9e44921b07200be713052f0');

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const appendMessage = (role, content) => {
    const msg = document.createElement('div');
    msg.classList.add(role === 'user' ? 'user-message' : 'bot-message');
    msg.textContent = content;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
};

const chatWithBot = async (userMessage) => {
    appendMessage('user', userMessage);
    
    try {
        const response = await chaiApi.createChatCompletion({
            model: 'chai_v1',
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 500,
            temperature: 1
        });
        
        const botResponse = response.data;
        appendMessage('bot', botResponse);
    } catch (err) {
        console.error('Error:', err);
        appendMessage('bot', 'Sorry, there was an error.');
    }
};

// Event listener for send button
sendBtn.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        chatWithBot(message);
        userInput.value = ''; // Clear input field
    }
});

// Optional: Send message on Enter key press
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});
