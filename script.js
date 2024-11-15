const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let currentRegenerateButton = null; // Track the current regenerate button

// Function to format text (italic and bold)
const formatText = (text) => {
    // Replace **text** with <b>text</b>
    text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // Replace *text* with <i>text</i>
    text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
    return text;
};


const appendMessage = (role, content, userMessage = null) => {
    const container = document.createElement('div');
    container.classList.add(role === 'user' ? 'user-message-container' : 'bot-message-container');

    const msg = document.createElement('div');
    msg.classList.add(role === 'user' ? 'user-message' : 'bot-message');

    // Apply text formatting
    msg.innerHTML = formatText(content);

    container.appendChild(msg);

    // Add "Regenerate" button only for the most recent bot response
    if (role === 'bot' && userMessage) {
        if (currentRegenerateButton) {
            currentRegenerateButton.remove();
        }

        const regenerateBtn = document.createElement('button');
        regenerateBtn.classList.add('regenerate-btn');
        regenerateBtn.innerHTML = '<i class="fa fa-refresh"></i>'; // Font Awesome icon
        regenerateBtn.addEventListener('click', () => regenerateResponse(userMessage, msg));
        container.appendChild(regenerateBtn);

        currentRegenerateButton = regenerateBtn;
    }

    chatBox.appendChild(container);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
};
// Function to regenerate bot response
const regenerateResponse = async (userMessage, msgElement) => {
    console.log('Regenerating response for:', userMessage);

    const options = {
        method: 'POST',
        url: 'https://api.chai-research.com/v1/chat/completions',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'X-API_KEY': '8527a3fdd9e44921b07200be713052f0' // Replace with your actual API key
        },
        data: {
            model: 'chai_v1',
            messages: [{ role: 'user', content: userMessage }],
            role: 'system',
                    content: 'You are a cheerful and humorous chatbot who always tries to brighten the user\'s day with positivity and witty comments.',
            max_tokens: 500,
            temperature: 0.5
        }
    };

    try {
        const response = await axios.request(options);
        console.log('New API response:', response.data);
        const newBotResponse = response.data.choices[0].message.content; // Adjust based on response structure

        // Update the bot's message text
        msgElement.textContent = newBotResponse;
    } catch (err) {
        console.error('Error regenerating response:', err);
        msgElement.textContent = 'Sorry, there was an error. Try again later.';
    }
};

// Function to handle chat with the bot
const chatWithBot = async (userMessage) => {
    console.log('User message:', userMessage);
    appendMessage('user', userMessage);

    const options = {
        method: 'POST',
        url: 'https://api.chai-research.com/v1/chat/completions',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'X-API_KEY': '8527a3fdd9e44921b07200be713052f0' // Replace with your actual API key
        },
        data: {
            model: 'chai_v1',
            messages: [{ role: 'user', content: userMessage }],
            role: 'system',
                    content: 'You are a cheerful and humorous chatbot who always tries to brighten the user\'s day with positivity and witty comments.',
            max_tokens: 500,
            temperature: 0.5
        }
    };

    try {
        const response = await axios.request(options);
        console.log('API response:', response.data);
        const botResponse = response.data.choices[0].message.content; // Adjust based on response structure
        appendMessage('bot', botResponse, userMessage);
    } catch (err) {
        console.error('Error communicating with Chai API:', err);
        appendMessage('bot', 'Sorry, there was an error.');
    }
};

// Event listener for send button
sendBtn.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        chatWithBot(message);
        userInput.value = ''; // Clear input field
    } else {
        console.log('Empty message, not sending.');
    }
});

// Optional: Send message on Enter key press
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

