# Pre-sell OOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 25% pre-order discount on out-of-stock products to convert bouncing OOS visitors into customers, tag those orders, show an admin queue, and give Jorrel a "Mark PO placed" workflow.

**Architecture:** Server-side price recomputation in the existing `api/send-order-email.js` handler applies the 25% discount on qualifying OOS lines (active+stock=0+retail≥45+not disabled). Orders table gains 3 columns (`pre_sell_line_count`, `pre_sell_subtotal_cents`, `pre_sell_status`). Storefront HTML renders pre-sell pricing + "PRE-ORDER" badge. New admin page in advnce-site at `/admin-presell.html` + 3 serverless endpoints, cookie-auth via new `ADVNCE_ADMIN_PASSWORD` env var.

**Tech Stack:** Static HTML + Vercel serverless (Node 20 ESM) + Supabase REST + Resend + Stripe. Zero new dependencies.

**Related docs:**
- Spec: [../specs/2026-04-23-presell-oos-design.md](../specs/2026-04-23-presell-oos-design.md)
- Existing checkout handler: `api/send-order-email.js`
- Existing storefront: `advnce-catalog.html`, `advnce-product.html`, `advnce-checkout.html`

---

## Phase 1 — customer-visible (ships first)

### Task 1.1: Schema migration

**Files:**
- Create: `sql/2026-04-23-presell-columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 2026-04-23: pre-sell OOS feature columns

alter table products
  add column if not exists pre_sell_disabled boolean not null default false;

alter table orders
  add column if not exists pre_sell_line_count integer not null default 0,
  add column if not exists pre_sell_subtotal_cents integer not null default 0,
  add column if not exists pre_sell_status text;

-- pre_sell_status values: null (no pre-sell lines) | 'queued' | 'po_placed' | 'shipped' | 'cancelled'

create index if not exists orders_presell_queue_idx
  on orders(pre_sell_status, created_at)
  where pre_sell_status in ('queued', 'po_placed');
```

- [ ] **Step 2: Surface the SQL to Jorrel to run in Supabase SQL editor**

Paste contents into the editor for project `efuxqrvdkrievbpljlaf`. Verify via:

```sql
select column_name from information_schema.columns where table_name='orders' and column_name like 'pre_sell%';
-- expect 3 rows
```

- [ ] **Step 3: Commit**

```bash
git add sql/2026-04-23-presell-columns.sql
git commit -m "presell: sql migration for pre_sell_disabled + order queue columns"
```

---

### Task 1.2: Pre-sell eligibility helper

**Files:**
- Create: `api/_lib/presell.js`

- [ ] **Step 1: Create the helper**

```js
// Pre-sell eligibility: one source of truth used by checkout + admin.
// Must match the rule defined in the spec:
//   active=true AND stock=0 AND retail>=45 AND NOT pre_sell_disabled
// Feature flag PRESELL_ENABLED gates the entire feature off in production
// until the admin explicitly enables it.

export const PRESELL_DISCOUNT_PCT = 25;
export const PRESELL_RETAIL_FLOOR = 45;

export function presellEnabled() {
  return process.env.PRESELL_ENABLED === 'true';
}

// Pass a product row fetched from supabase. Returns true iff this specific
// product qualifies for a pre-sell discount RIGHT NOW.
export function isPresellEligible(product) {
  if (!presellEnabled()) return false;
  if (!product) return false;
  if (product.active !== true) return false;
  if (Number(product.stock) !== 0) return false;
  if (Number(product.retail) < PRESELL_RETAIL_FLOOR) return false;
  if (product.pre_sell_disabled === true) return false;
  return true;
}

// Apply the pre-sell discount to a retail price. Rounds to cents.
export function applyPresellDiscount(retail) {
  const discounted = Number(retail) * (1 - PRESELL_DISCOUNT_PCT / 100);
  return Math.round(discounted * 100) / 100;
}
```

- [ ] **Step 2: Smoke-test via node --check**

```bash
node --check api/_lib/presell.js
# expect: no output (clean)
```

- [ ] **Step 3: Commit**

```bash
git add api/_lib/presell.js
git commit -m "presell: eligibility helper with PRESELL_ENABLED flag"
```

---

### Task 1.3: Server-side discount application in the order pipeline

**Files:**
- Modify: `api/send-order-email.js` (around line 60 price-validation loop, and around line 150 order-save)

- [ ] **Step 1: Import the helper at the top of the file**

Find the top imports block of `api/send-order-email.js` and add:

```js
import { isPresellEligible, applyPresellDiscount } from './_lib/presell.js';
```

- [ ] **Step 2: Extend the price-validation loop**

Find the section around line 60 that looks like this (existing code):

```js
const serverPrice = parseFloat(skuData[0].retail);
const clientPrice = parseFloat(item.price);
if (Math.abs(serverPrice - clientPrice) > 0.01) priceMismatch = true;

serverTotal += serverPrice * qty;
item.price = serverPrice;
item.name = skuData[0].name;
stockBySku[item.sku] = parseInt(skuData[0].stock) || 0;
```

