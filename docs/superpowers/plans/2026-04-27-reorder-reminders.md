# Reorder Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a 14-day soft nudge and 3-day urgent reminder email per delivered order line item before the customer is likely to run out, with auto-compute from `lib/constants/peptides.js`, manual `typical_days_supply` override, and dedup against newer orders for the same customer + SKU.

**Architecture:** A daily Vercel cron scans delivered orders, computes runout per item via a shared helper (`lib/reorderDuration.js`), and sends emails through Resend. Sends are recorded in `reorder_reminders_sent` with a unique constraint that's the source of truth for "already sent." No pre-scheduled rows — runout is recomputed every pass so updates to `typical_days_supply` take effect immediately.

**Tech Stack:** Next.js 14 App Router · JavaScript/JSX (no TS) · Supabase (PostgREST) · Resend · Vercel Cron · no test framework configured (verification = node script + curl smoke).

**Spec:** [`docs/superpowers/specs/2026-04-27-reorder-reminders-design.md`](../specs/2026-04-27-reorder-reminders-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sql/2026-04-27-reorder-reminders.sql` | create | Adds `products.typical_days_supply` and creates `reorder_reminders_sent` table. |
| `lib/reorderDuration.js` | create | Pure function `daysSupply(sku, productRow, qty) → number \| null`. Manual override → peptides.js auto-compute → null. |
| `lib/reorderDuration.test.mjs` | create | Standalone node script that asserts behavior across known SKUs (no test framework available). Also enumerates auto-compute coverage so we know what needs manual override. |
| `app/api/cron/reorder-reminders/route.js` | create | Daily cron endpoint. Auth, load orders + products + sent log, bucket per-order, dedup, send via Resend, stamp. |
| `vercel.json` | modify | Add cron schedule entry. |
| `app/admin/inventory/page.jsx` | modify | Inline edit for `typical_days_supply` so Jorrel can populate the SKUs the auto-compute can't handle. |

---

## Task 1: Schema migration

**Files:**
- Create: `sql/2026-04-27-reorder-reminders.sql`

- [ ] **Step 1: Write the SQL**

```sql
-- 2026-04-27: reorder reminders — add typical_days_supply override + sent log
-- Run in Supabase SQL editor (project: efuxqrvdkrievbpljlaf)

alter table products
  add column if not exists typical_days_supply integer;

create table if not exists reorder_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  reminder_type text not null check (reminder_type in ('14d', '3d')),
  sent_at timestamptz not null default now(),
  email_to text not null,
  unique (order_id, sku, reminder_type)
);

create index if not exists reorder_reminders_sent_lookup
  on reorder_reminders_sent(order_id, sku);

-- Verify:
-- select column_name from information_schema.columns
-- where table_name='products' and column_name='typical_days_supply';
-- select count(*) from reorder_reminders_sent;
```

- [ ] **Step 2: Hand the file to Jorrel**

Tell Jorrel: paste `sql/2026-04-27-reorder-reminders.sql` into the Supabase SQL editor of project `efuxqrvdkrievbpljlaf` and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify column and table exist**

```bash
curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/products?select=sku,typical_days_supply&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
# Expected: [{"sku":"...","typical_days_supply":null}]

curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/reorder_reminders_sent?select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
# Expected: [] (empty array)
```

- [ ] **Step 4: Commit**

```bash
git add sql/2026-04-27-reorder-reminders.sql
git commit -m "sql: add reorder reminder schema (typical_days_supply + sent log)"
```

---

## Task 2: `daysSupply` helper

**Files:**
- Create: `lib/reorderDuration.js`

The helper resolves in order: manual override → peptides.js auto-compute → null.

- [ ] **Step 1: Write the helper**

```js
// Single source of truth for "how many days does this SKU last?"
//
// Resolution order:
//   1. products.typical_days_supply (manual override) — return verbatim × qty
//   2. lib/constants/peptides.js auto-compute via dose × frequency math
//   3. null  — caller must skip this SKU (no reminder scheduled)
//
// The parser is intentionally conservative: ambiguous dose strings
// ("Per protocol", "as needed", ranges with non-numeric units) return null.
//
// All math is mg-based internally; mcg is converted on parse.

import { PEPTIDES } from './constants/peptides';

const DOSES_PER_WEEK = {
  daily: 7,
  '2x_week': 2,
  weekly: 1,
};

