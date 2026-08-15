// Global app settings stored in Supabase (service-role access only).

import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const MOCK_MODE_KEY = 'mock_mode_enabled';

export async function getMockModeEnabled() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', MOCK_MODE_KEY)
    .maybeSingle();

  if (error || !data) return false;
  return data.value === true || data.value === 'true';
}

export async function setMockModeEnabled(enabled) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server.');
  }

  const { error } = await supabase.from('app_settings').upsert(
    {
      key: MOCK_MODE_KEY,
      value: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    if (/app_settings|schema cache/i.test(error.message)) {
      throw new Error(
        'app_settings table is missing. Run supabase/app_settings_migration.sql in the Supabase SQL Editor, then try again.'
      );
    }
    throw new Error(error.message);
  }
  return enabled;
}
