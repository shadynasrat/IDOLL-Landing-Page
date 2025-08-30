import { sendMessage } from './websocket.js';
import { switchToChat } from './conversation.js';

export function setupScrollObserver() {
    const conversationContainer = document.getElementById('conversation-container');
    if (!conversationContainer) {
        console.warn('Cannot setup scroll observer: Conversation container not found');
        return;
    }
    
    console.log('Setting up scroll observer');
    
    // Create a mutation observer to detect when messages are added or content changes
    const mutationObserver = new MutationObserver((mutations) => {
        let shouldScroll = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldScroll = true;
            } else if (mutation.type === 'attributes' || mutation.type === 'characterData') {
                // Also scroll if attributes or text content changes
                shouldScroll = true;
            }
        });
        
        if (shouldScroll) {
            // Short delay to ensure DOM is fully updated
            setTimeout(scrollToLastMessage, 50);
        }
    });
    
    // Observe all changes to the conversation container
    mutationObserver.observe(conversationContainer, { 
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
    
    // Also scroll on window resize
    window.addEventListener('resize', () => {
        setTimeout(scrollToLastMessage, 100);
    });
    
    // Initial scroll
    setTimeout(scrollToLastMessage, 300);
}

export function scrollToLastMessage() {
    const container = document.getElementById('conversation-container');
    if (!container) return;
    // Scroll to bottom smoothly
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

export function setupCollapsibleMessages() {
    const toggleButtons = document.querySelectorAll('.toggle-message-btn');
    
    toggleButtons.forEach(button => {
        // Remove any existing event listeners to prevent duplicates
        button.removeEventListener('click', toggleCollapsibleContent);
        // Add the event listener
        button.addEventListener('click', toggleCollapsibleContent);

        // Start with collapsed state
        const messageGroup = button.closest('.message-group');
        const collapsibleContent = messageGroup.querySelector('.collapsible-content');
        if (collapsibleContent) {
            collapsibleContent.classList.add('collapsed');
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-down';
            }
        }
    });
}

export function toggleCollapsibleContent() {
    // Find the associated collapsible content (parent message-group -> find collapsible-content)
    const messageGroup = this.closest('.message-group');
    const collapsibleContent = messageGroup.querySelector('.collapsible-content');
    
    if (collapsibleContent) {
        // Toggle collapsed state
        collapsibleContent.classList.toggle('collapsed');
        
        // Update the icon
        const icon = this.querySelector('i');
        if (collapsibleContent.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-down';
        } else {
            icon.className = 'fas fa-chevron-up';
        }
    }
}

export function setupEditButtons() {
    const editButtons = document.querySelectorAll('.message-group-edit-button');
    
    editButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling to message group
            const messageGroup = this.closest('.message-group');
            const messageId = messageGroup.getAttribute('data-message-id');
            
            // Call edit function from editMessages.js
            if (typeof openEditForm === 'function') {
                openEditForm(messageGroup, messageId);
            } else {
                console.error('Edit function not available');
            }
        });
    });
}

export function setupMobileMenu() {
    // Create overlay element for mobile menu
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    document.body.appendChild(overlay);
    
    // Functions to show/hide sidebar
    function showSidebar() {
        document.querySelector('.sidebar').classList.add('show');
        overlay.classList.add('show');
    }
    
    function hideSidebar() {
        document.querySelector('.sidebar').classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // Toggle sidebar when hamburger button is clicked
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling
            showSidebar();
        });
    }
    
    // Close sidebar when close button is clicked
    const sidebarClose = document.getElementById('sidebar-close');
    if (sidebarClose) {
        sidebarClose.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling
            hideSidebar();
        });
    }
    
    // Close sidebar when clicking overlay
    overlay.addEventListener('click', hideSidebar);
    
    // Make all mobile menu items clickable and close menu after click
    const allMenuItems = document.querySelectorAll('.sidebar .nav-link, .mobile-menu .nav-link');
    allMenuItems.forEach(item => {
        // Ensure clicks are captured
        item.addEventListener('click', function(e) {
            // Only close sidebar on mobile
            if (window.innerWidth < 992) {
                // Small delay to allow for the tab change animation
                setTimeout(hideSidebar, 100);
            }
        });
    });

    // Prevent sidebar close when clicking on the theme toggle
    const themeToggle = document.getElementById('darkModeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from closing sidebar
        });
    }
}

export function createNewChat() {
    console.log("Preparing new chat UI");
    // Clear current chat UI
    const conversationContainer = document.getElementById('conversation-container');
    if (conversationContainer) conversationContainer.innerHTML = '';
    // Clear active selections
    document.querySelectorAll('.chat-history-item, .chat-list-item').forEach(i => i.classList.remove('active','selected'));
    // Reset header title
    const titleEl = document.querySelector('.current-chat-title');
    if (titleEl) titleEl.textContent = 'New Chat';
    // Clear input
    const inputEl = document.querySelector('.chat-input');
    if (inputEl) { inputEl.value = ''; inputEl.style.height = 'auto'; }
    // Flag awaiting first user message
    window.newChatPending = true;
}

