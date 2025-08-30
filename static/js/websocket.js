import { appendTempMessage, appendAssistantMessageContainer, showErrorNotification, formatDate } from './helpers.js';
import { scrollToLastMessage } from './uiUtils.js';
import { createChatOnServer } from './uiUtils.js';
import { upsertConversationSummary, removeConversationSummary, switchToChat } from './conversation.js';
import { playAudioFromBase64, clearAudioQueue } from './ws/audioStream.js';
import { markdownToHtml, renderButtons } from './renderHelpers.js';

// WebSocket connection management
window.wsConnection = null;
window.isConnected = false;
let reconnectAttempts = 0;
// Store current streaming message ID
let currentStreamingMessageId = null;

const maxReconnectAttempts = 5;

// Add function to update send button state
function updateSendButtonState(isGenerating) {
    const sendButton = window.sendButton;
    if (!sendButton) return;
    
    const icon = sendButton.querySelector('i');
    
    if (isGenerating) {
        // Change to stop button
        sendButton.classList.add('generating');
        sendButton.classList.remove('btn-primary');
        sendButton.classList.add('btn-danger');
        sendButton.disabled = false; // Always enable stop button
        
        if (icon) {
            icon.className = 'fas fa-stop';
        }
        sendButton.title = 'Stop generation';
        
    } else {
        // Change back to send button
        sendButton.classList.remove('generating');
        sendButton.classList.remove('btn-danger');
        sendButton.classList.add('btn-primary');
        
        if (icon) {
            icon.className = 'fa-solid fa-arrow-up';
        }
        sendButton.title = 'Send message';
        
        // Check if button should be disabled based on input content
        updateSendButtonDisabledState();
    }
}

// Add new function to check and update disabled state
function updateSendButtonDisabledState() {
    const sendButton = window.sendButton;
    const chatInput = document.querySelector('.chat-input');
    const hasImage = window.selectedImageUuid || document.querySelector('.image-preview');
    
    if (!sendButton || !chatInput) return;
    
    const hasText = chatInput.value.trim().length > 0;
    const shouldDisable = !hasText && !hasImage;
    
    sendButton.disabled = shouldDisable;
    
    // Add visual styling for disabled state
    if (shouldDisable) {
        sendButton.classList.add('disabled');
        sendButton.style.opacity = '0.5';
    } else {
        sendButton.classList.remove('disabled');
        sendButton.style.opacity = '1';
    }
}

// Export the function so it can be used elsewhere
window.updateSendButtonDisabledState = updateSendButtonDisabledState;

// Add function to handle stop generation
function stopGeneration() {
    if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
        window.wsConnection.send(JSON.stringify({
            type: 'stop_generation'
        }));
        console.log('Sent stop generation request');
    }
    
    // Reset the generating state
    window.is_generating = false;
    updateSendButtonState(false);
}

// Initialize WebSocket connection
export function initializeWebSocket() {
    const wsUrl = window.IDOLL_WS || (location.origin.replace(/^http/, 'ws') + '/ws');
    try { console.log('[IDOLL] Connecting WS to:', wsUrl); } catch {}
    
    try {
        window.wsConnection = new WebSocket(wsUrl);
        
        window.wsConnection.onopen = () => {
            console.log('WebSocket connected');
            window.isConnected = true;
            reconnectAttempts = 0;
            updateConnectionStatus(true);
            // Identify this connection for targeted events
            try {
                const uid = window.userId;
                if (uid) {
                    window.wsConnection.send(JSON.stringify({ type: 'identify', user_id: uid }));
                }
            } catch (e) {}
        };

        window.wsConnection.onmessage = evt => {
          let payload;
          try {
            payload = JSON.parse(evt.data);
          } catch (e) {
            console.error("Invalid JSON from WS", evt.data);
            return;
          }
          handleWebSocketMessage(payload);
        };

        window.wsConnection.onclose = () => {
            console.log('WebSocket disconnected');
            window.isConnected = false;
            stopLatencyMeasurement();
            updateConnectionStatus(false);
            attemptReconnect();
        };

        window.wsConnection.onerror = (error) => {
            console.error('WebSocket error:', error);
            showErrorNotification('Connection error');
        };

    } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        showErrorNotification('Failed to connect');
    }
}

// Add latency measurement variables
let pingInterval = null;
let lastPingTime = 0;
let currentLatency = 0;

