// Unlock audio on mobile browsers
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Configure audio context for ambient playback (works with silent mode)
async function configureAudioForMobile() {
    try {
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // For iOS: Use AudioContext with specific settings that work with silent mode
        // This needs to be done after user interaction
        return true;
    } catch (error) {
        console.error('Failed to configure audio for mobile:', error);
        return false;
    }
}

// Resume audio context on first touch (iOS/Android unlock)
document.body.addEventListener('touchstart', async () => {
    await configureAudioForMobile();
}, { once: true });

// Also try on any click
document.body.addEventListener('click', async () => {
    await configureAudioForMobile();
}, { once: true });

// Track currently playing audio and associated button
let currentAudioElement = null;
let currentPlayButton = null;

// Function to update play button appearance
function updatePlayButtonState(button, isPlaying) {
    const svg = button.querySelector('svg');
    if (isPlaying) {
        // Change to stop icon - fixed SVG
        svg.innerHTML = '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle><rect x="8" y="8" width="8" height="8" fill="currentColor" rx="1"></rect>';
        button.title = 'Stop audio';
    } else {
        // Change back to play icon
        svg.innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M11 4.9099C11 4.47485 10.4828 4.24734 10.1621 4.54132L6.67572 7.7372C6.49129 7.90626 6.25019 8.00005 6 8.00005H4C3.44772 8.00005 3 8.44776 3 9.00005V15C3 15.5523 3.44772 16 4 16H6C6.25019 16 6.49129 16.0938 6.67572 16.2629L10.1621 19.4588C10.4828 19.7527 11 19.5252 11 19.0902V4.9099ZM8.81069 3.06701C10.4142 1.59714 13 2.73463 13 4.9099V19.0902C13 21.2655 10.4142 22.403 8.81069 20.9331L5.61102 18H4C2.34315 18 1 16.6569 1 15V9.00005C1 7.34319 2.34315 6.00005 4 6.00005H5.61102L8.81069 3.06701ZM20.3166 6.35665C20.8019 6.09313 21.409 6.27296 21.6725 6.75833C22.5191 8.3176 22.9996 10.1042 22.9996 12.0001C22.9996 13.8507 22.5418 15.5974 21.7323 17.1302C21.4744 17.6185 20.8695 17.8054 20.3811 17.5475C19.8927 17.2896 19.7059 16.6846 19.9638 16.1962C20.6249 14.9444 20.9996 13.5175 20.9996 12.0001C20.9996 10.4458 20.6064 8.98627 19.9149 7.71262C19.6514 7.22726 19.8312 6.62017 20.3166 6.35665ZM15.7994 7.90049C16.241 7.5688 16.8679 7.65789 17.1995 8.09947C18.0156 9.18593 18.4996 10.5379 18.4996 12.0001C18.4996 13.3127 18.1094 14.5372 17.4385 15.5604C17.1357 16.0222 16.5158 16.1511 16.0539 15.8483C15.5921 15.5455 15.4632 14.9255 15.766 14.4637C16.2298 13.7564 16.4996 12.9113 16.4996 12.0001C16.4996 10.9859 16.1653 10.0526 15.6004 9.30063C15.2687 8.85905 15.3578 8.23218 15.7994 7.90049Z" fill="currentColor"></path>';
        button.title = 'Play audio';
    }
}

// Function to stop current audio playback
function stopCurrentAudio() {
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
    }
    
    if (currentPlayButton) {
        updatePlayButtonState(currentPlayButton, false);
        currentPlayButton = null;
    }
    
    // Clear audio queue from websocket.js
    if (window.clearAudioQueue) {
        window.clearAudioQueue();
    }
    
    // Send stop request through WebSocket if connected
    if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
        window.wsConnection.send(JSON.stringify({
            type: 'stop_audio'
        }));
    }
}

