import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const { user_id: userId } = req.body || {};
  if (typeof userId !== 'string' || !userId) {
    return res.status(400).json({ error: 'user_id is required.' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  // analyses/profiles rows cascade-delete via the FK on auth.users, but delete
  // explicitly first so a partial failure is still visible in the response.
  const { error: analysesError } = await supabase.from('analyses').delete().eq('user_id', userId);
  if (analysesError) return res.status(502).json({ error: analysesError.message });

  const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (profileError) return res.status(502).json({ error: profileError.message });

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) return res.status(502).json({ error: authError.message });

  return res.status(200).json({ ok: true });
}
