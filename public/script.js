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
const chatOptionsModal = document.getElementById('chat-options-modal');
const renameChatBtn = document.getElementById('rename-chat-btn');
const deleteChatBtn = document.getElementById('delete-chat-btn');
const accountBtn = document.getElementById('account-btn');
const accountModal = document.getElementById('account-modal');
const modelSelectorBtn = document.getElementById('model-selector-btn');
const modelSelectorModal = document.getElementById('model-selector-modal');
const searchBtn = document.getElementById('search-btn');
const searchModal = document.getElementById('search-modal');
const closeSearchModalBtn = document.getElementById('close-search-modal-btn');
const searchInput = document.getElementById('search-input');
const searchResultsContainer = document.getElementById('search-results');
const versionInfoBtn = document.getElementById('version-info-btn');
const versionInfoModal = document.getElementById('version-info-modal');
const closeVersionModalBtn = document.getElementById('close-version-modal-btn');


let canSendMessage = true; // Flag to control sending messages
let conversation = []; // To store the conversation history
let currentChatId = null; // To track the current chat ID
let chatsData = []; // To store the list of chats
let selectedChatId = null; // To keep track of which chat's options are being viewed
let currentModel = 'gpt-4'; // Default model

const modelDisplayNames = {
    // 'o1-preview': 'ChatGPT o1-preview',
    // 'o1-mini': 'ChatGPT o1-mini',
    'gpt-4o': 'ChatGPT 4o',
    'gpt-4o-mini': 'ChatGPT 4o-mini',
    'gpt-4': 'ChatGPT 4',
    'gpt-3.5-turbo': 'ChatGPT 3.5',
};

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

// Open Search Modal
searchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSearchModal();
});

// Close Search Modal
closeSearchModalBtn.addEventListener('click', () => {
    closeSearchModal();
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-modal') && !e.target.closest('#search-btn')) {
        closeSearchModal();
    }
});


marked.setOptions({
    gfm: true,
    breaks: true,
    smartLists: true,
    smartypants: false,
    xhtml: false,
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        } else {
            return hljs.highlightAuto(code).value;
        }
    },
});

function openSearchModal() {
    // Close other modals if open
    chatOptionsModal.classList.remove('visible');
    accountModal.classList.remove('visible');
    modelSelectorModal.classList.remove('visible');

    searchModal.classList.add('visible');
    searchInput.value = ''; // Clear previous search input
    searchInput.focus(); // Focus on the search input
    // Populate recent chats
    displayRecentChats();
}


function closeSearchModal() {
    searchModal.classList.remove('visible');
}


searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    filterChats(query);
});

function filterChats(query) {
    // Filter chats based on the query
    const filteredChats = chatsData.filter(chat => {
        return (chat.title && chat.title.toLowerCase().includes(query));
    });
    displayRecentChats(filteredChats);
}

