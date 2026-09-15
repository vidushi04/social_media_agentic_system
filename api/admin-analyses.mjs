import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const fromSettingsValue = (key, value, updatedAt) => {
  const data = value && typeof value === 'object' ? value : {};
  return {
    id: data.id || String(key).replace(/^analysis:/, ''),
    user_id: data.user_id || null,
    user_email: null,
    is_guest: true,
    video_url: data.video_url || '',
    data_collector: data.data_collector ?? null,
    deconstructor: data.deconstructor ?? null,
    audience: data.audience ?? null,
    pattern: data.pattern ?? null,
    coach: data.coach ?? null,
    created_at: data.created_at || updatedAt,
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const [{ data: rows, error }, { data: profiles, error: profilesError }, { data: settingsRows, error: settingsError }] =
    await Promise.all([
      supabase
        .from('analyses')
        .select('id, user_id, video_url, data_collector, deconstructor, audience, pattern, coach, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, email'),
      supabase.from('app_settings').select('key, value, updated_at').like('key', 'analysis:%'),
    ]);

  if (error) {
    return res.status(502).json({ error: error.message });
  }
  if (profilesError) {
    return res.status(502).json({ error: profilesError.message });
  }

  const emailByUser = new Map((profiles || []).map((profile) => [profile.user_id, profile.email]));
  const analyses = (rows || []).map((row) => ({
    ...row,
    user_email: row.user_id ? emailByUser.get(row.user_id) || null : null,
    is_guest: !row.user_id,
  }));

  const fallback = settingsError
    ? []
    : (settingsRows || []).map((row) => fromSettingsValue(row.key, row.value, row.updated_at));

  const seen = new Set(analyses.map((row) => row.id));
  for (const extra of fallback) {
    if (!seen.has(extra.id)) analyses.push(extra);
  }

  analyses.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return res.status(200).json(analyses);
}
