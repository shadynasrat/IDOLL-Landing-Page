import { API_BASE } from './config.js';

function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown-container');

  dropdowns.forEach(dropdown => {
    const button = dropdown.querySelector('.dropdown-button');
    const menu = dropdown.querySelector('.dropdown-menu');
    const options = dropdown.querySelectorAll('.dropdown-option');
    const hiddenInput = dropdown.querySelector('input[type="hidden"]');
    const textSpan = button?.querySelector('.dropdown-text');

    if (!button || !menu) return;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('.dropdown-menu.show').forEach(other => {
        if (other !== menu) {
          other.classList.remove('show');
          other.parentElement?.querySelector('.dropdown-button')?.classList.remove('active');
        }
      });
      menu.classList.toggle('show');
      button.classList.toggle('active');
    });

    options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        if (hiddenInput) hiddenInput.value = value || '';
        if (textSpan) { textSpan.textContent = text || ''; textSpan.style.color = 'white'; }
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        menu.classList.remove('show');
        button.classList.remove('active');
      });
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('.dropdown-container')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        menu.parentElement?.querySelector('.dropdown-button')?.classList.remove('active');
      });
    }
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
        menu.parentElement?.querySelector('.dropdown-button')?.classList.remove('active');
      });
    }
  });
}

// Optional: swap to Google Form embed
export function toggleGF(e) {
  e?.preventDefault?.();
  const f = document.getElementById('google-form');
  if (f) f.classList.remove('hidden');
  document.getElementById('join')?.scrollIntoView({ behavior: 'smooth' });
}

function setYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

async function bootstrapGooglePrefill() {
  try {
    let client_id = window.IDOLL_GOOGLE_CLIENT_ID || null;
    if (!client_id) {
      const resp = await fetch(API_BASE + '/auth/google/client-id', { credentials: 'include' });
      if (!resp.ok) throw new Error('client-id fetch failed: ' + resp.status);
      ({ client_id } = await resp.json());
    }
    if (!client_id) {
      console.warn('[IDOLL] GOOGLE_CLIENT_ID is not set on API. Google button disabled.');
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id,
        callback: (response) => {
          window.idollGoogleToken = response.credential;
          try {
            const parts = response.credential.split('.');
            const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
            const email = payload.email || '';
            const name = payload.name || '';
            const givenName = (name.split(' ')[0] || name).trim();
            const locale = payload.locale || '';
            const countryGuess = (locale.includes('-') ? locale.split('-')[1] : locale).toUpperCase();
            const f = document.getElementById('firstName');
            const e = document.getElementById('email');
            const c = document.getElementById('country');
            if (givenName && f && !f.value) f.value = givenName;
            if (email && e) { e.value = email; e.readOnly = true; }
            if (countryGuess && c && !c.value) c.value = countryGuess;
          } catch {}
          // Create a session on server (optional)
          fetch(API_BASE + '/auth/google/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ idToken: window.idollGoogleToken })
          }).catch(()=>{});
        }
      });
      const btn = document.getElementById('waitlist-google-btn');
      if (btn) window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', shape: 'pill' });
    };
    document.head.appendChild(s);
  } catch (e) {
    console.warn('[IDOLL] Google Sign-In bootstrap failed:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initDropdowns();
  bootstrapGooglePrefill();
});

