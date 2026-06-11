import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';
import { buildRecipientList } from '../../../lib/buildRecipientList';
import { aggregateOrders, segmentRecipient, renderAnnouncement, SUBJECTS } from '../../../lib/rewardsAnnounce';

// One-off ADVNCE Rewards launch announcement.
// POST modes:
//   { mode: 'dryrun' }                          → segment counts + samples, sends nothing (default)
//   { mode: 'test', testEmail }                 → sends BOTH template variants to testEmail only
//   { mode: 'send', confirm: 'SEND EVERYONE', offset?, limit? }
//     → real send, deterministic email-sorted order; chunked + resumable via offset.
// No DB tracking table (one-off campaign): the response lists failures for retry.

export const maxDuration = 300;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const SEND_THROTTLE_MS = 600; // Resend default limit is 2 req/s — stay under it
const DEFAULT_LIMIT = 200;    // ~120-180s/chunk, safely under maxDuration

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// PostgREST silently caps responses at max-rows (default 1000) regardless of
// ?limit=. Verify nothing was truncated — a partial orders read would email
// members the wrong lifetime numbers.
async function fetchOrderRows() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=email,total,status,tier_unlocked&limit=10000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' }, cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`orders fetch failed: ${res.status}`);
  const rows = await res.json();
  const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  if (Number.isFinite(total) && total !== rows.length) {
    throw new Error(`orders read truncated (${rows.length} of ${total}) — paginate before sending`);
  }
  return rows;
}

// Same truncation hazard for the recipient sources read inside buildRecipientList.
async function assertSourcesNotTruncated() {
  for (const table of ['subscribers', 'ambassadors', 'orders']) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=email&limit=1`, {
      method: 'HEAD',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'count=exact' },
      cache: 'no-store',
    });
    const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
    if (Number.isFinite(total) && total > 1000) {
      throw new Error(`${table} has ${total} rows — buildRecipientList truncates at 1000; paginate before sending`);
    }
  }
}

async function sendEmail(to, subject, html) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + RESEND },
      body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to, subject, html }),
    });
    if (res.ok) return;
    if (res.status === 429 && attempt === 0) { await sleep(1100); continue; }
    const data = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(data).slice(0, 300));
  }
}

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;
  if (!RESEND) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const mode = body.mode || 'dryrun';
  const baseUrl = new URL(request.url).origin;

  let recipients, ordersByEmail;
  try {
    await assertSourcesNotTruncated();
    const [list, orderRows] = await Promise.all([buildRecipientList(), fetchOrderRows()]);
    recipients = list.sort((a, b) => a.email.localeCompare(b.email)); // deterministic order for offset resume
    ordersByEmail = aggregateOrders(orderRows);
  } catch (err) {
    return NextResponse.json({ error: 'Data load failed', detail: String(err.message || err) }, { status: 500 });
  }

  const plan = recipients.map(r => ({ recipient: r, seg: segmentRecipient(r, ordersByEmail) }));
  const counts = plan.reduce((a, p) => { a[p.seg.segment] = (a[p.seg.segment] || 0) + 1; return a; }, {});

  if (mode === 'dryrun') {
    return NextResponse.json({
      mode,
      total: plan.length,
      counts,
      subjects: SUBJECTS,
      members: plan.filter(p => p.seg.segment === 'member').map(p => ({
        email: p.recipient.email,
        tier: p.seg.tier.name,
        lifetime: p.seg.spend,
        gifts: p.seg.giftNames,
      })),
      samples: plan.slice(0, 10).map(p => ({ email: p.recipient.email, segment: p.seg.segment, lifetime: p.seg.spend })),
    });
  }

  if (mode === 'test') {
    const testEmail = String(body.testEmail || '').trim();
    if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(testEmail)) {
      return NextResponse.json({ error: 'Valid testEmail required' }, { status: 400 });
    }
    // Send both variants with representative sample data so copy can be reviewed.
    const sampleRecipient = { email: testEmail, name: 'Sample' };
    const memberSeg = { segment: 'member', spend: 480, tier: { name: 'MOMENTUM', threshold: 350, pct: 5, giftName: 'DSIP 5mg' }, giftNames: ['DSIP 5mg'], next: { name: 'VELOCITY', threshold: 1000, pct: 10 } };
    const introSeg = { segment: 'intro_progress', spend: 125, tier: null };
    try {
      const m = renderAnnouncement(sampleRecipient, memberSeg, baseUrl);
      await sendEmail(testEmail, '[TEST] ' + m.subject, m.html);
      await sleep(SEND_THROTTLE_MS);
      const i = renderAnnouncement(sampleRecipient, introSeg, baseUrl);
      await sendEmail(testEmail, '[TEST] ' + i.subject, i.html);
    } catch (err) {
      return NextResponse.json({ error: 'Test send failed', detail: String(err.message || err) }, { status: 500 });
    }
    return NextResponse.json({ mode, sent: 2, to: testEmail });
  }

  if (mode === 'send') {
    if (body.confirm !== 'SEND EVERYONE') {
      return NextResponse.json({ error: "Refusing: pass confirm: 'SEND EVERYONE' to really send" }, { status: 400 });
    }
    const offset = Math.max(parseInt(body.offset, 10) || 0, 0);
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || DEFAULT_LIMIT, 1), 1000);
    const chunk = plan.slice(offset, offset + limit);

    let sent = 0;
    const failed = [];
    for (const p of chunk) {
      try {
        const r = renderAnnouncement(p.recipient, p.seg, baseUrl);
        await sendEmail(p.recipient.email, r.subject, r.html);
        sent++;
      } catch (err) {
        failed.push({ email: p.recipient.email, error: String(err.message || err).slice(0, 200) });
      }
      await sleep(SEND_THROTTLE_MS);
    }

    const nextOffset = offset + chunk.length;
    return NextResponse.json({
      mode,
      counts,
      processed: chunk.length,
      sent,
      failed,
      next_offset: nextOffset < plan.length ? nextOffset : null,
      remaining: Math.max(plan.length - nextOffset, 0),
    });
  }

  return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({ status: 'rewards-announce route is live (POST with mode: dryrun | test | send)' });
}
