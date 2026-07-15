// app/api/push/register/route.js
//
// Registers (upserts) an APNs device token for the signed-in Adonis app
// user. Called by src/app/PushPermissionExplainer.jsx's saveToken(),
// after a successful native PushNotifications 'registration' event (see
// src/platform/push.js, iOS P3 Task 3) — POST {token} with
// `Authorization: Bearer <supabase access token>`.
//
// AUTH: the app's Supabase Auth session lives entirely client-side (see
// src/services/auth.js) — there's no existing server-side "who is this
// request from" helper for a signed-in APP user (requireAdminOrCron /
// get-current-admin are for the cookie-based /admin dashboard, a
// completely separate user namespace — see CLAUDE.md's dual-stack note).
// So this route verifies the caller's bearer token itself, the same way
// Supabase's own client SDK would: GET {SUPABASE_URL}/auth/v1/user with
// the token as the Authorization bearer + the anon key as `apikey`
// (identifies the PROJECT, not the caller) — GoTrue returns the user
// object if the token is valid and unexpired, 401 otherwise. Once we
// have a trusted user_id, the actual row write uses the SERVICE key
// (bypasses RLS) — the same service-key-write pattern every other
// cron/admin route in this repo uses (see welcome-emails' sbFetch) —
// rather than forwarding the user's own token to PostgREST (which would
// also work under this table's RLS policy, but this repo has no
// precedent for a per-request user-scoped Supabase client, so
// service-key + a verified user_id keeps this route consistent with
// every other write in the codebase).
//
// PLATFORM: the current client (PushPermissionExplainer.jsx) only ever
// sends {token} — no platform field — so it defaults to 'ios' here,
// matching the push_tokens column's own DB default
// (sql/2026-07-14-push-tokens.sql). Accepting an explicit platform in
// the body is forward-looking (a future Android build could send one)
// without requiring a client change today.

import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getUserIdFromBearer(accessToken) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!r.ok) return null;
  const user = await r.json().catch(() => null);
  return user?.id || null;
}

export async function POST(request) {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserIdFromBearer(accessToken);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }
  const platform = typeof body?.platform === 'string' && body.platform ? body.platform : 'ios';

  const r = await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?on_conflict=user_id,token`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return NextResponse.json({ error: 'Upsert failed', detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
