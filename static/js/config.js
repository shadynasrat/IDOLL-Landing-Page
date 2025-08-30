// Centralized frontend config for API and WebSocket endpoints
// Sets window.IDOLL_API_BASE and window.IDOLL_WS, and exports constants.

const loc = (typeof location !== 'undefined' ? location : { hostname: 'localhost', origin: 'http://localhost' });

// Prefer same-origin defaults to keep cookies first‑party.
// Can be overridden by setting window.IDOLL_API_BASE and/or window.IDOLL_WS before this loads.
const sameOriginApi = (loc.origin + '/api').replace(/\/$/, '');
const sameOriginWs  = loc.origin.replace(/^http/, 'ws') + '/ws';

export const API_BASE = (window.IDOLL_API_BASE || sameOriginApi).replace(/\/$/, '');
export const WS_URL   = window.IDOLL_WS || sameOriginWs;
export const DEBUG    = !!window.IDOLL_DEBUG;

// Also expose on window for non-module scripts
window.IDOLL_API_BASE = API_BASE;
window.IDOLL_WS = WS_URL;

if (DEBUG) {
  console.log('[IDOLL] Config:', { API_BASE, WS_URL });
}
