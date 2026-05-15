#!/usr/bin/env node
// scripts/smoke-career-ingest.js
//
// End-to-end smoke test for the career ingest cron.
// Calls the local dev server (must be running on :3000) with the CRON_SECRET,
// asserts the response shape, and prints a summary.
//
// Requires:
//   CRON_SECRET in env (or /tmp/adonis.env)
//
// Run: node scripts/smoke-career-ingest.js

const fs = require('fs');

if (fs.existsSync('/tmp/adonis.env')) {
  for (const line of fs.readFileSync('/tmp/adonis.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SECRET = process.env.CRON_SECRET;
const URL = process.env.SMOKE_URL || 'http://localhost:3000/api/cron/career/ingest';

if (!SECRET) {
  console.error('Missing CRON_SECRET');
  process.exit(1);
}

(async () => {
  console.log(`POST-ish (GET) ${URL} ...`);
  const t0 = Date.now();
  const res = await fetch(URL, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`HTTP ${res.status} in ${elapsed}s`);

  const body = await res.json();
  if (!res.ok || !body.ok) {
    console.error('FAIL', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('\nTotals:', body.totals);
  console.log('\nPer-source summary:');
  for (const s of body.summaries) {
    const errors = s.errors.length ? ` errors=${s.errors.length}` : '';
    console.log(`  ${s.source.padEnd(11)} fetched=${String(s.fetched).padStart(4)}  pre_filtered=${String(s.pre_filtered).padStart(3)}  duplicates=${String(s.duplicates).padStart(3)}  inserted=${String(s.inserted).padStart(3)}${errors}`);
  }

  if (body.totals.fetched === 0) {
    console.error('\nFAIL: zero jobs fetched across all sources. Check env vars + target seed rows.');
    process.exit(1);
  }

  console.log('\nOK');
})().catch(err => {
  console.error('THREW:', err);
  process.exit(1);
});