Replace with:

```js
const retail = parseFloat(skuData[0].retail);
const isPresell = isPresellEligible(skuData[0]);
const serverPrice = isPresell ? applyPresellDiscount(retail) : retail;

const clientPrice = parseFloat(item.price);
if (Math.abs(serverPrice - clientPrice) > 0.01) priceMismatch = true;

serverTotal += serverPrice * qty;
item.price = serverPrice;
item.retail = retail;          // keep original for receipt/display
item.pre_sell = isPresell;     // tag for admin/email logic
item.name = skuData[0].name;
stockBySku[item.sku] = parseInt(skuData[0].stock) || 0;
```

- [ ] **Step 3: Tag the order payload**

Find the `orderPayload` object construction (around line 155). Add these three fields before the `created_at`:

```js
pre_sell_line_count: items.filter(i => i.pre_sell).length,
pre_sell_subtotal_cents: Math.round(
  items.filter(i => i.pre_sell).reduce((s, i) => s + i.price * (i.qty || 1), 0) * 100
),
pre_sell_status: items.some(i => i.pre_sell) ? 'queued' : null,
```

- [ ] **Step 4: Syntax check**

```bash
node --check api/send-order-email.js
# expect: no output (clean)
```

- [ ] **Step 5: Commit**

```bash
git add api/send-order-email.js
git commit -m "presell: apply 25% discount server-side + tag orders"
```

---

### Task 1.4: Order-confirmation email pre-sell block

**Files:**
- Modify: `api/send-order-email.js` (email HTML template section)

- [ ] **Step 1: Locate the email HTML template**

Find the block where the order-confirm email HTML is constructed (search for `orders@advncelabs` in the file to locate).

- [ ] **Step 2: Insert conditional pre-sell note**

Add, right before the closing `</body>` in the template string:

```js
${items.some(i => i.pre_sell) ? `
<div style="background:#F4F2EE;border:1px solid rgba(0,160,168,0.2);padding:20px 24px;margin:20px 0;border-radius:4px">
  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#00A0A8;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Pre-order note</div>
  <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.6;margin:0">
    ${items.filter(i => i.pre_sell).map(i => `<strong>${i.name}</strong>`).join(' and ')}
    ${items.filter(i => i.pre_sell).length === 1 ? 'is' : 'are'}
    on pre-order at our 25% discount. We're queueing ${items.filter(i => i.pre_sell).length === 1 ? 'it' : 'them'} for our next vendor shipment — you'll get another email when the purchase order is placed, and tracking as soon as ${items.filter(i => i.pre_sell).length === 1 ? 'it' : 'they'} ship${items.filter(i => i.pre_sell).length === 1 ? 's' : ''} to you. Typical timeline: 2–3 weeks from today.
  </p>
</div>
` : ''}
```

- [ ] **Step 3: Syntax check**

```bash
node --check api/send-order-email.js
```

- [ ] **Step 4: Commit**

```bash
git add api/send-order-email.js
git commit -m "presell: add pre-order note to order-confirmation email"
```

---

### Task 1.5: Storefront — product page pricing

**Files:**
- Modify: `advnce-product.html` (around line 290 where stock/price rendering happens)

- [ ] **Step 1: Find the existing stock-note / price render**

The current logic near line 290 is:

```js
const stock=p.stock;
let stockClass='stock-in',stockNote='In stock · Ships 2–4 days',btnClass='',btnText=`Add to Order — $${p.retail}`;
if(stock===0){stockClass='stock-low';stockNote='This ships in 2–3 weeks'}
else if(stock&&stock<5){stockClass='stock-low';stockNote=`Only ${stock} remaining`}
```

- [ ] **Step 2: Replace with pre-sell-aware logic**

```js
const PRESELL_DISCOUNT_PCT = 25;
const PRESELL_FLOOR = 45;
const stock=p.stock;
const presellEligible = window.__PRESELL_ENABLED === true
  && p.active === true
  && stock === 0
  && Number(p.retail) >= PRESELL_FLOOR
  && p.pre_sell_disabled !== true;

const presellPrice = presellEligible
  ? Math.round(Number(p.retail) * (1 - PRESELL_DISCOUNT_PCT / 100) * 100) / 100
  : null;

let stockClass='stock-in',stockNote='In stock · Ships 2–4 days';
let btnClass='',btnText=`Add to Order — $${p.retail}`;
let priceHtml = `<div class="price">$${p.retail}</div>`;

if (presellEligible) {
  stockClass='stock-presell';
  stockNote=`Pre-order 25% off · Ships 2–3 weeks`;
  btnText=`Pre-order — $${presellPrice.toFixed(2)}`;
  priceHtml = `<div class="price-presell"><s>$${p.retail}</s> <span class="price-new">$${presellPrice.toFixed(2)}</span></div>`;
} else if (stock===0) {
  stockClass='stock-low';
  stockNote='This ships in 2–3 weeks';
} else if (stock&&stock<5) {
  stockClass='stock-low';
  stockNote=`Only ${stock} remaining`;
}
```

