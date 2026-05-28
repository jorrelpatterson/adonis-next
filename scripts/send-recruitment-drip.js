#!/usr/bin/env node
// Advance every eligible recipient through the next touch of the recruitment drip.
// Called by cron once an hour. Idempotent — re-runnable.

const fs = require('fs');
if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const BASE = process.env.ADVNCE_ORIGIN || 'https://www.adonis.pro';

if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!RESEND)       { console.error('Missing RESEND_API_KEY'); process.exit(1); }

// Touch spacing in days (gap from previous touch to this one):
// touch 1 = 0 (initial), then 3, 4, 7, 7 (totals: 0, 3, 7, 14, 21)
const GAP_DAYS_AFTER_TOUCH = { 1: 3, 2: 4, 3: 7, 4: 7, 5: 0 };
const THROTTLE_MS = 250;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const nowIso = new Date().toISOString();
  // Fetch candidates: queued/in_progress/paused, due now, paused_until expired or null
  const q =
    `${URL_}/rest/v1/ambassador_recruitment_recipients?` +
    `drip_status=in.(queued,in_progress,paused)&` +
    `next_send_at=lte.${encodeURIComponent(nowIso)}&` +
    `or=(paused_until.is.null,paused_until.lte.${encodeURIComponent(nowIso)})&` +
    `select=*&limit=200`;
  const candRes = await fetch(q, { headers });
  if (!candRes.ok) { console.error('Candidate lookup failed:', candRes.status, await candRes.text()); process.exit(1); }
  const cands = await candRes.json();
  console.log(`candidates due: ${cands.length}`);

  // Load suppression list to short-circuit mid-flight unsubscribes
  const supRes = await fetch(`${URL_}/rest/v1/compound_email_unsubscribes?select=email`, { headers });
  const suppressed = new Set((supRes.ok ? await supRes.json() : []).map(r => String(r.email || '').toLowerCase()));

  let sent = 0, failed = 0, skipped = 0;

  const { renderRecruitmentEmail } = await import('../lib/renderRecruitmentEmail.js');

  for (const rec of cands) {
    const email = String(rec.email || '').toLowerCase();
    if (suppressed.has(email)) {
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ drip_status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }),
      });
      skipped++; continue;
    }

    const touch = rec.next_touch_num;
    if (!(touch >= 1 && touch <= 5)) { skipped++; continue; }

    let html, subject;
    try { ({ html, subject } = await renderRecruitmentEmail(touch, rec, BASE)); }
    catch (err) { console.error('render error:', rec.id, err.message); failed++; continue; }

    let ok = false, resendId = null, error = null;
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + RESEND },
        body: JSON.stringify({
          from: 'advnce labs <ambassadors@advncelabs.com>',
          to: email, subject, html,
        }),
      });
      const data = await sendRes.json().catch(() => ({}));
      if (sendRes.ok) { ok = true; resendId = data.id || null; }
      else { error = JSON.stringify(data).slice(0, 500); }
    } catch (err) { error = String(err.message || err).slice(0, 500); }

    await fetch(`${URL_}/rest/v1/ambassador_recruitment_sends`, {
      method: 'POST', headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ recipient_id: rec.id, touch_num: touch, sent_at: new Date().toISOString(), resend_id: resendId, status: ok ? 'sent' : 'failed', error }),
    });

    if (ok) {
      sent++;
      const patch = {};
      if (touch === 5) { patch.drip_status = 'completed'; patch.next_send_at = null; }
      else {
        patch.drip_status = 'in_progress';
        patch.next_touch_num = touch + 1;
        patch.next_send_at = new Date(Date.now() + GAP_DAYS_AFTER_TOUCH[touch] * 24 * 60 * 60 * 1000).toISOString();
      }
      // Clear paused_until once delivered
      patch.paused_until = null;
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(patch),
      });
    } else {
      failed++;
      // Don't advance touch on failure — cron will retry. But push next_send_at out 1h to avoid hammering.
      await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${rec.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ next_send_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() }),
      });
    }

    await sleep(THROTTLE_MS);
  }

  console.log(`done | sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