// Function to play text-to-speech for a single message
export function PlaySound(event) {
    const button = event.target.closest('.message-button');
    
    // If this button is currently playing, stop it
    if (currentPlayButton === button) {
        stopCurrentAudio();
        return;
    }
    
    // Stop any currently playing audio
    if (currentAudioElement || currentPlayButton) {
        stopCurrentAudio();
    }
    
    const msgEl = event.target.closest('.message');
    const txt = msgEl?.querySelector('.message-content')?.textContent || '';
    if (!txt) return;
    
    // Update button to show stop state
    currentPlayButton = button;
    updatePlayButtonState(button, true);
    
    // Ensure audio context is ready for mobile
    configureAudioForMobile().then(() => {
        // Send TTS request through WebSocket instead of HTTP fetch
        if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
            const message = {
                'type': 'tts_request',
                'text': txt,
            };
            window.wsConnection.send(JSON.stringify(message));
        } else {
            console.error('WebSocket not available for TTS request');
            // Enhanced fallback to speechSynthesis for mobile
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(txt);
                
                // Mobile-specific speech synthesis settings
                utterance.volume = 1.0;
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                
                utterance.onend = () => {
                    updatePlayButtonState(button, false);
                    currentPlayButton = null;
                };
                utterance.onerror = () => {
                    updatePlayButtonState(button, false);
                    currentPlayButton = null;
                };
                
                // For mobile: ensure speech synthesis works with silent mode
                window.speechSynthesis.cancel(); // Clear any pending speech
                window.speechSynthesis.speak(utterance);
            } else {
                updatePlayButtonState(button, false);
                currentPlayButton = null;
            }
        }
    });
}

// Export function to handle audio completion (called from websocket.js)
export function handleAudioPlaybackComplete() {
    if (currentPlayButton) {
        updatePlayButtonState(currentPlayButton, false);
        currentPlayButton = null;
    }
    currentAudioElement = null;
}

// Export function to set current audio element (called from websocket.js)
export function setCurrentAudioElement(audioElement) {
    currentAudioElement = audioElement;
    
    // Add event listeners to ensure icon resets when audio ends
    if (audioElement) {
        // Reset icon when audio naturally ends
        audioElement.addEventListener('ended', () => {
            console.log('Audio ended - resetting icon'); // Debug log
            if (currentPlayButton) {
                updatePlayButtonState(currentPlayButton, false);
                currentPlayButton = null;
            }
            currentAudioElement = null;
        });
        
        // Reset icon if audio encounters an error
        audioElement.addEventListener('error', () => {
            console.log('Audio error - resetting icon'); // Debug log
            if (currentPlayButton) {
                updatePlayButtonState(currentPlayButton, false);
                currentPlayButton = null;
            }
            currentAudioElement = null;
        });
        
        // Reset icon if audio is paused (which happens during stop)
        audioElement.addEventListener('pause', () => {
            if (currentPlayButton && audioElement.currentTime === 0) {
                console.log('Audio paused at start - resetting icon'); // Debug log
                updatePlayButtonState(currentPlayButton, false);
                currentPlayButton = null;
            }
        });
    }
}

// Function to update STT button state
function updateSTTButtonState(button, isRecording) {
    const svg = button.querySelector('svg');
    if (isRecording) {
        // Change to stop icon
        svg.innerHTML = '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"></circle><rect x="8" y="8" width="8" height="8" fill="currentColor" rx="1"></rect>';
        button.title = 'Stop recording';
        button.classList.add('recording');
    } else {
        // Change back to microphone icon (adjust this SVG to match your original icon)
        svg.innerHTML = '<path d="M18.9953 11.5415C19.5246 11.6991 19.826 12.2559 19.6685 12.7852C18.7771 15.7804 16.179 18.0417 13 18.4381V19.5H14.5C15.0523 19.5 15.5 19.9477 15.5 20.5C15.5 21.0523 15.0523 21.5 14.5 21.5H9.50002C8.94773 21.5 8.50002 21.0523 8.50002 20.5C8.50002 19.9477 8.94773 19.5 9.50002 19.5H11V18.4381C7.82093 18.0418 5.22279 15.7805 4.33136 12.7852C4.17382 12.2559 4.47522 11.6991 5.00456 11.5415C5.5339 11.384 6.09073 11.6854 6.24827 12.2148C6.98609 14.6939 9.28339 16.5 11.9999 16.5C14.7165 16.5 17.0138 14.6939 17.7516 12.2148C17.9091 11.6854 18.466 11.384 18.9953 11.5415Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14.5 10.5V7C14.5 5.61929 13.3807 4.5 12 4.5C10.6193 4.5 9.5 5.61929 9.5 7V10.5C9.5 11.8807 10.6193 13 12 13C13.3807 13 14.5 11.8807 14.5 10.5ZM12 2.5C9.51472 2.5 7.5 4.51472 7.5 7V10.5C7.5 12.9853 9.51472 15 12 15C14.4853 15 16.5 12.9853 16.5 10.5V7C16.5 4.51472 14.4853 2.5 12 2.5Z" fill="currentColor"></path>';
        button.title = 'Send STT message';
        button.classList.remove('recording');
    }
}

