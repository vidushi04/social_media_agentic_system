// Admin login. Fully separate from Supabase Auth/user accounts — a single
// shared password checked here, verified with a constant-time comparison to
// avoid leaking its value via response-timing.

import { timingSafeEqual } from 'node:crypto';
import { signAdminSession, buildSessionCookie } from './_adminAuth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!adminPassword || !sessionSecret) {
    return res.status(500).json({ error: 'Admin login is not configured on the server.' });
  }

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const providedBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(adminPassword);
  const isMatch =
    providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);

  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const token = signAdminSession(sessionSecret);
  res.setHeader('Set-Cookie', buildSessionCookie(token));
  return res.status(200).json({ ok: true });
}
