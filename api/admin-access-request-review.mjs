import { requireAdmin } from './_adminAuth.mjs';
import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';
import { sendAccessApprovedEmail } from './_sendEmail.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!requireAdmin(req, res)) return;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured on the server.' });
  }

  const { request_id, action, app_url } = req.body || {};
  if (!request_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'request_id and action (approve|reject) are required.' });
  }

  const { data: request, error: fetchError } = await supabase
    .from('access_requests')
    .select('*')
    .eq('id', request_id)
    .maybeSingle();

  if (fetchError) {
    return res.status(502).json({ error: fetchError.message });
  }
  if (!request) {
    return res.status(404).json({ error: 'Access request not found.' });
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();

  const { error: updateRequestError } = await supabase
    .from('access_requests')
    .update({ status: nextStatus, reviewed_at: now })
    .eq('id', request_id);

  if (updateRequestError) {
    return res.status(502).json({ error: updateRequestError.message });
  }

  if (action === 'approve') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ access_status: 'approved', approved_at: now })
      .ilike('email', request.email);

    if (profileError) {
      return res.status(502).json({ error: profileError.message });
    }

    const emailResult = await sendAccessApprovedEmail({
      to: request.email,
      appUrl: typeof app_url === 'string' ? app_url : undefined,
    });

    return res.status(200).json({
      ok: true,
      status: 'approved',
      email_sent: emailResult.sent,
    });
  }

  await supabase
    .from('profiles')
    .update({ access_status: 'rejected' })
    .ilike('email', request.email);

  return res.status(200).json({ ok: true, status: 'rejected' });
}
