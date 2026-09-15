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

  const [{ count: totalUsers, error: usersError }, { data: analyses, error: analysesError }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('analyses').select('created_at, user_id'),
  ]);

  if (usersError) return res.status(502).json({ error: usersError.message });
  if (analysesError) return res.status(502).json({ error: analysesError.message });

  const totalAnalyses = analyses.length;
  const guestAnalyses = analyses.filter((row) => !row.user_id).length;
  const byWeek = new Map();
  for (const row of analyses) {
    const weekStart = new Date(row.created_at);
    weekStart.setUTCHours(0, 0, 0, 0);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) || 0) + 1);
  }

  const analysesPerWeek = Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  return res.status(200).json({
    total_users: totalUsers ?? 0,
    total_analyses: totalAnalyses,
    guest_analyses: guestAnalyses,
    analyses_per_week: analysesPerWeek,
  });
}
