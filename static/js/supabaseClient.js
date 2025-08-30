// Use esm.sh to serve ESM bundle directly (avoids 404 on jsDelivr dist path)
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