// STT recording functionality
let analyser, dataArray, animationId, visualizerCanvas;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

document.addEventListener('DOMContentLoaded', () => {
    const sttBtn = document.getElementById('send-stt-message-btn');
    if (sttBtn && navigator.mediaDevices) {
        sttBtn.addEventListener('click', async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                    // Update button state to recording/stop
                    updateSTTButtonState(sttBtn, true);

                    // Hide textarea and setup visualizer canvas
                    const textarea = document.querySelector('.chat-input');
                    // Measure textarea size before hiding
                    const rect = textarea.getBoundingClientRect();
                    const width = rect.width;
                    const height = rect.height;
                    textarea.style.display = 'none';
                    visualizerCanvas = document.createElement('canvas');
                    visualizerCanvas.id = 'stt-visualizer';
                    // Set drawing buffer size
                    visualizerCanvas.width = width;
                    visualizerCanvas.height = height;
                    // Ensure canvas is visible at same size
                    visualizerCanvas.style.width = width + 'px';
                    visualizerCanvas.style.height = height + 'px';
                    textarea.parentNode.insertBefore(visualizerCanvas, textarea);
                    const vizCtx = visualizerCanvas.getContext('2d');
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const sourceNode = audioCtx.createMediaStreamSource(stream);
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 256;
                    dataArray = new Uint8Array(analyser.fftSize);
                    sourceNode.connect(analyser);
                    // Initialize waveformBuffer with 50 zeros before adding any data
                    const bufferSize = 50;
                    if (!window.waveformBuffer) {
                        window.waveformBuffer = new Array(bufferSize).fill(0);
                    }
                    
                    function drawVisualizer() {
                        animationId = requestAnimationFrame(drawVisualizer);
                        analyser.getByteTimeDomainData(dataArray);
                        
                        // Introduce a counter to limit the number of data points pushed
                        if (!window.waveformSkipCounter) { 
                            window.waveformSkipCounter = 0; 
                        }
                        window.waveformSkipCounter++;
                        
                        // Only update every 5th frame (adjust the modulus value to change the update frequency)
                        if (window.waveformSkipCounter % 5 === 0) {
                            // Compute average magnitude from time domain data
                            let sum = 0;
                            for (let i = 0; i < dataArray.length; i++) {
                                sum += Math.abs(dataArray[i] - 128);
                            }
                            const magnitude = (sum / dataArray.length / 128) * 6; // normalized value between 0 and 1

                            // Add the current magnitude to the rolling window buffer
                            window.waveformBuffer.push(magnitude);
                            // Limit the buffer to keep the last 50 readings (adjust as needed)
                            if (window.waveformBuffer.length > bufferSize) {
                                window.waveformBuffer.shift();
                            }
                        }
                        // Clear the canvas
                        vizCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
                        
                        // Visualize the rolling window as a simple bar graph
                        const barWidth = visualizerCanvas.width / window.waveformBuffer.length;
                        window.waveformBuffer.forEach((value, index) => {
                            const gap = 2;
                            const effectiveBarWidth = barWidth - gap;
                            const barHeight = value * visualizerCanvas.height;
                            const x = index * barWidth + gap / 2;
                            const y = visualizerCanvas.height - barHeight;
                            vizCtx.fillStyle = '#cfcfcf';
                            
                            // Use the roundRect API if available for a fully rounded bar
                            if (typeof vizCtx.roundRect === 'function') {
                                vizCtx.beginPath();
                                vizCtx.roundRect(x, y, effectiveBarWidth, barHeight, effectiveBarWidth / 2);
                                vizCtx.fill();
                            } else {
                                // Fallback: manually draw a rounded rectangle
                                const radius = effectiveBarWidth / 2;
                                vizCtx.beginPath();
                                vizCtx.moveTo(x + radius, y);
                                vizCtx.lineTo(x + effectiveBarWidth - radius, y);
                                vizCtx.quadraticCurveTo(x + effectiveBarWidth, y, x + effectiveBarWidth, y + radius);
                                vizCtx.lineTo(x + effectiveBarWidth, y + barHeight - radius);
                                vizCtx.quadraticCurveTo(x + effectiveBarWidth, y + barHeight, x + effectiveBarWidth - radius, y + barHeight);
                                vizCtx.lineTo(x + radius, y + barHeight);
                                vizCtx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
                                vizCtx.lineTo(x, y + radius);
                                vizCtx.quadraticCurveTo(x, y, x + radius, y);
                                vizCtx.closePath();
                                vizCtx.fill();
                            }
                        });
                    }
                    drawVisualizer();

                    audioChunks = [];
                    // Select best supported recording format
                    let recorderOptions = {};
                    const candidateTypes = [
                        'audio/webm;codecs=opus',
                        'audio/ogg;codecs=opus',
                        'audio/mp4',
                        'audio/mpeg'
                    ];
                    for (const type of candidateTypes) {
                        if (MediaRecorder.isTypeSupported(type)) {
                            recorderOptions.mimeType = type;
                            break;
                        }
                    }
                    if (!recorderOptions.mimeType) {
                        console.warn('No supported MediaRecorder mimeType, using default');
                    }
                    mediaRecorder = new MediaRecorder(stream, recorderOptions);
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    mediaRecorder.onstop = async () => {
                        if (window.wsConnection && window.wsConnection.readyState === WebSocket.OPEN) {
                            const audioBlob = new Blob(audioChunks, { type: recorderOptions.mimeType || 'audio/webm' });
                            
                            // Convert audio to PCM format for server processing
                            try {
                                const arrayBuffer = await audioBlob.arrayBuffer();
                                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                                
                                // Convert to 16-bit PCM mono audio
                                const sampleRate = 16000; // Target sample rate for STT
                                const channelData = audioBuffer.getChannelData(0); // Get first channel (mono)
                                
                                // Resample if necessary
                                let pcmData;
                                if (audioBuffer.sampleRate !== sampleRate) {
                                    // Simple resampling
                                    const ratio = audioBuffer.sampleRate / sampleRate;
                                    const newLength = Math.floor(channelData.length / ratio);
                                    pcmData = new Float32Array(newLength);
                                    for (let i = 0; i < newLength; i++) {
                                        pcmData[i] = channelData[Math.floor(i * ratio)];
                                    }
                                } else {
                                    pcmData = channelData;
                                }
                                
                                // Convert float32 to int16
                                const int16Array = new Int16Array(pcmData.length);
                                for (let i = 0; i < pcmData.length; i++) {
                                    int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(pcmData[i] * 32768)));
                                }
                                
                                // Convert to base64 safely for large arrays
                                const uint8Array = new Uint8Array(int16Array.buffer);
                                let binaryString = '';
                                
                                // Convert to binary string without using apply()
                                for (let i = 0; i < uint8Array.length; i++) {
                                    binaryString += String.fromCharCode(uint8Array[i]);
                                }
                                
                                const base64 = btoa(binaryString);
                                
                                const message = {
                                    'type': 'stt_request',
                                    'audio_data': base64,
                                    'sample_rate': sampleRate,
                                    'format': 'pcm16'
                                };
                                window.wsConnection.send(JSON.stringify(message));
                                
                            } catch (error) {
                                console.error('Error processing audio:', error);
                                // Fallback: send original blob (server will need to handle conversion)
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const message = {
                                        'type': 'stt_request',
                                        'audio_data': reader.result.split(',')[1],
                                        'format': 'blob'
                                    };
                                    window.wsConnection.send(JSON.stringify(message));
                                };
                                reader.readAsDataURL(audioBlob);
                            }
                        }
                    };


                    mediaRecorder.start();
                    isRecording = true;
                    
                } catch (err) {
                    console.error('Microphone access denied', err);
                    // Reset button state if recording fails
                    updateSTTButtonState(sttBtn, false);
                }
            } else {
                mediaRecorder.stop();
                isRecording = false;

                // Update button state back to initial
                updateSTTButtonState(sttBtn, false);

                // Stop and remove visualizer
                cancelAnimationFrame(animationId);
                if (visualizerCanvas) {
                    visualizerCanvas.remove();
                    visualizerCanvas = null;
                }
                const textarea = document.querySelector('.chat-input');
                textarea.style.display = '';
            }
        });
    }
});

