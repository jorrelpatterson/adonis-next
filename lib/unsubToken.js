// HMAC-signed unsubscribe tokens. No expiry — unsubscribe is permanent.
// Token format: <emailB64Url>.<sigHex>
//
// Uses Node's crypto so no new dependency is added.

import crypto from 'crypto';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function secret() {
  const s = process.env.EMAIL_UNSUB_SECRET;
  if (!s || s.length < 32) throw new Error('EMAIL_UNSUB_SECRET missing or too short (need 32+ chars)');
  return s;
}

export function signUnsubToken(email) {
  const normalized = String(email).trim().toLowerCase();
  const payload = b64url(normalized);
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyUnsubToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  // Constant-time compare.
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try { return b64urlDecode(payload); } catch { return null; }
}