// Add speed measurement variables
let uploadSpeed = 0;
let downloadSpeed = 0;
let uploadStartTime = 0;
let downloadStartTime = 0;
let uploadBytes = 0;
let downloadBytes = 0;
let speedMeasurementInterval = null;

// Add function to start latency measurement
function startLatencyMeasurement() {
    // Send ping every 5 seconds
    pingInterval = setInterval(() => {
        if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
            lastPingTime = performance.now();
            
            // Create a test payload for speed measurement
            const testPayload = {
                type: 'ping',
                timestamp: lastPingTime,
                // Add test data for upload speed measurement (1KB of data)
                testData: 'a'.repeat(1024)
            };
            
            const payloadString = JSON.stringify(testPayload);
            uploadBytes = new Blob([payloadString]).size;
            uploadStartTime = performance.now();
            
            window.wsConnection.send(payloadString);
        }
    }, 5000);
    
    // Start speed measurement reporting every 5 seconds (reduced from 10)
    speedMeasurementInterval = setInterval(() => {
        updateSpeedDisplay();
        
        // If no recent download activity, reset download speed
        const now = performance.now();
        if (downloadStartTime > 0 && (now - downloadStartTime) > 10000) { // 10 seconds of inactivity
            downloadSpeed = 0;
            downloadStartTime = 0;
            downloadBytes = 0;
            updateSpeedDisplay();
        }
    }, 5000);
}

// Add function to stop latency measurement
function stopLatencyMeasurement() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
    if (speedMeasurementInterval) {
        clearInterval(speedMeasurementInterval);
        speedMeasurementInterval = null;
    }
}

// Update the updateConnectionStatus function
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    const latencyEl = document.getElementById('latency-display');
    const speedEl = document.getElementById('speed-display');
    
    if (statusEl) {
        const icon = statusEl.querySelector('i');
        if (icon) {
            icon.className = connected ? 'fas fa-circle status-connected' : 'fas fa-circle status-disconnected';
        }
    }
    
    if (latencyEl) {
        if (connected) {
            latencyEl.textContent = currentLatency > 0 ? `${Math.round(currentLatency)} ms` : '-- ms';
        } else {
            latencyEl.textContent = '-- ms';
        }
    }
    
    if (speedEl) {
        if (connected) {
            updateSpeedDisplay();
        } else {
            speedEl.textContent = '↑ -- KB/s ↓ -- KB/s';
        }
    }
    
    // Start or stop latency measurement based on connection status
    if (connected) {
        startLatencyMeasurement();
    } else {
        stopLatencyMeasurement();
        currentLatency = 0;
        uploadSpeed = 0;
        downloadSpeed = 0;
    }
}

