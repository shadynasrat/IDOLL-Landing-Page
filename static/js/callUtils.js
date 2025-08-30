import { sendVadAudio } from "./websocket.js";

export function setupCallButton() {
    const callButton = document.getElementById('call-button');
    const modalElement = document.getElementById('callModal');
    const callModal = new bootstrap.Modal(modalElement);
    const endCallButton = document.getElementById('end-call-button');
    let mediaRecorder = null;
    let callTimer = null;
    let callDuration = 0;

    callButton.addEventListener('click', async () => {
        callModal.show();
        startTimer();
        await startRecording();
    });

    if (endCallButton) endCallButton.addEventListener('click', stopCall);
    modalElement.addEventListener('hidden.bs.modal', stopCall);

    function startTimer() {
        const timerElement = document.querySelector('.call-timer');
        if (!timerElement) return;

        callDuration = 0;
        callTimer = setInterval(() => {
            callDuration++;
            const minutes = Math.floor(callDuration / 60);
            const seconds = callDuration % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    async function startRecording() {
        if (mediaRecorder) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Use Web Audio API to get raw PCM data
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (event) => {
                const inputBuffer = event.inputBuffer;
                const inputData = inputBuffer.getChannelData(0);
                
                // Convert float32 to int16
                const int16Array = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
                }
                
                // Convert to base64 and send
                const buffer = int16Array.buffer;
                const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                sendVadAudio(base64);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // Store references for cleanup
            mediaRecorder = {
                audioContext,
                source,
                processor,
                stream
            };

        } catch (error) {
            console.error('Error starting audio recording:', error);
            if (modalElement) modalElement.hide();
            alert('Failed to access microphone. Please check permissions.');
        }
    }

    function stopRecording() {
        if (!mediaRecorder) return;
        
        // Clean up Web Audio API components
        if (mediaRecorder.processor) {
            mediaRecorder.processor.disconnect();
        }
        if (mediaRecorder.source) {
            mediaRecorder.source.disconnect();
        }
        if (mediaRecorder.audioContext) {
            mediaRecorder.audioContext.close();
        }
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        mediaRecorder = null;
    }

    function stopCall() {
        clearInterval(callTimer);
        callDuration = 0;
        stopRecording();
    }
}