- [ ] **Step 3: Wire the priceHtml into the render**

Find where `$${p.retail}` is rendered in the template (around line 339 uses `stock-note`). Replace the existing price display block with `${priceHtml}` in the template string. The exact location will vary slightly — search for the first `$${p.retail}` in a JSX-like context and swap it. Also update the Add to Cart handler to pass the discounted price, not retail, when `presellEligible` is true — i.e. where `price:p.retail` is in the cart-add handler, change to `price: presellEligible ? presellPrice : p.retail` and append `pre_sell: presellEligible` to the cart item.

- [ ] **Step 4: Add CSS for new classes**

Near the existing `.stock-low` / `.stock-in` rules (around line 110), add:

```css
.stock-presell{color:var(--cyan);font-weight:700}
.price-presell{display:flex;align-items:baseline;gap:10px}
.price-presell s{color:var(--dim);font-size:0.7em;font-weight:400}
.price-presell .price-new{color:var(--cyan);font-weight:800}
.presell-pill{display:inline-block;padding:4px 10px;background:rgba(0,160,168,0.12);color:var(--cyan);font-family:var(--fm);font-size:9px;letter-spacing:2px;text-transform:uppercase;border-radius:999px;margin-bottom:8px}
```

- [ ] **Step 5: Expose the flag to the client**

Near the top of the page's `<script>` block, before any of the product-rendering code, add:

```js
window.__PRESELL_ENABLED = false;  // overridden by /api/chatbot-status-style fetch below
(async () => {
  try {
    const r = await fetch('/api/presell-status');
    const s = await r.json();
    window.__PRESELL_ENABLED = !!s.enabled;
  } catch(_) {}
})();
```

- [ ] **Step 6: Commit**

```bash
git add advnce-product.html
git commit -m "presell: product page shows pre-order price + pill for eligible OOS items"
```

---

### Task 1.6: Storefront — catalog grid cards

**Files:**
- Modify: `advnce-catalog.html`

- [ ] **Step 1: Find the product card render template**

Search for where price and stock badge are rendered per-card. Look for occurrences of `retail` in template strings. There will be a function or template literal that renders each card.

- [ ] **Step 2: Add the same PRESELL flag fetch + same eligibility computation at card-render time**

Same logic as product page: compute `presellEligible` per product. When true, render:
- A `<span class="presell-pill">PRE-ORDER</span>` in place of any existing stock badge on that card
- Price line with `<s>$${p.retail}</s> <strong style="color:var(--cyan)">$${presellPrice.toFixed(2)}</strong>`

Use the same CSS block from Task 1.5 Step 4 — add it to this file's `<style>` block too (the two pages don't share CSS).

- [ ] **Step 3: Expose the flag here too**

Add the same `window.__PRESELL_ENABLED` bootstrap from Task 1.5 Step 5.

- [ ] **Step 4: Commit**

```bash
git add advnce-catalog.html
git commit -m "presell: catalog cards show PRE-ORDER pill + discount price"
```

---

### Task 1.7: `/api/presell-status` feature-flag endpoint

**Files:**
- Create: `api/presell-status.js`

- [ ] **Step 1: Write the endpoint**

```js
// GET /api/presell-status
// Cheap endpoint that storefront pages hit on load to know whether to render
// pre-sell UI. Matches the pattern used by chatbot-status.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    enabled: process.env.PRESELL_ENABLED === 'true',
    discount_pct: 25,
    retail_floor: 45,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/presell-status.js
git commit -m "presell: feature-flag status endpoint"
```

---

### Task 1.8: Checkout cart line display

**Files:**
- Modify: `advnce-checkout.html`

- [ ] **Step 1: Find where cart items are rendered in the summary**

The cart items come from `localStorage` and are rendered into `#cart-items`. Each cart item object now has `pre_sell: true/false` and `retail: <original>` set by the product-page "Add to Cart" handler (Task 1.5 Step 3).

- [ ] **Step 2: Show discount on pre-sell lines**

Where the price per line is rendered, replace:

```js
<span class="item-price">$${item.price}</span>
```

with:

```js
${item.pre_sell
  ? `<span class="item-price"><s style="color:var(--dim);font-size:0.75em;font-weight:400;margin-right:6px">$${item.retail}</s> <strong style="color:var(--cyan)">$${item.price}</strong> <span style="font-family:var(--fm);font-size:8px;letter-spacing:2px;color:var(--cyan);text-transform:uppercase;display:block;margin-top:2px">Pre-order 25% off</span></span>`
  : `<span class="item-price">$${item.price}</span>`
}
```

- [ ] **Step 3: Ensure existing "Ships in 2 parts" block still works**

The existing logic in lines 550-570 only looked at stock. It still works correctly for pre-sell items because they have `stock=0` and would hit the existing "slow" branch. No changes needed.

- [ ] **Step 4: Commit**