// Update the handleWebSocketMessage function to handle the correct message types
function handleWebSocketMessage(data) {
    console.log('🔥 WS payload:', data);

    // Measure download speed for all messages
    const messageSize = new Blob([JSON.stringify(data)]).size;
    const now = performance.now();
    
    // Initialize download measurement if not started
    if (downloadStartTime === 0) {
        downloadStartTime = now;
        downloadBytes = messageSize;
    } else {
        downloadBytes += messageSize;
        
        // Calculate download speed every few seconds or when we have enough data
        const downloadDuration = (now - downloadStartTime) / 1000; // Convert to seconds
        if (downloadDuration >= 1.0) { // Calculate every 1 second minimum
            downloadSpeed = (downloadBytes / downloadDuration) / 1024; // Convert to KB/s
            console.log(`Download speed calculated: ${downloadSpeed.toFixed(2)} KB/s`);
            
            // Reset for next measurement cycle
            downloadStartTime = now;
            downloadBytes = messageSize;
            
            // Update display immediately
            updateSpeedDisplay();
        }
    }

    switch (data.type) {
        case 'pong':
            // Calculate latency from ping-pong
            if (data.timestamp && data.timestamp === lastPingTime) {
                currentLatency = now - lastPingTime; // in milliseconds
                updateLatencyDisplay();
                
                // Calculate upload speed (bytes per second)
                const uploadDuration = (now - uploadStartTime) / 1000; // Convert to seconds
                if (uploadDuration > 0) {
                    uploadSpeed = (uploadBytes / uploadDuration) / 1024; // Convert to KB/s
                    console.log(`Upload speed calculated: ${uploadSpeed.toFixed(2)} KB/s`);
                }
                
                // Update display
                updateSpeedDisplay();
            }
            break;

        case 'stt_transcription':
            // Handle speech-to-text transcription
            const messageInput = document.querySelector('.chat-input');
            if (messageInput && data.text) {
                // Append to existing text or replace if empty
                const currentText = messageInput.value.trim();
                messageInput.value = currentText ? currentText + ' ' + data.text : data.text;
                // Focus the input for user convenience
                messageInput.focus();
            }
            break;
            
        case 'audio_response_chunk':
            // Handle text-to-speech audio and streaming text
            if (data.audio_data) {
                playAudioFromBase64(data.audio_data);
            }
            if (data.text && currentStreamingMessageId) {
                appendStreamingText(currentStreamingMessageId, data.text, data.tags);
            }
            break;
            
        case 'llm_response_chunk':
            // Handle incremental text chunks - this is what we're receiving!
            console.log('Processing LLM response chunk:', data.text);
            
            // If we don't have a streaming message ID yet, create one
            if (!currentStreamingMessageId) {
                currentStreamingMessageId = 'assistant-' + Date.now();
                console.log('Creating new streaming message container:', currentStreamingMessageId);
                appendAssistantMessageContainer(currentStreamingMessageId);
            }
            
            // Add the text chunk to the streaming message
            if (data.text) {
                appendStreamingText(currentStreamingMessageId, data.text, data.tags);
            }
            
            // Check if this is the final chunk
            if (data.full_response || data.finished) {
                console.log('Final LLM Response received');
                handleLLMResponse(data);
            } else if (data.is_final || data.done || data.end) {
                // Handle other possible end-of-stream indicators
                console.log('Stream ended, finalizing response');
                handleLLMResponse(data);
            }
            break;
            
        case 'stream_start':
            console.log('→ stream_start, message_id=', data.message_id);
            // create the empty assistant‐message container in the DOM
            appendAssistantMessageContainer(data.message_id);
            currentStreamingMessageId = data.message_id;
            break;

        case 'stream_token':
            console.log('→ stream_token, token=', data.token);
            // make sure this matches your helper's signature
            appendStreamingText(currentStreamingMessageId, data.token);
            break;

        case 'stream_end':
            console.log('→ stream_end');
            // final wrap-up (e.g. stop spinner, persist, etc.)
            handleLLMResponse(data);
            break;

        case 'conversation_created':
        case 'conversation_updated':
            if (data.summary) {
                upsertConversationSummary(data.summary);
            }
            break;
        case 'conversation_deleted':
            if (data.summary && data.summary.id) {
                removeConversationSummary(data.summary.id);
            } else if (data.id) {
                removeConversationSummary(data.id);
            }
            break;
            
        default:
            console.warn('Unhandled WS type:', data.type);
    }
}

// Reconnection logic
function attemptReconnect() {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
            initializeWebSocket();
        }, 1000 * reconnectAttempts);
    }
}

// Add function to update speed display
function updateSpeedDisplay() {
    const speedEl = document.getElementById('speed-display');
    if (speedEl && window.isConnected) {
        const upSpeed = uploadSpeed > 0 ? uploadSpeed.toFixed(1) : '--';
        const downSpeed = downloadSpeed > 0 ? downloadSpeed.toFixed(1) : '--';
        speedEl.textContent = `↑ ${upSpeed} KB/s ↓ ${downSpeed} KB/s`;
        console.log(`Speed display updated: ↑ ${upSpeed} KB/s ↓ ${downSpeed} KB/s`);
    }
}

// Add function to update latency display
function updateLatencyDisplay() {
    const latencyEl = document.getElementById('latency-display');
    if (latencyEl && window.isConnected) {
        latencyEl.textContent = `${Math.round(currentLatency)} ms`;
    }
}

