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

  const { user_id, action, app_url } = req.body || {};
  if (!user_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'user_id and action (approve|reject) are required.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, email, access_status')
    .eq('user_id', user_id)
    .maybeSingle();

  if (profileError) {
    return res.status(502).json({ error: profileError.message });
  }
  if (!profile) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      access_status: nextStatus,
      approved_at: action === 'approve' ? now : null,
    })
    .eq('user_id', user_id);

  if (updateError) {
    return res.status(502).json({ error: updateError.message });
  }

  const { data: existingRequest } = await supabase
    .from('access_requests')
    .select('id')
    .ilike('email', profile.email)
    .maybeSingle();

  if (existingRequest) {
    await supabase
      .from('access_requests')
      .update({ status: nextStatus, reviewed_at: now })
      .eq('id', existingRequest.id);
  } else if (action === 'approve') {
    await supabase.from('access_requests').insert({
      email: profile.email.toLowerCase(),
      status: 'approved',
      reviewed_at: now,
    });
  }

  let emailSent = false;
  if (action === 'approve') {
    const emailResult = await sendAccessApprovedEmail({
      to: profile.email,
      appUrl: typeof app_url === 'string' ? app_url : undefined,
    });
    emailSent = emailResult.sent;
  }

  return res.status(200).json({ ok: true, status: nextStatus, email_sent: emailSent });
}
