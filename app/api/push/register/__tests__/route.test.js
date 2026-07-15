// app/api/push/register/__tests__/route.test.js
//
// route.js reads its Supabase env vars into module-scope consts at
// import time (same convention as welcome-emails/reorder-reminders), so
// every test sets process.env THEN vi.resetModules() THEN dynamically
// imports the route fresh — same per-scenario re-import idiom used
// throughout this suite (src/platform/push.test.js, lib/push/apns.test.js).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ORIGINAL_ENV = { ...process.env };

function makeRequest({ body, authorization } = {}) {
  return new NextRequest('http://localhost/api/push/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/push/register', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('401s when no Authorization header is present (no fetch to Supabase at all)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { POST } = await import('../route.js');

    const res = await POST(makeRequest({ body: { token: 'abc' } }));

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('401s when the bearer token does not verify against Supabase (getUser fails)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/auth/v1/user')) {
          return new Response('invalid token', { status: 401 });
        }
        throw new Error(`unexpected fetch to ${url}`);
      })
    );
    const { POST } = await import('../route.js');

    const res = await POST(makeRequest({ body: { token: 'abc' }, authorization: 'Bearer bad-token' }));

    expect(res.status).toBe(401);
  });

  it('400s when the verified caller sends no token in the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
        }
        throw new Error(`unexpected fetch to ${url}`);
      })
    );
    const { POST } = await import('../route.js');

    const res = await POST(makeRequest({ body: {}, authorization: 'Bearer good-token' }));

    expect(res.status).toBe(400);
  });

  it('upserts the token for the verified user, defaulting platform to ios, and returns 200', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url).includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
        }
        if (String(url).includes('/rest/v1/push_tokens')) {
          return new Response(null, { status: 201 });
        }
        throw new Error(`unexpected fetch to ${url}`);
      })
    );
    const { POST } = await import('../route.js');

    // Matches the ACTUAL client payload (src/app/PushPermissionExplainer.jsx
    // sends {token} only, no platform field — see that file's saveToken).
    const res = await POST(makeRequest({ body: { token: 'apns-token-abc' }, authorization: 'Bearer good-token' }));

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody).toEqual({ ok: true });

    const upsertCall = calls.find((c) => c.url.includes('push_tokens'));
    expect(upsertCall).toBeTruthy();
    expect(upsertCall.init.method).toBe('POST');
    expect(upsertCall.url).toContain('on_conflict=user_id,token');
    const sentBody = JSON.parse(upsertCall.init.body);
    expect(sentBody.user_id).toBe('user-1');
    expect(sentBody.token).toBe('apns-token-abc');
    expect(sentBody.platform).toBe('ios');
  });

  it('honors an explicit platform in the body (forward-looking, not sent by the current client)', async () => {
    const calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url).includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
        }
        return new Response(null, { status: 201 });
      })
    );
    const { POST } = await import('../route.js');

    await POST(makeRequest({ body: { token: 'tok', platform: 'android' }, authorization: 'Bearer good-token' }));

    const sentBody = JSON.parse(calls.find((c) => c.url.includes('push_tokens')).init.body);
    expect(sentBody.platform).toBe('android');
  });

  it('502s when the upsert itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/auth/v1/user')) {
          return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
        }
        return new Response('db error', { status: 500 });
      })
    );
    const { POST } = await import('../route.js');

    const res = await POST(makeRequest({ body: { token: 'abc' }, authorization: 'Bearer good-token' }));

    expect(res.status).toBe(502);
  });

  it('500s when Supabase env vars are missing, without ever calling fetch', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { POST } = await import('../route.js');

    const res = await POST(makeRequest({ body: { token: 'abc' }, authorization: 'Bearer good-token' }));

    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
