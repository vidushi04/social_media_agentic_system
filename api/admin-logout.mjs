import { buildClearedCookie } from './_adminAuth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  res.setHeader('Set-Cookie', buildClearedCookie());
  return res.status(200).json({ ok: true });
}
