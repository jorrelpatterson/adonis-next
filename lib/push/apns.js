// lib/push/apns.js
//
// APNs HTTP/2 sender — the send half of iOS P3 Task 4 (the receive half
// is src/platform/push.js, shipped in Task 3). DORMANT BY DESIGN: reads
// 4 env vars Jorrel provides at iOS P4 (device-verify) — APNS_KEY_P8 (the
// .p8 key file's raw contents), APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID.
// If ANY of the four is unset, sendPush() resolves
// {ok:false, skipped:'apns-not-configured'} and logs — it NEVER builds a
// JWT, NEVER opens a connection to Apple. This is what lets the register
// route + the routine-reminders cron ship to prod today (register writes
// real rows, the cron runs on schedule) with zero chance of a malformed
// dormant-mode call ever reaching Apple's servers. Flipping to live at P4
// is a Vercel env var change — no code change here.
//
// Transport: Node's built-in node:http2 (APNs requires HTTP/2 — no
// external dependency needed). JWT signing: node:crypto's ES256 support
// (dsaEncoding: 'ieee-p1363' — JWS wants the raw r||s signature format,
// not node:crypto's DER default). Nothing new in package.json for either.
//
// sendPush() always RESOLVES, never rejects — every failure mode
// (unconfigured, malformed key, network error, a non-200 from Apple) is a
// resolved {ok:false, ...}, so a caller looping over many tokens (the
// cron) never needs its own try/catch per token.

import { connect } from 'node:http2';
import { createSign } from 'node:crypto';

const APNS_HOST = 'api.push.apple.com';
const REQUEST_TIMEOUT_MS = 10_000; // protects the cron's overall duration budget from one hung connection
const REQUIRED_ENV_KEYS = ['APNS_KEY_P8', 'APNS_KEY_ID', 'APNS_TEAM_ID', 'APNS_BUNDLE_ID'];

// APNs allows JWT reuse for up to 1h; refreshing at 50m leaves margin so a
// token is never presented right at its edge. Module-scoped: a warm
// serverless invocation reuses this across cron runs within the window.
// Keyed only on time (not on the env values) because the 4 env vars are
// static per deployment — they can't change mid-invocation.
const JWT_TTL_MS = 50 * 60 * 1000;
let cachedJWT = null; // { token, mintedAtMs }

function isConfigured(env) {
  return REQUIRED_ENV_KEYS.every((key) => Boolean(env[key]));
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function mintJWT(env) {
  const header = { alg: 'ES256', kid: env.APNS_KEY_ID };
  const payload = { iss: env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();
  // ieee-p1363: raw r||s concatenation, the format JWS ES256 requires —
  // node:crypto's default ('der') is ASN.1-encoded and Apple will reject it.
  const signature = signer.sign({ key: env.APNS_KEY_P8, dsaEncoding: 'ieee-p1363' });

  return `${signingInput}.${base64url(signature)}`;
}

function getJWT(env) {
  if (cachedJWT && Date.now() - cachedJWT.mintedAtMs < JWT_TTL_MS) {
    return cachedJWT.token;
  }
  const token = mintJWT(env);
  cachedJWT = { token, mintedAtMs: Date.now() };
  return token;
}

/**
 * Sends a single APNs alert push.
 *
 * @param {string} token - APNs device token (hex string)
 * @param {{title?: string, body?: string, data?: object}} payload
 * @param {NodeJS.ProcessEnv} [env] - injectable for tests; defaults to process.env
 * @returns {Promise<{ok: true} | {ok: false, skipped?: string, status?: number, reason?: string, error?: string}>}
 */
export async function sendPush(token, { title, body, data } = {}, env = process.env) {
  if (!isConfigured(env)) {
    console.log('[apns] not configured — skipping push (dormant until APNS_KEY_P8/APNS_KEY_ID/APNS_TEAM_ID/APNS_BUNDLE_ID are all set)');
    return { ok: false, skipped: 'apns-not-configured' };
  }

  let jwt;
  try {
    jwt = getJWT(env);
  } catch (e) {
    console.error('[apns] failed to build JWT', e);
    return { ok: false, error: 'jwt-build-failed' };
  }

  const payload = JSON.stringify({
    aps: { alert: { title: title || '', body: body || '' }, sound: 'default' },
    ...(data || {}),
  });

  return new Promise((resolve) => {
    let client;
    let settled = false;
    let timeoutHandle;

    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      try {
        client?.close();
      } catch {
        // best-effort cleanup
      }
      resolve(result);
    };

    timeoutHandle = setTimeout(() => done({ ok: false, error: 'timeout' }), REQUEST_TIMEOUT_MS);

    try {
      client = connect(`https://${APNS_HOST}`);
    } catch (e) {
      done({ ok: false, error: String(e?.message || e) });
      return;
    }

    client.on('error', (e) => done({ ok: false, error: String(e?.message || e) }));

    let req;
    try {
      req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': env.APNS_BUNDLE_ID,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      });
    } catch (e) {
      done({ ok: false, error: String(e?.message || e) });
      return;
    }

    let status;
    let responseBody = '';
    req.on('response', (headers) => {
      status = headers[':status'];
    });
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      responseBody += chunk;
    });
    req.on('end', () => {
      if (status === 200) {
        done({ ok: true });
        return;
      }
      let reason;
      try {
        reason = JSON.parse(responseBody)?.reason;
      } catch {
        reason = responseBody || undefined;
      }
      done({ ok: false, status, reason });
    });
    req.on('error', (e) => done({ ok: false, error: String(e?.message || e) }));

    req.write(payload);
    req.end();
  });
}
