import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const { user_id: userId } = req.query;
  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ error: 'user_id is required.' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const [{ data: profile, error: profileError }, { data: analyses, error: analysesError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('analyses').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  if (profileError) return res.status(502).json({ error: profileError.message });
  if (analysesError) return res.status(502).json({ error: analysesError.message });
  if (!profile) return res.status(404).json({ error: 'User not found.' });

  const exportPayload = { profile, analyses, exported_at: new Date().toISOString() };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="trellis-export-${userId}.json"`);
  return res.status(200).json(exportPayload);
}
