import { setupMobileMenu, setupMobileChatInterface, createNewChat } from './uiUtils.js';
// import { setupCallButton } from './callUtils.js';


// Initial load
window.addEventListener('load', function() {
    // Restore the last active tab
    const activeTab = localStorage.getItem('activeTab');
    if (activeTab) {
        const tab = document.querySelector(`#${activeTab}`);
        if (tab) {
            const bsTab = new bootstrap.Tab(tab);
            bsTab.show();
        }
    }
    
    // Setup mobile menu functionality
    setupMobileMenu();
    
    // Setup mobile chat interface
    setupMobileChatInterface();

    // Setup call button functionality
    // setupCallButton();

        
    // Handle window resize
    window.addEventListener('resize', function() {
        // Adjust UI based on window size if needed
        if (window.innerWidth > 992) {
            document.body.style.overflow = '';
        }
        
        // Ensure messages are scrolled into view after resize
        scrollToLastMessage();
    });
    
    // Set up conversations drawer toggle behavior
    const conversationsDrawer = document.getElementById('conversations-drawer');
    if (conversationsDrawer) {
        conversationsDrawer.addEventListener('show.bs.collapse', function() {
            document.querySelector('.conversation-chevron')?.classList.add('rotated');
            
            // When opening the drawer, select the first conversation and show the panel
            setTimeout(() => {
                const firstChatItem = document.querySelector('.conversation-drawer .chat-history-item');
                if (firstChatItem) {
                    const chatId = firstChatItem.getAttribute('data-chat-id');
                    if (chatId) {
                        switchToChat(chatId);
                        showConversationsPanel();
                    }
                }
            }, 300); // Give more time for the drawer to open
        });
        
        conversationsDrawer.addEventListener('hide.bs.collapse', function() {
            document.querySelector('.conversation-chevron')?.classList.remove('rotated');
        });
    }
    
    // Create a hidden tab button for the conversations panel
    const hiddenTabButton = document.createElement('button');
    hiddenTabButton.setAttribute('id', 'hidden-conversations-tab-button');
    hiddenTabButton.setAttribute('data-bs-toggle', 'tab');
    hiddenTabButton.setAttribute('data-bs-target', '#conversations-panel');
    hiddenTabButton.style.display = 'none';
    document.body.appendChild(hiddenTabButton);
    
    // Add click event to conversations-tab to show the conversations panel
    const conversationsTab = document.getElementById('conversations-tab');
    if (conversationsTab) {
        // When the conversations tab is clicked, also select the first conversation
        conversationsTab.addEventListener('click', function() {
            const tabElement = document.querySelector('button[data-bs-target="#conversations-panel"]');
            if (tabElement) {
                const bsTab = new bootstrap.Tab(tabElement);
                bsTab.show();
                
                // Make sure we have a chat selected
                const firstChatItem = document.querySelector('.conversation-drawer .chat-history-item');
                if (firstChatItem) {
                    const chatId = firstChatItem.getAttribute('data-chat-id');
                    if (chatId) {
                        switchToChat(chatId);
                    }
                }
            }
        });
    }

    // Add direct click handler for chat history items at load time
    document.querySelectorAll('.chat-history-item').forEach(item => {
        item.addEventListener('click', function() {
            const chatId = this.getAttribute('data-chat-id');
            switchToChat(chatId);
            showConversationsPanel();
            
            // Log for debugging
            console.log(`Initial chat clicked: ${chatId}`);
        });
    });
    
    // Set up initial handlers for showing conversations
    // Re-use the existing conversationsTab reference from above
    if (conversationsTab) {
        // Immediate click handler for direct activation
        conversationsTab.addEventListener('click', function() {
            // Also directly show the conversations panel after a short delay
            setTimeout(() => {
                showConversationsPanel();
                
                // Select the first conversation
                const firstChatItem = document.querySelector('.conversation-drawer .chat-history-item');
                if (firstChatItem) {
                    const chatId = firstChatItem.getAttribute('data-chat-id');
                    if (chatId) {
                        switchToChat(chatId);
                    }
                }
            }, 100);
        });
    }
    
    // If we start on the conversations panel, make sure a conversation is selected
    if (window.location.hash === '#conversations-panel' || 
        localStorage.getItem('activeTab') === 'conversations-tab') {
        setTimeout(() => {
            // Select the first conversation
            const firstChatItem = document.querySelector('.conversation-drawer .chat-history-item');
            if (firstChatItem) {
                const chatId = firstChatItem.getAttribute('data-chat-id');
                if (chatId) {
                    switchToChat(chatId);
                    showConversationsPanel();
                }
            }
        }, 200);
    }
    
    // Add mutation observer to detect new messages and scroll down
    const conversationContainer = document.getElementById('conversation-container');
    if (conversationContainer) {
        const mutationObserver = new MutationObserver((mutations) => {
            if (mutations.some(mutation => mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
                // Use a short timeout to ensure DOM is fully updated
                setTimeout(() => scrollToLastMessage(), 50);
            }
        });
        
        mutationObserver.observe(conversationContainer, { 
            childList: true, 
            subtree: true 
        });
    }
    
    // Add a scroll adjustment when the input container changes height
    const chatInput = document.querySelector('.chat-input');
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            // Adjust scroll position when input container changes size
            setTimeout(() => scrollToLastMessage(), 10);
        });
    }
    
    // Make sure scroll happens after initial load
    setTimeout(() => scrollToLastMessage(), 300);
});

