import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';
import { buildRecipientList } from '../../../lib/buildRecipientList';
import { renderCompoundEmail } from '../../../lib/renderCompoundEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_CHUNK = 500;
const SEND_THROTTLE_MS = 200;

function sbHeaders() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
}

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...init, headers: { ...sbHeaders(), ...(init.headers || {}) } });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;
  if (!RESEND) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { draft_id, chunk_size } = body || {};
  if (!UUID_RE.test(String(draft_id || ''))) return NextResponse.json({ error: 'Invalid draft_id' }, { status: 400 });
  const CHUNK = Math.min(Math.max(parseInt(chunk_size, 10) || DEFAULT_CHUNK, 1), 1000);

  const dRes = await sb(`/compound_email_drafts?id=eq.${draft_id}&select=*&limit=1`, { cache: 'no-store' });
  if (!dRes.ok) return NextResponse.json({ error: 'Draft lookup failed' }, { status: 500 });
  const [draft] = await dRes.json();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  // FIRST-CALL BRANCH: status=ready → transition + materialize recipients.
  if (draft.status === 'ready') {
    let recipients;
    try {
      recipients = await buildRecipientList();
    } catch (err) {
      return NextResponse.json({ error: 'Recipient build failed', detail: String(err.message || err) }, { status: 500 });
    }
    for (let i = 0; i < recipients.length; i += 500) {
      const batch = recipients.slice(i, i + 500).map(r => ({
        draft_id, email: r.email, name: r.name, source: r.source, status: 'pending',
      }));
      const ins = await sb('/compound_email_recipients', { method: 'POST', body: JSON.stringify(batch) });
      if (!ins.ok) return NextResponse.json({ error: 'Recipient insert failed', detail: await ins.text() }, { status: 500 });
    }
    await sb(`/compound_email_drafts?id=eq.${draft_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'sending', recipient_count: recipients.length }),
    });
    draft.status = 'sending';
    draft.recipient_count = recipients.length;
  }

  if (draft.status !== 'sending') {
    return NextResponse.json({ error: `Cannot send draft in status ${draft.status}` }, { status: 400 });
  }

  // Process next chunk of pending recipients.
  const pendRes = await sb(`/compound_email_recipients?draft_id=eq.${draft_id}&status=eq.pending&select=*&limit=${CHUNK}`, { cache: 'no-store' });
  if (!pendRes.ok) return NextResponse.json({ error: 'Pending lookup failed' }, { status: 500 });
  const pending = await pendRes.json();

  const baseUrl = new URL(request.url).origin;
  let sentCount = 0, failedCount = 0;
  for (const r of pending) {
    const html = renderCompoundEmail(draft, r.email, baseUrl);
    const subject = draft.hook ? draft.hook.replace(/^"|"$/g, '') : draft.compound_name;
    let resendId = null, error = null, ok = false;
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: r.email,
          subject,
          html,
        }),
      });
      const data = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) { ok = true; resendId = data.id || null; }
      else { error = JSON.stringify(data).slice(0, 500); }
    } catch (err) {
      error = String(err.message || err).slice(0, 500);
    }

    await sb(`/compound_email_recipients?id=eq.${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : null,
        resend_id: resendId,
        error,
      }),
    });
    if (ok) sentCount++; else failedCount++;

    await sleep(SEND_THROTTLE_MS);
  }

  // Recount totals.
  const countRes = await sb(`/compound_email_recipients?draft_id=eq.${draft_id}&select=status`, { cache: 'no-store' });
  const all = countRes.ok ? await countRes.json() : [];
  const totals = all.reduce((a, x) => { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
  const sentTotal = totals.sent || 0;
  const failedTotal = totals.failed || 0;
  const remaining = totals.pending || 0;

  const patch = {
    recipient_count_sent: sentTotal,
    recipient_count_failed: failedTotal,
  };
  if (remaining === 0) {
    patch.status = 'sent';
    patch.sent_at = new Date().toISOString();
  }
  await sb(`/compound_email_drafts?id=eq.${draft_id}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  });

  return NextResponse.json({
    draft_id,
    status: patch.status || 'sending',
    processed_this_call: pending.length,
    sent_total: sentTotal,
    failed_total: failedTotal,
    remaining,
  });
}

export async function GET() {
  return NextResponse.json({ status: 'compound-email-send route is live' });
}