function displayRecentChats(chatsList = null) {
    searchResultsContainer.innerHTML = ''; // Clear previous results

    const chatsToDisplay = chatsList || chatsData.filter(chat => {
        const chatDate = new Date(chat.updatedAt);
        const today = new Date();
        const diffTime = Math.abs(today - chatDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    });

    const groupedChats = groupChatsForSearch(chatsToDisplay);

    for (const [groupName, chatsInGroup] of Object.entries(groupedChats)) {
        const section = document.createElement('div');
        section.classList.add('search-section');

        const header = document.createElement('h3');
        header.textContent = groupName;
        section.appendChild(header);

        chatsInGroup.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('search-chat-item');
            chatItem.dataset.chatId = chat._id;

            const chatTitle = document.createElement('div');
            chatTitle.classList.add('search-chat-title');
            chatTitle.textContent = chat.title || 'New Chat';

            // Append title for now; we'll update snippet later
            chatItem.appendChild(chatTitle);

            chatItem.addEventListener('click', async () => {
                currentChatId = chat._id;
                highlightActiveChat();
                await loadChat(currentChatId);
                closeSearchModal();
            });

            section.appendChild(chatItem);

            // Fetch messages asynchronously and update the snippet
            fetch(`/api/chats/${chat._id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.chat.messages.length > 0) {
                        const lastMessage = data.chat.messages[data.chat.messages.length - 1];
                        const snippetContent = atob(lastMessage.content).substring(0, 50) + '...';

                        const chatSnippet = document.createElement('div');
                        chatSnippet.classList.add('search-chat-snippet');
                        chatSnippet.textContent = snippetContent;

                        chatItem.appendChild(chatSnippet);
                    }
                })
                .catch(err => {
                    console.error('Error fetching chat messages:', err);
                });
        });

        searchResultsContainer.appendChild(section);
    }
}



function groupChatsForSearch(chats) {
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
        } else {
            // Do not include chats older than 7 days
            return;
        }

        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }

        grouped[groupName].push(chat);
    });

    return grouped;
}

versionInfoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openVersionInfoModal();
});

// Close Version Info Modal
closeVersionModalBtn.addEventListener('click', closeVersionInfoModal);

// Functions to open and close the modal
function openVersionInfoModal() {
    // Position the modal near the version info text
    const rect = versionInfoBtn.getBoundingClientRect();
    
    // Temporarily show the modal to get its dimensions
    versionInfoModal.classList.add('visible');
    const modalRect = versionInfoModal.getBoundingClientRect();
    versionInfoModal.classList.remove('visible');
    
    let left = rect.left + (rect.width / 2) - (modalRect.width / 2);
    let top = rect.top - modalRect.height - 10; // Position above the button
    
    // Ensure the modal doesn't go off-screen
    if (left < 10) {
        left = 10;
    } else if (left + modalRect.width > window.innerWidth - 10) {
        left = window.innerWidth - modalRect.width - 10;
    }
    
    if (top < 10) {
        top = rect.bottom + 10; // Position below the button if not enough space above
    }
    
    versionInfoModal.style.left = left + 'px';
    versionInfoModal.style.top = top + 'px';
    
    versionInfoModal.classList.add('visible');
}

function closeVersionInfoModal() {
    versionInfoModal.classList.remove('visible');
}

modelSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModelSelectorModal();
});

// Function to toggle model selector modal
function toggleModelSelectorModal() {
    // Close other modals if open
    chatOptionsModal.classList.remove('visible');
    accountModal.classList.remove('visible');

    if (modelSelectorModal.classList.contains('visible')) {
        modelSelectorModal.classList.remove('visible');
    } else {
        // Temporarily display the modal to get its dimensions
        modelSelectorModal.style.visibility = 'hidden';
        modelSelectorModal.classList.add('visible');
        const modalRect = modelSelectorModal.getBoundingClientRect();

        // Position the modal relative to the viewport
        const btnRect = modelSelectorBtn.getBoundingClientRect();

        // Define the offset in pixels (adjust this value as needed)
        const offset = 100; // Move modal 30 pixels to the right

        // Calculate the left position to center the modal under the button
        let left = btnRect.left + (btnRect.width / 2) - (modalRect.width / 2) + offset;

        // Ensure the modal doesn't overflow the viewport
        if (left < 10) {
            left = 10;
        } else if (left + modalRect.width > window.innerWidth - 10) {
            left = window.innerWidth - modalRect.width - 10;
        }

        modelSelectorModal.style.top = btnRect.bottom + 'px';
        modelSelectorModal.style.left = left + 'px';
        modelSelectorModal.style.right = 'auto'; // Reset right
        modelSelectorModal.style.visibility = 'visible';
    }
}




// Event listener for selecting a model
modelSelectorModal.addEventListener('click', (e) => {
    let target = e.target;
    while (target && target !== modelSelectorModal) {
        if (target.tagName === 'LI') {
            const selectedModel = target.dataset.model;
            setModel(selectedModel);
            modelSelectorModal.classList.remove('visible');
            break;
        }
        target = target.parentElement;
    }
});

// Function to set the current model
function setModel(model) {
    currentModel = model;
    console.log('Model changed to:', currentModel);

    // Update UI to reflect the selected model
    const displayName = modelDisplayNames[model] || model;
    document.getElementById('selected-model').textContent = displayName;
}

// Load chats on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    await loadChats();

    // Set the initial model display name
    const displayName = modelDisplayNames[currentModel] || currentModel;
    document.getElementById('selected-model').textContent = displayName;
});
// Function to load chats
async function loadChats() {
    try {
        const response = await fetch('/api/chats?includeMessages=true');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const chats = data.chats;
                chatsData = chats; // Store chats with messages
                displayChatList(chats);
                if (chats.length > 0) {
                    currentChatId = chats[0]._id;
                    await loadChat(currentChatId);
                } else {
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


// Function to load a specific chat
async function loadChat(chatId) {
    try {
        const response = await fetch(`/api/chats/${chatId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const chat = data.chat;
                conversation = chat.messages;
                console.log('Loaded conversation:', conversation);
                displayConversation(conversation);
            }
        } else {
            console.error('Failed to load chat messages');
        }
    } catch (err) {
        console.error('Error loading chat messages:', err);
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
                // Instead of reloading chats, update chatsData and displayChatList
                const newChat = {
                    _id: currentChatId,
                    title: 'New Chat',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                chatsData.unshift(newChat); // Add new chat to the beginning
                displayChatList(chatsData); // Refresh chat list
                highlightActiveChat(); // Highlight the new chat
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
    console.log(`Appending message. Role: ${role}, Content:`, content);

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', role);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    messageContainer.appendChild(messageContent);
    chatBox.appendChild(messageContainer);

    // Decode the Base64 content for all roles
    const decodedContent = atob(content);

    // Check for both 'bot' and 'assistant' roles
    if (role === 'bot' || role === 'assistant') {
        console.log('Decoded Content:', decodedContent);
        const parsedHTML = marked.parse(decodedContent);
        messageContent.innerHTML = parsedHTML;
        // Process code blocks in the message content
        processCodeBlocks(messageContent);
    } else {
        messageContent.textContent = decodedContent;
    }

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
    // For non-assistant/bot messages, fallback to appendMessage
    if (role !== 'bot' && role !== 'assistant') {
        appendMessage(role, content);
        return;
    }

    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', role);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    messageContainer.appendChild(messageContent);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Decode the Base64 content
    const decodedContent = atob(content);

    // Parse the markdown content into HTML elements
    const parsedHTML = document.createElement('div');
    parsedHTML.innerHTML = marked.parse(decodedContent);

    let typingSpeed = 10; // Typing speed in milliseconds per character

    // Function to recursively traverse and animate nodes
    const animateNodes = (parentNode, container, callback) => {
        const nodes = Array.from(parentNode.childNodes);

        let index = 0;

        const processNode = () => {
            if (index >= nodes.length) {
                if (callback) callback();
                return;
            }

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

                    processNode(); // Move to the next node
                } else {
                    // Recursively animate child nodes
                    animateNodes(node, elementClone, processNode);
                }
            } else {
                processNode(); // Skip other node types
            }
        };

        processNode();
    };

    animateNodes(parsedHTML, messageContent, () => {
        // After animation is complete, process code blocks
        processCodeBlocks(messageContent);
    });
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
    appendMessage('user', btoa(userMessage)); // Encode user's message before displaying

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
                message: userMessage,
                model: currentModel // Include the selected model
            })
        });

        if (!response.ok) {
            console.error('HTTP error! Status:', response.status);
            const errorText = await response.text();
            console.error('Error Response Body:', errorText);

            // Remove typing indicator in case of error
            removeTypingIndicator();

            appendMessage('bot', btoa('Sorry, there was an error with the request.'));
            return;
        }

        const data = await response.json(); // Parse the JSON response
        console.log('Received response from server:', data);

        if (data.success) {
            const assistantMessage = data.message;
            // Remove typing indicator before appending message
            removeTypingIndicator();

            // Append bot response with typing animation
            appendMessageWithTyping('assistant', assistantMessage.content);

            console.log('Bot response appended:', assistantMessage.content);

            if (data.title && !chatHasTitle(currentChatId)) {
                animateChatTitle(currentChatId, data.title);
                // Update the local chat data to indicate it has a title
                updateChatTitleInChats(currentChatId, data.title);
            }
        } else {
            // Remove typing indicator
            removeTypingIndicator();

            console.error('Unexpected response:', data);
            appendMessage('bot', btoa('Sorry, I received an unexpected response.'));
        }
    } catch (err) {
        // Remove typing indicator in case of error
        removeTypingIndicator();

        console.error('Error communicating with the server:', err);
        appendMessage('bot', btoa('Sorry, there was an error during communication.'));
    }
};