// Modified audio playback function with mobile-specific handling
function playAudioFromBase64(base64Audio) {
    console.log('Queuing audio chunk, data length:', base64Audio.length);
    
    // Add the audio chunk to the queue
    audioQueue.push(base64Audio);
    
    // Start processing the queue if not already playing
    if (!isPlayingAudio) {
        processAudioQueue();
    }
}

// Process audio queue sequentially with mobile fixes
function processAudioQueue() {
    if (audioQueue.length === 0) {
        isPlayingAudio = false;
        console.log('Audio queue empty, playback finished');
        // Notify audio helpers that playback is complete
        handleAudioPlaybackComplete();
        return;
    }
    
    isPlayingAudio = true;
    const base64Audio = audioQueue.shift(); // Get first chunk from queue
    
    console.log('Playing audio chunk, remaining in queue:', audioQueue.length);
    
    try {
        // Decode base64 to get raw PCM bytes
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Audio configuration - match your Python settings
        const sampleRate = 24000; // Adjust to match your Python sample_rate
        const channels = 1; // Adjust to match your Python channels
        
        // Ensure audio context is ready for mobile
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                playPCMAudio(bytes, sampleRate, channels);
            }).catch(() => {
                // Fallback to HTML5 audio
                playFallbackAudio(base64Audio);
            });
        } else {
            playPCMAudio(bytes, sampleRate, channels);
        }
        
    } catch (error) {
        console.error('Audio playback error:', error);
        // Fallback: try as WAV or MP3
        playFallbackAudio(base64Audio);
    }
}

