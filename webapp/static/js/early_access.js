import { supabase } from '/static/js/supabaseClient.js';

const INVITE_CODES = ['IDOLL-ALPHA-2024', 'IDOLL-BETA', 'EARLY-ACCESS']
  .map(c => c.replace(/-/g, '').toLowerCase());

function normalizeCode(c){ return (c || '').replace(/\s+/g,'').replace(/-/g,'').toLowerCase(); }

function setLocalEarlyAccess(email){
  const token = { granted: true, email, ts: Date.now(), v: 1 };
  try { localStorage.setItem('idoll_early_access', JSON.stringify(token)); } catch {}
}

function redirectToApp(){
  window.location.href = '/templates/webapp.html';
}

function show(el){ el?.classList?.remove('hidden'); }
function hide(el){ el?.classList?.add('hidden'); }

async function checkEarlyAccess(email){
  try {
    // Expect a table `early_access` with columns: email (text, PK/unique), approved (bool)
    const { data, error } = await supabase
      .from('early_access')
      .select('approved')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.warn('Supabase check error:', error.message);
      return { approved: false, error };
    }
    return { approved: !!(data && data.approved) };
  } catch (e) {
    console.warn('Supabase check failed:', e);
    return { approved: false, error: e };
  }
}

async function onSignedIn(session){
  const email = session?.user?.email;
  if (!email) return;

  const statusEl = document.getElementById('auth-status');
  const inviteWrap = document.getElementById('invite');

  statusEl.textContent = `Signed in as ${email}`;
  show(statusEl);

  const res = await checkEarlyAccess(email);
  if (res.approved) {
    setLocalEarlyAccess(email);
    redirectToApp();
    return;
  }

  // Not approved yet: let users enter invite code
  show(inviteWrap);
  const pendingMsg = document.getElementById('pending-msg');
  show(pendingMsg);
}

async function init(){
  const googleBtn = document.getElementById('google-signin');
  const emailForm = document.getElementById('email-form');
  const emailInput = document.getElementById('magic-email');
  const emailMsg = document.getElementById('email-msg');
  const inviteForm = document.getElementById('invite-form');
  const inviteError = document.getElementById('error');
  const alreadyApproved = document.getElementById('already-approved');

  // Session check
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await onSignedIn(session);
  }

  // Auth state changes (e.g., after OAuth redirect or magic link)
  supabase.auth.onAuthStateChange(async (_event, newSession) => {
    if (newSession) {
      await onSignedIn(newSession);
    }
  });

  // Google sign-in
  googleBtn?.addEventListener('click', async () => {
    const redirectTo = window.location.origin + '/early-access.html';
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) alert('Google sign-in failed: ' + error.message);
  });

  // Email magic link
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailMsg.textContent = '';
    const email = emailInput.value.trim();
    if (!email) return;
    const redirectTo = window.location.origin + '/early-access.html';
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      emailMsg.textContent = 'Failed to send sign-in link. ' + error.message;
      emailMsg.classList.remove('text-emerald-300');
      emailMsg.classList.add('text-rose-300');
    } else {
      emailMsg.textContent = 'Magic link sent. Check your email.';
      emailMsg.classList.remove('text-rose-300');
      emailMsg.classList.add('text-emerald-300');
    }
  });

  // Invite code (fallback/unlock)
  inviteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    inviteError.classList.add('hidden');
    const code = document.getElementById('code').value.trim();
    const normalized = normalizeCode(code);
    const ok = INVITE_CODES.includes(normalized);
    if (!ok) {
      inviteError.textContent = 'Invalid or expired invite code. Double‑check and try again.';
      inviteError.classList.remove('hidden');
      return;
    }

    // Grant local access even if not approved in Supabase table
    const email = emailInput?.value?.trim() || (supabase?.auth?.getUser?.().data?.user?.email) || '';
    setLocalEarlyAccess(email);
    redirectToApp();
  });

  // If already approved locally
  try {
    const raw = localStorage.getItem('idoll_early_access');
    const token = raw ? JSON.parse(raw) : null;
    if (token && token.granted === true) {
      alreadyApproved?.classList?.remove('hidden');
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', init);

