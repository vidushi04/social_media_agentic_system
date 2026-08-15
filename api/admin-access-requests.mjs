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

  const statusFilter = typeof req.query.status === 'string' ? req.query.status : null;

  let query = supabase
    .from('access_requests')
    .select('id, email, display_name, message, status, created_at, reviewed_at')
    .order('created_at', { ascending: false });

  if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(502).json({ error: error.message });
  }

  return res.status(200).json(data);
}
