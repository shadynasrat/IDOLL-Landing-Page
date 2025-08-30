import { loadChatHistory, loadConversation, switchToChat } from './js/conversation.js';
import { initializeWebSocket } from './js/websocket.js';
import { setupCallButton } from './js/callUtils.js';
import {
  setupScrollObserver,
  setupMobileMenu,
  copyToClipboard,
  setupMobileChatInterface
} from './js/uiUtils.js';
import './js/chat.js';
import { toggleTheme } from './js/helpers.js';
import { initializeUserSideTab } from './js/users.js';
import { inputBox_functions } from './js/input_box.js';
import { PlaySound } from './js/audio_helpers.js';
import { markdownToHtml } from './js/renderHelpers.js';


document.addEventListener('DOMContentLoaded', () => {
    let currentChatId = 'default_chat';
    let userId        = 'default_user';

    window.sendButton = document.getElementById('send-message-btn');
    window.is_generating = false;
    window.PlaySound = PlaySound;


    // expose userId for conversation.js
    window.userId = userId;
    window.currentChatId = currentChatId;

    setupScrollObserver();
    setupMobileMenu();
    loadChatHistory();
    initializeWebSocket();
    setupMobileChatInterface();
    initializeUserSideTab();
    setupCallButton();
    inputBox_functions(); 

    const burgerBtn = document.getElementById('burger-menu-btn');
    const closeBtn = document.getElementById('close-menu-btn');
    const mobileMenu = document.getElementById('mobile-nav-menu');


    
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
            burgerBtn.addEventListener('click', function() {
                    console.log("Burger button clicked (inline)");
                    mobileMenu.classList.add('active');
                    document.body.style.overflow = 'hidden';
            });

            document.addEventListener('click', function(event) {
                    if (!mobileMenu.contains(event.target) && !burgerBtn.contains(event.target)) {
                            mobileMenu.classList.remove('active');
                            document.body.style.overflow = '';
                    }
            });
    }
    
    if(closeBtn) {
        closeBtn.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }


    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            toggleTheme();
        });
    }

    // Initialize chat history on page load
    loadChatHistory();
    
    // Load initial conversation (default)
    loadConversation(currentChatId);
});



// expose for inline onclicks
window.loadConversation   = loadConversation;
window.switchToChat       = switchToChat;
window.copyToClipboard    = copyToClipboard;
window.markdownToHtml     = markdownToHtml;




