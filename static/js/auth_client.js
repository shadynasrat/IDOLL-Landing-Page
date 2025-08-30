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

async function signupWithEmail(email, password, inviteCode) {
  const res = await apiFetch('/auth/email/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, invite_code: inviteCode })
  });
  return await res.json();
}

async function signinWithEmail(email, password) {
  const res = await apiFetch('/auth/email/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const codeInput = document.getElementById('code');
  const submitBtn = document.getElementById('email-submit-btn');
  const toggleSignin = document.getElementById('toggle-signin');
  const passwordBlock = document.getElementById('password-block');
  
  let isSignupMode = true;
  
  function toggleMode() {
    isSignupMode = !isSignupMode;
    if (isSignupMode) {
      submitBtn.textContent = 'Sign up & Continue';
      toggleSignin.textContent = 'Already have an account? Sign in';
      passwordInput.placeholder = 'Create a secure password';
      codeInput.required = true;
      codeInput.parentElement.style.display = '';
    } else {
      submitBtn.textContent = 'Sign in';
      toggleSignin.textContent = 'Need an account? Sign up';
      passwordInput.placeholder = 'Enter your password';
      codeInput.required = false;
      codeInput.parentElement.style.display = 'none';
    }
  }
  
  toggleSignin?.addEventListener('click', toggleMode);
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    error?.classList?.add('hidden');
    
    const email = emailInput?.value;
    const password = passwordInput?.value;
    const code = normalizeCode(codeInput?.value);
    
    try {
      let res;
      if (isSignupMode) {
        if (!code) {
          error.textContent = 'Invite code is required for signup';
          error.classList.remove('hidden');
          return;
        }
        res = await signupWithEmail(email, password, code);
      } else {
        res = await signinWithEmail(email, password);
      }
      
      if (res.ok) { 
        redirectToApp(); 
        return; 
      }
      
      error.textContent = (isSignupMode ? 'Signup' : 'Signin') + ' failed: ' + (res.error || 'unknown_error');
      error.classList.remove('hidden');
    } catch (err) {
      error.textContent = 'Connection error. Please try again.';
      error.classList.remove('hidden');
    }
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