// Build a sku → peptide lookup once at module load.
const PEPTIDES_BY_SKU = (() => {
  const map = {};
  for (const p of PEPTIDES) {
    if (p.vendorSku) map[p.vendorSku] = p;
  }
  return map;
})();

function parseSizeMg(sizeStr) {
  // "10mg", "10mg / 3ml", "5mg", "100mg"
  if (!sizeStr) return null;
  const m = String(sizeStr).match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = m[2].toLowerCase();
  if (unit === 'mg') return n;
  if (unit === 'mcg') return n / 1000;
  if (unit === 'g') return n * 1000;
  return null;
}

function parseDoseMidpointMg(doseStr) {
  // "0.25-2.4mg/wk", "300mcg/day", "2-5mg 2x/wk", "1-2mg/day"
  // Take the first numeric-range we find with mg or mcg unit.
  if (!doseStr) return null;
  const m = String(doseStr).match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(mg|mcg)\b/i);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const mid = (lo + hi) / 2;
  const unit = m[3].toLowerCase();
  return unit === 'mcg' ? mid / 1000 : mid;
}

export function daysSupply(sku, productRow, qty = 1) {
  const q = Math.max(1, Number(qty) || 1);

  // 1. Manual override
  const manual = productRow?.typical_days_supply;
  if (manual != null && Number.isFinite(Number(manual)) && Number(manual) > 0) {
    return Math.round(Number(manual) * q);
  }

  // 2. peptides.js auto-compute
  const p = PEPTIDES_BY_SKU[sku];
  if (!p) return null;

  const dosesPerWeek = DOSES_PER_WEEK[p.freq];
  if (!dosesPerWeek) return null; // skip 'as_needed' and unknown frequencies

  const vialMg = parseSizeMg(p.size);
  const doseMg = parseDoseMidpointMg(p.dose);
  if (!vialMg || !doseMg || doseMg <= 0) return null;

  const weeklyMg = doseMg * dosesPerWeek;
  if (weeklyMg <= 0) return null;
  const days = (vialMg / weeklyMg) * 7;
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.round(days * q);
}
```

- [ ] **Step 2: Sanity-check syntax**

```bash
node --check lib/reorderDuration.js
# Expected: no output (parse OK)
```

- [ ] **Step 3: Commit**

```bash
git add lib/reorderDuration.js
git commit -m "lib/reorderDuration: per-SKU days_supply helper"
```

---

## Task 3: Behavior tests for `daysSupply`

**Files:**
- Create: `lib/reorderDuration.test.mjs`

No test framework — this is a self-contained node script that asserts a handful of known cases and surfaces auto-compute coverage across the catalog.

- [ ] **Step 1: Write the test**

```js
// Behavior tests for daysSupply. Run: node lib/reorderDuration.test.mjs
// No test framework — assertions throw on failure, exit code reflects outcome.

import { daysSupply } from './reorderDuration.js';
import { PEPTIDES } from './constants/peptides.js';

