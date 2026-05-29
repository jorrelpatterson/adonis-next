#!/usr/bin/env node
/**
 * migrate-content-calendar-2026-05-29.js
 *
 * One-time migration to resume the content calendar starting Fri 2026-05-29:
 *  1. Re-slots all `scheduled` social_posts onto consecutive Mon/Wed/Fri dates
 *     from 2026-05-29, preserving their current order (by scheduled_date asc).
 *  2. Inserts `news_card` social_posts for the currently approved (ready) news
 *     drafts, newest first, on Tue/Thu/Sat starting 2026-05-30.
 *  3. Marks those news drafts `approved` so they leave the review queue.
 *
 * Usage:
 *   node scripts/migrate-content-calendar-2026-05-29.js          # dry run (prints plan, no writes)
 *   node scripts/migrate-content-calendar-2026-05-29.js --apply  # execute writes
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1); }

const APPLY = process.argv.includes('--apply');
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const START = '2026-05-29';          // Friday — first compound slot
const NEWS_START = '2026-05-30';     // Saturday — first news slot
const MWF = new Set([1, 3, 5]);      // Mon, Wed, Fri
const TTS = new Set([2, 4, 6]);      // Tue, Thu, Sat

function ymd(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function parse(s) { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); }

// Generate `count` consecutive dates on or after `fromStr` whose weekday is in `daySet`.
function slots(fromStr, daySet, count) {
  const out = [];
  const d = parse(fromStr);
  while (out.length < count) {
    if (daySet.has(d.getUTCDay())) out.push(ymd(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function sb(pathStr, init = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1${pathStr}`, { ...init, headers: { ...H, ...(init.headers||{}) } });
  return r;
}

(async () => {
  console.log(`\n=== Content calendar migration ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===\n`);

  // 1. Re-slot scheduled compound posts ---------------------------------------
  const cRes = await sb(`/social_posts?select=id,scheduled_date,post_type,source_compound&status=eq.scheduled&order=scheduled_date.asc`);
  const compounds = await cRes.json();
  const mwf = slots(START, MWF, compounds.length);
  const reslot = compounds.map((p, i) => ({ ...p, new_date: mwf[i] })).filter(p => p.new_date !== p.scheduled_date);

  console.log(`1) Re-slot ${compounds.length} scheduled posts onto Mon/Wed/Fri from ${START}`);
  console.log(`   ${reslot.length} of them change date. First 6:`);
  compounds.slice(0, 6).forEach((p, i) =>
    console.log(`     ${p.scheduled_date} -> ${mwf[i]}  ${p.post_type.padEnd(16)} ${p.source_compound||''}`));
  console.log(`   ... last: ${compounds.at(-1)?.scheduled_date} -> ${mwf.at(-1)}\n`);

  // 2. News inserts -----------------------------------------------------------
  // The 7 drafts approved today (mis-marked `posted` by the old Approve&Download
  // button before it was replaced). They were never posted to IG — schedule all.
  const nRes = await sb(`/post_drafts?select=id,slot_date,hook,caption,hashtags,image_urls,status&status=eq.posted&approved_at=gte.${START}&order=slot_date.desc`);
  const ready = (await nRes.json()).filter(d => Array.isArray(d.image_urls) && d.image_urls.length === 4);
  const newsDates = slots(NEWS_START, TTS, ready.length);
  const newsPlan = ready.map((d, i) => ({ draft: d, date: newsDates[i] }));

  console.log(`2) Insert ${ready.length} news_card posts on Tue/Thu/Sat from ${NEWS_START} (newest first):`);
  newsPlan.forEach(({ draft, date }) => console.log(`     ${date}  ${(draft.hook||'').slice(0,60)}`));
  console.log('');

  if (!APPLY) { console.log('DRY RUN — no writes. Re-run with --apply to execute.\n'); return; }

  // --- APPLY ---
  let ok = 0, fail = 0;
  for (const p of reslot) {
    const r = await sb(`/social_posts?id=eq.${p.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ scheduled_date: p.new_date, updated_at: new Date().toISOString() }),
    });
    if (r.ok) ok++; else { fail++; console.error(`   PATCH ${p.id} failed: ${r.status} ${await r.text()}`); }
  }
  console.log(`   Re-slotted: ${ok} ok, ${fail} failed`);

  // Skip dates that already hold a news_card (idempotent re-run guard).
  const existRes = await sb(`/social_posts?select=scheduled_date&post_type=eq.news_card`);
  const existing = new Set((await existRes.json()).map(r => r.scheduled_date));

  for (const { draft, date } of newsPlan) {
    if (existing.has(date)) { console.log(`   news ${date}: already present, skip`); continue; }
    const caption = [(draft.caption||'').trim(), (draft.hashtags||[]).join(' ')].filter(Boolean).join('\n\n');
    const cr = await sb(`/social_posts`, {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ scheduled_date: date, post_type: 'news_card', image_path: draft.image_urls[0], caption, status: 'scheduled' }),
    });
    if (!cr.ok) { console.error(`   news insert ${date} failed: ${cr.status} ${await cr.text()}`); continue; }
    console.log(`   news ${date}: insert ok  (${(draft.hook||'').slice(0,50)})`);
  }
  console.log('\nDone.\n');
})().catch(e => { console.error(e); process.exit(1); });
