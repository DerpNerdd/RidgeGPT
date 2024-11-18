// Get references to the necessary DOM elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const miniConsole = document.getElementById('mini-console'); // Mini console log div

let canSendMessage = true; // Flag to control sending messages

// Function to append messages to the chat box
const appendMessage = (role, content) => {
    const msg = document.createElement('div');
    msg.classList.add(role === 'user' ? 'user-message' : 'bot-message'); // Ensure consistent styling
    msg.textContent = content;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
};

// Function to log messages to the mini-console
const logToMiniConsole = (message) => {
    miniConsole.textContent += `${message}\n`; // Append the message to the mini-console
    miniConsole.scrollTop = miniConsole.scrollHeight; // Scroll to the bottom
};

// Function to send message to the server, which will communicate with OpenAI API
const chatWithBot = async (userMessage) => {
    // Check if the message can be sent
    if (!canSendMessage) {
        logToMiniConsole("Please wait before sending another message.");
        return;
    }

    canSendMessage = false; // Prevent sending more messages
    setTimeout(() => {
        canSendMessage = true; // Allow sending after 5 seconds
    }, 5000); // Delay of 5 seconds

    console.log('User message received:', userMessage);
    appendMessage('user', userMessage); // Display user's message
    logToMiniConsole(`User: ${userMessage}`); // Log to mini console

    try {
        console.log('Sending message to the server...');
        logToMiniConsole("Sending message to the server...");

        // Fetch request to your server
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: userMessage }]
            })
        });

        if (!response.ok) {
            console.error('HTTP error! Status:', response.status);
            const errorText = await response.text();
            console.error('Error Response Body:', errorText);
            logToMiniConsole(`Error: HTTP error! Status: ${response.status}\nBody: ${errorText}`);
            appendMessage('bot', 'Sorry, there was an error with the request.');
            return;
        }

        const data = await response.json(); // Parse the JSON response
        console.log('Received response from server:', data);

        if (data.choices && data.choices.length > 0) {
            const botResponse = data.choices[0].message.content;
            appendMessage('bot', botResponse);
            logToMiniConsole(`Bot: ${botResponse}`); // Log bot's response
            console.log('Bot response appended:', botResponse);
        } else {
            console.error('Unexpected response structure:', data);
            logToMiniConsole(`Error: Unexpected response structure: ${JSON.stringify(data)}`);
            appendMessage('bot', 'Sorry, I received an unexpected response.');
        }
    } catch (err) {
        console.error('Error communicating with the server:', err);
        logToMiniConsole(`Error: ${err.message}`);
        appendMessage('bot', 'Sorry, there was an error during communication.');
    }
};

// Event listener for send button
sendBtn.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        console.log('Sending user input:', message);
        chatWithBot(message); // Call function to send user's message to the bot
        userInput.value = ''; // Clear input field
    } else {
        console.log('Empty message, not sending.');
        logToMiniConsole('Attempted to send an empty message.');
    }
});

// Optional: Send message on Enter key press
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        console.log('Enter key pressed, sending message...');
        sendBtn.click(); // Trigger send button click
    }
});
