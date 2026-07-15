// lib/push/__tests__/apns.test.js
//
// sendPush() has two load-bearing contracts to prove:
//   1. THE DORMANT GUARD — if any of the 4 required env vars is missing,
//      Apple is NEVER contacted (node:http2's connect() is never called).
//      This is what makes it safe to deploy the cron before Jorrel has an
//      APNs key.
//   2. When configured, the JWT it builds has the exact claim shape APNs
//      requires (ES256, iss=team id, kid=key id) and the request carries
//      the right apns-topic/path — all without ever hitting the real
//      api.push.apple.com.
//
// node:http2 is mocked module-wide via vi.doMock + vi.resetModules() (the
// same per-scenario re-import pattern as src/platform/push.test.js), so
// each test gets a fresh apns.js module instance — and, importantly, a
// fresh JWT cache (the cache is module-scoped).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { generateKeyPairSync } from 'node:crypto';

function testP8() {
  // A real Apple .p8 is a PKCS8 PEM EC (P-256) private key — this
  // generates a structurally identical stand-in so mintJWT's real
  // ES256-signing code path runs for real, without any Apple credential.
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return privateKey.export({ type: 'pkcs8', format: 'pem' });
}

function decodeJwtPart(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

function configuredEnv() {
  return {
    APNS_KEY_P8: testP8(),
    APNS_KEY_ID: 'KEYID1234',
    APNS_TEAM_ID: 'TEAMID5678',
    APNS_BUNDLE_ID: 'com.adonis.app',
  };
}

describe('lib/push/apns', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('node:http2');
  });

  describe('dormant guard (unconfigured)', () => {
    let connect;

    beforeEach(() => {
      connect = vi.fn();
      // `default` alongside the named export: Vite's SSR transform for
      // node: built-ins reaches for `.default` on the mock even though
      // apns.js only ever uses the named `connect` import — omitting it
      // throws "No default export is defined on the node:http2 mock".
      vi.doMock('node:http2', () => ({ connect, default: { connect } }));
    });

    it.each([
      ['APNS_KEY_P8', { APNS_KEY_ID: 'k', APNS_TEAM_ID: 't', APNS_BUNDLE_ID: 'b' }],
      ['APNS_KEY_ID', { APNS_KEY_P8: 'p', APNS_TEAM_ID: 't', APNS_BUNDLE_ID: 'b' }],
      ['APNS_TEAM_ID', { APNS_KEY_P8: 'p', APNS_KEY_ID: 'k', APNS_BUNDLE_ID: 'b' }],
      ['APNS_BUNDLE_ID', { APNS_KEY_P8: 'p', APNS_KEY_ID: 'k', APNS_TEAM_ID: 't' }],
    ])('missing %s alone -> skipped, http2.connect is never called', async (_missingKey, env) => {
      const { sendPush } = await import('../apns.js');
      const result = await sendPush('device-token', { title: 't', body: 'b' }, env);
      expect(result).toEqual({ ok: false, skipped: 'apns-not-configured' });
      expect(connect).not.toHaveBeenCalled();
    });

    it('a completely empty env -> skipped, never touches http2', async () => {
      const { sendPush } = await import('../apns.js');
      const result = await sendPush('device-token', { title: 't', body: 'b' }, {});
      expect(result).toEqual({ ok: false, skipped: 'apns-not-configured' });
      expect(connect).not.toHaveBeenCalled();
    });

    it('real process.env is never sufficient by accident in this suite (no APNS_* leaking from the shell)', async () => {
      // Defense against a false-green: prove the *real* process.env
      // default path also skips (nobody's ambient shell env should ever
      // make this suite exercise a live Apple connection).
      const { sendPush } = await import('../apns.js');
      const clean = { ...process.env };
      delete clean.APNS_KEY_P8;
      delete clean.APNS_KEY_ID;
      delete clean.APNS_TEAM_ID;
      delete clean.APNS_BUNDLE_ID;
      const result = await sendPush('device-token', { title: 't', body: 'b' }, clean);
      expect(result).toEqual({ ok: false, skipped: 'apns-not-configured' });
      expect(connect).not.toHaveBeenCalled();
    });
  });

  describe('configured', () => {
    let connect;
    let fakeClient;
    let fakeReq;
    let capturedHeaders;
    let capturedBody;

    function makeFake({ status = 200, body = '' } = {}) {
      capturedBody = '';

      fakeReq = new EventEmitter();
      fakeReq.write = (chunk) => {
        capturedBody += chunk;
      };
      fakeReq.setEncoding = () => {};
      fakeReq.end = () => {
        queueMicrotask(() => {
          fakeReq.emit('response', { ':status': status });
          if (body) fakeReq.emit('data', body);
          fakeReq.emit('end');
        });
      };

      fakeClient = new EventEmitter();
      fakeClient.close = vi.fn();
      fakeClient.request = (headers) => {
        capturedHeaders = headers;
        return fakeReq;
      };
    }

    beforeEach(() => {
      capturedHeaders = null;
      makeFake();
      // Closes over the outer `fakeClient` binding, so re-running
      // makeFake() later in a test (to swap in a new fake response)
      // transparently changes what the NEXT connect() call returns too.
      connect = vi.fn(() => fakeClient);
      // See the dormant-guard describe block above for why `default` is
      // needed alongside the named export here.
      vi.doMock('node:http2', () => ({ connect, default: { connect } }));
    });

    it('opens exactly one connection, to api.push.apple.com', async () => {
      const { sendPush } = await import('../apns.js');
      await sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      expect(connect).toHaveBeenCalledTimes(1);
      expect(connect).toHaveBeenCalledWith('https://api.push.apple.com');
    });

    it('requests the right path and apns-topic', async () => {
      const env = configuredEnv();
      const { sendPush } = await import('../apns.js');
      await sendPush('my-device-token', { title: 't', body: 'b' }, env);

      expect(capturedHeaders[':method']).toBe('POST');
      expect(capturedHeaders[':path']).toBe('/3/device/my-device-token');
      expect(capturedHeaders['apns-topic']).toBe('com.adonis.app');
    });

    it('the JWT header/payload carry the right ES256 claims', async () => {
      const env = configuredEnv();
      const { sendPush } = await import('../apns.js');
      await sendPush('device-token', { title: 't', body: 'b' }, env);

      expect(capturedHeaders.authorization).toMatch(/^bearer /);
      const jwt = capturedHeaders.authorization.replace(/^bearer /, '');
      const [headerPart, payloadPart, signaturePart] = jwt.split('.');

      expect(decodeJwtPart(headerPart)).toEqual({ alg: 'ES256', kid: env.APNS_KEY_ID });
      const payload = decodeJwtPart(payloadPart);
      expect(payload.iss).toBe(env.APNS_TEAM_ID);
      expect(typeof payload.iat).toBe('number');
      expect(signaturePart.length).toBeGreaterThan(0);
    });

    it('sends the aps alert payload (title/body/sound) plus any extra data alongside aps', async () => {
      const { sendPush } = await import('../apns.js');
      await sendPush(
        'device-token',
        { title: 'Time for your protocol', body: 'Your routine is ready.', data: { tab: 'routine' } },
        configuredEnv()
      );

      const sent = JSON.parse(capturedBody);
      expect(sent.aps.alert).toEqual({ title: 'Time for your protocol', body: 'Your routine is ready.' });
      expect(sent.aps.sound).toBe('default');
      expect(sent.tab).toBe('routine');
    });

    it('a 200 response resolves {ok: true}', async () => {
      const { sendPush } = await import('../apns.js');
      const result = await sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      expect(result).toEqual({ ok: true });
    });

    it("a non-200 response resolves {ok:false, status, reason} from Apple's JSON body, never throws", async () => {
      makeFake({ status: 400, body: JSON.stringify({ reason: 'BadDeviceToken' }) });
      const { sendPush } = await import('../apns.js');
      const result = await sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      expect(result).toEqual({ ok: false, status: 400, reason: 'BadDeviceToken' });
    });

    it('a non-JSON error body still resolves {ok:false} with the raw text as reason', async () => {
      makeFake({ status: 500, body: 'internal error' });
      const { sendPush } = await import('../apns.js');
      const result = await sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      expect(result).toEqual({ ok: false, status: 500, reason: 'internal error' });
    });

    it('reuses the cached JWT across calls within the cache window', async () => {
      // ECDSA signatures are randomized per signing op, so a byte-identical
      // authorization header across two calls proves cache reuse, not
      // coincidental regeneration.
      const env = configuredEnv();
      const { sendPush } = await import('../apns.js');

      await sendPush('device-token-a', { title: 't', body: 'b' }, env);
      const firstAuth = capturedHeaders.authorization;

      makeFake(); // fresh stream for the 2nd call; connect() still resolves to it (closure)
      await sendPush('device-token-b', { title: 't', body: 'b' }, env);
      const secondAuth = capturedHeaders.authorization;

      expect(secondAuth).toBe(firstAuth);
    });

    it('a client-level connection error resolves {ok:false, error}, never rejects', async () => {
      const { sendPush } = await import('../apns.js');
      const promise = sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      fakeClient.emit('error', new Error('ECONNRESET'));
      await expect(promise).resolves.toEqual(
        expect.objectContaining({ ok: false, error: expect.stringContaining('ECONNRESET') })
      );
    });

    it('a request-level error resolves {ok:false, error}, never rejects', async () => {
      const { sendPush } = await import('../apns.js');
      const promise = sendPush('device-token', { title: 't', body: 'b' }, configuredEnv());
      fakeReq.emit('error', new Error('stream reset'));
      await expect(promise).resolves.toEqual(
        expect.objectContaining({ ok: false, error: expect.stringContaining('stream reset') })
      );
    });
  });
});
