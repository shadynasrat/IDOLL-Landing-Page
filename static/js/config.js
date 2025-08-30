// Centralized frontend config for API and WebSocket endpoints
// Sets window.IDOLL_API_BASE and window.IDOLL_WS, and exports constants.

const host = (typeof location !== 'undefined' ? location.hostname : 'localhost');

// Allow pre-seeding via window variables; otherwise choose sensible defaults.
const defaultApi = host.includes('ngrok.app')
  ? 'https://idoll.ngrok.app/api'
  : '/api';

const defaultWs = host.includes('ngrok.app')
  ? 'wss://idoll.ngrok.app/ws'
  : (typeof location !== 'undefined'
      ? location.origin.replace(/^http/, 'ws') + '/ws'
      : 'ws://localhost/ws');

export const API_BASE = (window.IDOLL_API_BASE || defaultApi).replace(/\/$/, '');
export const WS_URL   = window.IDOLL_WS || defaultWs;
export const DEBUG    = !!window.IDOLL_DEBUG;

// Also expose on window for non-module scripts
window.IDOLL_API_BASE = API_BASE;
window.IDOLL_WS = WS_URL;

if (DEBUG) {
  console.log('[IDOLL] Config:', { API_BASE, WS_URL });
}