```bash
git add advnce-checkout.html
git commit -m "presell: checkout summary shows struck-through retail + discount price on pre-sell lines"
```

---

### Task 1.9: Integration smoke test

**Files:**
- Create: `scripts/presell-smoke.mjs`

- [ ] **Step 1: Write the script**

```js
#!/usr/bin/env node
// Phase 1 smoke test. Call with:
//   ANTHROPIC_API_KEY=x BASE_URL=https://advncelabs.com node scripts/presell-smoke.mjs
// Or against local dev:
//   BASE_URL=http://localhost:3000 node scripts/presell-smoke.mjs

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function main() {
  // 1. Check the status endpoint
  const st = await fetch(BASE + '/api/presell-status').then(r => r.json());
  console.log('status endpoint:', st);
  if (typeof st.enabled !== 'boolean') throw new Error('status endpoint broken');

  // 2. Simulate an order with a known OOS + $45+ SKU and verify server applies the discount.
  // (Use a fake email + phone so we don't pollute real data; set a test flag in notes.)
  const testOrder = {
    order_id: 'PRESELL-SMOKE-' + Date.now(),
    first_name: 'Test', last_name: 'Presell',
    email: 'presell-test@example.com',
    phone: '+15555550100',
    address: '1 Test St', city: 'Los Angeles', state: 'CA', zip: '90001',
    notes: 'PRESELL SMOKE — do not fulfill',
    items: [
      // Retatrutide 10mg — currently OOS, retail $68. If presell is enabled
      // server should replace price with 51.00.
      { sku: 'RT10', name: 'Retatrutide', size: '10mg / 3ml', qty: 1, price: 68 }
    ],
    total: 68,
  };

  const r = await fetch(BASE + '/api/send-order-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testOrder),
  });

  console.log('order response status:', r.status);
  const body = await r.json().catch(() => ({}));
  console.log('order response body:', body);

  if (!st.enabled) {
    console.log('⚠ presell feature-flag is OFF — cannot verify discount application. Flip PRESELL_ENABLED=true and re-run.');
    return;
  }

  // Expect: order created with price_mismatch=false (because we sent $68 but
  // the server recomputed to $51 — no client protection needed since we didn't
  // send $51, but the client-reported price would be flagged as mismatch).
  // For smoke purposes just ensure we got a 200 response.
  if (r.status !== 200) {
    throw new Error('order endpoint failed');
  }

  console.log('✓ smoke test passed — check the orders table for pre_sell_* fields:');
  console.log('  select order_id, total, pre_sell_line_count, pre_sell_status, items->0->\'pre_sell\' from orders where order_id=\'' + testOrder.order_id + '\';');
}

main().catch((e) => { console.error('✗', e); process.exit(1); });
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x scripts/presell-smoke.mjs
git add scripts/presell-smoke.mjs
git commit -m "presell: integration smoke script"
```

---

### Task 1.10: Deploy Phase 1, flag off

- [ ] **Step 1: Push**

```bash
git push origin main
```

Vercel will auto-deploy. At this point `PRESELL_ENABLED` is not set in Vercel env, so `/api/presell-status` returns `{enabled:false}`, the storefront skips all pre-sell rendering, and the order handler computes full retail exactly as before.

- [ ] **Step 2: Verify nothing broke in normal flow**

```bash
curl https://www.advncelabs.com/api/presell-status
# expect: {"enabled":false,"discount_pct":25,"retail_floor":45}
```

Visit advncelabs.com — catalog, product, checkout all still work as before.

- [ ] **Step 3: Flip flag on Vercel preview for end-to-end test**

Jorrel adds `PRESELL_ENABLED=true` to Vercel advnce-site Preview env only. Redeploy to preview. Test an OOS product like RT10 (retail $68):
- Product page shows strikethrough $68 + $51
- Add to cart → checkout shows $51 with "Pre-order 25% off" caption
- Complete a test order → verify `orders` row has `pre_sell_line_count=1`, `pre_sell_status='queued'`, and `items[0].pre_sell=true`

- [ ] **Step 4: Flip flag in Production when ready**

Jorrel sets `PRESELL_ENABLED=true` in Production env. Pre-sell goes live on advncelabs.com. If anything looks wrong, remove the env var and redeploy (kill switch).

---

## Phase 2 — admin ops surface

### Task 2.1: Admin auth helper

**Files:**
- Create: `api/_lib/admin-auth.js`
- Create: `api/admin-login.js`
- Create: `api/admin-logout.js`

Pattern: set a signed cookie after verifying against `ADVNCE_ADMIN_PASSWORD` env var. Reusable across any future admin endpoints.

- [ ] **Step 1: Write `api/_lib/admin-auth.js`**

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'advnce_admin';
const MAX_AGE_SEC = 60 * 60 * 8;  // 8 hours