const cases = [
  // Manual override always wins
  { name: 'manual override',
    sku: 'RT10', row: { typical_days_supply: 35 }, qty: 1, expect: 35 },
  { name: 'manual override × qty',
    sku: 'RT10', row: { typical_days_supply: 35 }, qty: 2, expect: 70 },

  // RT10 (Retatrutide 10mg, dose 0.5-12mg/wk midpoint 6.25mg, weekly)
  // 10mg / 6.25mg per dose / 1 dose per week × 7 = 11.2 → 11 days
  { name: 'RT10 auto-compute',
    sku: 'RT10', row: { typical_days_supply: null }, qty: 1, expect: 11 },

  // BC5 (BPC-157 5mg, dose 250-500mcg/day midpoint 0.375mg, daily)
  // 5mg / 0.375mg / 7 doses per week × 7 = 13.33 → 13 days
  { name: 'BC5 auto-compute',
    sku: 'BC5', row: { typical_days_supply: null }, qty: 1, expect: 13 },

  // SM10 (Semaglutide 10mg, dose 0.25-2.4mg/wk midpoint 1.325mg, weekly)
  // 10 / 1.325 × 7 = 52.83 → 53 days
  { name: 'SM10 auto-compute',
    sku: 'SM10', row: { typical_days_supply: null }, qty: 1, expect: 53 },

  // P41 (PT-141, freq=as_needed) → null
  { name: 'PT-141 as_needed → null',
    sku: 'P41', row: { typical_days_supply: null }, qty: 1, expect: null },

  // Unknown SKU → null
  { name: 'unknown SKU → null',
    sku: 'NOPE-XX', row: { typical_days_supply: null }, qty: 1, expect: null },

  // Manual override but invalid value falls through to auto-compute
  { name: 'invalid manual falls through',
    sku: 'RT10', row: { typical_days_supply: 0 }, qty: 1, expect: 11 },
  { name: 'negative manual falls through',
    sku: 'RT10', row: { typical_days_supply: -5 }, qty: 1, expect: 11 },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = daysSupply(c.sku, c.row, c.qty);
  const ok = got === c.expect;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${c.name} — got ${got} expected ${c.expect}`);
  ok ? pass++ : fail++;
}

// Coverage report: how many catalog SKUs auto-compute vs. need manual override?
let auto = 0, manual_needed = 0, freq_skip = 0;
for (const p of PEPTIDES) {
  if (!p.vendorSku) continue;
  const days = daysSupply(p.vendorSku, { typical_days_supply: null }, 1);
  if (days != null) auto++;
  else if (!['daily', '2x_week', 'weekly'].includes(p.freq)) freq_skip++;
  else manual_needed++;
}
console.log('---');
console.log(`Catalog coverage: ${auto} auto-compute, ${manual_needed} need manual, ${freq_skip} freq-skip`);
console.log(`Asserts: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: Run the tests**

```bash
node lib/reorderDuration.test.mjs
```

Expected: All asserts PASS. Coverage report shows ~70-80 SKUs auto-computed; the remainder need manual override (Jorrel can populate over time via Task 8). If any of the explicit asserts FAIL, the parser is wrong — fix in `lib/reorderDuration.js`.

The `.mjs` extension lets node treat the file as ES modules without a `package.json` change. Don't ship to Vercel — `.test.mjs` is naturally excluded since Next.js only bundles imports actually referenced.

- [ ] **Step 3: Commit**

```bash
git add lib/reorderDuration.test.mjs
git commit -m "lib/reorderDuration: assertion script + catalog coverage report"
```

---

## Task 4: Cron route — auth + data load

**Files:**
- Create: `app/api/cron/reorder-reminders/route.js`

Build the route in pieces. This task does just auth + loading the three data sources, returning a JSON shape so we can verify before adding logic.

- [ ] **Step 1: Write the skeleton**

```js
import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { daysSupply } from '../../../../lib/reorderDuration';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbInsert(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(body),
  });
  // 201 = inserted, 409 = unique conflict (already sent — fine).
  return r.ok || r.status === 409;
}

export async function POST(request) {
  const unauth = requireAdminOrCron(request);
  if (unauth) return unauth;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }
  if (!RESEND_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  // Look back 365 days. Older orders don't get reminders even if missed.
  const horizon = new Date(Date.now() - 365 * 86400000).toISOString();

  const [orders, products, sentRows] = await Promise.all([
    sb(`/orders?status=eq.delivered&delivered_at=gte.${encodeURIComponent(horizon)}&select=id,invoice_id,first_name,email,phone,items,delivered_at,is_invoice`),
    sb(`/products?select=sku,name,typical_days_supply,active`),
    sb(`/reorder_reminders_sent?select=order_id,sku,reminder_type`),
  ]);

  const productsBySku = {};
  for (const p of products) productsBySku[p.sku] = p;

  const sentSet = new Set();
  for (const s of sentRows) sentSet.add(`${s.order_id}|${s.sku}|${s.reminder_type}`);

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
  });
}

// Vercel Cron uses GET by default.
export async function GET(request) { return POST(request); }
```

- [ ] **Step 2: Smoke test the route**

Start dev server in another shell: `npm run dev`. Then in this shell:

```bash
# Get the admin cookie value (open DevTools on /admin while logged in,
# copy 'adonis_admin' cookie value), or use the CRON_SECRET if you have it.

curl -s -X POST http://localhost:3000/api/cron/reorder-reminders \
  -H "Cookie: adonis_admin=authenticated"
```

Expected: `{"ran_at":"...","loaded":{"orders":N,"products":150ish,"sent_rows":0}}`. The number of orders is whatever is currently delivered in the DB (likely 1 — Hosep's AVL-INV-0003).

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/reorder-reminders/route.js
git commit -m "cron/reorder-reminders: stub — auth + data load"
```

---

## Task 5: Cron route — bucket + dedup logic

**Files:**
- Modify: `app/api/cron/reorder-reminders/route.js`

Add the per-order computation that buckets line items into 14d/3d reminders, runs the dedup query against newer same-SKU orders, and returns a planned-sends report (without actually emailing yet).

- [ ] **Step 1: Add helper functions before `POST`**

Insert above `export async function POST(request)`:

```js
// Build a customer-identity key. Email is preferred when real;
// otherwise normalize phone to digits-only. Returns null when neither is usable.
function identityKey(order) {
  const email = (order.email || '').toLowerCase().trim();
  if (email && !email.endsWith('@invoice.local')) return `e:${email}`;
  const phone = (order.phone || '').replace(/\D/g, '');
  if (phone) return `p:${phone}`;
  return null;
}

// Index orders by identity → array of { delivered_at, skuSet }.
function indexByIdentity(orders) {
  const idx = {};
  for (const o of orders) {
    const key = identityKey(o);
    if (!key) continue;
    const skuSet = new Set((o.items || []).map(i => i.sku));
    (idx[key] ||= []).push({ delivered_at: o.delivered_at, skuSet });
  }
  return idx;
}

// True iff this customer has another delivered order for this SKU
// strictly later than the order under consideration.
function hasNewerOrderFor(identityIdx, identity, sku, ownDeliveredAt) {
  const list = identityIdx[identity] || [];
  for (const entry of list) {
    if (entry.delivered_at > ownDeliveredAt && entry.skuSet.has(sku)) return true;
  }
  return false;
}

// Window: 12-15 days out for '14d', 1-4 days for '3d'.
// 3-day grace catches up if the cron skipped a day.
function reminderTypeFor(daysUntilRunout) {
  if (daysUntilRunout >= 12 && daysUntilRunout <= 15) return '14d';
  if (daysUntilRunout >= 1 && daysUntilRunout <= 4) return '3d';
  return null;
}

function daysBetween(later, earlier) {
  return Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86400000);
}
```

- [ ] **Step 2: Replace the POST body's return statement with planning logic**

In `POST`, replace:

```js
  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
  });
