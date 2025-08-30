const API_BASE = (window.IDOLL_API_BASE || '/api').replace(/\/$/, '');

function apiFetch(path, options = {}){
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const opts = { credentials: 'include', ...options };
  return fetch(url, opts);
}

async function getSession() {
  try {
    const res = await apiFetch('/auth/session');
    return await res.json();
  } catch { return { authenticated: false }; }
}

async function redeemInvite(code) {
  const res = await apiFetch('/invite/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return await res.json();
}

function normalizeCode(c){ return (c || '').trim(); }

function redirectToApp(){ window.location.href = '/webapp.html'; }

document.addEventListener('DOMContentLoaded', async () => {
  // Show already approved link
  const approvedEl = document.getElementById('already-approved');
  const sess = await getSession();
  if (sess.authenticated && sess.user && sess.user.role === 'early_access') {
    approvedEl?.classList?.remove('hidden');
  }

  // Handle invite form
  const form = document.getElementById('invite-form');
  const error = document.getElementById('error');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    error?.classList?.add('hidden');
    const code = normalizeCode(document.getElementById('code').value);
    const res = await redeemInvite(code);
    if (res.ok) { redirectToApp(); return; }
    error.textContent = 'Invite failed: ' + (res.error || 'unknown_error');
    error.classList.remove('hidden');
  });

  // Google Sign-In bootstrap (optional)
  try {
    let client_id = window.IDOLL_GOOGLE_CLIENT_ID || null;
    if (!client_id) {
      const resp = await apiFetch('/auth/google/client-id');
      if (!resp.ok) throw new Error('client-id fetch failed: ' + resp.status);
      ({ client_id } = await resp.json());
    }
    if (client_id) {
      // Dynamically load GSI client
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => {
        window.google?.accounts.id.initialize({
          client_id,
          callback: (response) => {
            // Store ID token globally for backend verification
            window.idollGoogleToken = response.credential;
            // Lightly decode for UX-prefill only
            try {
              const parts = response.credential.split('.');
              const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
              if (payload.email) {
                const emailInput = document.getElementById('email');
                if (emailInput) { emailInput.value = payload.email; emailInput.readOnly = true; }
              }
            } catch {}
            // Also create a session cookie on server then go to app
            apiFetch('/auth/google/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: window.idollGoogleToken })
            }).then(r => r.json()).then(resp => {
              if (resp && resp.ok) {
                redirectToApp();
              }
            }).catch(()=>{});
          }
        });
        // Render button if container exists
        const btn = document.getElementById('google-btn');
        if (btn) {
          window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', shape: 'pill' });
        }
      };
      document.head.appendChild(s);
    }
  } catch {}
});
