import { renderMessageGroup } from './renderHelpers.js';
import { setupCollapsibleMessages, setupEditButtons, scrollToLastMessage, createNewChat } from './uiUtils.js';

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
    
    const base = (window.IDOLL_API_BASE || '/api').replace(/\/$/, '');
    fetch(`${base}/conversation/${window.userId}/${window.currentChatId}`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          // Graceful fallback: show welcome if no conversation exists yet
          showWelcomeIfFirstConversation(conversationContainer);
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        if (data && Array.isArray(data.conversation)) {
          updateConversationUI(data);
        } else {
          showWelcomeIfFirstConversation(conversationContainer);
        }
      })
      .catch(error => {
        // Already handled above; keep console for debugging
        console.warn(`Conversation load fallback for ${window.currentChatId}:`, error?.message || error);
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
    const base = (window.IDOLL_API_BASE || '/api').replace(/\/$/, '');
    fetch(`${base}/conversations/${window.userId}`, { credentials: 'include' })
        .then(response => response.json())
        .then (data => {
            if (data.conversations && Array.isArray(data.conversations)) {
                console.log(`Loaded ${data.conversations.length} conversations from server`);
                // Update our chat history data with the server data
                chatHistoryData = data.conversations;
                
                // If none, create a friendly welcome placeholder
                if (chatHistoryData.length === 0) {
                    chatHistoryData.push({
                        id: 'welcome',
                        title: 'Welcome to IDOLL',
                        lastMessage: 'Start a new conversation',
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
                // Use default placeholder
                if (chatHistoryData.length === 0) {
                    chatHistoryData.push({
                        id: 'welcome',
                        title: 'Welcome to IDOLL',
                        lastMessage: 'Start a new conversation',
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
            // Use default placeholder on error
            if (chatHistoryData.length === 0) {
                chatHistoryData.push({
                    id: 'welcome',
                    title: 'Welcome to IDOLL',
                    lastMessage: 'Start a new conversation',
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

    // Ensure drawer header with New Chat button exists
    let drawerHeader = conversationDrawer.querySelector('.drawer-header');
    if (!drawerHeader) {
        drawerHeader = document.createElement('div');
        drawerHeader.className = 'drawer-header';
        drawerHeader.innerHTML = `
            <button id="sidebar-new-chat" class="new-chat-btn" title="New chat">
                <i class="fas fa-plus"></i>
                <span>New chat</span>
            </button>
        `;
        conversationDrawer.appendChild(drawerHeader);
        const newBtn = drawerHeader.querySelector('#sidebar-new-chat');
        if (newBtn) newBtn.addEventListener('click', (e) => { e.preventDefault(); createNewChat(); });
    }

    // Find or create chat history list
    let chatHistoryList = conversationDrawer.querySelector('.chat-history-list');
    if (!chatHistoryList) {
        console.log("Chat history list not found, creating it");
        chatHistoryList = document.createElement('div');
        chatHistoryList.className = 'chat-history-list';
        conversationDrawer.appendChild(chatHistoryList);
    }
    
    // Populate desktop chat list
    if (chatHistoryList) {
        chatHistoryList.innerHTML = '';
        if (chatHistoryData.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No conversations yet';
            chatHistoryList.appendChild(empty);
        } else {
            chatHistoryData.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'chat-history-item' + (chat.id === window.currentChatId ? ' active' : '');
                item.setAttribute('data-chat-id', chat.id);
                item.innerHTML = `
                    <div class="chat-history-title">${chat.title || chat.id}</div>
                    <div class="chat-history-preview">${chat.lastMessage || ''}</div>
                `;
                item.addEventListener('click', () => switchToChat(chat.id));
                chatHistoryList.appendChild(item);
            });
        }
    }

    // Also update the mobile list if it exists
    const mobileList = document.getElementById('mobile-conversations-list');
    if (mobileList) {
        displayMobileConversations(mobileList);
    }
    
    // Render current user profile at the bottom of the drawer
    renderUserProfile(conversationDrawer);

    console.log("Chat history displayed successfully");
}

// Realtime: upsert a conversation summary (id, title, lastMessage, timestamp)
export function upsertConversationSummary(summary) {
    if (!summary || !summary.id) return;
    const idx = chatHistoryData.findIndex(c => c.id === summary.id);
    if (idx >= 0) {
        chatHistoryData[idx] = { ...chatHistoryData[idx], ...summary };
    } else {
        chatHistoryData.unshift({ id: summary.id, title: summary.title || 'New Chat', lastMessage: summary.lastMessage || '', timestamp: summary.timestamp || new Date().toISOString() });
    }
    displayChatHistory();
}

// Realtime: remove a conversation by id
export function removeConversationSummary(chatId) {
    chatHistoryData = chatHistoryData.filter(c => c.id !== chatId);
    displayChatHistory();
}

function showWelcomeIfFirstConversation(container) {
    if (!container) return;
    if (window.currentChatId !== 'welcome') {
      // Not the placeholder; show minimal empty state
      container.innerHTML = '<div class="empty-state">No messages yet. Say hi to IDOLL!</div>';
      return;
    }
    container.innerHTML = `
      <div class="welcome-card">
        <h3>Welcome to IDOLL</h3>
        <p>Start a new conversation by typing below. Your recent chats will appear here.</p>
      </div>
    `;
}

function renderUserProfile(drawer) {
    try {
        if (!drawer) return;
        const profile = (window.userProfile || {});
        if (!profile) return;
        let card = drawer.querySelector('.user-profile-card');
        if (!card) {
            card = document.createElement('div');
            card.className = 'user-profile-card';
            // layout handled via CSS class in static/style.css
            drawer.appendChild(card);
        }
        const avatar = profile.picture || '/static/idoll_avatar.png';
        const name = profile.name || profile.email || profile.user_id || 'User';
        const email = profile.email || '';
        const isDark = (localStorage.getItem('theme') === 'dark');
        const icon = isDark ? 'fa-sun' : 'fa-moon';
        card.innerHTML = `
          <img src="${avatar}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color)" onerror="this.src='/static/idoll_avatar.png'"/>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:0.9rem;">${name}</span>
            ${email ? `<span style=\"font-size:0.75rem;opacity:0.7;\">${email}</span>` : ''}
          </div>
          <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
            <button id="theme-toggle-side-btn" title="Toggle theme" style="background:transparent;border:1px solid var(--border-color);color:var(--text-muted);border-radius:10px;padding:6px;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;">
              <i class=\"fas ${icon}\"></i>
            </button>
          </div>
        `;

        // Wire up theme toggle on the side card
        const sideBtn = card.querySelector('#theme-toggle-side-btn');
        if (sideBtn) {
          sideBtn.addEventListener('click', () => {
            if (typeof window.toggleTheme === 'function') {
              window.toggleTheme();
              // Update icon after toggle
              const nowDark = (localStorage.getItem('theme') === 'dark');
              const i = sideBtn.querySelector('i');
              if (i){
                i.classList.remove('fa-sun','fa-moon');
                i.classList.add(nowDark ? 'fa-sun' : 'fa-moon');
              }
            }
          });
        }
    } catch (e) {
        console.warn('Failed to render user profile card', e);
    }
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