// Helper to send first message as initial_message when creating chat on server
export function createChatOnServer(initialMessage) {
    console.log("Creating new chat on server with initial_message:", initialMessage);
    const requestBody = { initial_message: initialMessage };
    fetch(`/api/create_chat/${window.userId}/${initialMessage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error('Error creating chat:', data.error);
            showErrorNotification('Failed to create new chat');
            return;
        }
        // 1) update global chat id
        window.currentChatId = data.chat_id;
        // 2) switch UI into this new chat
        switchToChat(data.chat_id);
        // 3) re-inject the initial message into input
        const inputEl = document.querySelector('.chat-input');
        if (inputEl) {
            inputEl.value = initialMessage;
            // optional: adjust textarea height/disabled state
            inputEl.dispatchEvent(new Event('input'));
        }
        // 4) actually send it
        sendMessage();
    })
    .catch(err => {
        console.error('Error:', err);
        showErrorNotification('Failed to create new chat');
    });
}

export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard:', text);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        showErrorNotification('Failed to copy text');
    });
}


// Mobile chat interface handling
export function setupMobileChatInterface() {
    const backToConversations = document.getElementById('back-to-conversations');
    const chatInterface = document.querySelector('.chat-interface');
    const voiceButton = document.querySelector('.btn-outline-secondary i.fa-microphone')?.closest('button');
    const attachButton = document.querySelector('.btn-outline-secondary i.fa-paperclip')?.closest('button');

    // Function to show chat main view
    function showChatMain() {
    }
    
    // Go back when back button is clicked (mobile only)
    if (backToConversations) {
        backToConversations.addEventListener('click', function() {
            // On mobile, we just hide the conversations panel and show the sidebar
            const sidebar = document.querySelector('.sidebar');
            if (sidebar && window.innerWidth < 992) {
                sidebar.classList.add('show');
            }
            
            // Hide conversations panel (this is for mobile view)
            const conversationsPanel = document.getElementById('conversations-panel');
            if (conversationsPanel) {
                const tabElement = document.querySelector('button[data-bs-target="#users-panel"]');
                if (tabElement) {
                    const bsTab = new bootstrap.Tab(tabElement);
                    bsTab.show();
                }
            }
        });
    }

    // Users tab navigation
    const usersTab = document.getElementById('users-tab');
    if (usersTab) {
        usersTab.addEventListener('click', function() {
            console.log('Users tab clicked');
            
            // Show users panel if it's not already shown
            if (window.innerWidth >= 992) {
                const tabElement = document.querySelector('button[data-bs-target="#users-panel"]');
                if (tabElement) {
                    const bsTab = new bootstrap.Tab(tabElement);
                    bsTab.show();
                }
            }
        });
    }

    // Setup chat input functionality
    const chatInput = document.querySelector('.chat-input');
    
    // Make sure sendButton is available globally
    if (!window.sendButton) {
        window.sendButton = document.querySelector('#send-button') || 
                           document.querySelector('.btn-primary[type="submit"]') || 
                           document.querySelector('button[onclick*="send"]') ||
                           document.querySelector('.send-button') ||
                           document.querySelector('[data-action="send"]');
    }

    // Send message when the send button is clicked
    if (window.sendButton) {
        // Remove any existing listeners first
        window.sendButton.removeEventListener('click', handleSendClick);
        window.sendButton.addEventListener('click', handleSendClick);
        console.log('Send button event listener added');
    } else {
        console.error('Send button not found! Check your HTML structure.');
    }
        
    // Send message when Enter key is pressed (but allow Shift+Enter for new line)
    if (chatInput) {
        chatInput.removeEventListener('keydown', handleKeyDown);
        chatInput.addEventListener('keydown', handleKeyDown);
        console.log('Chat input event listener added');
    } else {
        console.error('Chat input not found!');
    }
        
    // Auto-resize the textarea based on content and check send button state
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        const newHeight = Math.min(this.scrollHeight, 150);
        this.style.height = newHeight + 'px';
        
        // Update send button disabled state when input changes
        if (window.updateSendButtonDisabledState) {
            window.updateSendButtonDisabledState();
        }
    });

    // Initial check for send button state
    if (window.updateSendButtonDisabledState) {
        window.updateSendButtonDisabledState();
    }

    // Set up collapse toggle for conversation drawer
    const conversationsTab = document.getElementById('conversations-tab');
    if (conversationsTab) {
        conversationsTab.addEventListener('click', function() {
            const chevron = this.querySelector('.conversation-chevron');
            if (chevron) {
                chevron.classList.toggle('rotated');
            }
            
            // Show first conversation after a delay to allow drawer to open
            setTimeout(() => {
                const firstChatItem = document.querySelector('.conversation-drawer .chat-history-item');
                if (firstChatItem) {
                    // Dispatch a click event to simulate user clicking
                    firstChatItem.click();
                }
            }, 300);
        });
    }

    // Event listener for new chat button in drawer
    const newChatButton = document.querySelector('.conversation-drawer-actions .btn');
    if (newChatButton) {
        newChatButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling to collapse toggle
            
            // Show conversations panel
            showConversationsPanel();
            
            // Logic to create a new chat would go here
            console.log('Creating new chat');
            
            // On mobile, hide the sidebar
            if (window.innerWidth < 992) {
                document.querySelector('.sidebar')?.classList.remove('show');
                document.querySelector('.menu-overlay')?.classList.remove('show');
            }
        });
    }
}

// Separate functions for event handling to avoid issues with removeEventListener
function handleSendClick(e) {
    e.preventDefault();
    // Only proceed if button is not disabled
    if (window.sendButton && !window.sendButton.disabled) {
        console.log('Send button clicked - calling sendMessage()');
        sendMessage();
    }
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Only proceed if button is not disabled
        if (window.sendButton && !window.sendButton.disabled) {
            console.log('Enter key pressed - calling sendMessage()');
            sendMessage();
        }
    }
}