// Function to scroll to the last message in the chat container
export function scrollToLastMessage() {
    const container = document.getElementById('conversation-container');
    if (!container) return;
    // Scroll to bottom smoothly
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// Ensure scrollToLastMessage is called after new messages are added
const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Use a short timeout to ensure DOM is fully updated
            setTimeout(() => scrollToLastMessage(), 50);
        }
    });
});


const conversationContainer = document.getElementById('conversation-container');
// Create a debounced scroll function to reduce jitter and always scroll
let scrollTimeout = null;
const debouncedScroll = () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
            conversationContainer.scrollTop = conversationContainer.scrollHeight;
        });
    }, 50);
};

// Add event listener for new chat button
document.addEventListener('DOMContentLoaded', function() {
    const newChatBtn = document.getElementById('header-new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            createNewChat();      // sets window.newChatPending = true
            showWelcomeMessage(); // clears the UI and shows your welcome screen
        });
    }
});

function showWelcomeMessage() {
    // switch to the conversation container
    const container = document.getElementById('conversation-container');
    if (!container) return;

    // Clear existing chat
    container.innerHTML = '';

    // Create welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-container';
    welcomeDiv.innerHTML = `
        <div class="welcome-text">
            <h2>Hey am IDOLL</h2>
            <p>How can I help you today?</p>
        </div>
        <div class="recommendation-buttons">
            <button class="rec-btn" data-prompt="Help me with my homework">
                Help me with my homework
            </button>
            <button class="rec-btn" data-prompt="How tall is Big Ben?">
                How tall is Big Ben?
            </button>
            <button class="rec-btn" data-prompt="Wake me up tomorrow at 5pm">
                Wake me up tomorrow at 5pm
            </button>
        </div>
    `;

    container.appendChild(welcomeDiv);

    // Add click handlers for recommendation buttons
    const recButtons = welcomeDiv.querySelectorAll('.rec-btn');
    recButtons.forEach(button => {
        button.addEventListener('click', function() {
            const prompt = this.getAttribute('data-prompt');
            // put text into your .chat-input
            const input = document.querySelector('.chat-input');
            if (input) {
                input.value = prompt;
                input.dispatchEvent(new Event('input'));
            }
        });
    });
}

function handleRecommendationClick(prompt) {
    // Fill the input field with the selected prompt
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.value = prompt;
        messageInput.focus();
    }
    
    // Optionally auto-send the message
    // sendMessage(prompt);
}
