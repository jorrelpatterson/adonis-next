// app/api/cron/routine-reminders/__tests__/route.test.js
//
// Same module-scope-env-vars-at-import-time reality as every other cron
// route in this repo, so each test sets process.env THEN
// vi.resetModules() THEN dynamically imports the route fresh.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ORIGINAL_ENV = { ...process.env };

function makeRequest(authorization) {
  return new NextRequest('http://localhost/api/cron/routine-reminders', {
    method: 'GET',
    headers: authorization ? { authorization } : {},
  });
}

describe('cron: /api/cron/routine-reminders', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'service-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Guarantee the dormant guard fires regardless of the host shell's
    // ambient env — this suite must never risk a live Apple call.
    delete process.env.APNS_KEY_P8;
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APNS_BUNDLE_ID;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it('401s without any Authorization header (no admin cookie either)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { GET } = await import('../route.js');

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('401s with the wrong bearer secret', async () => {
    const { GET } = await import('../route.js');
    const res = await GET(makeRequest('Bearer nope'));
    expect(res.status).toBe(401);
  });

  it('200s with sent:0 when the token table is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/rest/v1/push_tokens')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        throw new Error(`unexpected fetch to ${url}`);
      })
    );
    const { GET } = await import('../route.js');

    const res = await GET(makeRequest('Bearer test-cron-secret'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.due).toBe(0);
  });

  it('200s with sent:0, error set (soft-fail) when the push_tokens query itself fails (e.g. table not applied yet)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('/rest/v1/push_tokens')) {
          return new Response('relation "push_tokens" does not exist', { status: 404 });
        }
        throw new Error(`unexpected fetch to ${url}`);
      })
    );
    const { GET } = await import('../route.js');

    const res = await GET(makeRequest('Bearer test-cron-secret'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.error).toBeTruthy();
  });

  it('the dormant guard holds end-to-end: due tokens exist, but with APNS_* unset nothing is actually sent', async () => {
    const patchCalls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        const u = String(url);
        if (u.includes('/rest/v1/push_tokens') && (!init || init.method !== 'PATCH')) {
          return new Response(
            JSON.stringify([
              { id: 'row-1', user_id: 'user-1', token: 'tok-1', platform: 'ios', last_notified_at: null },
            ]),
            { status: 200 }
          );
        }
        if (u.includes('/rest/v1/push_tokens') && init?.method === 'PATCH') {
          patchCalls.push(u);
          return new Response(null, { status: 204 });
        }
        throw new Error(`unexpected fetch to ${u}`);
      })
    );
    const { GET } = await import('../route.js');

    const res = await GET(makeRequest('Bearer test-cron-secret'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.due).toBe(1);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.failed).toBe(0);
    // No token was stamped notified — a real send never happened, so the
    // next run (once a key exists) must still see this token as due.
    expect(patchCalls).toHaveLength(0);
  });

  it('500s when Supabase env vars are missing, without ever calling fetch', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { GET } = await import('../route.js');

    const res = await GET(makeRequest('Bearer test-cron-secret'));

    expect(res.status).toBe(500);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
