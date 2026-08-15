// Transactional email via Resend (https://resend.com).
// Set RESEND_API_KEY and RESEND_FROM_EMAIL in server env. If unset, emails are skipped.

const RESEND_API = 'https://api.resend.com/emails';

export async function sendAccessApprovedEmail({ to, appUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL not set — skipping approval email.');
    return { sent: false, reason: 'not_configured' };
  }

  const loginUrl = appUrl || process.env.APP_URL || 'http://localhost:3001';

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your Trellis early access has been approved',
      html: `
        <p>Hi,</p>
        <p>Good news — your request for early access to <strong>Trellis</strong> has been approved.</p>
        <p>You can sign in with Google here:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
        <p>Make sure you use the same Google account email you applied with.</p>
        <p>— The Trellis team</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[email] Resend error:', res.status, body);
    return { sent: false, reason: 'provider_error' };
  }

  return { sent: true };
}
