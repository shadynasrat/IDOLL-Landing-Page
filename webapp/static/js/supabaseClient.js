// Initialize Supabase client (v2) for browser usage
// TODO: Replace placeholders with your actual Supabase URL and anon public key.
// Option A: Set via window.SUPABASE_URL / window.SUPABASE_ANON_KEY before this script loads.
// Option B: Hardcode below.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = window.SUPABASE_URL || 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co';
const key = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
