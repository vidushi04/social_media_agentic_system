// Shared admin-session verification for the admin API functions.
// The leading underscore keeps Vercel from exposing this as its own route.
//
// Admin auth is intentionally NOT Supabase Auth: the admin isn't a row in
// auth.users, so there's no JWT for RLS to key off of. Instead a single
// password (ADMIN_PASSWORD) is checked once at login (api/admin-login.mjs),
// which issues an HMAC-signed, HttpOnly session cookie. Every other admin
// endpoint verifies that cookie here, then uses the Supabase service-role key
// (which bypasses RLS) to read/write across all users' data.

import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'admin_session';

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function signAdminSession(secret) {
  const payload = JSON.stringify({ role: 'admin', iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 });
  const encodedPayload = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${sig}`;
}

export function buildSessionCookie(token) {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
}

export function buildClearedCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function verifyAdminSession(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token || !token.includes('.')) return false;

  const [encodedPayload, sig] = token.split('.');
  const expectedSig = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  const sigBuf = Buffer.from(sig || '');
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.role !== 'admin') return false;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function requireAdmin(req, res) {
  if (!verifyAdminSession(req)) {
    res.status(401).json({ error: 'Not authenticated as admin.' });
    return false;
  }
  return true;
}