```

with:

```js
  const identityIdx = indexByIdentity(orders);
  const today = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';

  const plan = []; // [{ order, type, items: [{sku, name}] }]

  for (const order of orders) {
    const identity = identityKey(order);
    if (!identity) continue; // can't dedup or contact — skip safely

    const buckets = { '14d': [], '3d': [] };
    for (const item of (order.items || [])) {
      const product = productsBySku[item.sku];
      if (!product) continue;
      const days = daysSupply(item.sku, product, item.qty || 1);
      if (days == null) continue;

      const runout = new Date(new Date(order.delivered_at).getTime() + days * 86400000).toISOString();
      const daysUntil = daysBetween(runout, today);
      const type = reminderTypeFor(daysUntil);
      if (!type) continue;

      // Already sent?
      if (sentSet.has(`${order.id}|${item.sku}|${type}`)) continue;

      // Dedup: newer same-SKU order delivered for same customer?
      if (hasNewerOrderFor(identityIdx, identity, item.sku, order.delivered_at)) continue;

      buckets[type].push({ sku: item.sku, name: product.name });
    }

    for (const type of ['14d', '3d']) {
      if (buckets[type].length > 0) {
        plan.push({ order, type, items: buckets[type] });
      }
    }
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
    planned_sends: plan.map(p => ({
      order_id: p.order.id,
      invoice_id: p.order.invoice_id,
      to: p.order.email,
      type: p.type,
      items: p.items,
    })),
  });
```

- [ ] **Step 3: Smoke test — observe planned sends without actually emailing**

```bash
curl -s -X POST http://localhost:3000/api/cron/reorder-reminders \
  -H "Cookie: adonis_admin=authenticated" | python3 -m json.tool
