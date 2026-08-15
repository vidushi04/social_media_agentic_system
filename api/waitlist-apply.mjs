import { getSupabaseAdminClient } from './_supabaseAdmin.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Waitlist is not configured on the server.' });
  }

  const { email, display_name, message } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const displayName =
    typeof display_name === 'string' && display_name.trim() ? display_name.trim().slice(0, 120) : null;
  const note =
    typeof message === 'string' && message.trim() ? message.trim().slice(0, 1000) : null;

  const { data: existing, error: lookupError } = await supabase
    .from('access_requests')
    .select('id, status')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) {
    return res.status(502).json({ error: lookupError.message });
  }

  if (existing?.status === 'approved') {
    return res.status(200).json({
      ok: true,
      message: 'This email is already approved. You can sign in with Google.',
    });
  }

  if (existing?.status === 'pending') {
    return res.status(200).json({
      ok: true,
      message: 'You are already on the waitlist. We will email you when approved.',
    });
  }

  if (existing?.status === 'rejected') {
    return res.status(403).json({
      error: 'This email was not approved for access. Contact support if you think this is a mistake.',
    });
  }

  const { error: insertError } = await supabase.from('access_requests').insert({
    email: normalizedEmail,
    display_name: displayName,
    message: note,
    status: 'pending',
  });

  if (insertError) {
    return res.status(502).json({ error: insertError.message });
  }

  return res.status(201).json({
    ok: true,
    message: 'Application received. We will email you when your access is approved.',
  });
}