// Modified sendMessage function to not create assistant container here since we do it in the message handler
export function sendMessage() {
    const messageInput = document.querySelector('.chat-input');
    const message = messageInput.value.trim();
    
    // if we just hit "New Chat" and are about to send the first message …
    if (window.newChatPending) {
        window.newChatPending = false;          // clear the flag
        createChatOnServer(message);            // -> this will set window.currentChatId for us
        return;                                 // bail out of the normal WS send
    }

    console.log('sendMessage called, is_generating:', window.is_generating);
    
    // Check if currently generating - if so, stop instead of send
    if (window.is_generating) {
        console.log('Currently generating, stopping...');
        stopGeneration();
        return;
    }

    console.log('Starting new message send...');
    window.is_generating = true;
    updateSendButtonState(true);

    const preview = document.querySelector('.image-preview');

    console.log('Message to send:', message);

    // If a new chat was prepared, create it on server with this first message
    if (window.newChatPending) {
        window.newChatPending = false;
        console.log('Sending initial message to create new chat');
        createChatOnServer(message);
        window.is_generating = false;
        updateSendButtonState(false);
        return;
    }

    // Check if there's a selected image from input_box.js
    const selectedImageUuid = window.selectedImageUuid || null;

    if (!message && !selectedImageUuid) {
        console.log('No message or image to send');
        window.is_generating = false;
        updateSendButtonState(false);
        return;
    }

    // Check WebSocket connection
    if (!window.isConnected) {
        console.log('WebSocket not connected');
        showErrorNotification('Not connected to server. Please wait for reconnection.');
        window.is_generating = false;
        updateSendButtonState(false);
        return;
    }

    // Clear the input field
    messageInput.value = '';

    // Show a temporary message in the UI while we wait for the response
    const tempMessageId = 'temp-' + Date.now();
    appendTempMessage(message, tempMessageId, selectedImageUuid);

    // Reset the current streaming message ID - will be created when we receive the first chunk
    currentStreamingMessageId = null;

    try {
        // Build conversation history for LLM
        const history = buildConversationHistory(message);
        
        // Prepare images array if image is selected
        let images = null;
        if (selectedImageUuid) {
            images = [selectedImageUuid];
        }

        // Send LLM request via WebSocket
        const request = {
            type: 'llm_request',
            history: history,
            images: images,
        };

        console.log('Sending WebSocket request:', request);
        
        // Measure upload speed for message sending
        const messagePayload = JSON.stringify(request);
        const messageSize = new Blob([messagePayload]).size;
        const sendStartTime = performance.now();
        
        window.wsConnection.send(messagePayload);
        
        // Calculate instantaneous upload speed
        const sendDuration = (performance.now() - sendStartTime) / 1000;
        if (sendDuration > 0) {
            const instantUploadSpeed = (messageSize / sendDuration) / 1024; // KB/s
            // Use exponential moving average to smooth the speed calculation
            uploadSpeed = uploadSpeed === 0 ? instantUploadSpeed : (uploadSpeed * 0.7 + instantUploadSpeed * 0.3);
            updateSpeedDisplay();
        }
        
        // Save message if we have the necessary variables
        if (typeof window.userId !== 'undefined' && typeof window.currentChatId !== 'undefined') {
            saveMessage('user', message);
        } else {
            console.warn('userId or currentChatId not available for saving message');
        }

        // Update the temporary message to show it was sent successfully
        const tempMessage = document.getElementById(tempMessageId);
        if (tempMessage) {
            const statusElement = tempMessage.querySelector('.message-status');
            if (statusElement) {
                statusElement.textContent = '';
                statusElement.classList.add('sent');
            }

            // Update the timestamp with the current time
            const timestampElement = tempMessage.querySelector('.message-timestamp');
            if (timestampElement) {
                const currentTime = new Date();
                timestampElement.textContent = formatDate(currentTime);
            }
        }

    } catch (error) {
        console.error('Error sending message:', error);
        showErrorNotification('Failed to send message');
        document.getElementById(tempMessageId)?.remove();
        currentStreamingMessageId = null;
        window.is_generating = false;
        updateSendButtonState(false);
    } finally {
        // always cleanup
        window.selectedImageUuid = null;
        if (preview) preview.remove();
    }
}

// Build conversation history for LLM request
function buildConversationHistory(currentMessage) {
    // Get existing conversation messages from the DOM or a stored array
    const messages = [];
    
    // Add previous messages from conversation
    const messageElements = document.querySelectorAll('.message');
    messageElements.forEach(element => {
        const isUser = element.classList.contains('user-message');
        const content = element.querySelector('.message-content')?.textContent || '';
        
        if (content.trim()) {
            messages.push({
                role: isUser ? 'user' : 'assistant',
                content: content.trim()
            });
        }
    });
    
    // Add the current message
    messages.push({
        role: 'user',
        content: currentMessage
    });
    
    return messages;
}