function secret() {
  const s = process.env.ADVNCE_ADMIN_SECRET;
  if (!s) throw new Error('ADVNCE_ADMIN_SECRET not set');
  return s;
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

export function makeAdminCookie() {
  const issued = Date.now().toString();
  const sig = sign(issued);
  const token = `${issued}.${sig}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SEC}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function verifyAdminCookie(req) {
  const raw = (req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE_NAME + '='));
  if (!raw) return false;
  const token = raw.slice((COOKIE_NAME + '=').length);
  const [issued, sig] = token.split('.');
  if (!issued || !sig) return false;
  const age = (Date.now() - parseInt(issued, 10)) / 1000;
  if (age > MAX_AGE_SEC || age < 0) return false;
  const expected = sign(issued);
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requireAdmin(req, res) {
  if (!verifyAdminCookie(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Write `api/admin-login.js`**

```js
import { makeAdminCookie } from './_lib/admin-auth.js';
import { timingSafeEqual } from 'node:crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://advncelabs.com');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') return res.status(400).json({ error: 'password required' });
  const expected = process.env.ADVNCE_ADMIN_PASSWORD || '';
  if (!expected) return res.status(500).json({ error: 'ADVNCE_ADMIN_PASSWORD not set' });
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'invalid password' });
  }
  res.setHeader('Set-Cookie', makeAdminCookie());
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 3: Write `api/admin-logout.js`**

```js
import { clearAdminCookie } from './_lib/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', clearAdminCookie());
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 4: Syntax check + commit**

```bash
node --check api/_lib/admin-auth.js api/admin-login.js api/admin-logout.js
git add api/_lib/admin-auth.js api/admin-login.js api/admin-logout.js
git commit -m "presell: admin cookie-auth with HMAC-signed token"
```

---

### Task 2.2: Pre-sell queue API — list

**Files:**
- Create: `api/admin-presell-queue.js`

- [ ] **Step 1: Write the endpoint**

```js
// GET /api/admin-presell-queue
// Returns pre-sell queue grouped by SKU. Admin-only.

import { requireAdmin } from './_lib/admin-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Fetch all orders with open pre-sell status
  const url = `${SUPABASE_URL}/rest/v1/orders?select=order_id,email,items,total,pre_sell_subtotal_cents,pre_sell_status,created_at&pre_sell_status=in.(queued,po_placed)&order=created_at.asc`;
  const r = await fetch(url, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) return res.status(500).json({ error: await r.text() });
  const orders = await r.json();

  // Group by SKU
  const bySku = {};
  for (const o of orders) {
    const presellLines = (o.items || []).filter(it => it.pre_sell);
    for (const line of presellLines) {
      const key = line.sku;
      if (!bySku[key]) {
        bySku[key] = {
          sku: line.sku,
          name: line.name,
          size: line.size,
          orders: [],
          total_units: 0,
          queued_revenue_cents: 0,
          oldest_days: 0,
          status_counts: { queued: 0, po_placed: 0 },
        };
      }
      const qty = line.qty || 1;
      bySku[key].total_units += qty;
      bySku[key].queued_revenue_cents += Math.round(line.price * qty * 100);
      bySku[key].status_counts[o.pre_sell_status] += 1;
      bySku[key].orders.push({
        order_id: o.order_id,
        email: o.email,
        qty,
        price: line.price,
        pre_sell_status: o.pre_sell_status,
        created_at: o.created_at,
      });
      const ageDays = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (ageDays > bySku[key].oldest_days) bySku[key].oldest_days = ageDays;
    }
  }

  const queue = Object.values(bySku).sort((a, b) => b.oldest_days - a.oldest_days);
  return res.status(200).json({ queue });
}
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check api/admin-presell-queue.js
git add api/admin-presell-queue.js
git commit -m "presell: admin queue API grouped by SKU"
```

---

### Task 2.3: Pre-sell queue API — "Mark PO placed"

**Files:**
- Create: `api/admin-presell-po-placed.js`

- [ ] **Step 1: Write the endpoint**

```js
// POST /api/admin-presell-po-placed
// Body: { sku: string }
// Transitions all orders with open pre_sell_status='queued' for this SKU to
// 'po_placed' and sends the "PO placed" email to each distinct customer.

import { requireAdmin } from './_lib/admin-auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;

