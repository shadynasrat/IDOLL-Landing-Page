import { loadChatHistory, loadConversation, switchToChat, showConversationsPanel } from './js/conversation.js';
import { initializeWebSocket } from './js/websocket.js';
import { setupCallButton } from './js/callUtils.js';
import {
  setupScrollObserver,
  copyToClipboard,
  setupMobileChatInterface
} from './js/uiUtils.js';
import './js/chat.js';
import { toggleTheme } from './js/helpers.js';
import { initializeUserSideTab } from './js/users.js';
import { inputBox_functions } from './js/input_box.js';
import { PlaySound } from './js/audio_helpers.js';
import { markdownToHtml } from './js/renderHelpers.js';


function initIdollApp() {
    const currentChatId = window.currentChatId || 'default_chat';
    const userId        = window.userId || 'default_user';

    window.sendButton = document.getElementById('send-message-btn');
    window.is_generating = false;
    window.PlaySound = PlaySound;


    // expose userId for conversation.js
    window.userId = userId;
    window.currentChatId = currentChatId;

  setupScrollObserver();
  // Load chat history; it will auto-select a chat or show welcome
  loadChatHistory();
  initializeWebSocket();
  setupMobileChatInterface();
  initializeUserSideTab();
    setupCallButton();
    inputBox_functions(); 

    const burgerBtn = document.getElementById('burger-menu-btn');
    const closeBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-nav-menu');

    // Desktop sidebar: restore saved state (default open on desktop)
    try {
        const savedSidebar = localStorage.getItem('sidebarOpen');
        if (window.innerWidth >= 1024) {
            if (savedSidebar === null) {
                document.body.classList.add('sidebar-open');
            } else if (savedSidebar === '1') {
                document.body.classList.add('sidebar-open');
            } else {
                document.body.classList.remove('sidebar-open');
            }
        } else {
            document.body.classList.remove('sidebar-open');
        }
    } catch {}

    // Keep sidebar state sensible on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth < 1024) {
            document.body.classList.remove('sidebar-open');
        } else {
            // keep whatever state user chose previously
            const savedSidebar = localStorage.getItem('sidebarOpen');
            if (savedSidebar === '1') document.body.classList.add('sidebar-open');
        }
    });


    
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const rect = this.getBoundingClientRect();
            
            // Calculate position
            const left = rect.left + (rect.width / 2);
            const top = rect.top + 40; // 10px above the element
            
            // Set CSS custom properties for positioning
            this.style.setProperty('--tooltip-left', left + 'px');
            this.style.setProperty('--tooltip-top', top + 'px');
        });
    });



    // Directly add click handlers to ensure functionality
    if (burgerBtn) {
        burgerBtn.addEventListener('click', function(ev) {
            // Use the same dynamic sidebar for both desktop and mobile
            ev.stopPropagation();
            document.body.classList.toggle('sidebar-open');
            try { localStorage.setItem('sidebarOpen', document.body.classList.contains('sidebar-open') ? '1' : '0'); } catch {}
            
            // On mobile, also handle body overflow for better UX
            if (window.innerWidth < 1024) {
                if (document.body.classList.contains('sidebar-open')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            }
        });

        document.addEventListener('click', function(event) {
            // Close sidebar when clicking outside on any screen size
            const conversationDrawer = document.querySelector('.conversation-drawer');
            if (conversationDrawer && !conversationDrawer.contains(event.target) && !burgerBtn.contains(event.target)) {
                document.body.classList.remove('sidebar-open');
                document.body.style.overflow = '';
                try { localStorage.setItem('sidebarOpen', '0'); } catch {}
            }
        });
    }
    
    // Close button is no longer needed since we use the dynamic drawer
    // if(closeBtn) {
    //     closeBtn.addEventListener('click', function() {
    //         mobileMenu.classList.remove('active');
    //         document.body.style.overflow = '';
    //     });
    // }


    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            toggleTheme();
        });
    }

    // Do not force-load a conversation here; loadChatHistory will handle selection
}

// Run immediately if the DOM is already parsed (dynamic imports may occur after DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIdollApp);
} else {
  initIdollApp();
}



// expose for inline onclicks
window.loadConversation   = loadConversation;
window.switchToChat       = switchToChat;
window.copyToClipboard    = copyToClipboard;
window.markdownToHtml     = markdownToHtml;
window.showConversationsPanel = showConversationsPanel;
