// Get references to the necessary DOM elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const chatForm = document.getElementById('chat-form');
const sendBtn = document.getElementById('send-btn');

let canSendMessage = true; // Flag to control sending messages
let conversation = []; // To store the conversation history

// Configure Marked.js
marked.setOptions({
    breaks: true, // Convert '\n' in paragraphs into <br>
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        } else {
            return hljs.highlightAuto(code).value;
        }
    }
});

// Function to append messages to the chat box without typing animation
const appendMessage = (role, content) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', role);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    // Render the content using Marked.js
    messageContent.innerHTML = marked.parse(content);

    // Handle code blocks to add copy buttons
    const codeBlocks = messageContent.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        // Wrap the code block in a div
        const codeContainer = document.createElement('div');
        codeContainer.classList.add('code-container');

        // Create a copy button
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = 'Copy';

        // Add copy functionality
        copyButton.addEventListener('click', () => {
            // Copy code to clipboard
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });
        });

        // Move the code block into the container
        const pre = codeBlock.parentNode;
        codeContainer.appendChild(copyButton);
        codeContainer.appendChild(pre.cloneNode(true));

        // Replace the original pre element with the container
        pre.parentNode.replaceChild(codeContainer, pre);
    });

    messageContainer.appendChild(messageContent);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to show typing indicator
const showTypingIndicator = () => {
    // Create typing indicator elements
    const typingMessage = document.createElement('div');
    typingMessage.classList.add('message', 'bot', 'typing');
    typingMessage.setAttribute('id', 'typing-indicator'); // Set an ID for easy removal

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('typing-indicator');

    // Create three dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingIndicator.appendChild(dot);
    }

    messageContent.appendChild(typingIndicator);
    typingMessage.appendChild(messageContent);
    chatBox.appendChild(typingMessage);
    chatBox.scrollTop = chatBox.scrollHeight;
};

// Function to remove typing indicator
const removeTypingIndicator = () => {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
};

const appendMessageWithTyping = (role, content) => {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', role);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    messageContainer.appendChild(messageContent);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Parse the markdown content into HTML elements
    const parsedHTML = document.createElement('div');
    parsedHTML.innerHTML = marked.parse(content);

    let typingSpeed = 10; // Faster typing speed (milliseconds per character)

    // Function to recursively traverse and animate nodes
    const animateNodes = (parentNode, container) => {
        const nodes = Array.from(parentNode.childNodes);

        let index = 0;

        const processNode = () => {
            if (index >= nodes.length) return;

            const node = nodes[index];
            index++;

            if (node.nodeType === Node.TEXT_NODE) {
                // Animate text node
                let text = node.textContent;
                let charIndex = 0;

                const typeChar = () => {
                    if (charIndex < text.length) {
                        container.appendChild(document.createTextNode(text[charIndex]));
                        charIndex++;
                        chatBox.scrollTop = chatBox.scrollHeight;
                        setTimeout(typeChar, typingSpeed);
                    } else {
                        processNode(); // Move to the next node
                    }
                };

                typeChar();
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Clone the element without children
                const elementClone = node.cloneNode(false);
                container.appendChild(elementClone);

                // If the element is a code block, display it immediately
                if (node.tagName.toLowerCase() === 'pre') {
                    elementClone.innerHTML = node.innerHTML;
                    chatBox.scrollTop = chatBox.scrollHeight;

                    // Handle code blocks to add copy buttons
                    const codeBlocks = elementClone.querySelectorAll('pre code');
                    codeBlocks.forEach((codeBlock) => {
                        // Wrap the code block in a div
                        const codeContainer = document.createElement('div');
                        codeContainer.classList.add('code-container');

                        // Create a copy button
                        const copyButton = document.createElement('button');
                        copyButton.classList.add('copy-button');
                        copyButton.textContent = 'Copy';

                        // Add copy functionality
                        copyButton.addEventListener('click', () => {
                            // Copy code to clipboard
                            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                                copyButton.textContent = 'Copied!';
                                setTimeout(() => {
                                    copyButton.textContent = 'Copy';
                                }, 2000);
                            });
                        });

                        // Move the code block into the container
                        const pre = codeBlock.parentNode;
                        codeContainer.appendChild(copyButton);
                        codeContainer.appendChild(pre.cloneNode(true));

                        // Replace the original pre element with the container
                        pre.parentNode.replaceChild(codeContainer, pre);
                    });

                    processNode(); // Move to the next node
                } else {
                    // Recursively animate child nodes
                    animateNodes(node, elementClone);
                    processNode(); // Move to the next node
                }
            } else {
                processNode(); // Skip other node types
            }
        };

        processNode();
    };

    animateNodes(parsedHTML, messageContent);
};