// Handle streaming text updates
function appendStreamingText(messageId, text, tags = null) {
    console.log(`Appending chunk [${messageId}]:`, text);
    
    const messageContainer = document.getElementById(messageId);
    if (!messageContainer) {
        console.error(`Message container not found: ${messageId}`);
        return;
    }
    const contentElement = messageContainer.querySelector('.message-content');
    if (!contentElement) {
        console.error(`Content element not found in container: ${messageId}`);
        return;
    }

    // Store scroll position
    const convo = document.getElementById('conversation-container');
    const atBottom = convo ? 
        (convo.scrollHeight - convo.clientHeight <= convo.scrollTop + 100) : true;

    // accumulate and render from raw markdown
    let raw = messageContainer.dataset.rawMarkdown || '';
    raw += text;
    messageContainer.dataset.rawMarkdown = raw;
    
    // Convert markdown to HTML and render
    contentElement.innerHTML = markdownToHtml(raw);
    console.log(`Updated content for ${messageId}, total length: ${raw.length}`);


    if (atBottom) {
        requestAnimationFrame(() => {
            if (convo) {
                convo.scrollTop = convo.scrollHeight;
            }
        });
    }
}

// Handle final LLM response
function handleLLMResponse(data) {
    const messageContainer = document.getElementById(currentStreamingMessageId);
    if (!messageContainer) {
        console.error(`Message container not found: ${currentStreamingMessageId}`);
        return;
    }
    const contentElement = messageContainer.querySelector('.message-content');
    if (!contentElement) {
        console.error(`Content element not found in container: ${currentStreamingMessageId}`);
        return;
    }
    
    const response = data.full_response || messageContainer.dataset.rawMarkdown || 'Something went wrong, I didnt get the full response.';
    
    // Save message if we have the necessary variables
    if (typeof window.userId !== 'undefined' && typeof window.currentChatId !== 'undefined') {
        saveMessage('assistant', response);
    }

    // Render final response with proper markdown conversion
    contentElement.innerHTML = markdownToHtml(response);
    
    // Store the answer in the dataset for button functionality
    messageContainer.dataset.rawMarkdown = response;

    // Check if buttons already exist to avoid duplicates
    const existingButtons = messageContainer.querySelector('.under-message-buttons');
    if (!existingButtons) {
        // Add under-message buttons using the renderButtons function
        const timestamp = data.timestamp || formatDate(new Date());
        const buttonsHTML = renderButtons(response, timestamp, 'assistant');
        
        // Find the message element to append buttons to
        const messageElement = messageContainer.querySelector('.message');
        if (messageElement) {
            messageElement.innerHTML += buttonsHTML;
        }
    }

    // Clear current streaming message ID
    currentStreamingMessageId = null;

    // Reset generation state and update button
    window.is_generating = false;
    updateSendButtonState(false);

    // Final scroll to bottom
    setTimeout(() => {
        scrollToLastMessage();
    }, 100);
}

// helper to persist a message via REST
async function saveMessage(role, content) {
    // Check if required variables exist
    if (typeof window.userId === 'undefined' || typeof window.currentChatId === 'undefined') {
        console.warn('Cannot save message: userId or currentChatId not defined');
        return;
    }
    
    const time_stamp = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }) + ' ' + new Date().toLocaleTimeString('en-US', { 
        hour12: false 
    });
    const images = window.selectedImageUuid ? [window.selectedImageUuid] : null;
    const payload = { role, content, images, time_stamp };
    const base = (window.IDOLL_API_BASE || '/api').replace(/\/$/, '');
    const url = `${base}/add_message/${window.userId}/${window.currentChatId}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) console.error('Save message failed:', json);
    } catch (err) {
        console.error('Could not reach save_message API:', err);
    }
}

// Make clearAudioQueue available globally for audio_helpers.js
window.clearAudioQueue = clearAudioQueue;

export function sendVadAudio(base64Audio) {
    if (window.isConnected && window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
        window.wsConnection.send(JSON.stringify({
            type: 'vad_audio',
            audio_data: base64Audio
        }));
        console.log('Sent VAD audio data');
    } else {
        console.error('WebSocket is not connected. Cannot send VAD audio data.');
        showErrorNotification('WebSocket is not connected. Cannot send VAD audio data.');
    }
}