```

Expected: `planned_sends` will probably be empty (Hosep's order was just delivered and is far from runout). To verify the logic works, temporarily backdate Hosep's `delivered_at` in Supabase:

```bash
# Set Hosep's invoice delivered_at to 12 days ago (forces 14d window)
DAYS_AGO=$(python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow() - timedelta(days=12)).isoformat())")
curl -s -X PATCH "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?invoice_id=eq.AVL-INV-0003" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"delivered_at\":\"${DAYS_AGO}Z\"}"
```

Then re-run the curl. Expected: `planned_sends` now contains an entry for Hosep's order with `type: '14d'` and items based on whatever auto-compute resolves for those SKUs. Note: Hosep has a placeholder email (`@invoice.local`) so identity key will fall back to phone.

After verifying, restore `delivered_at`:

```bash
curl -s -X PATCH "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?invoice_id=eq.AVL-INV-0003" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"delivered_at\":\"$(python3 -c 'from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())')\"}"
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/reorder-reminders/route.js
git commit -m "cron/reorder-reminders: bucket + dedup logic, return planned sends"
```

---

## Task 6: Cron route — email send + stamp

**Files:**
- Modify: `app/api/cron/reorder-reminders/route.js`

Add the email templates and the actual send loop. After this, the route is fully wired.

- [ ] **Step 1: Add email-template helpers above `POST`**

Insert below the existing helpers from Task 5:

```js
const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function reminderEmailHtml({ firstName, type, items, catalogUrl }) {
  const isUrgent = type === '3d';
  const headline = isUrgent
    ? 'Running low.'
    : 'Planning ahead.';
  const accent = isUrgent ? '#E07C24' : '#00A0A8';
  const lead = isUrgent
    ? `You're likely to run out in the next few days.`
    : `Based on typical use, your supply runs low in about two weeks.`;
  const greeting = firstName ? `Hi ${esc(firstName)},` : 'Hi —';
  const itemList = items.map((i) =>
    `<li style="margin-bottom:6px"><strong>${esc(i.name)}</strong></li>`,
  ).join('');
  const ctaLabel = isUrgent ? 'Order now →' : 'Reorder →';

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">Heads up</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;margin:0 0 20px">${headline.replace(/\.$/, '')}<span style="color:${accent}">.</span></h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${greeting}</p>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${lead}</p>
<ul style="font-size:15px;line-height:1.6;color:#1A1C22;margin:0 0 24px;padding-left:20px">${itemList}</ul>
<p style="margin:0 0 28px"><a href="${esc(catalogUrl)}" style="display:inline-block;padding:12px 24px;background:${accent};color:#fff;text-decoration:none;font-family:'Barlow Condensed',Arial,sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:4px;font-size:13px">${ctaLabel}</a></p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · all products are for research and laboratory use · not for human consumption · not evaluated by the fda</p>
</div>
</div></body></html>`;
}

async function sendReminderEmail(toEmail, firstName, type, items) {
  const catalogUrl = 'https://www.advncelabs.com/advnce-catalog.html';
  const productsLabel = items.length === 1
    ? items[0].name
    : `${items[0].name} + ${items.length - 1} more`;
  const subject = type === '3d'
    ? `Running low on ${productsLabel} — quick reorder?`
    : `Planning ahead — your ${productsLabel} runs low in about two weeks`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: toEmail,
      subject,
      html: reminderEmailHtml({ firstName, type, items, catalogUrl }),
    }),
  });
  return r.ok;
}
```

- [ ] **Step 2: Replace `planned_sends` return with the actual send loop**

Replace:

```js
  return NextResponse.json({
    ran_at: new Date().toISOString(),
    loaded: {
      orders: orders.length,
      products: products.length,
      sent_rows: sentRows.length,
    },
    planned_sends: plan.map(p => ({
      order_id: p.order.id,
      invoice_id: p.order.invoice_id,
      to: p.order.email,
      type: p.type,
      items: p.items,
    })),
  });
```

with:

```js
  let sent = 0, failed = 0, skipped_no_email = 0;
  const failures = [];

  for (const { order, type, items } of plan) {
    const toEmail = order.email;
    if (!toEmail || toEmail.endsWith('@invoice.local')) {
      skipped_no_email += 1;
      continue;
    }

    const ok = await sendReminderEmail(toEmail, order.first_name || '', type, items);
    if (!ok) {
      failed += 1;
      failures.push({ order_id: order.id, type, reason: 'resend send failed' });
      continue;
    }

    // Stamp every item in the bucket. Race-safe: the unique constraint
    // turns concurrent inserts into a no-op via Prefer: ignore-duplicates.
    const stampRows = items.map((it) => ({
      order_id: order.id,
      sku: it.sku,
      reminder_type: type,
      email_to: toEmail,
    }));
    const stamped = await sbInsert('/reorder_reminders_sent', stampRows);
    if (!stamped) {
      failed += 1;
      failures.push({ order_id: order.id, type, reason: 'email sent but stamp failed' });
      continue;
    }

    sent += 1;
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    orders_scanned: orders.length,
    sent,
    failed,
    skipped_no_email,
    failures,
  });
```

Note: identity-key dedup also covers the phone-only-identity case in Task 5, but here we additionally guard sends against `@invoice.local` addresses (no real email = no email).

- [ ] **Step 3: Smoke test — actually send one**

Set up: backdate Hosep's `delivered_at` AND set a real email so it actually delivers:

```bash
DAYS_AGO=$(python3 -c "from datetime import datetime, timezone, timedelta; print((datetime.now(timezone.utc) - timedelta(days=12)).isoformat())")
curl -s -X PATCH "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?invoice_id=eq.AVL-INV-0003" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"delivered_at\":\"${DAYS_AGO}\",\"email\":\"jorrelpatterson@gmail.com\"}"
```

Run the cron:

```bash
curl -s -X POST http://localhost:3000/api/cron/reorder-reminders \
  -H "Cookie: adonis_admin=authenticated" | python3 -m json.tool
```

Expected: `sent: 1` (or higher if multiple buckets), and an email arrives at the address you set. Verify the stamp log:

```bash
curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/reorder_reminders_sent?select=*" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | python3 -m json.tool
```

Expected: rows for the SKUs that were sent.

Re-run the cron a second time:

```bash
curl -s -X POST http://localhost:3000/api/cron/reorder-reminders \
  -H "Cookie: adonis_admin=authenticated" | python3 -m json.tool
```

Expected: `sent: 0` — the unique constraint prevents resending. This is the idempotency check.

Finally, restore Hosep's invoice:

```bash
curl -s -X PATCH "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?invoice_id=eq.AVL-INV-0003" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"delivered_at\":\"$(python3 -c 'from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())')\",\"email\":\"no-email+AVL-INV-0003@invoice.local\"}"

# Optionally clear the stamp rows so the next real cron run isn't pre-stamped
curl -s -X DELETE "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/reorder_reminders_sent?order_id=eq.0369e7d8-922e-4788-a2ef-f5a46896ff32" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/reorder-reminders/route.js
git commit -m "cron/reorder-reminders: send via Resend + stamp sent log"
```

---

## Task 7: Wire into Vercel cron

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the cron entry**

Find the existing `crons` array:

```json
  "crons": [
    { "path": "/api/cron/welcome-emails", "schedule": "0 17 * * *" }
  ]
```

Replace with:

```json
  "crons": [
    { "path": "/api/cron/welcome-emails", "schedule": "0 17 * * *" },
    { "path": "/api/cron/reorder-reminders", "schedule": "0 12 * * *" }
  ]
```

`0 12 * * *` = noon UTC daily ≈ 4–5 AM PT, well before customer-facing morning hours. Welcome emails fire 5 hours later at 17 UTC.

- [ ] **Step 2: Validate JSON parses**

```bash
python3 -m json.tool vercel.json > /dev/null && echo OK
# Expected: OK
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "vercel: wire reorder-reminders cron at noon UTC daily"
```

---

## Task 8: Inline edit `typical_days_supply` in inventory admin

**Files:**
- Modify: `app/admin/inventory/page.jsx`

The auto-compute won't cover everything (some peptides use "Per protocol" / "as_needed" / non-mg units). Surface the override field so Jorrel can populate over time.

The inventory table has many columns and an existing inline-edit pattern (`editId`, `editData`, `setEditData`). We add `typical_days_supply` to that pattern with the smallest possible diff.

- [ ] **Step 1: Find the existing edit-mode columns and add days-supply**

Grep for the editable column nearest to the SKU/stock fields to mirror the styling:

```bash
grep -n "editData.stock\|editData.cost\|editData.retail" 'app/admin/inventory/page.jsx' | head
```

Pick a column like `stock` and locate its edit-mode `<input>` — it'll look like:

```jsx
{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.stock} onChange={e=>setEditData(d=>({...d,stock:e.target.value}))}/>:(
```

Add a new column header next to "Stock" in the table header. Find the `<thead>` row and add a `<th>` for "Days":

```jsx
<th style={{padding:'8px 10px',textAlign:'center',fontSize:10,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,whiteSpace:'nowrap'}}>Days supply</th>
```

(Place it adjacent to the existing Stock `<th>` — the exact location depends on the existing table; match the grep output above.)

- [ ] **Step 2: Add the cell in each row**

In the row mapping where `editId === p.id` ternaries render, add a `<td>` next to the stock cell:

```jsx
<td style={{padding:'6px 8px',textAlign:'center'}}>
  {ie
    ? <input
        style={{...cs.input,width:60,padding:'4px 6px',textAlign:'center'}}
        type="number" min="0"
        value={editData.typical_days_supply ?? ''}
        onChange={e=>setEditData(d=>({...d,typical_days_supply:e.target.value}))}
      />
    : <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:p.typical_days_supply?'#0F1928':'#A0A4AE'}}>
        {p.typical_days_supply ?? '—'}
      </span>
  }
</td>
```

- [ ] **Step 3: Initialize edit state when entering edit mode**

Find where `setEditData({...})` is called when an admin clicks a row's edit pencil. Make sure `typical_days_supply` is included in the initial state. Search:

```bash
grep -n "setEditData(" 'app/admin/inventory/page.jsx' | head
```

In the call where edit mode is entered (typically `setEditData({ ...p })` or a hand-rolled object), ensure the row's `typical_days_supply` is propagated. If the existing pattern is `setEditData({ ...p })`, no change needed — the spread carries it through. If it's a hand-rolled set, add `typical_days_supply: p.typical_days_supply ?? null`.

- [ ] **Step 4: Save handler — write the column**

Find the save handler (look for the PATCH to `/products`):

```bash
grep -n "/products?id=eq\|method:.*PATCH" 'app/admin/inventory/page.jsx'
```

In the body it sends, ensure `typical_days_supply` is included. The value should be coerced to int or null:

```js
typical_days_supply: editData.typical_days_supply === '' || editData.typical_days_supply == null
  ? null
  : Math.max(0, parseInt(editData.typical_days_supply, 10) || 0),
```

(If 0 is set, that effectively disables auto-compute and disables reminders — `daysSupply` treats `0` as "not set" and falls through. That's intentional: 0 is a clear "off" signal.)

- [ ] **Step 5: Smoke test**

`npm run dev`, go to `/admin/inventory`, click edit on any row, enter a number in the new "Days supply" field, click save. Reload the page — value persists. Confirm via curl:

```bash
curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/products?sku=eq.<your-test-sku>&select=sku,typical_days_supply" \
  -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/page.jsx
git commit -m "inventory: inline edit for typical_days_supply override"
```

---

## Task 9: End-to-end verification + push

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: build succeeds. Pre-existing warnings unrelated to this work are acceptable.

- [ ] **Step 2: Re-run helper tests**

```bash
node lib/reorderDuration.test.mjs
```

Expected: all asserts pass; coverage report unchanged.

- [ ] **Step 3: Final smoke against the cron**

With dev server running:

```bash
curl -s -X POST http://localhost:3000/api/cron/reorder-reminders \
  -H "Cookie: adonis_admin=authenticated" | python3 -m json.tool
```

Expected: a clean response with `sent: 0` (assuming no orders are in the reminder window today). `failures: []`.

- [ ] **Step 4: Push to origin**

```bash
git push origin main
```

After Vercel deploys (~30s), the cron will activate at the next noon UTC.

- [ ] **Step 5: Note for Jorrel**

Mention to him:
1. The cron runs daily at noon UTC.
2. The auto-compute covers the peptides where dose is parseable; the test script's coverage report shows how many SKUs need manual override.
3. He can populate `typical_days_supply` per-SKU on `/admin/inventory` as he learns from real customer usage.
4. He needs to actually mark orders **delivered** (status transition) for reminders to fire — the spec deliberately uses delivered_at, not shipped_at.

---

## Out of scope (do NOT do in this plan)

- Customer-facing unsubscribe link / per-SKU reminder toggle.
- Admin UI to preview upcoming reminders before they send.
- SMS reminders.
- Combining reminders across orders for the same customer.
- Tracking opens / clicks / conversions from reminders (Resend has this; we don't surface it yet).
- Backfilling reminders for orders that were delivered before this feature shipped beyond what the natural 365-day horizon catches.
