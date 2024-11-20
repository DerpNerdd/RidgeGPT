const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const chatForm = document.getElementById('chat-form');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatListContainer = document.getElementById('chat-list');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const showSidebarBtn = document.getElementById('show-sidebar-btn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');

let canSendMessage = true; // Flag to control sending messages
let conversation = []; // To store the conversation history
let currentChatId = null; // To track the current chat ID
let chatsData = []; // To store the list of chats

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    mainContent.classList.add('collapsed');
    showSidebarBtn.classList.add('visible');
});

showSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('hidden');
    mainContent.classList.remove('collapsed');
    showSidebarBtn.classList.remove('visible');
});

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

// Load chats on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadChats();
});

// Function to load chats
async function loadChats() {
    try {
        const response = await fetch('/api/chats');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const chats = data.chats;
                displayChatList(chats);
                if (chats.length > 0) {
                    // Select the most recent chat
                    currentChatId = chats[0]._id;
                    await loadChat(currentChatId);
                } else {
                    // No chats available, create a new one
                    await createNewChat();
                }
            }
        } else {
            console.error('Failed to load chats');
        }
    } catch (err) {
        console.error('Error loading chats:', err);
    }
}


function groupChatsByDate(chats) {
    // (Updated to include Years)
    const grouped = {};
    const today = new Date().setHours(0, 0, 0, 0);

    chats.forEach(chat => {
        const chatDate = new Date(chat.updatedAt).setHours(0, 0, 0, 0);
        const daysDifference = (today - chatDate) / (1000 * 60 * 60 * 24);

        let groupName = '';

        if (daysDifference < 1) {
            groupName = 'Today';
        } else if (daysDifference < 2) {
            groupName = 'Yesterday';
        } else if (daysDifference < 7) {
            groupName = 'Previous 7 Days';
        } else if (daysDifference < 30) {
            groupName = 'Previous 30 Days';
        } else if (daysDifference < 365) {
            const options = { month: 'long' };
            groupName = new Date(chatDate).toLocaleDateString(undefined, options);
        } else {
            const options = { year: 'numeric' };
            groupName = new Date(chatDate).toLocaleDateString(undefined, options);
        }

        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }

        grouped[groupName].push(chat);
    });

    return grouped;
}

// Function to display chat list
function displayChatList(chats) {
    chatListContainer.innerHTML = '';
    chatsData = chats; // Store chats locally
    const groupedChats = groupChatsByDate(chats);

    for (const [groupName, chatsInGroup] of Object.entries(groupedChats)) {
        const chatSection = document.createElement('div');
        chatSection.classList.add('chat-section');

        const header = document.createElement('h3');
        header.textContent = groupName;
        chatSection.appendChild(header);

        chatsInGroup.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.dataset.chatId = chat._id;

            const chatTitle = document.createElement('div');
            chatTitle.classList.add('chat-title');
            chatTitle.textContent = chat.title || 'New Chat';

            const chatOptionsBtn = document.createElement('button');
            chatOptionsBtn.classList.add('chat-options-btn');

            // Three dots icon
            chatOptionsBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#dcdcdc" d="M12,16A2,2 0 1,1 14,18A2,2 0 0,1 12,16M12,10A2,2 0 1,1 14,12A2,2 0 0,1 12,10M12,4A2,2 0 1,1 14,6A2,2 0 0,1 12,4Z" />
                </svg>
            `;

            chatItem.appendChild(chatTitle);
            chatItem.appendChild(chatOptionsBtn);

            if (chat._id === currentChatId) {
                chatItem.classList.add('active');
            }
            chatItem.addEventListener('click', async () => {
                currentChatId = chat._id;
                highlightActiveChat();
                await loadChat(currentChatId);
            });
            chatSection.appendChild(chatItem);
        });

        chatListContainer.appendChild(chatSection);
    }
}

// Function to highlight the active chat
function highlightActiveChat() {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        if (item.dataset.chatId === currentChatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Function to load a specific chat
async function loadChat(chatId) {
    try {
        const response = await fetch(`/api/chats/${chatId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const chat = data.chat;
                conversation = chat.messages;
                displayConversation(conversation);
            }
        } else {
            console.error('Failed to load chat messages');
        }
    } catch (err) {
        console.error('Error loading chat messages:', err);
    }
}

function displayConversation(conversation) {
    chatBox.innerHTML = '';
    conversation.forEach(message => {
        appendMessage(message.role, message.content);
    });
}