// Separate function for PCM audio playback
function playPCMAudio(bytes, sampleRate, channels) {
    try {
        // Create AudioContext for playing raw PCM data
        const audioBuffer = audioContext.createBuffer(channels, bytes.length / 2, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert 16-bit PCM to float values (-1.0 to 1.0)
        for (let i = 0; i < bytes.length; i += 2) {
            const sample = (bytes[i] | (bytes[i + 1] << 8));
            // Convert from signed 16-bit to signed value
            const signedSample = sample > 32767 ? sample - 65536 : sample;
            channelData[i / 2] = signedSample / 32768.0;
        }
        
        // Create audio source and play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // Create gain node for volume control (helps with mobile)
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0; // Full volume
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a mock audio element for compatibility with audio helpers
        const mockAudioElement = {
            addEventListener: function(event, callback) {
                if (event === 'ended') {
                    source.onended = callback;
                }
            },
            currentTime: 0,
            duration: audioBuffer.duration,
            volume: 1.0
        };
        
        // Register this audio element with audio helpers
        setCurrentAudioElement(mockAudioElement);
        
        source.onended = () => {
            console.log('Audio chunk completed, processing next in queue');
            // Process next chunk in queue when current one finishes
            processAudioQueue();
        };
        
        source.start(0);
        console.log('Audio chunk playing via Web Audio API');
        
    } catch (error) {
        console.error('PCM audio playback failed:', error);
        playFallbackAudio(base64Audio);
    }
}

// Enhanced fallback audio function for mobile compatibility
function playFallbackAudio(base64Audio) {
    console.log('Using fallback audio playback');
    
    // Try multiple formats for better mobile compatibility
    const audioFormats = [
        `data:audio/wav;base64,${base64Audio}`,
        `data:audio/mpeg;base64,${base64Audio}`,
        `data:audio/mp4;base64,${base64Audio}`,
        `data:audio/ogg;base64,${base64Audio}`
    ];
    
    let audioElement = null;
    let formatIndex = 0;
    
    function tryNextFormat() {
        if (formatIndex >= audioFormats.length) {
            console.error('All audio formats failed, skipping chunk');
            processAudioQueue();
            return;
        }
        
        audioElement = new Audio(audioFormats[formatIndex]);
        
        // Mobile-specific settings
        audioElement.preload = 'auto';
        audioElement.volume = 1.0;
        
        // For iOS: these attributes help with silent mode
        audioElement.setAttribute('playsinline', '');
        audioElement.setAttribute('webkit-playsinline', '');
        
        // Register this audio element with audio helpers
        setCurrentAudioElement(audioElement);
        
        audioElement.oncanplaythrough = () => {
            console.log(`Audio loaded successfully with format ${formatIndex}`);
            
            // Play with user gesture context (important for mobile)
            const playPromise = audioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('Audio playing successfully');
                }).catch(e => {
                    console.error(`Format ${formatIndex} play failed:`, e);
                    formatIndex++;
                    tryNextFormat();
                });
            }
        };
        
        audioElement.onended = () => {
            console.log('Fallback audio chunk completed');
            // Process next chunk when fallback audio finishes
            processAudioQueue();
        };
        
        audioElement.onerror = (e) => {
            console.error(`Format ${formatIndex} failed:`, e);
            formatIndex++;
            tryNextFormat();
        };
        
        audioElement.onloadstart = () => {
            console.log(`Trying audio format ${formatIndex}`);
        };
    }
    
    tryNextFormat();
}