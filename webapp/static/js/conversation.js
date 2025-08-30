import { renderMessageGroup } from './renderHelpers.js';
import { setupCollapsibleMessages, setupEditButtons, scrollToLastMessage } from './uiUtils.js';

let chatHistoryData = [];

export function loadConversation(chatId) {
    // set the currentChatId before doing anything else
    window.currentChatId = chatId;
    console.log(`Loading conversation: ${window.currentChatId}`);
    
    // Update active state in the chat history list
    document.querySelectorAll('.chat-history-item, .mobile-conversation-item').forEach(item => {
        if (item.getAttribute('data-chat-id') === window.currentChatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Also update selected state in mobile menu
    document.querySelectorAll('.chat-list-item').forEach(item => {
        if (item.getAttribute('data-chat-id') === window.currentChatId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Show loading indicator
    const conversationContainer = document.getElementById('conversation-container');
    if (conversationContainer) {
        conversationContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading conversation...</div>';
    }
    
    // Fetch the conversation data from the server
    fetch(`/api/conversation/${window.userId}/${window.currentChatId}`)
        .then(response => response.json())
        .then(data => {
            updateConversationUI(data);
        })
        .catch(error => {
            console.error(`Error loading conversation ${window.currentChatId}:`, error);
            if (conversationContainer) {
                conversationContainer.innerHTML = '<div class="error-message">Error loading conversation. Please try again.</div>';
            }
        });
}


export function showConversationsPanel() {
    // Direct approach - find the panel and show it using Bootstrap tab
    const conversationsPanel = document.getElementById('conversations-panel');
    
    if (conversationsPanel) {
        // First ensure all tab panes are hidden
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // Then activate our conversations panel
        conversationsPanel.classList.add('show', 'active');
        
        // Update active state on tab buttons
        document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-bs-target') === '#conversations-panel') {
                btn.classList.add('active');
            }
        });
    }
    
    // Log for debugging
    console.log("Showing conversations panel");
}

export function switchToChat(chatId) {
    console.log(`Switching to chat: ${chatId}`);
    // update only the currentChatId, not userId
    window.currentChatId = chatId;

    // Update UI to show this chat is active
    document.querySelectorAll('.chat-history-item').forEach(item => {
        if (item.getAttribute('data-chat-id') === window.currentChatId) {
            item.classList.add('active');
            
            // Update the current chat title in the header
            const currentChatTitle = document.querySelector('.current-chat-title');
            if (currentChatTitle) {
                currentChatTitle.textContent = item.querySelector('.chat-history-title').textContent;
            }
        } else {
            item.classList.remove('active');
        }
    });

    // Update the selected state in mobile menu
    document.querySelectorAll('.chat-list-item').forEach(item => {
        if (item.getAttribute('data-chat-id') === window.currentChatId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // Ensure the conversations panel is shown
    showConversationsPanel();

    // Load the specific chat's conversation
    loadConversation(window.currentChatId);

    console.log(`Switched to chat: ${window.currentChatId}`);
}

export function updateConversationUI(data) {
  const container = document.getElementById('conversation-container');
  container.innerHTML = '';
  (data.conversation||[]).forEach(msg => {
    container.appendChild(renderMessageGroup(msg));
  });
  setupCollapsibleMessages();
  setupEditButtons();
  scrollToLastMessage();
}

export function loadChatHistory() {
    console.log("Loading chat history...");
    
    // First try to fetch conversation data from the server
    fetch(`/api/conversations/${window.userId}`)
        .then(response => response.json())
        .then (data => {
            if (data.conversations && Array.isArray(data.conversations)) {
                console.log(`Loaded ${data.conversations.length} conversations from server`);
                // Update our chat history data with the server data
                chatHistoryData = data.conversations;
                
                // If we don't have any conversations yet, create a default one
                if (chatHistoryData.length === 0) {
                    chatHistoryData.push({
                        id: 'general',
                        title: 'General Conversation',
                        lastMessage: 'No messages yet',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Now display the conversations in the UI
                displayChatHistory();
                // --- new: auto-select first chat if none selected ---
                if (!window.currentChatId) {
                    window.currentChatId = chatHistoryData[0].id;
                    switchToChat(window.currentChatId);
                }
            } else {
                console.log("No valid conversations data received, using default");
                // Use default conversation data
                if (chatHistoryData.length === 0) {
                    chatHistoryData.push({
                        id: 'general',
                        title: 'General Conversation',
                        lastMessage: 'No messages yet',
                        timestamp: new Date().toISOString()
                    });
                }
                displayChatHistory();
                // --- new: auto-select first chat ---
                if (!window.currentChatId) {
                    window.currentChatId = chatHistoryData[0].id;
                    switchToChat(window.currentChatId);
                }
            }
        })
        .catch(error => {
            console.error("Error fetching conversations:", error);
            // Use default conversation data on error
            if (chatHistoryData.length === 0) {
                chatHistoryData.push({
                    id: 'general',
                    title: 'General Conversation',
                    lastMessage: 'No messages yet',
                    timestamp: new Date().toISOString()
                });
            }
            displayChatHistory();
            // --- new: auto-select first chat ---
            if (!window.currentChatId) {
                window.currentChatId = chatHistoryData[0].id;
                switchToChat(window.currentChatId);
            }
        });
}

export function displayChatHistory() {
    console.log("Displaying chat history...");

    // Find or create conversation drawer elements
    let conversationDrawer = document.querySelector('.conversation-drawer');
    if (!conversationDrawer) {
        console.log("Conversation drawer not found, looking for container");
        const chatContainer = document.querySelector('.chat-container');
        
        if (chatContainer) {
            console.log("Creating conversation drawer in chat container");
            conversationDrawer = document.createElement('div');
            conversationDrawer.className = 'conversation-drawer';
            conversationDrawer.id = 'conversations-drawer';
            chatContainer.prepend(conversationDrawer);
        } else {
            console.log("Chat container not found, checking for mobile menu");
            // Try to find mobile container instead
            const mobileList = document.getElementById('mobile-conversations-list');
            if (mobileList) {
                console.log("Using mobile conversations list");
                displayMobileConversations(mobileList);
                return;
            } else {
                console.error("Cannot find any suitable container for conversations");
                return;
            }
        }
    }

    // Find or create chat history list
    let chatHistoryList = conversationDrawer.querySelector('.chat-history-list');
    if (!chatHistoryList) {
        console.log("Chat history list not found, creating it");
        chatHistoryList = document.createElement('div');
        chatHistoryList.className = 'chat-history-list';
        conversationDrawer.appendChild(chatHistoryList);
    }
    
    
    // Also update the mobile list if it exists
    const mobileList = document.getElementById('mobile-conversations-list');
    if (mobileList) {
        displayMobileConversations(mobileList);
    }
    
    console.log("Chat history displayed successfully");
}


export function displayMobileConversations(mobileList) {
    mobileList.innerHTML = '';
    
    if (chatHistoryData.length === 0) {
        mobileList.innerHTML = `
            <div class="mobile-empty-state">
                <p>No conversations yet</p>
            </div>
        `;
        return;
    }
    
    chatHistoryData.forEach(chat => {
        const isSelected = chat.id === window.currentChatId;
        const chatItem = document.createElement('div');
        chatItem.className = `chat-list-item ${isSelected ? 'selected' : ''}`;
        chatItem.setAttribute('data-chat-id', chat.id);

        // add actions button + menu
        chatItem.innerHTML = `
            <div class="chat-list-item-content">
                <div class="chat-list-item-title">${chat.title}</div>
                <div class="chat-list-item-preview">${chat.lastMessage || 'No messages'}</div>
            </div>
            <div class="chat-list-item-actions">
                <button class="options-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12ZM10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12ZM17 12C17 10.8954 17.8954 10 19 10C20.1046 10 21 10.8954 21 12C21 13.1046 20.1046 14 19 14C17.8954 14 17 13.1046 17 12Z" fill="currentColor"></path></svg>
                </button>
                <div class="options-menu">
                    <button class="delete-chat">
                        <img src="./static/svg/trash-bin.svg" alt="icon">
                        <span>Delete</span>
                    </button>
                    <button class="share-chat">
                        <img src="./static/svg/share.svg" alt="icon">
                        <span>Share</span>
                    </button>
                </div>
            </div>
        `;

        // existing click-to-switch
        chatItem.addEventListener('click', function() {
            const chatId = this.getAttribute('data-chat-id');
            
            // Remove selected class from all chat items
            document.querySelectorAll('.chat-list-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Add selected class to this item
            this.classList.add('selected');
            
            switchToChat(chat.id);
            
            // Close the mobile menu
            const mobileMenu = document.getElementById('mobile-nav-menu');
            const overlay = document.getElementById('mobile-menu-overlay');
            if (mobileMenu) mobileMenu.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // toggle options menu
        const optionsButton = chatItem.querySelector('.options-button');
        const optionsMenu   = chatItem.querySelector('.options-menu');
        optionsButton.addEventListener('click', e => {
            console.log('Toggling options menu for chat:', chat.id);
            e.stopPropagation();

            // Close all other options menus
            document.querySelectorAll('.options-menu.active').forEach(menu => {
            if (menu !== optionsMenu) {
                menu.classList.remove('active');
            }
            });

            // Toggle the clicked options menu
            optionsMenu.classList.toggle('active');
        });

        // delete handler
        chatItem.querySelector('.delete-chat')
            .addEventListener('click', e => {
                e.stopPropagation();
                deleteChat(chat.id);
            });

        // share handler
        chatItem.querySelector('.share-chat')
            .addEventListener('click', e => {
                e.stopPropagation();
                shareChat(chat.id);
            });

        mobileList.appendChild(chatItem);
    });
}

// stub implementations — fill in API calls, UI refresh, etc.
export function deleteChat(chatId) {
    console.log('Deleting chat', chatId);
    // TODO: call DELETE /api/conversation/{userId}/{chatId}, then reload history
}

export function shareChat(chatId) {
    console.log('Sharing chat', chatId);
    // TODO: implement share logic (e.g. copy link or open share dialog)
}