async function createNewChat() {
    try {
        const response = await fetch('/api/new-chat', {
            method: 'POST',
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentChatId = data.chatId;
                conversation = [];
                chatBox.innerHTML = '';
                await loadChats(); // Refresh chat list
                console.log('New chat started with ID:', currentChatId);
            }
        } else {
            console.error('Failed to create new chat');
        }
    } catch (err) {
        console.error('Error creating new chat:', err);
    }
}
// Event listener for the "New Chat" button
newChatBtn.addEventListener('click', async () => {
    await createNewChat();
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
    const codeBlocks = messageContent.querySelectorAll('pre');
    codeBlocks.forEach((preBlock) => {
        const codeBlock = preBlock.querySelector('code');
        if (codeBlock) {
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
            codeContainer.appendChild(copyButton);
            codeContainer.appendChild(preBlock.cloneNode(true));

            // Replace the original pre element with the container
            preBlock.parentNode.replaceChild(codeContainer, preBlock);
        }
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

// Function to append messages with typing animation
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

                // If the element is a code block or image, display it immediately
                if (node.tagName.toLowerCase() === 'pre' || node.tagName.toLowerCase() === 'img') {
                    elementClone.innerHTML = node.innerHTML;
                    chatBox.scrollTop = chatBox.scrollHeight;

                    // Handle code blocks to add copy buttons
                    if (node.tagName.toLowerCase() === 'pre') {
                        const codeBlocks = elementClone.querySelectorAll('code');
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
                            codeContainer.appendChild(copyButton);
                            codeContainer.appendChild(codeBlock.parentNode.cloneNode(true));

                            // Replace the original code element with the container
                            codeBlock.parentNode.parentNode.replaceChild(codeContainer, codeBlock.parentNode);
                        });
                    }

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

// Function to send message to the server
const chatWithBot = async (userMessage, isContinuation = false) => {
    if (!currentChatId) {
        console.error('No chat selected.');
        return;
    }

    if (!canSendMessage) {
        console.log("Please wait before sending another message.");
        return;
    }

    canSendMessage = false; // Prevent sending more messages
    setTimeout(() => {
        canSendMessage = true; // Allow sending after 5 seconds
    }, 5000); // Delay of 5 seconds

    console.log('User message received:', userMessage);
    appendMessage('user', userMessage); // Display user's message

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
                chatId: currentChatId,
                message: userMessage
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

        if (data.success) {
            const assistantMessage = data.message;
            // Remove typing indicator before appending message
            removeTypingIndicator();

            // Append bot response with typing animation
            appendMessageWithTyping('bot', assistantMessage.content);

            console.log('Bot response appended:', assistantMessage.content);

            if (data.title && !chatHasTitle(currentChatId)) {
                animateChatTitle(currentChatId, data.title);
                // Update the local chat data to indicate it has a title
                updateChatTitleInChats(currentChatId, data.title);
            }
            // Optionally reload chats to update titles if necessary
            // await loadChats(); // Comment out if you don't want to reload the entire chat list
        } else {
            // Remove typing indicator
            removeTypingIndicator();

            console.error('Unexpected response:', data);
            appendMessage('bot', 'Sorry, I received an unexpected response.');
        }
    } catch (err) {
        // Remove typing indicator in case of error
        removeTypingIndicator();

        console.error('Error communicating with the server:', err);
        appendMessage('bot', 'Sorry, there was an error during communication.');
    }
};

function animateChatTitle(chatId, fullTitle) {
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-title`);
    if (!chatItem) return;

    chatItem.textContent = ''; // Clear existing title

    let index = 0;
    const typingSpeed = 50; // Adjust typing speed as needed

    const typeChar = () => {
        if (index < fullTitle.length) {
            chatItem.textContent += fullTitle.charAt(index);
            index++;
            setTimeout(typeChar, typingSpeed);
        } else {
            // Typing animation complete
        }
    };

    typeChar();
}

// Function to check if chat has a title locally
function chatHasTitle(chatId) {
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-title`);
    return chatItem && chatItem.textContent.trim() !== 'New Chat';
}

function updateChatTitleInChats(chatId, newTitle) {
    // Update the title in the local chats data
    const chat = chatsData.find(c => c._id === chatId);
    if (chat) {
        chat.title = newTitle;
    }

    // Update the chat title in the UI
    const chatTitleElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-title`);
    if (chatTitleElement) {
        chatTitleElement.textContent = newTitle;
    }
}
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

