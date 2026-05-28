#!/usr/bin/env node
// End-to-end smoke test for compound spotlight email campaigns.
//
// Asserts (without actually sending real email — exits before invoking Resend):
//   1. compound_marketing has oxytocin row.
//   2. onStockRise fires on 0 → positive, creates a draft.
//   3. Draft can be updated with copy fields.
//   4. Preview renders and contains expected markers.
//   5. Recipient builder returns a deduped list.
//   6. Unsubscribe token roundtrip works.
//
// Run: node scripts/smoke-compound-email.js
// Exit codes: 0 on pass, 1 on any failure.

const fs = require('fs');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }
if (!process.env.EMAIL_UNSUB_SECRET) { console.error('Missing EMAIL_UNSUB_SECRET'); process.exit(1); }
process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
process.env.SUPABASE_SERVICE_KEY = KEY;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function fail(msg) { console.error('✗ FAIL:', msg); process.exit(1); }
function ok(msg)   { console.log('✓', msg); }

async function clean() {
  await fetch(`${URL}/rest/v1/compound_email_drafts?created_by=eq.system:smoke-test`, { method: 'DELETE', headers });
  await fetch(`${URL}/rest/v1/compound_email_drafts?created_by=eq.smoke-test`, { method: 'DELETE', headers });
}

(async () => {
  await clean();

  // 1. compound_marketing has oxytocin.
  const cmRes = await fetch(`${URL}/rest/v1/compound_marketing?compound_slug=eq.oxytocin&select=*`, { headers });
  const cmRows = await cmRes.json();
  if (!cmRows.length) fail('oxytocin missing from compound_marketing (run sync-compound-marketing.js + SKU updates)');
  if (!cmRows[0].sku) fail('oxytocin row missing sku — apply SKU updates');
  ok('compound_marketing has oxytocin with SKU');

  // 2. onStockRise fires.
  const { onStockRise } = await import('../lib/onStockRise.js');
  const result = await onStockRise({ sku: cmRows[0].sku, previousStock: 0, newStock: 50, source: 'smoke-test' });
  if (!result.fired) fail(`onStockRise did not fire: ${result.reason}`);
  ok(`onStockRise fired (draft_id ${result.draft_id})`);
  const draftId = result.draft_id;

  // No-op case
  const result2 = await onStockRise({ sku: cmRows[0].sku, previousStock: 10, newStock: 50 });
  if (result2.fired) fail('onStockRise fired when it should not have');
  ok('onStockRise no-op on non-transition');

  // 3. Update the draft.
  const patchRes = await fetch(`${URL}/rest/v1/compound_email_drafts?id=eq.${draftId}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({
      tagline: 'The bonding nonapeptide.',
      layman_lead: 'In plain terms: oxytocin is the peptide your brain releases during physical touch.',
      layman_bridge: 'Researchers have been studying it for decades.',
      bullet_1: 'A nine-amino-acid peptide.',
      bullet_2: 'Pair-bonding research.',
      bullet_3: 'Anxiolytic markers.',
    }),
  });
  if (!patchRes.ok) fail(`patch failed: ${await patchRes.text()}`);
  ok('draft updated with copy fields');

  // 4. Render preview.
  const dRes = await fetch(`${URL}/rest/v1/compound_email_drafts?id=eq.${draftId}&select=*`, { headers });
  const [draft] = await dRes.json();
  const { renderCompoundEmail } = await import('../lib/renderCompoundEmail.js');
  const html = renderCompoundEmail(draft, 'smoke@example.com', 'http://localhost:3000');
  if (!html.includes('OXYTOCIN')) fail('rendered html missing compound name');
  if (!html.includes('Now in stock')) fail('rendered html missing stock stamp (draft was restock-triggered)');
  if (!html.includes('email-unsub?t=')) fail('rendered html missing unsubscribe link');
  if (!html.includes("There's a peptide")) fail("rendered html missing campaign payoff line");
  ok('renderCompoundEmail produces expected output');

  // 5. Recipient builder.
  const { buildRecipientList } = await import('../lib/buildRecipientList.js');
  const list = await buildRecipientList();
  if (!Array.isArray(list)) fail('buildRecipientList did not return array');
  const dupes = list.length - new Set(list.map(r => r.email)).size;
  if (dupes !== 0) fail(`recipient list has ${dupes} dupes`);
  ok(`recipient list: ${list.length} unique emails`);

  // 6. Token roundtrip.
  const { signUnsubToken, verifyUnsubToken } = await import('../lib/unsubToken.js');
  const t = signUnsubToken('TestUser@Example.com');
  const v = verifyUnsubToken(t);
  if (v !== 'testuser@example.com') fail(`unsub token roundtrip mismatch: got ${v}`);
  if (verifyUnsubToken(t.slice(0, -2) + 'ff') !== null) fail('tampered token did not return null');
  ok('unsub token sign/verify works');

  // Cleanup.
  await clean();
  ok('cleanup done');

  console.log('\nAll smoke checks passed.');
})().catch(err => fail(err.message || String(err)));
