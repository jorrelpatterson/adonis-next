#!/usr/bin/env node
// Import a CSV of solar-rep contacts into ambassador_recruitment_recipients.
// Idempotent — re-runnable. Drops rows whose email is in compound_email_unsubscribes.
//
// Usage:  node scripts/import-recruitment-csv.js path/to/leads.csv [--batch-id=2026-05-28-wave-1]

const fs = require('fs');
const path = require('path');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith('--'));
const batchFlag = args.find(a => a.startsWith('--batch-id='));
const batchId = batchFlag ? batchFlag.split('=')[1] : new Date().toISOString().slice(0, 10);
if (!csvPath || !fs.existsSync(csvPath)) { console.error('CSV path missing or file not found:', csvPath); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimal CSV parser — handles quoted cells with commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; }
        if (c === '\r' && n === '\n') i++;
      } else cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function normalizeKey(k) {
  return String(k || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

(async () => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(raw);
  if (rows.length < 2) { console.error('CSV has no data rows'); process.exit(1); }

  const header = rows[0].map(normalizeKey);
  const idx = (...names) => {
    for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; }
    return -1;
  };

  const emailIdx = idx('email', 'email_address');
  const nameIdx  = idx('name', 'full_name');
  const firstIdx = idx('first_name', 'firstname', 'first');
  const lastIdx  = idx('last_name', 'lastname', 'last');
  const phoneIdx = idx('phone', 'phone_number', 'mobile');
  const compIdx  = idx('company', 'company_name', 'dealer');
  const cityIdx  = idx('city');
  const stateIdx = idx('state');
  const volIdx   = idx('volume', 'monthly_volume', 'sales_volume');

  if (emailIdx < 0) { console.error('CSV must have an "email" column'); process.exit(1); }

  // Load suppression list once
  const supRes = await fetch(`${URL_}/rest/v1/compound_email_unsubscribes?select=email`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const suppressed = new Set((supRes.ok ? await supRes.json() : []).map(r => String(r.email || '').toLowerCase()));

  const records = [];
  let skippedNoEmail = 0, skippedInvalid = 0, skippedSuppressed = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const email = String(r[emailIdx] || '').trim().toLowerCase();
    if (!email) { skippedNoEmail++; continue; }
    if (!EMAIL_RE.test(email)) { skippedInvalid++; continue; }
    if (suppressed.has(email)) { skippedSuppressed++; continue; }
    const name = nameIdx >= 0 ? String(r[nameIdx] || '').trim() : '';
    let first = firstIdx >= 0 ? String(r[firstIdx] || '').trim() : '';
    let last  = lastIdx  >= 0 ? String(r[lastIdx]  || '').trim() : '';
    if (!first && name) first = name.split(/\s+/)[0] || '';
    if (!last && name) last = name.split(/\s+/).slice(1).join(' ') || '';
    records.push({
      email,
      first_name: first || null,
      last_name: last || null,
      name: name || [first, last].filter(Boolean).join(' ') || null,
      phone: phoneIdx >= 0 ? String(r[phoneIdx] || '').trim() || null : null,
      company: compIdx >= 0 ? String(r[compIdx] || '').trim() || null : null,
      city: cityIdx >= 0 ? String(r[cityIdx] || '').trim() || null : null,
      state: stateIdx >= 0 ? String(r[stateIdx] || '').trim().toUpperCase() || null : null,
      volume: volIdx >= 0 ? String(r[volIdx] || '').trim() || null : null,
      csv_batch_id: batchId,
      drip_status: 'queued',
      next_touch_num: 1,
      next_send_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  }

  console.log(`Parsed ${rows.length - 1} rows | upserting ${records.length} | skipped no-email=${skippedNoEmail} invalid=${skippedInvalid} suppressed=${skippedSuppressed}`);

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    const res = await fetch(`${URL_}/rest/v1/ambassador_recruitment_recipients?on_conflict=email`, {
      method: 'POST', headers, body: JSON.stringify(batch),
    });
    if (!res.ok) { console.error('Upsert failed:', res.status, await res.text()); process.exit(1); }
    console.log(`  upserted ${i + batch.length}/${records.length}`);
  }
  console.log('Done. batch_id=' + batchId);
})().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
