import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';

// Daily drip job. Invoked by Vercel Cron (see vercel.json) with a
// CRON_SECRET Bearer token, or manually from the admin UI (authed cookie).
//
// Rules:
// - Welcome 2 fires on day 3 after signup (subscribed_at <= now - 2 days).
// - Welcome 3 fires on day 8 after signup (subscribed_at <= now - 7 days)
//   AND welcome 2 has been sent.
//
// Each subscriber is processed once — the welcome_N_sent_at columns are
// stamped after a successful Resend send. Failures are retried on the
// next run (no row is stamped if the send errors).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function sendWelcome(request, template, email, firstName) {
  const origin = new URL(request.url).origin;
  const CRON_SECRET = process.env.CRON_SECRET;
  const r = await fetch(`${origin}/api/subscribe-welcome-${template}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ email, first_name: firstName || '' }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    return { ok: false, status: r.status, detail };
  }
  return { ok: true };
}

async function stampSent(id, column) {
  const r = await sbFetch(`/subscribers?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ [column]: new Date().toISOString() }),
  });
  return r.ok;
}

async function processBatch(request, template) {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const column = `welcome_${template}_sent_at`;
  let filter = '';
  if (template === 2) {
    filter = `?welcome_2_sent_at=is.null&subscribed_at=lte.${encodeURIComponent(twoDaysAgo)}&select=id,email,first_name`;
  } else {
    filter = `?welcome_2_sent_at=not.is.null&welcome_3_sent_at=is.null&subscribed_at=lte.${encodeURIComponent(sevenDaysAgo)}&select=id,email,first_name`;
  }
  filter += '&limit=100';

  const r = await sbFetch('/subscribers' + filter);
  if (!r.ok) {
    return { template, error: `query failed ${r.status}`, attempted: 0, sent: 0, failed: 0 };
  }
  const rows = await r.json();

  let sent = 0, failed = 0;
  const failures = [];
  for (const row of rows) {
    const res = await sendWelcome(request, template, row.email, row.first_name);
    if (!res.ok) {
      failed += 1;
      failures.push({ email: row.email, status: res.status, detail: res.detail });
      continue;
    }
    const stamped = await stampSent(row.id, column);
    if (!stamped) {
      failed += 1;
      failures.push({ email: row.email, detail: 'email sent but stamp failed' });
      continue;
    }
    sent += 1;
  }

  return { template, attempted: rows.length, sent, failed, failures };
}

export async function POST(request) {
  const unauth = requireAdminOrCron(request);
  if (unauth) return unauth;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  const w2 = await processBatch(request, 2);
  const w3 = await processBatch(request, 3);

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    welcome_2: w2,
    welcome_3: w3,
  });
}

// Vercel Cron invokes GET by default. Accept both so manual admin POSTs and
// scheduled GETs share the same implementation.
export async function GET(request) {
  return POST(request);
}
