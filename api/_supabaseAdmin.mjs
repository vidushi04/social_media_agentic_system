// Server-side Supabase client using the service-role key, which bypasses RLS.
// Used exclusively by the admin API functions — never import this from
// anything reachable without an admin session.

import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