// Close modals when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.modal') && !e.target.closest('.account-btn') && !e.target.closest('.chat-options-btn') && !e.target.closest('.model-selector-btn')) {
        chatOptionsModal.classList.remove('visible');
        accountModal.classList.remove('visible');
        modelSelectorModal.classList.remove('visible');
    }
});


function animateChatTitle(chatId, fullTitle) {
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-title`);
    if (!chatItem) return;

    chatItem.textContent = ''; // Clear existing title
    chatItem.classList.add('animating'); // Add animating class

    let index = 0;
    const typingSpeed = 50; // Adjust typing speed as needed

    const typeChar = () => {
        if (index < fullTitle.length) {
            chatItem.textContent += fullTitle.charAt(index);
            index++;
            setTimeout(typeChar, typingSpeed);
        } else {
            // Typing animation complete
            chatItem.classList.remove('animating'); // Remove animating class
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

    // Update the chat title in the UI (only if not animating)
    const chatTitleElement = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-title`);
    if (chatTitleElement && !chatTitleElement.classList.contains('animating')) {
        chatTitleElement.textContent = newTitle;
    }
}
// Event listener for form submission
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (message) {
        chatWithBot(message); // Ensure only one function sends the message
        userInput.value = ''; // Clear input field
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


// Close modal when clicking outside of modal content
window.addEventListener('click', (e) => {
    if (e.target === chatOptionsModal) {
        closeChatOptionsModal();
    }
});

renameChatBtn.addEventListener('click', () => {
    const newTitle = prompt('Enter new chat name:');
    if (newTitle) {
        // Update the chat title locally and on the server
        updateChatTitle(selectedChatId, newTitle);
    }
    chatOptionsModal.classList.remove('visible');
});

// Event listener for Delete option
deleteChatBtn.addEventListener('click', async () => {
    const confirmDelete = confirm('Are you sure you want to delete this chat?');
    if (confirmDelete) {
        await deleteChat(selectedChatId);
    }
    chatOptionsModal.classList.remove('visible');
});

// Function to update chat title
function updateChatTitle(chatId, newTitle) {
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

    // Send update to the server
    fetch(`/api/chats/${chatId}/rename`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
    }).then(response => {
        if (!response.ok) {
            console.error('Failed to rename chat on server');
        }
    }).catch(err => {
        console.error('Error renaming chat on server:', err);
    });
}