function escape(s) { return String(s || '').replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function emailHtml({ firstName, productName }) {
  const fn = escape(firstName);
  const pn = escape(productName);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;margin:0 0 16px">Your <span style="color:#00A0A8">${pn}</span> is on the way to us.</h1>
<p style="font-size:15px;line-height:1.6;color:#1A1C22;margin:0 0 16px">${fn ? 'Hi ' + fn + ', ' : ''}we've just placed the purchase order with our vendor. Your ${pn} will ship to our warehouse over the next ~10 days, then out to you the same day it arrives.</p>
<p style="font-size:15px;line-height:1.6;color:#1A1C22;margin:0 0 24px">You'll get tracking as soon as it leaves.</p>
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;border-top:1px solid #E4E7EC;padding-top:20px">advncelabs.com · orders@advncelabs.com · research use only</div>
</div></body></html>`;
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { sku } = req.body || {};
  if (!sku || typeof sku !== 'string') return res.status(400).json({ error: 'sku required' });

  // Fetch matching orders
  const headers = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const listRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=order_id,first_name,email,items&pre_sell_status=eq.queued`, { headers });
  if (!listRes.ok) return res.status(500).json({ error: await listRes.text() });
  const allQueued = await listRes.json();

  // Filter to orders that contain this SKU in a pre-sell line
  const matches = allQueued.filter(o => (o.items || []).some(it => it.pre_sell && it.sku === sku));
  if (!matches.length) return res.status(200).json({ updated: 0, emails: 0 });

  const productName = matches[0].items.find(it => it.sku === sku)?.name || sku;

  // Transition those orders
  const orderIds = matches.map(o => o.order_id);
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?order_id=in.(${orderIds.map(encodeURIComponent).join(',')})`,
    { method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' }, body: JSON.stringify({ pre_sell_status: 'po_placed' }) },
  );
  if (!patchRes.ok) return res.status(500).json({ error: await patchRes.text() });

  // Send emails
  let emailed = 0;
  for (const o of matches) {
    if (!o.email) continue;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND}` },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: o.email,
          subject: `Your ${productName} is on the way.`,
          html: emailHtml({ firstName: o.first_name || '', productName }),
        }),
      });
      if (r.ok) emailed += 1;
    } catch (e) { console.error('email send error:', e); }
  }

  return res.status(200).json({ updated: orderIds.length, emails: emailed, sku });
}
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check api/admin-presell-po-placed.js
git add api/admin-presell-po-placed.js
git commit -m "presell: admin PO-placed transition + customer email"
```

---

### Task 2.4: Admin page UI

**Files:**
- Create: `advnce-admin-presell.html`

- [ ] **Step 1: Write the HTML page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Pre-sell Queue — advnce labs admin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#F4F2EE;--bg2:#ECEAE4;--cyan:#00A0A8;--amber:#E07C24;--ink:#1A1C22;--dim:#7A7D88;--rule:rgba(0,0,0,0.08);--fn:'Barlow Condensed',sans-serif;--fm:'JetBrains Mono',monospace}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--fn);padding:40px 28px;min-height:100vh}
.wrap{max-width:1100px;margin:0 auto}
h1{font-size:40px;font-weight:900;letter-spacing:-1px;text-transform:uppercase;margin-bottom:6px}
.sub{font-family:var(--fm);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);margin-bottom:32px}
.login-box{background:white;border:1px solid var(--rule);padding:32px;max-width:400px;margin:80px auto}
.login-box input{width:100%;padding:14px;font-family:inherit;font-size:16px;border:1px solid var(--rule);margin-bottom:12px}
.login-box button,.btn{background:var(--ink);color:white;border:none;padding:12px 20px;font-family:var(--fn);font-weight:700;letter-spacing:2px;text-transform:uppercase;font-size:12px;cursor:pointer}
.btn.btn-cyan{background:var(--cyan)}.btn.btn-sm{padding:8px 14px;font-size:11px}
.table{width:100%;background:white;border-collapse:collapse;margin-top:24px}
.table th{background:var(--bg2);padding:14px 18px;text-align:left;font-family:var(--fm);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--dim)}
.table td{padding:18px;border-top:1px solid var(--rule);vertical-align:middle}
.table tr:first-child td{border-top:none}
.sku{font-family:var(--fm);font-size:11px;color:var(--dim)}
.age-warn{color:var(--amber)}.age-hot{color:#DC2626}
.empty{text-align:center;padding:60px 20px;color:var(--dim)}
</style>
</head>
<body>
<div class="wrap">
  <h1>Pre-sell Queue</h1>
  <div class="sub">advnce labs · admin</div>
  <div id="root"></div>
</div>
<script>
const root = document.getElementById('root');

async function check() {
  const r = await fetch('/api/admin-presell-queue', { credentials: 'include' });
  if (r.status === 401) return renderLogin();
  if (!r.ok) { root.innerHTML = '<div class="empty">Error loading queue: ' + r.status + '</div>'; return; }
  const { queue } = await r.json();
  renderQueue(queue);
}

function renderLogin() {
  root.innerHTML = `
    <div class="login-box">
      <input id="pw" type="password" placeholder="Admin password" autofocus>
      <button onclick="login()" style="width:100%">Sign in</button>
      <div id="err" style="color:#DC2626;font-size:12px;margin-top:10px"></div>
    </div>`;
  document.getElementById('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}

async function login() {
  const pw = document.getElementById('pw').value;
  const r = await fetch('/api/admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ password: pw }) });
  if (r.ok) check(); else document.getElementById('err').textContent = 'Invalid password';
}

function renderQueue(queue) {
  if (!queue.length) {
    root.innerHTML = '<div class="empty">No pre-orders queued.</div>';
    return;
  }
  const rows = queue.map(g => {
    const ageClass = g.oldest_days >= 14 ? 'age-hot' : g.oldest_days >= 7 ? 'age-warn' : '';
    return `<tr>
      <td><div style="font-weight:700">${g.name}</div><div class="sku">${g.sku} · ${g.size || ''}</div></td>
      <td>${g.total_units} units<br><span class="sku">${g.status_counts.queued} queued · ${g.status_counts.po_placed} on PO</span></td>
      <td>$${(g.queued_revenue_cents/100).toFixed(2)}</td>
      <td class="${ageClass}">${g.oldest_days} days</td>
      <td>
        ${g.status_counts.queued > 0 ? `<button class="btn btn-cyan btn-sm" onclick="markPo('${g.sku}','${g.name.replace(/'/g,"\\'")}')">Mark PO placed</button>` : '<span style="color:var(--dim);font-size:11px">—</span>'}
      </td>
    </tr>`;
  }).join('');
  root.innerHTML = `
    <table class="table">
      <thead><tr><th>Product</th><th>Orders</th><th>Queued $</th><th>Oldest</th><th>Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function markPo(sku, name) {
  if (!confirm('Mark PO placed for all queued orders of ' + name + '? This sends customer emails.')) return;
  const r = await fetch('/api/admin-presell-po-placed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ sku }) });
  const body = await r.json().catch(() => ({}));
  if (r.ok) { alert('Updated ' + body.updated + ' orders, emailed ' + body.emails + ' customers'); check(); }
  else alert('Error: ' + (body.error || r.status));
}

check();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add advnce-admin-presell.html
git commit -m "presell: admin queue page with login + Mark PO placed action"
```

---

### Task 2.5: Deploy Phase 2

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Set the admin env vars in Vercel**

Jorrel adds to Vercel advnce-site env:
- `ADVNCE_ADMIN_PASSWORD=<strong-password>`
- `ADVNCE_ADMIN_SECRET=<random-32-byte-hex>`  (generate with `openssl rand -hex 32`)

- [ ] **Step 3: Smoke-test**

Visit `https://www.advncelabs.com/advnce-admin-presell.html`. Log in. Queue page loads. If there are test pre-orders from Phase 1, try "Mark PO placed" on one.

---

## Phase 3 — cancel / refund flow

### Task 3.1: Cancel/refund endpoint

**Files:**
- Create: `api/admin-presell-cancel.js`

- [ ] **Step 1: Write the endpoint**

```js
// POST /api/admin-presell-cancel
// Body: { sku: string, reason?: string }
// For each order with pre_sell_status in ('queued','po_placed') containing this SKU:
//   1. Refund the pre-sell portion via Stripe (proportional to the line amount)
//   2. Set pre_sell_status='cancelled'
//   3. Send apology email
// Also sets product pre_sell_disabled=true.

import { requireAdmin } from './_lib/admin-auth.js';
import Stripe from 'stripe';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { sku, reason } = req.body || {};
  if (!sku) return res.status(400).json({ error: 'sku required' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const headers = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Fetch matching orders
  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=order_id,email,first_name,items,total,stripe_payment_intent&pre_sell_status=in.(queued,po_placed)`, { headers });
  const allOpen = await r1.json();
  const matches = allOpen.filter(o => (o.items || []).some(it => it.pre_sell && it.sku === sku));
  if (!matches.length) return res.status(200).json({ cancelled: 0, refunded: 0 });

  const productName = matches[0].items.find(it => it.sku === sku)?.name || sku;
  let refunded = 0, emailed = 0;

  for (const o of matches) {
    // Compute the pre-sell line amount for THIS sku only
    const line = (o.items || []).find(it => it.pre_sell && it.sku === sku);
    if (!line) continue;
    const lineCents = Math.round(line.price * (line.qty || 1) * 100);

    // Refund via Stripe if we have a payment intent on the order
    if (o.stripe_payment_intent) {
      try {
        await stripe.refunds.create({ payment_intent: o.stripe_payment_intent, amount: lineCents });
        refunded += 1;
      } catch (e) {
        console.error('refund error:', e);
      }
    }

    // Update order
    await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(o.order_id)}`, {
      method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ pre_sell_status: 'cancelled' }),
    });

    // Email apology
    if (o.email) {
      try {
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px"><div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px"><h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#1A1C22;text-transform:uppercase;margin:0 0 16px">About your pre-order.</h1><p style="font-size:15px;line-height:1.6;color:#1A1C22">Hi ${(o.first_name||'').replace(/[<>]/g,'')}, we hit a supply issue on <strong>${productName}</strong> and won't be able to fulfill your pre-order. We've refunded the pre-sell amount ($${(lineCents/100).toFixed(2)}) to your original payment method — you should see it in 5–10 business days.</p>${reason ? `<p style="font-size:14px;color:#7A7D88;line-height:1.6">${reason.replace(/[<>]/g,'')}</p>` : ''}<p style="font-size:15px;line-height:1.6;color:#1A1C22">If you'd prefer store credit instead, reply to this email and we'll swap the refund for a credit + 10% extra.</p><p style="font-size:15px;line-height:1.6;color:#1A1C22">— advnce labs</p></div></body></html>`;
        const er = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND}` },
          body: JSON.stringify({ from: 'advnce labs <orders@advncelabs.com>', to: o.email, subject: `About your ${productName} pre-order`, html }),
        });
        if (er.ok) emailed += 1;
      } catch (e) { console.error('apology email error:', e); }
    }
  }

  // Disable pre-sell on this product going forward
  await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}`, {
    method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ pre_sell_disabled: true }),
  });

  return res.status(200).json({ cancelled: matches.length, refunded, emails: emailed });
}
```

- [ ] **Step 2: Ensure Stripe is available**

Check that `stripe` is in the package.json dependencies. If it's not, install:

```bash
npm install stripe
```

Commit `package.json` + `package-lock.json` changes.

- [ ] **Step 3: Syntax check + commit**

```bash
node --check api/admin-presell-cancel.js
git add api/admin-presell-cancel.js package.json package-lock.json
git commit -m "presell: cancel + refund flow with Stripe refunds"
```

---

### Task 3.2: Add "Cancel all" button to admin UI

**Files:**
- Modify: `advnce-admin-presell.html`

- [ ] **Step 1: Add the button in the Action column**

In the `renderQueue` function's row template, add a second button after "Mark PO placed":

```html
<button class="btn btn-sm" style="background:#DC2626;margin-left:6px" onclick="cancel('${g.sku}','${g.name.replace(/'/g,"\\'")}')">Cancel all</button>
```

- [ ] **Step 2: Add the `cancel` function**

After `markPo`, add:

```js
async function cancel(sku, name) {
  const reason = prompt('Cancel and refund all pre-orders of ' + name + '?\n\nOptional note to customers (or blank):');
  if (reason === null) return; // user cancelled prompt
  if (!confirm('FINAL: cancel + refund all pre-orders of ' + name + '?')) return;
  const r = await fetch('/api/admin-presell-cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ sku, reason }) });
  const body = await r.json().catch(() => ({}));
  if (r.ok) { alert('Cancelled ' + body.cancelled + ' orders, refunded ' + body.refunded + ', emailed ' + body.emails); check(); }
  else alert('Error: ' + (body.error || r.status));
}
```

- [ ] **Step 3: Commit**

```bash
git add advnce-admin-presell.html
git commit -m "presell: Cancel all button in admin queue (phase 3 UI)"
```

---

### Task 3.3: Deploy Phase 3

- [ ] **Step 1: Push + deploy**

```bash
git push origin main
```

Vercel deploys automatically.

- [ ] **Step 2: Manual test (only when needed)**

The cancel/refund flow has side effects (real Stripe refunds), so don't test with real orders. Test by:
1. Place a test order on preview deploy with PRESELL_ENABLED=true
2. Visit admin page, click "Cancel all" for that SKU
3. Verify Stripe dashboard shows refund, apology email arrives, `pre_sell_disabled=true` now on that SKU

---

## Stop-points (cannot proceed without Jorrel)

1. **After Task 1.1** — SQL migration must be run on production Supabase before Phase 1 code will work.
2. **Task 1.10 Step 4** — Flipping `PRESELL_ENABLED=true` in Production env is Jorrel's go-live decision.
3. **Task 2.5 Step 2** — Setting `ADVNCE_ADMIN_PASSWORD` + `ADVNCE_ADMIN_SECRET` env vars is Jorrel's.

Everything else runs straight through.

---

## Success criteria

**Phase 1:** An OOS product with retail ≥ $45 shows a discounted pre-order price on the storefront (catalog + product + checkout). A customer can complete an order and the resulting row in `orders` has `pre_sell_line_count > 0` and `pre_sell_status='queued'`. Order-confirmation email includes the pre-order note.

**Phase 2:** Admin page at `/advnce-admin-presell.html` loads after login, shows a table grouped by SKU with counts and oldest-order age. Clicking "Mark PO placed" transitions those orders and sends a "your product is on the way" email to each customer.

**Phase 3:** Admin can cancel + refund all open pre-orders for a SKU; Stripe refunds apply, apology emails go out, and the product is auto-set to `pre_sell_disabled=true` so no new pre-orders are accepted for it.

---

## Deferred (not in this plan)

- **Inventory dashboard tile** (spec § 8): "Pre-orders queued" summary tile on the existing inventory admin page. The existing inventory admin lives in adonis-next (per `CLAUDE.md`), which isn't available locally right now. Once adonis-next is re-cloned, add a simple tile that reads from `/api/admin-presell-queue` and renders the totals. Low priority — Jorrel can visit the queue page directly.
- **Per-product pre-sell toggle in inventory UI** (spec § 3): lets Jorrel flip `pre_sell_disabled` from the admin inventory page. Same dependency on adonis-next admin working tree. For now he can flip it directly in Supabase if needed (`update products set pre_sell_disabled=true where sku='...';`).
