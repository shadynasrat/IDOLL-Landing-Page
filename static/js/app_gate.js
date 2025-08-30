import { supabase } from '/static/js/supabaseClient.js';

(async function gate() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') return; // allow debug bypass

    // Check auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.replace('/early-access.html?denied=1');
      return;
    }

    const email = session.user?.email || '';
    // Check approval in DB
    const { data, error } = await supabase
      .from('early_access')
      .select('approved')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.warn('Approval check failed:', error.message);
      window.location.replace('/early-access.html?denied=1');
      return;
    }

    const approved = !!(data && data.approved);
    if (!approved) {
      window.location.replace('/early-access.html?denied=1&reason=not_approved');
      return;
    }

    // Optional: keep local token for backward compatibility
    try {
      localStorage.setItem('idoll_early_access', JSON.stringify({ granted: true, email, ts: Date.now(), v: 2 }));
    } catch {}
  } catch (e) {
    console.warn('Gate error:', e);
    try { window.location.replace('/early-access.html?denied=1'); } catch {}
  }
})();