// Function to delete chat
async function deleteChat(chatId) {
    try {
        const response = await fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            // Remove chat from local data and UI
            chatsData = chatsData.filter(chat => chat._id !== chatId);
            displayChatList(chatsData);

            // If the deleted chat was the current chat, load another chat or create a new one
            if (currentChatId === chatId) {
                if (chatsData.length > 0) {
                    currentChatId = chatsData[0]._id;
                    await loadChat(currentChatId);
                    highlightActiveChat();
                } else {
                    await createNewChat();
                }
            }
        } else {
            console.error('Failed to delete chat');
        }
    } catch (err) {
        console.error('Error deleting chat:', err);
    }
}

accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAccountModal();
});

function toggleAccountModal() {
    // Close other modals if open
    chatOptionsModal.classList.remove('visible');
    modelSelectorModal.classList.remove('visible');

    if (accountModal.classList.contains('visible')) {
        accountModal.classList.remove('visible');
    } else {
        // Position the modal relative to the viewport
        const rect = accountBtn.getBoundingClientRect();

        // Temporarily show the modal to get its dimensions
        accountModal.classList.add('visible');
        const modalRect = accountModal.getBoundingClientRect();
        accountModal.classList.remove('visible');

        let left = rect.left;

        // Adjust left position if modal overflows the viewport
        if (left + modalRect.width > window.innerWidth) {
            left = window.innerWidth - modalRect.width - 10; // Adjust with margin
        }

        accountModal.style.top = rect.bottom + 'px';
        accountModal.style.left = left + 'px';
        accountModal.style.right = 'auto'; // Ensure right is reset
        accountModal.classList.add('visible');
    }
}

// Event listener for chat options button
document.addEventListener('click', (e) => {
    if (e.target.closest('.chat-options-btn')) {
        e.stopPropagation();
        selectedChatId = e.target.closest('.chat-item').dataset.chatId;
        toggleChatOptionsModal(e.target.closest('.chat-options-btn'));
    } else {
        // Close modals when clicking outside
        chatOptionsModal.classList.remove('visible');
        accountModal.classList.remove('visible');
    }
});

// Open/Toggle chat options modal
function toggleChatOptionsModal(buttonElement) {
    // Close other modals if open
    accountModal.classList.remove('visible');
    modelSelectorModal.classList.remove('visible');

    if (chatOptionsModal.classList.contains('visible')) {
        chatOptionsModal.classList.remove('visible');
    } else {
        // Position the modal relative to the viewport
        const rect = buttonElement.getBoundingClientRect();
        chatOptionsModal.style.top = rect.top + 'px';
        chatOptionsModal.style.left = rect.right + 'px';
        chatOptionsModal.classList.add('visible');
    }
}


// Close modals when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.modal') && !e.target.closest('.account-btn') && !e.target.closest('.chat-options-btn')) {
        chatOptionsModal.classList.remove('visible');
        accountModal.classList.remove('visible');
    }
});

function processCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        // Highlight the code block using Highlight.js
        hljs.highlightElement(codeBlock);

        // Wrap the code block for additional features (e.g., copy button)
        const preBlock = codeBlock.parentElement;
        const codeContainer = document.createElement('div');
        codeContainer.classList.add('code-container');

        const codeHeader = document.createElement('div');
        codeHeader.classList.add('code-header');

        const languageSpan = document.createElement('span');
        languageSpan.classList.add('code-language');
        const language = codeBlock.className.replace('language-', '');
        languageSpan.textContent = language;

        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = 'Copy';

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });
        });

        codeHeader.appendChild(languageSpan);
        codeHeader.appendChild(copyButton);
        codeContainer.appendChild(codeHeader);
        codeContainer.appendChild(preBlock.cloneNode(true));

        preBlock.parentElement.replaceChild(codeContainer, preBlock);
    });
}
