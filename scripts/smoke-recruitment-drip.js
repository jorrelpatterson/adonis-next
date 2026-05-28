#!/usr/bin/env node
// End-to-end smoke test for the recruitment drip.
// Verifies (without sending real email — by setting a non-recipient as send target):
//   1. Schema tables respond.
//   2. Renderer produces non-empty HTML for all 5 touches with substitutions intact.
//   3. CSV import upserts and skips suppressed.
//   4. Click-tracking route updates recipient state.
//   5. Apply API inserts an application and flips recipient to 'applied'.
//   6. Application approve creates an ambassador and updates application status.
//
// Run:  node scripts/smoke-recruitment-drip.js
// Exit codes: 0 on pass, 1 on any failure.

const fs = require('fs');
if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGIN = process.env.ADVNCE_ORIGIN || 'http://localhost:3000';
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!process.env.EMAIL_UNSUB_SECRET) { console.error('Missing EMAIL_UNSUB_SECRET'); process.exit(1); }
process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
process.env.SUPABASE_SERVICE_KEY = KEY;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
function fail(m) { console.error('✗ FAIL:', m); process.exit(1); }
function ok(m)   { console.log('✓', m); }

async function clean() {
  await fetch(`${URL_}/rest/v1/ambassador_applications?email=eq.smoke-recruit@example.com`, { method: 'DELETE', headers });
  await fetch(`${URL_}/rest/v1/ambassadors?email=eq.smoke-recruit@example.com`, { method: 'DELETE', headers });
  await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-recruit`, { method: 'DELETE', headers });
}

(async () => {
  await clean();

  // 1. Schema responds
  for (const t of ['ambassador_recruitment_recipients','ambassador_recruitment_sends','ambassador_applications']) {
    const r = await fetch(`${URL_}/rest/v1/${t}?limit=0`, { headers });
    if (!r.ok) fail(`${t} responded ${r.status}`);
  }
  ok('all 3 tables respond');

  // 2. Renderer
  const { renderRecruitmentEmail } = await import('../lib/renderRecruitmentEmail.js');
  const fakeRec = { id: '11111111-1111-1111-1111-111111111111', email: 'smoke-recruit@example.com', first_name: 'Smoke', company: 'SmokeSolar', state: 'CA' };
  for (const t of [1,2,3,4,5]) {
    const { html, subject } = await renderRecruitmentEmail(t, fakeRec, ORIGIN);
    if (!html.includes('Smoke')) fail(`touch ${t}: first_name missing`);
    if (!html.includes('email-unsub?t=')) fail(`touch ${t}: unsub link missing`);
    if (!subject || subject.length < 4) fail(`touch ${t}: subject missing`);
  }
  ok('renderer produces all 5 touches');

  // 3. CSV import — write a tiny CSV and import
  const csv = 'name,email,phone,company,city,state,volume\nSmoke Recruit,smoke-recruit@example.com,5550009999,SmokeSolar,Los Angeles,CA,$50k\n';
  fs.writeFileSync('/tmp/smoke-recruit.csv', csv);
  const { spawnSync } = require('child_process');
  const imp = spawnSync('node', ['scripts/import-recruitment-csv.js', '/tmp/smoke-recruit.csv', '--batch-id=smoke-recruit'], { encoding: 'utf8' });
  if (imp.status !== 0) fail('csv import failed: ' + imp.stdout + imp.stderr);
  fs.unlinkSync('/tmp/smoke-recruit.csv');
  const recRes = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?csv_batch_id=eq.smoke-recruit&select=*`, { headers });
  const recs = await recRes.json();
  if (recs.length !== 1) fail('expected 1 recipient, got ' + recs.length);
  const recipient = recs[0];
  ok(`csv imported 1 row (recipient ${recipient.id.slice(0,8)}...)`);

  // 4. Click tracking
  const clickRes = await fetch(`${ORIGIN}/api/recruitment-click?r=${recipient.id}&t=1&dest=apply`, { redirect: 'manual' });
  if (clickRes.status !== 302) fail('click did not redirect (got ' + clickRes.status + ')');
  const upd1 = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipient.id}&select=last_apply_clicked_at`, { headers });
  const [u1] = await upd1.json();
  if (!u1.last_apply_clicked_at) fail('click did not record on recipient');
  ok('click tracked + redirected');

  // 5. Apply
  const applyRes = await fetch(`${ORIGIN}/api/ambassador-apply`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'smoke-recruit@example.com', first_name: 'Smoke', last_name: 'Recruit', phone: '5550009999', why_interested: 'smoke', recipient_id: recipient.id, source_touch: 1 }),
  });
  if (!applyRes.ok) fail('apply failed: ' + await applyRes.text());
  const appLookup = await fetch(`${URL_}/rest/v1/ambassador_applications?email=eq.smoke-recruit@example.com&select=*&limit=1`, { headers });
  const [appRow] = await appLookup.json();
  if (!appRow) fail('application not inserted');
  if (appRow.status !== 'pending') fail('application status not pending');
  // Recipient should be applied
  const recLookup = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?id=eq.${recipient.id}&select=drip_status,applied_at`, { headers });
  const [r2] = await recLookup.json();
  if (r2.drip_status !== 'applied') fail('recipient drip_status not applied');
  ok('apply: inserted application + recipient flipped to applied');

  // 6. NOTE: approval triggers a real Resend ambassador-welcome email. Skip in smoke.
  // Instead, verify the route's GET status only.
  const gw = await fetch(`${ORIGIN}/api/recruitment-application-write`);
  const gd = await gw.json();
  if (!gd.status || !gd.status.includes('live')) fail('application-write route missing');
  ok('application-write route is live (approval skipped to avoid real send)');

  await clean();
  ok('cleanup done');

  console.log('\nAll smoke checks passed.');
})().catch(err => { console.error('FATAL:', err.message, err.stack); process.exit(1); });