// Function to show the "Continue" button
const showContinueButton = () => {
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue';
    continueButton.classList.add('continue-button');

    // Append the button to the chat box
    chatBox.appendChild(continueButton);
    chatBox.scrollTop = chatBox.scrollHeight;

    continueButton.addEventListener('click', () => {
        // Remove the button after clicking
        continueButton.remove();

        // Send a request to continue the conversation
        chatWithBot('', true); // Pass empty user message, isContinuation = true
    });
};

// Function to send message to the server
const chatWithBot = async (userMessage, isContinuation = false) => {
    // Check if the message can be sent
    if (!canSendMessage) {
        console.log("Please wait before sending another message.");
        return;
    }

    canSendMessage = false; // Prevent sending more messages
    setTimeout(() => {
        canSendMessage = true; // Allow sending after 5 seconds
    }, 5000); // Delay of 5 seconds

    if (!isContinuation) {
        console.log('User message received:', userMessage);
        appendMessage('user', userMessage); // Display user's message

        // Add user's message to conversation history
        conversation.push({ role: 'user', content: userMessage });
    } else {
        console.log('Continuing the bot\'s response...');
    }

    // Show typing indicator
    showTypingIndicator();

    try {
        console.log('Sending message to the server...');

        // Fetch request to your server
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversation, // Send the entire conversation
            })
        });

        if (!response.ok) {
            console.error('HTTP error! Status:', response.status);
            const errorText = await response.text();
            console.error('Error Response Body:', errorText);

            // Remove typing indicator in case of error
            removeTypingIndicator();

            appendMessage('bot', 'Sorry, there was an error with the request.');
            return;
        }

        const data = await response.json(); // Parse the JSON response
        console.log('Received response from server:', data);

        if (data.choices && data.choices.length > 0) {
            const botResponse = data.choices[0].message.content;

            // Remove typing indicator before appending message
            removeTypingIndicator();

            // Append bot response with typing animation
            appendMessageWithTyping('bot', botResponse);

            // Add bot's response to conversation history
            conversation.push({ role: 'assistant', content: botResponse });

            console.log('Bot response appended:', botResponse);

            // Check if the bot's response was truncated
            if (data.choices[0].finish_reason === 'length') {
                // Show "Continue" button
                showContinueButton();
            }
        } else {
            // Remove typing indicator
            removeTypingIndicator();

            console.error('Unexpected response structure:', data);
            appendMessage('bot', 'Sorry, I received an unexpected response.');
        }
    } catch (err) {
        // Remove typing indicator in case of error
        removeTypingIndicator();

        console.error('Error communicating with the server:', err);
        appendMessage('bot', 'Sorry, there was an error during communication.');
    }
};

// Event listener for form submission
chatForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent the form from submitting and refreshing the page
    const message = userInput.value.trim();
    if (message) {
        console.log('Sending user input:', message);
        chatWithBot(message); // Call function to send user's message to the bot
        userInput.value = ''; // Clear input field
        userInput.style.height = 'auto'; // Reset textarea height
    } else {
        console.log('Empty message, not sending.');
    }
});

// Auto-resize textarea with max height limit
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    const maxHeight = 100; // Maximum height in pixels
    const padding = parseInt(window.getComputedStyle(userInput).paddingTop) + parseInt(window.getComputedStyle(userInput).paddingBottom);

    userInput.style.height = (userInput.scrollHeight - padding) + 'px';

    if (userInput.scrollHeight > maxHeight) {
        userInput.style.height = maxHeight + 'px';
        userInput.style.overflowY = 'auto'; // Show scrollbar when max height is exceeded
    } else {
        userInput.style.overflowY = 'hidden'; // Hide scrollbar when content fits
    }
});

// Optional: Send message on Enter key press without Shift key
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent adding a new line
        sendBtn.click(); // Trigger send button click
    }
});
