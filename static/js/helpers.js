import { scrollToLastMessage } from './uiUtils.js';

// Theme handling
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.setAttribute('data-theme', themeName);
}

export function toggleTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        setTheme('light');
    } else {
        setTheme('dark');
    }
}

// Initialize theme
(function() {
    if (localStorage.getItem('theme') === 'dark') {
        setTheme('dark');
        document.getElementById('theme-toggle-btn').checked = true;
    } else {
        setTheme('light');
        document.getElementById('theme-toggle-btn').checked = false;
    }
})();





// Function to format date
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Helper function to update tab badges
function updateTabBadge(tabId, count) {
    const tab = document.getElementById(tabId);
    
    if (!tab) {
        console.log(`Tab element with ID ${tabId} not found, skipping badge update`);
        return;
    }
    
    // Remove existing badge if there is one
    const existingBadge = tab.querySelector('.tab-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add new badge
    const badge = document.createElement('span');
    badge.className = 'tab-badge';
    badge.textContent = count;
    tab.appendChild(badge);
}

// Function to append an empty assistant message container for streaming
export function appendAssistantMessageContainer(messageId) {
    const conversationContainer = document.getElementById('conversation-container');
    const messageHtml = `
        <div class="message-group" id="${messageId}">
            <div class="message assistant-message">
                <div class="message-content markdown-content"></div>
            </div>
        </div>
    `;
    
    conversationContainer.innerHTML += messageHtml;
    
    // Initialize the raw markdown buffer
    const messageContainer = document.getElementById(messageId);
    if (messageContainer) {
        messageContainer.dataset.rawMarkdown = '';
        console.log(`Initialized message container: ${messageId}`);
    }
    
    scrollToLastMessage();
    
    // Scroll to the new message with smooth behavior
    const newMessage = document.getElementById(messageId);
    if (newMessage) {
        requestAnimationFrame(() => {
            newMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
            
            // Add a subtle entrance animation
            setTimeout(() => {
                newMessage.style.opacity = '1';
                newMessage.style.transform = 'translateY(0)';
            }, 50);
        });
    }
}


// Function to show notification
export function showErrorNotification(message) {
    // Simple notification display
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}


// Function to append a temporary user message
export function appendTempMessage(message, tempId, selectedImage) {
    const conversationContainer = document.getElementById('conversation-container');

    // get current time
    const date = new Date();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const current_time = `${weekday} ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    // TODO: Current time for all timestamps should be comming from the clinet 

    let messageHtml = `
        <div class="message-group" id="${tempId}">
            <div class="message user-message">`


    if (selectedImage) {
        messageHtml += `
        <div class="user-image-grid">
            <div class="message-image">
                <img src="${selectedImage}" alt="Uploaded Image">
            </div>
        </div>`;
    }
    
                

    messageHtml += `
                <div class="message-content markdown-content">
                    ${message}
                </div>
        <div class="under-message-buttons">
            <button class="message-button" onclick="copyToClipboard('${message}')" data-tooltip="Copy to clipboard">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md-heavy"><path fill-rule="evenodd" clip-rule="evenodd" d="M7 5C7 3.34315 8.34315 2 10 2H19C20.6569 2 22 3.34315 22 5V14C22 15.6569 20.6569 17 19 17H17V19C17 20.6569 15.6569 22 14 22H5C3.34315 22 2 20.6569 2 19V10C2 8.34315 3.34315 7 5 7H7V5ZM9 7H14C15.6569 7 17 8.34315 17 10V15H19C19.5523 15 20 14.5523 20 14V5C20 4.44772 19.5523 4 19 4H10C9.44772 4 9 4.44772 9 5V7ZM5 9C4.44772 9 4 9.44772 4 10V19C4 19.5523 4.44772 20 5 20H14C14.5523 20 15 19.5523 15 19V10C15 9.44772 14.5523 9 14 9H5Z" fill="currentColor"></path></svg>
            </button>
            <button class="message-button" onclick="PlaySound(event)" data-tooltip="Read aloud">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md-heavy"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.9099C11 4.47485 10.4828 4.24734 10.1621 4.54132L6.67572 7.7372C6.49129 7.90626 6.25019 8.00005 6 8.00005H4C3.44772 8.00005 3 8.44776 3 9.00005V15C3 15.5523 3.44772 16 4 16H6C6.25019 16 6.49129 16.0938 6.67572 16.2629L10.1621 19.4588C10.4828 19.7527 11 19.5252 11 19.0902V4.9099ZM8.81069 3.06701C10.4142 1.59714 13 2.73463 13 4.9099V19.0902C13 21.2655 10.4142 22.403 8.81069 20.9331L5.61102 18H4C2.34315 18 1 16.6569 1 15V9.00005C1 7.34319 2.34315 6.00005 4 6.00005H5.61102L8.81069 3.06701ZM20.3166 6.35665C20.8019 6.09313 21.409 6.27296 21.6725 6.75833C22.5191 8.3176 22.9996 10.1042 22.9996 12.0001C22.9996 13.8507 22.5418 15.5974 21.7323 17.1302C21.4744 17.6185 20.8695 17.8054 20.3811 17.5475C19.8927 17.2896 19.7059 16.6846 19.9638 16.1962C20.6249 14.9444 20.9996 13.5175 20.9996 12.0001C20.9996 10.4458 20.6064 8.98627 19.9149 7.71262C19.6514 7.22726 19.8312 6.62017 20.3166 6.35665ZM15.7994 7.90049C16.241 7.5688 16.8679 7.65789 17.1995 8.09947C18.0156 9.18593 18.4996 10.5379 18.4996 12.0001C18.4996 13.3127 18.1094 14.5372 17.4385 15.5604C17.1357 16.0222 16.5158 16.1511 16.0539 15.8483C15.5921 15.5455 15.4632 14.9255 15.766 14.4637C16.2298 13.7564 16.4996 12.9113 16.4996 12.0001C16.4996 10.9859 16.1653 10.0526 15.6004 9.30063C15.2687 8.85905 15.3578 8.23218 15.7994 7.90049Z" fill="currentColor"></path></svg>
            </button>
            <button class="message-button" onclick="" data-tooltip="Good response">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md-heavy"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.1318 2.50389C12.3321 2.15338 12.7235 1.95768 13.124 2.00775L13.5778 2.06447C16.0449 2.37286 17.636 4.83353 16.9048 7.20993L16.354 8.99999H17.0722C19.7097 8.99999 21.6253 11.5079 20.9313 14.0525L19.5677 19.0525C19.0931 20.7927 17.5124 22 15.7086 22H6C4.34315 22 3 20.6568 3 19V12C3 10.3431 4.34315 8.99999 6 8.99999H8C8.25952 8.99999 8.49914 8.86094 8.6279 8.63561L12.1318 2.50389ZM10 20H15.7086C16.6105 20 17.4008 19.3964 17.6381 18.5262L19.0018 13.5262C19.3488 12.2539 18.391 11 17.0722 11H15C14.6827 11 14.3841 10.8494 14.1956 10.5941C14.0071 10.3388 13.9509 10.0092 14.0442 9.70591L14.9932 6.62175C15.3384 5.49984 14.6484 4.34036 13.5319 4.08468L10.3644 9.62789C10.0522 10.1742 9.56691 10.5859 9 10.8098V19C9 19.5523 9.44772 20 10 20ZM7 11V19C7 19.3506 7.06015 19.6872 7.17071 20H6C5.44772 20 5 19.5523 5 19V12C5 11.4477 5.44772 11 6 11H7Z" fill="currentColor"></path></svg>
            </button>
            <button class="message-button" onclick="" data-tooltip="Bad response">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md-heavy"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.8727 21.4961C11.6725 21.8466 11.2811 22.0423 10.8805 21.9922L10.4267 21.9355C7.95958 21.6271 6.36855 19.1665 7.09975 16.7901L7.65054 15H6.93226C4.29476 15 2.37923 12.4921 3.0732 9.94753L4.43684 4.94753C4.91145 3.20728 6.49209 2 8.29589 2H18.0045C19.6614 2 21.0045 3.34315 21.0045 5V12C21.0045 13.6569 19.6614 15 18.0045 15H16.0045C15.745 15 15.5054 15.1391 15.3766 15.3644L11.8727 21.4961ZM14.0045 4H8.29589C7.39399 4 6.60367 4.60364 6.36637 5.47376L5.00273 10.4738C4.65574 11.746 5.61351 13 6.93226 13H9.00451C9.32185 13 9.62036 13.1506 9.8089 13.4059C9.99743 13.6612 10.0536 13.9908 9.96028 14.2941L9.01131 17.3782C8.6661 18.5002 9.35608 19.6596 10.4726 19.9153L13.6401 14.3721C13.9523 13.8258 14.4376 13.4141 15.0045 13.1902V5C15.0045 4.44772 14.5568 4 14.0045 4ZM17.0045 13V5C17.0045 4.64937 16.9444 4.31278 16.8338 4H18.0045C18.5568 4 19.0045 4.44772 19.0045 5V12C19.0045 12.5523 18.5568 13 18.0045 13H17.0045Z" fill="currentColor"></path></svg>
            </button>
            <button class="message-button" onclick="" data-tooltip="Regenerate response">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-md"><path d="M3.06957 10.8763C3.62331 6.43564 7.40967 3 12 3C14.2824 3 16.4028 3.85067 18.0118 5.25439V4C18.0118 3.44772 18.4595 3 19.0118 3C19.5641 3 20.0118 3.44772 20.0118 4V8C20.0118 8.55228 19.5641 9 19.0118 9H15C14.4477 9 14 8.55228 14 8C14 7.44772 14.4477 7 15 7H16.9571C15.6757 5.76379 13.9101 5 12 5C8.43108 5 5.48466 7.67174 5.0542 11.1237C4.98586 11.6718 4.48619 12.0607 3.93815 11.9923C3.39011 11.924 3.00123 11.4243 3.06957 10.8763ZM20.0618 12.0077C20.6099 12.076 20.9988 12.5757 20.9304 13.1237C20.3767 17.5644 16.5903 21 12 21C9.72322 21 7.60762 20.1535 5.99999 18.7559V20C5.99999 20.5523 5.55228 21 4.99999 21C4.44771 21 3.99999 20.5523 3.99999 20V16C3.99999 15.4477 4.44771 15 4.99999 15H8.99999C9.55228 15 9.99999 15.4477 9.99999 16C9.99999 16.5523 9.55228 17 8.99999 17H7.04285C8.32433 18.2362 10.0899 19 12 19C15.5689 19 18.5153 16.3283 18.9458 12.8763C19.0141 12.3282 19.5138 11.9393 20.0618 12.0077Z" fill="currentColor"></path></svg>
            </button>
        </div>
        <span class="message-timestamp">${current_time||'Just now'}</span>
        `;

    

    conversationContainer.innerHTML += messageHtml;
    scrollToLastMessage();
}


// Update the renderStreamingText function to handle chunk display consistently
function renderStreamingText(contentElement, accumulatedText, previousLength) {
    const newText = accumulatedText.substring(previousLength);

    // Create a span for the new text with fade-in effect
    const fadeInSpan = document.createElement('span');
    fadeInSpan.innerHTML = typeof markdownToHtml === 'function' ? markdownToHtml(newText) : newText;
    fadeInSpan.style.opacity = '0';
    fadeInSpan.style.transition = 'opacity 0.5s ease-in';

    // Append the new span to the content element
    contentElement.appendChild(fadeInSpan);

    // Trigger the fade-in effect
    requestAnimationFrame(() => {
        fadeInSpan.style.opacity = '1';
    });
}
