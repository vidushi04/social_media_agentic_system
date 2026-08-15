import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, email, youtube_username, access_status, approved_at, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return res.status(502).json({ error: profilesError.message });
  }

  const { data: analyses, error: analysesError } = await supabase.from('analyses').select('user_id');
  if (analysesError) {
    return res.status(502).json({ error: analysesError.message });
  }

  const counts = new Map();
  for (const row of analyses) {
    counts.set(row.user_id, (counts.get(row.user_id) || 0) + 1);
  }

  const users = profiles.map((p) => ({ ...p, analysis_count: counts.get(p.user_id) || 0 }));
  return res.status(200).json(users);
}
