import { handleAudioPlaybackComplete, setCurrentAudioElement } from '../audio_helpers.js';

let audioQueue = [];
let isPlayingAudio = false;

// Public: enqueue base64 audio data (PCM16 or WAV fallback) and ensure playback
export function playAudioFromBase64(base64Audio) {
  if (!base64Audio) return;
  audioQueue.push(base64Audio);
  if (!isPlayingAudio) {
    processAudioQueue();
  }
}

// Public: clear queued audio and stop tracking playback state
export function clearAudioQueue() {
  audioQueue = [];
  isPlayingAudio = false;
  handleAudioPlaybackComplete();
}

function processAudioQueue() {
  if (audioQueue.length === 0) {
    isPlayingAudio = false;
    handleAudioPlaybackComplete();
    return;
  }

  isPlayingAudio = true;
  const base64Audio = audioQueue.shift();

  try {
    // Decode base64 into raw bytes (assumed PCM16 LE)
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const sampleRate = 24000; // must match server
    const channels = 1;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = audioCtx.createBuffer(channels, bytes.length / 2, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < bytes.length; i += 2) {
      const sample = (bytes[i] | (bytes[i + 1] << 8));
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      channelData[i / 2] = signedSample / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const mockAudioElement = {
      addEventListener: function(event, callback) { if (event === 'ended') source.onended = callback; },
      currentTime: 0,
      duration: audioBuffer.duration
    };
    setCurrentAudioElement(mockAudioElement);

    source.onended = () => { processAudioQueue(); };
    source.start(0);
  } catch (err) {
    // Fallback: treat bytes as WAV data URL
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    setCurrentAudioElement(audio);
    audio.oncanplaythrough = () => { audio.play().catch(() => processAudioQueue()); };
    audio.onended = () => { processAudioQueue(); };
    audio.onerror = () => { processAudioQueue(); };
  }
}

