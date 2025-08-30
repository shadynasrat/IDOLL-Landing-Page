// Centralized frontend config for API and WebSocket endpoints
// Sets window.IDOLL_API_BASE and window.IDOLL_WS, and exports constants.

const loc = (typeof location !== 'undefined' ? location : { hostname: 'localhost', origin: 'http://localhost' });
const host = loc.hostname;

// Allow pre-seeding via window variables; otherwise choose sensible defaults.
let defaultApi;
let defaultWs;

if (host === 'localhost' || host === '127.0.0.1') {
  defaultApi = 'http://localhost:8000/api';
  defaultWs  = 'ws://localhost:8000/ws';
} else if (host.endsWith('ngrok.app')) {
  defaultApi = 'https://idoll.ngrok.app/api';
  defaultWs  = 'wss://idoll.ngrok.app/ws';
} else if (host === 'idoll.love' || host.endsWith('.idoll.love')) {
  // Production: point website to ngrok API gateway
  defaultApi = 'https://idoll.ngrok.app/api';
  defaultWs  = 'wss://idoll.ngrok.app/ws';
} else {
  defaultApi = '/api';
  defaultWs  = loc.origin.replace(/^http/, 'ws') + '/ws';
}

export const API_BASE = (window.IDOLL_API_BASE || defaultApi).replace(/\/$/, '');
export const WS_URL   = window.IDOLL_WS || defaultWs;
export const DEBUG    = !!window.IDOLL_DEBUG;

// Also expose on window for non-module scripts
window.IDOLL_API_BASE = API_BASE;
window.IDOLL_WS = WS_URL;

if (DEBUG) {
  console.log('[IDOLL] Config:', { API_BASE, WS_URL });
}
