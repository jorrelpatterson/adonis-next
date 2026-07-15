// app/api/cron/routine-reminders/route.js
//
// Daily routine-reminder push. Invoked by Vercel Cron (see vercel.json,
// CRON_SECRET Bearer token) or manually from the admin UI (authed
// cookie) — same requireAdminOrCron guard as every other cron route in
// this repo (see app/api/cron/welcome-emails/route.js).
//
// WHAT THIS SENDS AND WHY: a single daily "time for your protocol" nudge
// to every still-registered iOS token due for one — NOT a smart reminder
// that skips users who already finished today's routine. Routine
// completion lives entirely in the app's localStorage (see
// src/services/storage.js); nothing about a user's daily progress is
// ever written to Supabase, so the server has no way to know who's
// already checked in today. See lib/push/due.js's header for the full
// reasoning — richer targeting needs server-side routine-completion
// state, a post-MVP roadmap item (state-sync), not something faked here.
//
// DORMANT UNTIL THE APNS KEY EXISTS: lib/push/apns.js's sendPush() is a
// guaranteed no-op (never contacts Apple) until Jorrel sets the 4
// APNS_* env vars at iOS P4 — so this cron is safe to deploy and run on
// its daily schedule today; every send just resolves
// {skipped:'apns-not-configured'}, counted below in `skipped`, and no
// push_tokens row ever gets stamped (so the very first run after the key
// is added treats every token as due, rather than some being
// artificially held back by a "successful" dormant-mode stamp).

import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { selectDueTokens } from '../../../../lib/push/due';
import { sendPush } from '../../../../lib/push/apns';

export const maxDuration = 60; // sequential per-token sends can add up as the user base grows

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const REMINDER_TITLE = 'Time for your protocol';
const REMINDER_BODY = 'Your routine is ready.';

async function fetchAllTokens() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/push_tokens?select=id,user_id,token,platform,last_notified_at`,
    {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: 'no-store',
    }
  );
  if (!r.ok) {
    throw new Error(`push_tokens query failed: ${r.status} ${await r.text().catch(() => '')}`);
  }
  return r.json();
}

async function stampNotified(id) {
  // Best-effort: if this PATCH fails, the row's last_notified_at simply
  // stays stale, so lib/push/due.js's guard lets it through again on the
  // NEXT run (~a day later per the cron schedule) — at worst one extra
  // reminder gets sent, never a lost one. Low enough stakes that this
  // isn't treated as a send failure the way welcome-emails treats a
  // stamp failure (there, a duplicate WELCOME email is a worse user
  // experience than a duplicate routine nudge).
  const r = await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ last_notified_at: new Date().toISOString() }),
  });
  return r.ok;
}

export async function POST(request) {
  const unauth = requireAdminOrCron(request);
  if (unauth) return unauth;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  let tokens;
  try {
    tokens = await fetchAllTokens();
  } catch (e) {
    // Soft-fail, matching welcome-emails' convention: a downstream query
    // hiccup (including push_tokens not existing yet, pre-manual-SQL-
    // apply) reports as a 200 body, not a 500 that fails the whole cron
    // invocation.
    return NextResponse.json({
      ran_at: new Date().toISOString(),
      sent: 0,
      skipped: 0,
      failed: 0,
      error: String(e.message || e),
    });
  }

  const due = selectDueTokens(tokens, new Date());

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const row of due) {
    let result;
    try {
      result = await sendPush(row.token, {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        data: { tab: 'routine' },
      });
    } catch (e) {
      result = { ok: false, error: String(e?.message || e) };
    }

    if (result.ok) {
      sent += 1;
      await stampNotified(row.id);
    } else if (result.skipped) {
      skipped += 1;
    } else {
      failed += 1;
      failures.push({ id: row.id, ...result });
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    eligible: tokens.length,
    due: due.length,
    sent,
    skipped,
    failed,
    failures: failures.slice(0, 20),
  });
}

// Vercel Cron invokes GET by default. Accept both so manual admin POSTs
// and scheduled GETs share the same implementation (mirrors welcome-emails).
export async function GET(request) {
  return POST(request);
}
