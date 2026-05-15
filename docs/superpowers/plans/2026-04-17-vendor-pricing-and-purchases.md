# Vendor Pricing, Purchase Orders, Receiving & Compound Content — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [docs/superpowers/specs/2026-04-17-vendor-pricing-and-purchases-design.md](../specs/2026-04-17-vendor-pricing-and-purchases-design.md)

**Goal:** Build the inventory-economics backbone for advnce labs — multi-vendor pricing sheets, purchase orders, line-by-line receiving, hide-from-storefront support, and per-product content management.

**Architecture:** 4 new Supabase tables (`vendors`, `vendor_prices`, `purchase_orders`, `purchase_order_items`); 5 server-side Next.js API routes using `SUPABASE_SERVICE_KEY` (mirrors the `ambassador-write` pattern); 2 new admin pages (`/admin/vendors`, `/admin/purchases`) and updates to 3 existing admin pages; 3 storefront file updates (active filter + dynamic content). Edits split across two repos: `adonis-next` (admin/API) and `../advnce-site` (storefront).

**Tech Stack:** Next.js 14 App Router, Supabase REST (no test framework — smoke test via `npm run dev` + curl + browser), Resend for email, Vercel for deploy.

**Repo prefixes used in tasks:** `[adonis-next]` for the admin/API repo (current cwd), `[advnce-site]` for the storefront repo at `../advnce-site`.

**No-test-framework note:** Per CLAUDE.md, this project has no test framework. Each task uses smoke tests (curl, UI walk, Supabase query) instead of automated tests. If you add a test framework later, retrofit tests then.

---

## File map

### Files created

| Path | Repo | Responsibility |
|---|---|---|
| `supabase/migrations/2026-04-17_vendor_purchases.sql` | adonis-next | Schema migration (4 tables) + one-time seed |
| `app/api/vendor-write/route.js` | adonis-next | Server-side vendor CRUD (service key) |
| `app/api/vendor-prices-write/route.js` | adonis-next | Server-side vendor_prices upsert/delete |
| `app/api/purchase-write/route.js` | adonis-next | Server-side PO create/update/submit/cancel + email send |
| `app/api/purchase-receive/route.js` | adonis-next | Receiving endpoint — updates stock, cost, vendor on products |
| `app/api/product-write/route.js` | adonis-next | Toggle `active` + content fields on products |
| `app/admin/vendors/page.jsx` | adonis-next | Vendors list + add new vendor |
| `app/admin/vendors/[id]/page.jsx` | adonis-next | Vendor detail + pricing sheet editor |
| `app/admin/purchases/page.jsx` | adonis-next | PO list + new PO form |
| `app/admin/purchases/[id]/page.jsx` | adonis-next | PO detail + receive shipment modal |
| `lib/po-email-template.js` | adonis-next | Reusable PO email HTML generator |

### Files modified

| Path | Repo | Change |
|---|---|---|
| `app/admin/layout.jsx` | adonis-next | Add `Vendors` + `Purchases` to sidebar nav |
| `app/admin/inventory/page.jsx` | adonis-next | Hide toggle + Compare Vendors modal + Content tab |
| `app/admin/pricing/page.jsx` | adonis-next | Suggested-retail column |
| `app/admin/page.jsx` | adonis-next | Add Open POs + In-transit value KPI cards |
| `advnce-catalog.html` | advnce-site | Add `&active=is.true` to products fetch |
| `advnce-product.html` | advnce-site | Add `&active=is.true` + dynamic content rendering (description/specs/research) |
| `api/send-order-email.js` | advnce-site | Reject inactive SKUs (defense-in-depth) |

### One-time external steps

- Run schema migration in Supabase SQL editor.
- Run data seed (after migration).
- Set `SHIPPING_ADDRESS` env var on Vercel (adonis-next project).

---

## Phase 1 — Schema migration + data seed

### Task 1: Write the schema migration SQL

**Files:**
- Create: `supabase/migrations/2026-04-17_vendor_purchases.sql`

- [ ] **Step 1: Create the migrations directory if it doesn't exist**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write the migration SQL file**

```sql
-- supabase/migrations/2026-04-17_vendor_purchases.sql
-- Vendor pricing + purchase orders + receiving (spec 2026-04-17)

-- 1. vendors lookup
CREATE TABLE IF NOT EXISTS vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  contact_email text,
  contact_phone text,
  notes         text,
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
-- No anon policies — all access via /api/vendor-write using SERVICE_KEY.

-- 2. per-vendor pricing sheet
CREATE TABLE IF NOT EXISTS vendor_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid REFERENCES vendors(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id) ON DELETE CASCADE,
  cost_per_kit numeric NOT NULL,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(vendor_id, product_id)
);
ALTER TABLE vendor_prices ENABLE ROW LEVEL SECURITY;

-- 3. purchase orders header
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       text UNIQUE NOT NULL,
  vendor_id       uuid REFERENCES vendors(id),
  status          text NOT NULL DEFAULT 'draft',
  total_cost      numeric,
  notes           text,
  submitted_at    timestamptz,
  received_at     timestamptz,
  closed_at       timestamptz,
  last_emailed_at timestamptz,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- 4. PO line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id),
  qty_ordered  integer NOT NULL CHECK (qty_ordered > 0),
  unit_cost    numeric NOT NULL,
  qty_received integer DEFAULT 0,
  received_at  timestamptz
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vendor_prices_vendor ON vendor_prices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_prices_product ON vendor_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(po_id);
```

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/2026-04-17_vendor_purchases.sql
git commit -m "Schema: vendor pricing + purchase orders + receiving"
```

### Task 2: Apply migration to Supabase

**This is a manual step — no code changes.**

- [ ] **Step 1: Open Supabase SQL editor**

URL: https://supabase.com/dashboard/project/efuxqrvdkrievbpljlaf/sql/new

- [ ] **Step 2: Paste the contents of `supabase/migrations/2026-04-17_vendor_purchases.sql` and click "Run"**

Expected: "Success. No rows returned" (4 CREATE TABLE statements + 4 ALTER TABLE + 5 CREATE INDEX, all `IF NOT EXISTS`).

- [ ] **Step 3: Verify tables exist**

In SQL editor, run:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('vendors','vendor_prices','purchase_orders','purchase_order_items');
```

Expected: 4 rows.

### Task 3: Seed vendors + vendor_prices from existing products

**This is a manual one-time step.**

- [ ] **Step 1: In Supabase SQL editor, run the seed**

```sql
-- Seed vendors from existing distinct values
INSERT INTO vendors (name)
SELECT DISTINCT vendor FROM products WHERE vendor IS NOT NULL AND vendor != ''
ON CONFLICT (name) DO NOTHING;

-- Seed vendor_prices from current product (vendor, cost) pairs
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT v.id, p.id, p.cost
FROM products p JOIN vendors v ON v.name = p.vendor
WHERE p.cost IS NOT NULL
ON CONFLICT (vendor_id, product_id) DO NOTHING;
```

- [ ] **Step 2: Verify counts**

```sql
SELECT name, count(*) AS priced_products
FROM vendors v
LEFT JOIN vendor_prices vp ON vp.vendor_id = v.id
GROUP BY name;
```

Expected: `Eve` ~69 priced, `Weak` ~33 priced (totals from earlier audit).

- [ ] **Step 3: Add contact info for Eve and Weak**

```sql
UPDATE vendors SET contact_email = '<EVE_EMAIL_HERE>' WHERE name = 'Eve';
UPDATE vendors SET contact_email = '<WEAK_EMAIL_HERE>' WHERE name = 'Weak';
```

If you don't know the email addresses yet, leave NULL — POs to vendors with NULL contact_email will fail submit with a clear error message later.

### Task 4: Add SHIPPING_ADDRESS env var to Vercel

**Manual external step.**

- [ ] **Step 1: Open Vercel env settings**

URL: https://vercel.com/jorrelpattersons-projects/adonis-next/settings/environment-variables

- [ ] **Step 2: Add new variable**

- Name: `SHIPPING_ADDRESS`
- Value (multiline OK):
  ```
  Jorrel Patterson
  <STREET>
  <CITY>, <STATE> <ZIP>
  ```
- Environments: All (Production, Preview, Development)

- [ ] **Step 3: Trigger a redeploy** so the env var becomes available.

URL: https://vercel.com/jorrelpattersons-projects/adonis-next/deployments → most recent deployment → "..." → "Redeploy"

---

## Phase 2 — Server-side API routes

All routes follow the same pattern as the existing `app/api/ambassador-write/route.js`. Each has a POST handler + a GET smoke-test handler.

### Task 5: Create /api/vendor-write

**Files:**
- Create: `app/api/vendor-write/route.js`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/api/vendor-write
```

- [ ] **Step 2: Write the route**

```javascript
// app/api/vendor-write/route.js
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (!['create','update','delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  if (action === 'create') {
    if (!fields?.name || typeof fields.name !== 'string') return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const payload = {
      name: fields.name.trim(),
      contact_email: fields.contact_email?.trim() || null,
      contact_phone: fields.contact_phone?.trim() || null,
      notes: fields.notes?.trim() || null,
      active: fields.active !== false,
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendors`, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!r.ok) return NextResponse.json({ error: 'Create failed', detail: await r.text() }, { status: 500 });
    const data = await r.json();
    return NextResponse.json({ success: true, vendor: data[0] });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const url = `${SUPABASE_URL}/rest/v1/vendors?id=eq.${id}`;

  if (action === 'delete') {
    const r = await fetch(url, { method: 'DELETE', headers });
    if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // update
  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const allowed = ['name','contact_email','contact_phone','notes','active'];
  const patch = {};
  for (const k of allowed) {
    if (fields[k] === undefined) continue;
    let v = fields[k];
    if (typeof v === 'string') v = v.trim();
    if (['contact_email','contact_phone','notes'].includes(k) && v === '') v = null;
    patch[k] = v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const r = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'vendor-write route is live' });
}
```

- [ ] **Step 3: Smoke test locally**

```bash
npm run dev    # in one terminal
# in another terminal:
curl http://localhost:3000/api/vendor-write
# Expected: {"status":"vendor-write route is live"}

curl -X POST http://localhost:3000/api/vendor-write \
  -H "Content-Type: application/json" \
  -d '{"action":"create","fields":{"name":"TestVendor"}}'
# Expected: {"success":true,"vendor":{...}}

# Clean up the test vendor — note the id from previous response, then:
curl -X POST http://localhost:3000/api/vendor-write \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","id":"<id-from-create>"}'
# Expected: {"success":true}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/vendor-write/route.js
git commit -m "API: vendor-write route (server-side vendor CRUD)"
```

### Task 6: Create /api/vendor-prices-write

**Files:**
- Create: `app/api/vendor-prices-write/route.js`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/api/vendor-prices-write
```

- [ ] **Step 2: Write the route**

```javascript
// app/api/vendor-prices-write/route.js
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, entries, vendor_id, product_id } = body || {};
  if (!['upsert','delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };

  if (action === 'upsert') {
    if (!Array.isArray(entries) || !entries.length) return NextResponse.json({ error: 'entries array required' }, { status: 400 });
    if (entries.length > 200) return NextResponse.json({ error: 'Max 200 entries per request' }, { status: 400 });
    for (const e of entries) {
      if (!UUID_RE.test(String(e.vendor_id || ''))) return NextResponse.json({ error: 'Invalid vendor_id in entry' }, { status: 400 });
      if (!Number.isInteger(e.product_id)) return NextResponse.json({ error: 'Invalid product_id' }, { status: 400 });
      if (typeof e.cost_per_kit !== 'number' || e.cost_per_kit < 0) return NextResponse.json({ error: 'Invalid cost_per_kit' }, { status: 400 });
    }
    const payload = entries.map(e => ({
      vendor_id: e.vendor_id, product_id: e.product_id,
      cost_per_kit: e.cost_per_kit, last_updated: new Date().toISOString(),
    }));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?on_conflict=vendor_id,product_id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return NextResponse.json({ error: 'Upsert failed', detail: await r.text() }, { status: 500 });
    return NextResponse.json({ success: true, count: entries.length });
  }

  // delete
  if (!UUID_RE.test(String(vendor_id || ''))) return NextResponse.json({ error: 'vendor_id required' }, { status: 400 });
  if (!Number.isInteger(product_id)) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  const url = `${SUPABASE_URL}/rest/v1/vendor_prices?vendor_id=eq.${vendor_id}&product_id=eq.${product_id}`;
  const r = await fetch(url, { method: 'DELETE', headers });
  if (!r.ok) return NextResponse.json({ error: 'Delete failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'vendor-prices-write route is live' });
}
```

- [ ] **Step 3: Smoke test**

```bash
curl http://localhost:3000/api/vendor-prices-write
# Expected: {"status":"vendor-prices-write route is live"}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/vendor-prices-write/route.js
git commit -m "API: vendor-prices-write route"
```

### Task 7: Create /api/product-write

**Files:**
- Create: `app/api/product-write/route.js`

- [ ] **Step 1: Create directory + write route**

```bash
mkdir -p app/api/product-write
```

```javascript
// app/api/product-write/route.js
import { NextResponse } from 'next/server';

const ALLOWED_FIELDS = ['active','description','specs','research'];

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, fields } = body || {};
  if (action !== 'update') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  if (!fields || typeof fields !== 'object') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const patch = {};
  for (const k of ALLOWED_FIELDS) {
    if (fields[k] === undefined) continue;
    if (k === 'active' && typeof fields[k] !== 'boolean') return NextResponse.json({ error: 'active must be boolean' }, { status: 400 });
    if (k === 'description' && typeof fields[k] !== 'string') return NextResponse.json({ error: 'description must be string' }, { status: 400 });
    if ((k === 'specs' || k === 'research') && !Array.isArray(fields[k])) return NextResponse.json({ error: `${k} must be array` }, { status: 400 });
    patch[k] = fields[k];
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  patch.updated_at = new Date().toISOString();

  const r = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) return NextResponse.json({ error: 'Update failed', detail: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ status: 'product-write route is live' });
}
```

- [ ] **Step 2: Smoke test**

```bash
curl http://localhost:3000/api/product-write
# Expected: {"status":"product-write route is live"}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/product-write/route.js
git commit -m "API: product-write route (active toggle + content fields)"
```

### Task 8: Create lib/po-email-template.js (shared PO email HTML)

**Files:**
- Create: `lib/po-email-template.js`

- [ ] **Step 1: Write the template module**

```javascript
// lib/po-email-template.js
// Generates the HTML body for a purchase-order email.
// Input shape:
//   po: { po_number, total_cost, notes }
//   vendor: { name }
//   items: [{ sku, name, size, qty_ordered, unit_cost }]
//   shipping_address: multi-line string

const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const LOGO_SVG = '<svg viewBox="0 0 48 28" width="32" height="18" fill="none" style="vertical-align:middle"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="3" r="3" fill="#E07C24"/></svg>';

export function renderPoEmail({ po, vendor, items, shipping_address }) {
  const itemsHtml = items.map(i => {
    const lineTotal = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:11px;color:#555">${esc(i.sku)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#0F1928">${esc(i.name)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;color:#7A7D88">${esc(i.size)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px">${i.qty_ordered}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px">$${Number(i.unit_cost).toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:13px;color:#0F1928;font-weight:700">$${lineTotal}</td>
    </tr>`;
  }).join('');

  const shipLines = String(shipping_address || '').split('\n').map(esc).join('<br>');
  const notesBlock = po.notes
    ? `<div style="border-left:3px solid #00A0A8;padding:12px 16px;background:#f8fffe;margin:20px 0;font-size:13px;color:#333;line-height:1.7"><strong>Notes:</strong><br>${esc(po.notes)}</div>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;background:white">
  <div style="background:#0A0D14;padding:20px 32px;display:flex;align-items:center;gap:12px">
    ${LOGO_SVG}<span style="color:white;font-size:13px;font-weight:300;letter-spacing:3px">advnce <span style="color:#7A7D88">labs</span></span>
  </div>
  <div style="padding:40px 32px">
    <p style="font-family:monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Purchase order</p>
    <h1 style="font-size:28px;font-weight:900;color:#0A0D14;text-transform:uppercase;letter-spacing:-1px;margin:0 0 24px">${esc(po.po_number)}</h1>
    <div style="background:#0A0D14;border-radius:6px;padding:20px 24px;margin-bottom:20px">
      <div style="font-family:monospace;font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:4px;text-transform:uppercase;margin-bottom:6px">Vendor</div>
      <div style="font-size:18px;color:white;font-weight:700">${esc(vendor.name)}</div>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;padding:16px;border:1px solid #eee;border-radius:6px">
        <div style="font-family:monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Ship to</div>
        <div style="font-family:monospace;font-size:12px;color:#0A0D14;line-height:1.7">${shipLines}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#f4f4f4">
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">SKU</th>
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Product</th>
        <th style="padding:8px;text-align:left;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Size</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Qty (kits)</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Unit cost</th>
        <th style="padding:8px;text-align:right;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;font-family:monospace">Line total</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot><tr><td colspan="5" style="padding:16px 8px 8px;text-align:right;font-weight:700;color:#0A0D14">Total</td><td style="padding:16px 8px 8px;text-align:right;font-family:monospace;font-size:18px;color:#00A0A8;font-weight:900">$${Number(po.total_cost || 0).toFixed(2)}</td></tr></tfoot>
    </table>
    ${notesBlock}
    <p style="font-size:13px;color:#7A7D88;margin-top:32px">Reply to this email or contact <a href="mailto:orders@advncelabs.com" style="color:#00A0A8">orders@advncelabs.com</a> with questions.</p>
  </div>
  <div style="background:#0A0D14;padding:20px 32px;text-align:center">
    <p style="font-family:monospace;font-size:9px;color:rgba(255,255,255,0.2);letter-spacing:1px;line-height:2">advncelabs.com · orders@advncelabs.com</p>
  </div>
</div></body></html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/po-email-template.js
git commit -m "lib: PO email HTML template"
```

### Task 9: Create /api/purchase-write

**Files:**
- Create: `app/api/purchase-write/route.js`

- [ ] **Step 1: Create directory + write route**

```bash
mkdir -p app/api/purchase-write
```

```javascript
// app/api/purchase-write/route.js
import { NextResponse } from 'next/server';
import { renderPoEmail } from '../../../lib/po-email-template.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function nextPoNumber(SUPABASE_URL, headers) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?po_number=like.${prefix}*&select=po_number&order=po_number.desc&limit=1`, { headers });
  const rows = await r.json();
  let next = 1;
  if (Array.isArray(rows) && rows.length) {
    const seq = parseInt(rows[0].po_number.slice(prefix.length), 10);
    if (!isNaN(seq)) next = seq + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function sendPoEmail({ po, vendor, items, RESEND, SHIPPING_ADDRESS }) {
  if (!vendor.contact_email) throw new Error(`Vendor "${vendor.name}" has no contact_email`);
  if (!RESEND) throw new Error('RESEND_API_KEY missing');
  const html = renderPoEmail({ po, vendor, items, shipping_address: SHIPPING_ADDRESS });
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND}` },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: vendor.contact_email,
      bcc: 'jorrelpatterson@gmail.com',
      reply_to: 'orders@advncelabs.com',
      subject: `Purchase Order ${po.po_number} — advnce labs`,
      html,
    }),
  });
  if (!r.ok) throw new Error('Resend error: ' + await r.text());
}

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  const SHIPPING_ADDRESS = process.env.SHIPPING_ADDRESS;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, vendor_id, items, notes } = body || {};
  if (!['create','update','submit','resend','cancel','close'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // CREATE — make a new draft PO + line items
  if (action === 'create') {
    if (!UUID_RE.test(String(vendor_id || ''))) return NextResponse.json({ error: 'Invalid vendor_id' }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items array required' }, { status: 400 });
    if (items.length > 100) return NextResponse.json({ error: 'Max 100 line items' }, { status: 400 });

    const total = items.reduce((s, i) => s + Number(i.qty_ordered) * Number(i.unit_cost), 0);
    // Use a placeholder po_number; finalized only on submit. Draft format: DRAFT-<timestamp>.
    const draftNumber = `DRAFT-${Date.now()}`;
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ po_number: draftNumber, vendor_id, status: 'draft', total_cost: total, notes: notes || null }),
    });
    if (!poRes.ok) return NextResponse.json({ error: 'PO create failed', detail: await poRes.text() }, { status: 500 });
    const [po] = await poRes.json();

    const lines = items.map(i => ({
      po_id: po.id, product_id: parseInt(i.product_id, 10),
      qty_ordered: parseInt(i.qty_ordered, 10), unit_cost: Number(i.unit_cost),
    }));
    const linesRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items`, {
      method: 'POST', headers, body: JSON.stringify(lines),
    });
    if (!linesRes.ok) return NextResponse.json({ error: 'Line items failed', detail: await linesRes.text() }, { status: 500 });

    return NextResponse.json({ success: true, po });
  }

  // For all other actions, id is required
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  // UPDATE — only allowed while draft. Replaces line items wholesale.
  if (action === 'update') {
    const poUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*`;
    const poRes = await fetch(poUrl, { headers });
    const [existing] = await poRes.json();
    if (!existing) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (existing.status !== 'draft') return NextResponse.json({ error: 'Can only edit draft POs' }, { status: 400 });

    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items array required' }, { status: 400 });
    const total = items.reduce((s, i) => s + Number(i.qty_ordered) * Number(i.unit_cost), 0);

    // delete existing lines, insert fresh
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${id}`, { method: 'DELETE', headers });
    const lines = items.map(i => ({
      po_id: id, product_id: parseInt(i.product_id, 10),
      qty_ordered: parseInt(i.qty_ordered, 10), unit_cost: Number(i.unit_cost),
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items`, { method: 'POST', headers, body: JSON.stringify(lines) });
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ vendor_id: vendor_id || existing.vendor_id, total_cost: total, notes: notes ?? existing.notes }),
    });
    return NextResponse.json({ success: true });
  }

  // SUBMIT — assign po_number, update status, send email
  if (action === 'submit') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(*),items:purchase_order_items(*,product:products(sku,name,size))`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (po.status !== 'draft') return NextResponse.json({ error: 'Only draft POs can be submitted' }, { status: 400 });
    if (!po.vendor?.contact_email) return NextResponse.json({ error: `Vendor "${po.vendor?.name}" has no contact_email` }, { status: 400 });

    let poNumber;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        poNumber = await nextPoNumber(SUPABASE_URL, headers);
        const now = new Date().toISOString();
        const upd = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ po_number: poNumber, status: 'submitted', submitted_at: now, last_emailed_at: now }),
        });
        if (upd.ok) break;
        if (attempt === 1) return NextResponse.json({ error: 'PO number conflict' }, { status: 500 });
      } catch (e) {
        if (attempt === 1) return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    try {
      await sendPoEmail({
        po: { ...po, po_number: poNumber },
        vendor: po.vendor,
        items: po.items.map(i => ({ ...i.product, qty_ordered: i.qty_ordered, unit_cost: i.unit_cost })),
        RESEND, SHIPPING_ADDRESS,
      });
    } catch (e) {
      // Roll back to draft so user can retry
      await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'draft', submitted_at: null, last_emailed_at: null }),
      });
      return NextResponse.json({ error: 'Email failed (PO reverted to draft): ' + e.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, po_number: poNumber });
  }

  // RESEND email (only for submitted/partial)
  if (action === 'resend') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(*),items:purchase_order_items(*,product:products(sku,name,size))`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (!['submitted','partial'].includes(po.status)) return NextResponse.json({ error: 'Cannot resend in current status' }, { status: 400 });
    try {
      await sendPoEmail({
        po, vendor: po.vendor,
        items: po.items.map(i => ({ ...i.product, qty_ordered: i.qty_ordered, unit_cost: i.unit_cost })),
        RESEND, SHIPPING_ADDRESS,
      });
      await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ last_emailed_at: new Date().toISOString() }),
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Resend failed: ' + e.message }, { status: 500 });
    }
  }

  // CANCEL — works on draft or submitted (not received)
  if (action === 'cancel') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=status`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (['received','cancelled'].includes(po.status)) return NextResponse.json({ error: `Cannot cancel ${po.status} PO` }, { status: 400 });
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'cancelled' }),
    });
    return NextResponse.json({ success: true });
  }

  // CLOSE — force partial → received (vendor short-shipped permanently)
  if (action === 'close') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=status`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (po.status !== 'partial') return NextResponse.json({ error: 'Can only close partial POs' }, { status: 400 });
    const now = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'received', received_at: now, closed_at: now }),
    });
    return NextResponse.json({ success: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'purchase-write route is live' });
}
```

- [ ] **Step 2: Smoke test**

```bash
curl http://localhost:3000/api/purchase-write
# Expected: {"status":"purchase-write route is live"}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/purchase-write/route.js
git commit -m "API: purchase-write route (create/update/submit/resend/cancel/close + email)"
```

### Task 10: Create /api/purchase-receive

**Files:**
- Create: `app/api/purchase-receive/route.js`

- [ ] **Step 1: Create directory + write route**

```bash
mkdir -p app/api/purchase-receive
```

```javascript
// app/api/purchase-receive/route.js
import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIT_VIALS = 10;  // Each kit = 10 vials

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { po_id, receipts } = body || {};
  if (!UUID_RE.test(String(po_id || ''))) return NextResponse.json({ error: 'Invalid po_id' }, { status: 400 });
  if (!Array.isArray(receipts) || !receipts.length) return NextResponse.json({ error: 'receipts array required' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // Load PO + lines + vendor
  const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${po_id}&select=*,vendor:vendors(name),items:purchase_order_items(*)`, { headers });
  const [po] = await poRes.json();
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
  if (!['submitted','partial'].includes(po.status)) return NextResponse.json({ error: `Cannot receive against ${po.status} PO` }, { status: 400 });

  // Process each receipt: { item_id, receive_now, unit_cost? }
  for (const rcpt of receipts) {
    if (!UUID_RE.test(String(rcpt.item_id || ''))) return NextResponse.json({ error: 'Invalid item_id' }, { status: 400 });
    const recvNow = parseInt(rcpt.receive_now, 10);
    if (isNaN(recvNow) || recvNow < 0) return NextResponse.json({ error: 'Invalid receive_now' }, { status: 400 });
    if (recvNow === 0) continue;

    const line = po.items.find(i => i.id === rcpt.item_id);
    if (!line) return NextResponse.json({ error: `item_id ${rcpt.item_id} not in PO` }, { status: 400 });

    const newQtyReceived = (line.qty_received || 0) + recvNow;
    const unitCost = (typeof rcpt.unit_cost === 'number' && rcpt.unit_cost >= 0) ? rcpt.unit_cost : line.unit_cost;

    // Update the PO line
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?id=eq.${line.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        qty_received: newQtyReceived,
        unit_cost: unitCost,
        received_at: line.received_at || new Date().toISOString(),
      }),
    });

    // Update the product: stock += kits*10, cost = latest, vendor = latest, updated_at
    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}&select=stock`, { headers });
    const [prod] = await prodRes.json();
    if (!prod) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        stock: (prod.stock || 0) + recvNow * KIT_VIALS,
        cost: unitCost,
        vendor: po.vendor.name,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  // Recompute PO status
  const updatedLinesRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${po_id}&select=qty_ordered,qty_received`, { headers });
  const updatedLines = await updatedLinesRes.json();
  const allComplete = updatedLines.every(l => (l.qty_received || 0) >= l.qty_ordered);
  const newStatus = allComplete ? 'received' : 'partial';
  const patch = { status: newStatus };
  if (allComplete && !po.received_at) patch.received_at = new Date().toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${po_id}`, {
    method: 'PATCH', headers, body: JSON.stringify(patch),
  });

  return NextResponse.json({ success: true, status: newStatus });
}

export async function GET() {
  return NextResponse.json({ status: 'purchase-receive route is live' });
}
```

- [ ] **Step 2: Smoke test**

```bash
curl http://localhost:3000/api/purchase-receive
# Expected: {"status":"purchase-receive route is live"}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/purchase-receive/route.js
git commit -m "API: purchase-receive route (line-by-line + stock/cost update)"
```

---

## Phase 3 — Admin nav + Vendors page

### Task 11: Add Vendors + Purchases to admin sidebar nav

**Files:**
- Modify: `app/admin/layout.jsx` (NAV constant near top of file)

- [ ] **Step 1: Read the current nav**

```bash
grep -n "NAV =" app/admin/layout.jsx
```

- [ ] **Step 2: Replace the NAV constant**

Find:

```javascript
const NAV = [
  { href: '/admin',              label: 'Dashboard',    icon: '📊' },
  { href: '/admin/inventory',    label: 'Inventory',    icon: '📦' },
  { href: '/admin/orders',       label: 'Orders',       icon: '🛒' },
  { href: '/admin/pricing',      label: 'Pricing',      icon: '💰' },
  { href: '/admin/ambassadors',  label: 'Ambassadors',  icon: '🤝' },
  { href: '/admin/distributors', label: 'Distributors', icon: '🏭' },
];
```

Replace with:

```javascript
const NAV = [
  { href: '/admin',              label: 'Dashboard',    icon: '📊' },
  { href: '/admin/inventory',    label: 'Inventory',    icon: '📦' },
  { href: '/admin/vendors',      label: 'Vendors',      icon: '🏪' },
  { href: '/admin/purchases',    label: 'Purchases',    icon: '📥' },
  { href: '/admin/orders',       label: 'Orders',       icon: '🛒' },
  { href: '/admin/pricing',      label: 'Pricing',      icon: '💰' },
  { href: '/admin/ambassadors',  label: 'Ambassadors',  icon: '🤝' },
  { href: '/admin/distributors', label: 'Distributors', icon: '🏭' },
];
```

- [ ] **Step 3: Smoke test (browser)**

`npm run dev`, log in to `/admin`, verify Vendors and Purchases links appear in the sidebar (both should 404 when clicked — that's expected, pages come next).

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.jsx
git commit -m "Admin: add Vendors + Purchases to sidebar nav"
```

### Task 12: Create /admin/vendors list page

**Files:**
- Create: `app/admin/vendors/page.jsx`

- [ ] **Step 1: Create directory + page**

```bash
mkdir -p app/admin/vendors
```

```jsx
// app/admin/vendors/page.jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Vendors table is RLS-locked from anon, so reads must go via SERVICE_KEY too.
// We don't have SERVICE_KEY client-side, so this page fetches via a tiny GET handler.
// Easier path: open up SELECT for anon on vendors+vendor_prices in the migration if you
// prefer client-side reads. For now we use the existing pattern of fetching from supabase
// and acknowledge the read also goes through /api/vendor-write... actually no — just use
// supabase REST with an anon SELECT policy added below.

// IMPORTANT: After Task 12, run this in Supabase SQL editor to allow admin reads:
//   CREATE POLICY "anon read vendors" ON vendors FOR SELECT TO anon USING (true);
//   CREATE POLICY "anon read vendor_prices" ON vendor_prices FOR SELECT TO anon USING (true);
//   CREATE POLICY "anon read purchase_orders" ON purchase_orders FOR SELECT TO anon USING (true);
//   CREATE POLICY "anon read purchase_order_items" ON purchase_order_items FOR SELECT TO anon USING (true);
// This lets the admin pages SELECT, while writes still require the API routes (no anon WRITE).

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newV, setNewV] = useState({ name:'', contact_email:'', contact_phone:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
      const [vRes, cRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&order=name.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=vendor_id`, { headers }),
      ]);
      const vs = await vRes.json();
      const cs = await cRes.json();
      const cmap = {};
      cs.forEach(r => { cmap[r.vendor_id] = (cmap[r.vendor_id] || 0) + 1; });
      setVendors(Array.isArray(vs) ? vs : []);
      setCounts(cmap);
      setLoading(false);
    }
    load();
  }, []);

  const addVendor = async () => {
    if (!newV.name.trim()) { alert('Name required'); return; }
    setSaving(true);
    const r = await fetch('/api/vendor-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', fields: newV }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); setSaving(false); return; }
    const { vendor } = await r.json();
    setVendors(prev => [...prev, vendor].sort((a,b) => a.name.localeCompare(b.name)));
    setNewV({ name:'', contact_email:'', contact_phone:'', notes:'' });
    setShowAdd(false);
    setSaving(false);
  };

  if (loading) return <div style={{padding:32,color:'#8C919E'}}>Loading vendors...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Vendors</h1>
          <p style={{color:'#8C919E',fontSize:14}}>{vendors.length} vendors</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {showAdd ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showAdd && (
        <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,padding:20,marginBottom:20,display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
          {[
            {k:'name',l:'Name *',ph:'Eve'},
            {k:'contact_email',l:'Contact email',ph:'orders@vendor.com'},
            {k:'contact_phone',l:'Contact phone',ph:'+1-555-...'},
          ].map(f => (
            <div key={f.k}>
              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>{f.l}</label>
              <input style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} placeholder={f.ph} value={newV[f.k]} onChange={e=>setNewV(p=>({...p,[f.k]:e.target.value}))} />
            </div>
          ))}
          <div style={{gridColumn:'1 / -1'}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes</label>
            <textarea style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:60}} value={newV.notes} onChange={e=>setNewV(p=>({...p,notes:e.target.value}))} />
          </div>
          <button onClick={addVendor} disabled={saving} style={{gridColumn:'1 / -1',padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.5:1}}>
            {saving ? 'Saving...' : 'Save Vendor'}
          </button>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['Name','Active','Contact','# Priced products',''].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                <td style={{padding:'12px',fontSize:14,fontWeight:600,color:'#0F1928'}}>{v.name}</td>
                <td style={{padding:'12px',fontSize:12}}><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:v.active?'#DCFCE7':'#FEE2E2',color:v.active?'#16A34A':'#DC2626'}}>{v.active?'Active':'Inactive'}</span></td>
                <td style={{padding:'12px',fontSize:12,color:'#4A4F5C'}}>{v.contact_email || '—'}</td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:13,color:'#0072B5'}}>{counts[v.id] || 0}</td>
                <td style={{padding:'12px',textAlign:'right'}}><Link href={`/admin/vendors/${v.id}`} style={{color:'#0072B5',fontSize:12,textDecoration:'none'}}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the anon SELECT policies in Supabase SQL editor**

Per the comment in the file, run these in [Supabase SQL editor](https://supabase.com/dashboard/project/efuxqrvdkrievbpljlaf/sql/new):

```sql
CREATE POLICY "anon read vendors" ON vendors FOR SELECT TO anon USING (true);
CREATE POLICY "anon read vendor_prices" ON vendor_prices FOR SELECT TO anon USING (true);
CREATE POLICY "anon read purchase_orders" ON purchase_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon read purchase_order_items" ON purchase_order_items FOR SELECT TO anon USING (true);
```

- [ ] **Step 3: Smoke test (browser)**

Visit `/admin/vendors`. Should see Eve + Weak with priced product counts.

Click "+ Add Vendor", fill in test name "Zzz", save. Should appear in list. Then in Supabase SQL editor: `DELETE FROM vendors WHERE name='Zzz';` to clean up.

- [ ] **Step 4: Commit**

```bash
git add app/admin/vendors/page.jsx
git commit -m "Admin: vendors list page + add-vendor form"
```

### Task 13: Create /admin/vendors/[id] detail page (Details + Pricing Sheet tabs)

**Files:**
- Create: `app/admin/vendors/[id]/page.jsx`

- [ ] **Step 1: Create directory + page**

```bash
mkdir -p app/admin/vendors/\[id\]
```

```jsx
// app/admin/vendors/[id]/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

export default function VendorDetailPage() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState({});      // { product_id: cost }
  const [editForm, setEditForm] = useState({});
  const [tab, setTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    async function load() {
      const [vRes, pRes, prRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/vendors?id=eq.${id}&select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,size,sku,cat&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?vendor_id=eq.${id}&select=product_id,cost_per_kit`, { headers: H() }),
      ]);
      const [v] = await vRes.json();
      setVendor(v);
      setEditForm({ name: v.name, contact_email: v.contact_email||'', contact_phone: v.contact_phone||'', notes: v.notes||'', active: v.active });
      setProducts(await pRes.json());
      const pmap = {};
      (await prRes.json()).forEach(r => { pmap[r.product_id] = r.cost_per_kit; });
      setPrices(pmap);
    }
    load();
  }, [id]);

  const saveDetails = async () => {
    setSaving(true);
    const r = await fetch('/api/vendor-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id, fields: editForm }),
    });
    if (r.ok) { setVendor(v => ({...v, ...editForm})); alert('Saved'); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setSaving(false);
  };

  const setPrice = (product_id, cost) => {
    setPrices(prev => ({ ...prev, [product_id]: cost }));
  };

  const savePrice = async (product_id) => {
    const cost = parseFloat(prices[product_id]);
    if (isNaN(cost) || cost < 0) { alert('Invalid cost'); return; }
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'upsert', entries:[{ vendor_id: id, product_id, cost_per_kit: cost }] }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  const removePrice = async (product_id) => {
    if (!confirm('Remove this product from this vendor?')) return;
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'delete', vendor_id: id, product_id }),
    });
    if (r.ok) setPrices(prev => { const n = {...prev}; delete n[product_id]; return n; });
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  const bulkUpdate = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = [];
    const skuMap = Object.fromEntries(products.map(p => [p.sku, p.id]));
    const errors = [];
    for (const line of lines) {
      const [sku, costStr] = line.split(',').map(s => s.trim());
      const pid = skuMap[sku];
      const cost = parseFloat(costStr);
      if (!pid) { errors.push(`Unknown SKU: ${sku}`); continue; }
      if (isNaN(cost) || cost < 0) { errors.push(`Invalid cost for ${sku}: ${costStr}`); continue; }
      entries.push({ vendor_id: id, product_id: pid, cost_per_kit: cost });
    }
    if (errors.length) { alert('Errors:\n' + errors.join('\n')); return; }
    if (!entries.length) { alert('No valid entries'); return; }
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'upsert', entries }),
    });
    if (r.ok) {
      setPrices(prev => { const n = {...prev}; entries.forEach(e => { n[e.product_id] = e.cost_per_kit; }); return n; });
      setBulkText('');
      alert(`Updated ${entries.length} prices`);
    } else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  if (!vendor) return <div style={{padding:32}}>Loading...</div>;

  return (
    <div>
      <Link href="/admin/vendors" style={{color:'#8C919E',fontSize:12,textDecoration:'none'}}>← All vendors</Link>
      <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,marginTop:8}}>{vendor.name}</h1>

      <div style={{display:'flex',gap:16,borderBottom:'1px solid #E4E7EC',marginBottom:24,marginTop:20}}>
        {['details','pricing'].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 4px',background:'none',border:'none',borderBottom:tab===t?'2px solid #0072B5':'2px solid transparent',color:tab===t?'#0072B5':'#8C919E',fontSize:13,fontWeight:tab===t?600:400,cursor:'pointer',textTransform:'capitalize'}}>{t === 'pricing' ? 'Pricing sheet' : t}</button>
        ))}
      </div>

      {tab === 'details' && (
        <div style={{maxWidth:500}}>
          {[
            {k:'name',l:'Name'},{k:'contact_email',l:'Contact email'},{k:'contact_phone',l:'Contact phone'},
          ].map(f => (
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>{f.l}</label>
              <input style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} value={editForm[f.k]||''} onChange={e=>setEditForm(prev=>({...prev,[f.k]:e.target.value}))} />
            </div>
          ))}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes</label>
            <textarea style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80}} value={editForm.notes||''} onChange={e=>setEditForm(prev=>({...prev,notes:e.target.value}))} />
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,fontSize:13}}>
            <input type="checkbox" checked={editForm.active!==false} onChange={e=>setEditForm(prev=>({...prev,active:e.target.checked}))} />
            Active (uncheck to hide vendor from new POs without losing history)
          </label>
          <button onClick={saveDetails} disabled={saving} style={{padding:'10px 24px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.5:1}}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'pricing' && (
        <>
          <details style={{marginBottom:20}}>
            <summary style={{cursor:'pointer',fontSize:12,color:'#0072B5'}}>Bulk paste prices (one per line: SKU,cost)</summary>
            <textarea style={{width:'100%',marginTop:8,padding:8,fontFamily:'monospace',fontSize:12,minHeight:120,border:'1px solid #E4E7EC',borderRadius:4}} placeholder="BP10,25&#10;TB50,28" value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            <button onClick={bulkUpdate} style={{marginTop:8,padding:'8px 16px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer'}}>Apply bulk update</button>
          </details>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                {['SKU','Product','Size','Cat','Cost / kit',''].map((h,i)=>(<th key={i} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                    <td style={{padding:'8px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{p.sku}</td>
                    <td style={{padding:'8px 12px'}}>{p.name}</td>
                    <td style={{padding:'8px 12px',color:'#7A7D88',fontSize:11}}>{p.size}</td>
                    <td style={{padding:'8px 12px',color:'#7A7D88',fontSize:11}}>{p.cat}</td>
                    <td style={{padding:'8px 12px'}}>
                      <input type="number" step="0.01" min="0" placeholder="—" style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}}
                        value={prices[p.id] ?? ''}
                        onChange={e => setPrice(p.id, e.target.value)}
                        onBlur={() => prices[p.id] !== undefined && prices[p.id] !== '' && savePrice(p.id)} />
                    </td>
                    <td style={{padding:'8px 12px'}}>{prices[p.id] !== undefined && <button onClick={()=>removePrice(p.id)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:14}}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test (browser)**

Visit `/admin/vendors/<eve-id>` (click "Open →" on Eve from the list). Verify:
- Details tab shows current name, can edit + save.
- Pricing tab shows all 102 products. Eve's existing 69 should have prices pre-filled.
- Edit a price (change Eve's BPC-157 from $25 to $26), tab away to trigger save. Reload — should persist.
- Bulk paste: "BP10,25\nTB50,28" → should update both. Reload — verify.

- [ ] **Step 3: Commit**

```bash
git add app/admin/vendors/\[id\]/page.jsx
git commit -m "Admin: vendor detail page + pricing sheet editor"
```

---

## Phase 4 — Purchases pages (list + detail + receiving)

### Task 14: Create /admin/purchases list page + new PO form

**Files:**
- Create: `app/admin/purchases/page.jsx`

- [ ] **Step 1: Create directory + page**

```bash
mkdir -p app/admin/purchases
```

```jsx
// app/admin/purchases/page.jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

const STATUS_BADGE = {
  draft:     { bg:'#F3F4F6', fg:'#6B7280' },
  submitted: { bg:'#DBEAFE', fg:'#1D4ED8' },
  partial:   { bg:'#FEF3C7', fg:'#A16207' },
  received:  { bg:'#DCFCE7', fg:'#16A34A' },
  cancelled: { bg:'#FEE2E2', fg:'#DC2626' },
};

export default function PurchasesPage() {
  const router = useRouter();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [prices, setPrices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newPo, setNewPo] = useState({ vendor_id: '', items: [], notes: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const [poRes, vRes, prRes, pRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?select=*,vendor:vendors(name)&order=created_at.desc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&active=is.true&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,sku,name,size`, { headers: H() }),
      ]);
      setPos(await poRes.json());
      setVendors(await vRes.json());
      setPrices(await prRes.json());
      setProducts(await pRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const vendorPrices = (vendor_id) => prices.filter(p => p.vendor_id === vendor_id);
  const productById = (id) => products.find(p => p.id === id);

  const addLine = () => setNewPo(p => ({ ...p, items: [...p.items, { product_id: '', qty_ordered: 1, unit_cost: 0 }] }));
  const removeLine = (i) => setNewPo(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, val) => setNewPo(p => {
    const items = [...p.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'product_id') {
      const vp = vendorPrices(p.vendor_id).find(x => x.product_id === parseInt(val, 10));
      if (vp) items[i].unit_cost = vp.cost_per_kit;
    }
    return { ...p, items };
  });

  const total = newPo.items.reduce((s, i) => s + (Number(i.qty_ordered) || 0) * (Number(i.unit_cost) || 0), 0);

  const create = async () => {
    if (!newPo.vendor_id) { alert('Pick a vendor'); return; }
    if (!newPo.items.length) { alert('Add at least one line'); return; }
    for (const i of newPo.items) {
      if (!i.product_id) { alert('Pick a product on every line'); return; }
      if (!i.qty_ordered || i.qty_ordered < 1) { alert('Qty must be ≥1'); return; }
    }
    setCreating(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', vendor_id: newPo.vendor_id, items: newPo.items, notes: newPo.notes }),
    });
    if (r.ok) {
      const { po } = await r.json();
      router.push(`/admin/purchases/${po.id}`);
    } else {
      const e = await r.json().catch(()=>({}));
      alert('Failed: ' + (e.error || r.status));
      setCreating(false);
    }
  };

  if (loading) return <div style={{padding:32}}>Loading...</div>;

  const allowedProducts = newPo.vendor_id ? products.filter(p => vendorPrices(newPo.vendor_id).some(vp => vp.product_id === p.id)) : [];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Purchases</h1>
          <p style={{color:'#8C919E',fontSize:14}}>{pos.length} purchase orders</p>
        </div>
        <button onClick={()=>setShowNew(s=>!s)} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {showNew ? 'Cancel' : '+ New PO'}
        </button>
      </div>

      {showNew && (
        <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,padding:20,marginBottom:24}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Vendor</label>
            <select value={newPo.vendor_id} onChange={e=>setNewPo(p=>({...p,vendor_id:e.target.value,items:[]}))} style={{padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minWidth:240}}>
              <option value="">— pick vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {newPo.vendor_id && (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
                <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                  {['Product','Qty (kits)','Unit cost','Line total',''].map((h,i)=>(<th key={i} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {newPo.items.map((line, i) => {
                    const lt = (Number(line.qty_ordered)||0) * (Number(line.unit_cost)||0);
                    return (
                      <tr key={i} style={{borderBottom:'1px solid #F0F1F4'}}>
                        <td style={{padding:'8px 12px'}}>
                          <select value={line.product_id} onChange={e=>updateLine(i,'product_id',e.target.value)} style={{padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:12,minWidth:240}}>
                            <option value="">—</option>
                            {allowedProducts.map(p => <option key={p.id} value={p.id}>{p.name} · {p.size} ({p.sku})</option>)}
                          </select>
                        </td>
                        <td style={{padding:'8px 12px'}}><input type="number" min="1" value={line.qty_ordered} onChange={e=>updateLine(i,'qty_ordered',e.target.value)} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                        <td style={{padding:'8px 12px'}}><input type="number" step="0.01" min="0" value={line.unit_cost} onChange={e=>updateLine(i,'unit_cost',e.target.value)} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                        <td style={{padding:'8px 12px',fontFamily:'monospace',fontSize:13}}>${lt.toFixed(2)}</td>
                        <td style={{padding:'8px 12px'}}><button onClick={()=>removeLine(i)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer'}}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan="3" style={{padding:'12px',textAlign:'right',fontWeight:700}}>Total</td><td style={{padding:'12px',fontFamily:'monospace',fontSize:15,color:'#0072B5',fontWeight:700}}>${total.toFixed(2)}</td><td></td></tr></tfoot>
              </table>
              <button onClick={addLine} style={{padding:'6px 14px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:4,fontSize:12,cursor:'pointer',marginBottom:16}}>+ Add line</button>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes (optional)</label>
                <textarea value={newPo.notes} onChange={e=>setNewPo(p=>({...p,notes:e.target.value}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:60}} />
              </div>
              <button onClick={create} disabled={creating} style={{padding:'10px 24px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:creating?0.5:1}}>
                {creating ? 'Creating...' : 'Save as Draft'}
              </button>
            </>
          )}
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['PO #','Vendor','Status','Total','Created',''].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {pos.map(po => {
              const b = STATUS_BADGE[po.status] || { bg:'#eee', fg:'#666' };
              return (
                <tr key={po.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12,color:'#0072B5'}}>{po.po_number}</td>
                  <td style={{padding:'12px',fontSize:13}}>{po.vendor?.name}</td>
                  <td style={{padding:'12px'}}><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:b.bg,color:b.fg,textTransform:'uppercase',letterSpacing:1}}>{po.status}</span></td>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:13}}>${Number(po.total_cost||0).toFixed(2)}</td>
                  <td style={{padding:'12px',fontSize:12,color:'#7A7D88'}}>{new Date(po.created_at).toLocaleDateString()}</td>
                  <td style={{padding:'12px',textAlign:'right'}}><Link href={`/admin/purchases/${po.id}`} style={{color:'#0072B5',fontSize:12,textDecoration:'none'}}>Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test (browser)**

Visit `/admin/purchases`. Should see empty list. Click "+ New PO":
- Pick Eve from the dropdown.
- Click "+ Add line", pick BPC-157, qty 5. Unit cost should auto-fill from vendor_prices (e.g. $25). Line total $125.
- Add another line.
- Click "Save as Draft" — should redirect to `/admin/purchases/<new-id>` (404 until Task 15).

In Supabase SQL editor: `SELECT * FROM purchase_orders WHERE status='draft' ORDER BY created_at DESC LIMIT 1;` → should see the draft you created.

- [ ] **Step 3: Commit**

```bash
git add app/admin/purchases/page.jsx
git commit -m "Admin: purchases list + new PO form"
```

### Task 15: Create /admin/purchases/[id] detail page (with receiving modal)

**Files:**
- Create: `app/admin/purchases/[id]/page.jsx`

- [ ] **Step 1: Create directory + page**

```bash
mkdir -p app/admin/purchases/\[id\]
```

```jsx
// app/admin/purchases/[id]/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

const STATUS_BADGE = {
  draft:{bg:'#F3F4F6',fg:'#6B7280'}, submitted:{bg:'#DBEAFE',fg:'#1D4ED8'},
  partial:{bg:'#FEF3C7',fg:'#A16207'}, received:{bg:'#DCFCE7',fg:'#16A34A'},
  cancelled:{bg:'#FEE2E2',fg:'#DC2626'},
};

export default function PoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [showReceive, setShowReceive] = useState(false);
  const [receipts, setReceipts] = useState({});  // { item_id: { receive_now, unit_cost } }
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [poRes, itRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(name,contact_email)`, { headers: H() }),
      fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${id}&select=*`, { headers: H() }),
    ]);
    const [p] = await poRes.json();
    const its = await itRes.json();
    setPo(p);
    setItems(its);
    // load related products
    const ids = its.map(i => i.product_id);
    if (ids.length) {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=in.(${ids.join(',')})&select=id,sku,name,size`, { headers: H() });
      const ps = await pRes.json();
      setProducts(Object.fromEntries(ps.map(p => [p.id, p])));
    }
  };
  useEffect(() => { reload(); }, [id]);

  const submit = async () => {
    if (!confirm('Submit this PO and email the vendor?')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'submit', id }),
    });
    if (r.ok) { const { po_number } = await r.json(); alert(`Submitted as ${po_number}. Email sent.`); reload(); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const resend = async () => {
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'resend', id }),
    });
    if (r.ok) { alert('PO email resent.'); reload(); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const cancel = async () => {
    if (!confirm('Cancel this PO?')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'cancel', id }),
    });
    if (r.ok) reload();
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const closeForce = async () => {
    if (!confirm('Force close this PO? Stock won\'t be auto-incremented for the remaining balance — only what was already received counts.')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'close', id }),
    });
    if (r.ok) reload();
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const openReceive = () => {
    const init = {};
    items.forEach(i => {
      const remaining = Math.max(0, i.qty_ordered - (i.qty_received || 0));
      init[i.id] = { receive_now: remaining, unit_cost: i.unit_cost };
    });
    setReceipts(init);
    setShowReceive(true);
  };

  const submitReceipt = async () => {
    const arr = Object.entries(receipts).map(([item_id, r]) => ({
      item_id, receive_now: parseInt(r.receive_now, 10), unit_cost: Number(r.unit_cost),
    })).filter(r => r.receive_now > 0);
    if (!arr.length) { alert('Nothing to receive'); return; }
    setBusy(true);
    const r = await fetch('/api/purchase-receive', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ po_id: id, receipts: arr }),
    });
    if (r.ok) { setShowReceive(false); reload(); alert('Receipt recorded. Stock + cost updated.'); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  if (!po) return <div style={{padding:32}}>Loading...</div>;
  const b = STATUS_BADGE[po.status] || { bg:'#eee', fg:'#666' };

  return (
    <div>
      <Link href="/admin/purchases" style={{color:'#8C919E',fontSize:12,textDecoration:'none'}}>← All purchases</Link>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:8,marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,fontFamily:'monospace'}}>{po.po_number}</h1>
          <p style={{color:'#8C919E',fontSize:14}}>Vendor: <strong>{po.vendor?.name}</strong> · Created {new Date(po.created_at).toLocaleString()}</p>
          {po.submitted_at && <p style={{color:'#8C919E',fontSize:12}}>Submitted: {new Date(po.submitted_at).toLocaleString()}</p>}
          {po.received_at && <p style={{color:'#8C919E',fontSize:12}}>Fully received: {new Date(po.received_at).toLocaleString()}</p>}
          {po.last_emailed_at && <p style={{color:'#8C919E',fontSize:12}}>Last email: {new Date(po.last_emailed_at).toLocaleString()}</p>}
        </div>
        <span style={{padding:'4px 12px',borderRadius:6,fontSize:12,background:b.bg,color:b.fg,textTransform:'uppercase',letterSpacing:1,fontWeight:600}}>{po.status}</span>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:24}}>
        {po.status === 'draft' && <button onClick={submit} disabled={busy} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Submit + Email Vendor</button>}
        {['submitted','partial'].includes(po.status) && <>
          <button onClick={openReceive} disabled={busy} style={{padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Receive Shipment</button>
          <button onClick={resend} disabled={busy} style={{padding:'10px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Resend PO email</button>
          <button onClick={cancel} disabled={busy} style={{padding:'10px 20px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel PO</button>
        </>}
        {po.status === 'partial' && <button onClick={closeForce} disabled={busy} style={{padding:'10px 20px',background:'#FEF3C7',color:'#A16207',border:'1px solid #FDE68A',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Close PO (forced)</button>}
        {po.status === 'draft' && <button onClick={cancel} disabled={busy} style={{padding:'10px 20px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Discard draft</button>}
      </div>

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['SKU','Product','Size','Ordered','Received','Unit cost','Line total'].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {items.map(i => {
              const p = products[i.product_id] || {};
              const lt = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
              const fully = (i.qty_received || 0) >= i.qty_ordered;
              return (
                <tr key={i.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{p.sku}</td>
                  <td style={{padding:'12px',fontSize:13}}>{p.name}</td>
                  <td style={{padding:'12px',color:'#7A7D88',fontSize:11}}>{p.size}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13}}>{i.qty_ordered}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13,color:fully?'#16A34A':(i.qty_received?'#A16207':'#7A7D88')}}>{i.qty_received||0}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13}}>${Number(i.unit_cost).toFixed(2)}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13,fontWeight:600}}>${lt}</td>
                </tr>
              );
            })}
            <tr><td colSpan="6" style={{padding:'12px',textAlign:'right',fontWeight:700}}>Total</td><td style={{padding:'12px',fontFamily:'monospace',fontSize:16,color:'#0072B5',fontWeight:700}}>${Number(po.total_cost||0).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {po.notes && <div style={{marginTop:24,padding:16,background:'#FAFBFC',borderLeft:'3px solid #00A0A8',borderRadius:4}}><strong>Notes:</strong><br />{po.notes}</div>}

      {showReceive && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}} onClick={()=>setShowReceive(false)}>
          <div style={{background:'white',borderRadius:8,maxWidth:800,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:20,fontWeight:700,color:'#0F1928',marginBottom:16}}>Receive Shipment</h2>
            <p style={{color:'#7A7D88',fontSize:13,marginBottom:16}}>Enter what arrived per line. Edit the unit cost if the invoice differs from what was on the PO.</p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                {['Product','Ordered','So far','Receive now','Unit cost'].map((h,i)=>(<th key={i} style={{padding:'8px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
              </tr></thead>
              <tbody>
                {items.map(i => {
                  const p = products[i.product_id] || {};
                  const r = receipts[i.id] || { receive_now: 0, unit_cost: i.unit_cost };
                  return (
                    <tr key={i.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                      <td style={{padding:'8px'}}>{p.name} <span style={{color:'#7A7D88',fontSize:11}}>({p.size})</span></td>
                      <td style={{padding:'8px',fontFamily:'monospace'}}>{i.qty_ordered}</td>
                      <td style={{padding:'8px',fontFamily:'monospace',color:'#7A7D88'}}>{i.qty_received||0}</td>
                      <td style={{padding:'8px'}}><input type="number" min="0" value={r.receive_now} onChange={e=>setReceipts(prev=>({...prev,[i.id]:{...r,receive_now:e.target.value}}))} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                      <td style={{padding:'8px'}}><input type="number" step="0.01" min="0" value={r.unit_cost} onChange={e=>setReceipts(prev=>({...prev,[i.id]:{...r,unit_cost:e.target.value}}))} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{display:'flex',gap:12,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowReceive(false)} style={{padding:'10px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={submitReceipt} disabled={busy} style={{padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Submit Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Smoke test full PO lifecycle**

1. **Create draft** — done in Task 14. Open the resulting PO detail page. Should show the line items and a "Submit + Email Vendor" button.
2. **Submit** — set Eve's contact_email first to your own personal email if not set (in `/admin/vendors/<eve-id>`). Click "Submit + Email Vendor" on the PO. Should redirect to PO detail with status "submitted" + a po_number like `PO-2026-0001`. Check your inbox for the PO email.
3. **Receive** — click "Receive Shipment". Modal opens. Receive partial qty on first line (e.g. ordered 5, receive 3). Submit. PO status should flip to "partial". In Supabase, verify `products.stock` for that SKU went up by 3*10 = 30 vials and `products.cost` updated.
4. **Receive remainder** — receive the rest. Status should flip to "received".
5. **Cleanup** — `DELETE FROM purchase_orders WHERE id='<test-po-id>';` in Supabase (cascades to items). Reset the test product's stock + cost to original values manually.

- [ ] **Step 3: Commit**

```bash
git add app/admin/purchases/\[id\]/page.jsx
git commit -m "Admin: PO detail page + receiving modal + lifecycle actions"
```

---

## Phase 5 — Inventory page enhancements (hide toggle + compare modal + content tab)

### Task 16: Add hide toggle to inventory page

**Files:**
- Modify: `app/admin/inventory/page.jsx`

- [ ] **Step 1: Find the row mapping in `app/admin/inventory/page.jsx` where each product `<tr>` is rendered (around the existing column definitions on line ~130).**

- [ ] **Step 2: Add a "Hide" toggle column at the end of the row, after Margin and before the existing actions cell.**

In the existing column array near line 130, add `{k:'active',l:'Show',w:55}` between margin and actions. Then in the row body, before the actions `<td>`, add:

```jsx
<td style={{padding:'10px 12px',textAlign:'center'}}>
  <button onClick={async (e) => {
    e.stopPropagation();
    const newActive = !p.active;
    const r = await fetch('/api/product-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id: p.id, fields:{ active: newActive } })
    });
    if (r.ok) setInventory(prev => prev.map(x => x.id === p.id ? { ...x, active: newActive } : x));
    else { const e2 = await r.json().catch(()=>({})); alert('Failed: '+(e2.error||r.status)); }
  }} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:p.active===false?0.3:1}}>
    {p.active === false ? '🚫' : '👁'}
  </button>
</td>
```

- [ ] **Step 3: Add a "Hidden" badge to the SKU cell when `p.active === false`.**

In the SKU cell (the existing `<td>` for SKU near line 142), wrap or extend so when `p.active === false`, show a small badge:

```jsx
<td style={{padding:'10px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>
  {p.sku}
  {p.active === false && <span style={{marginLeft:6,padding:'1px 6px',background:'#FEE2E2',color:'#DC2626',fontSize:9,borderRadius:3,letterSpacing:1}}>HIDDEN</span>}
</td>
```

- [ ] **Step 4: Smoke test (browser)**

Reload `/admin/inventory`. Each row should have an eye icon at the end. Click it on any product → row dims, "HIDDEN" badge appears next to SKU. In Supabase: `SELECT name, active FROM products WHERE id=<id>;` confirms `active=false`. Click eye again → unhides.

- [ ] **Step 5: Commit**

```bash
git add app/admin/inventory/page.jsx
git commit -m "Admin: hide toggle on inventory rows (uses products.active)"
```

### Task 17: Add Compare Vendors modal to inventory page

**Files:**
- Modify: `app/admin/inventory/page.jsx`

- [ ] **Step 1: At the top of the inventory page component (with other useState declarations), add:**

```jsx
const [compareFor, setCompareFor] = useState(null);  // product object or null
const [vendorPrices, setVendorPrices] = useState([]); // all vendor_prices
const [vendors, setVendors] = useState([]);
```

- [ ] **Step 2: In the existing `useEffect` that loads inventory, also load vendors and vendor_prices in parallel.** Find the existing `load()` function and add two more parallel fetches:

```jsx
const [invRes, vRes, vpRes] = await Promise.all([
  fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=name.asc`, { headers: H() }),
  fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*`, { headers: H() }),
  fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers: H() }),
]);
setInventory(await invRes.json());
setVendors(await vRes.json());
setVendorPrices(await vpRes.json());
```

(If the existing fetch logic differs, adapt — the goal is just to have `vendors` and `vendorPrices` populated by load time.)

- [ ] **Step 3: Add a "Compare" link cell next to the eye icon column in the row mapping:**

Either as part of the actions cell or as a new cell:

```jsx
<td style={{padding:'10px 12px'}}>
  <button onClick={(e)=>{e.stopPropagation(); setCompareFor(p);}} style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontSize:11,textDecoration:'underline'}}>Compare</button>
</td>
```

- [ ] **Step 4: Render the comparison modal at the bottom of the JSX (just before the closing `</div>` of the page):**

```jsx
{compareFor && (() => {
  const matches = vendorPrices.filter(vp => vp.product_id === compareFor.id);
  const minCost = Math.min(...matches.map(m => Number(m.cost_per_kit)));
  return (
    <div onClick={()=>setCompareFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:8,maxWidth:500,width:'100%',padding:24}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#0F1928',marginBottom:4}}>{compareFor.name}</h2>
        <p style={{color:'#7A7D88',fontSize:12,marginBottom:16}}>{compareFor.size} · {compareFor.sku}</p>
        {matches.length === 0 && <p style={{color:'#7A7D88'}}>No vendors have priced this product yet.</p>}
        {matches.length > 0 && (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
              <th style={{padding:'8px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Vendor</th>
              <th style={{padding:'8px',textAlign:'right',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Cost / kit</th>
              <th style={{padding:'8px',textAlign:'right',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Updated</th>
            </tr></thead>
            <tbody>
              {matches.sort((a,b)=>Number(a.cost_per_kit)-Number(b.cost_per_kit)).map(m => {
                const v = vendors.find(v => v.id === m.vendor_id);
                const isMin = Number(m.cost_per_kit) === minCost;
                return (
                  <tr key={m.id} style={{borderBottom:'1px solid #F0F1F4',background:isMin?'#F0FDF4':'transparent'}}>
                    <td style={{padding:'8px',fontWeight:isMin?700:400}}>{v?.name} {isMin && <span style={{color:'#16A34A',fontSize:10,marginLeft:6}}>↓ CHEAPEST</span>}</td>
                    <td style={{padding:'8px',textAlign:'right',fontFamily:'monospace',color:isMin?'#16A34A':'#0F1928',fontWeight:isMin?700:400}}>${Number(m.cost_per_kit).toFixed(2)}</td>
                    <td style={{padding:'8px',textAlign:'right',fontSize:11,color:'#7A7D88'}}>{new Date(m.last_updated).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button onClick={()=>setCompareFor(null)} style={{marginTop:16,padding:'8px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Close</button>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 5: Smoke test (browser)**

Reload `/admin/inventory`. Each row has a "Compare" link. Click on BPC-157 → modal shows Eve's price. After Task 13 you may have set a Weak price too — should show both with the cheaper one highlighted.

- [ ] **Step 6: Commit**

```bash
git add app/admin/inventory/page.jsx
git commit -m "Admin: compare vendors modal on inventory rows"
```

### Task 18: Add Content tab to inventory edit/add product flow

**Files:**
- Modify: `app/admin/inventory/page.jsx`

- [ ] **Step 1: The current page has inline-edit on rows + a "+ Add Product" button. We're adding richer content fields. Approach: when editing a row, show a "Content" link button that opens a modal with description/specs/research editors.**

Add state:

```jsx
const [contentFor, setContentFor] = useState(null);  // product or null
const [contentForm, setContentForm] = useState({ description:'', specs:[], research:[] });
```

- [ ] **Step 2: Add a "Content" button to the actions cell of each row:**

```jsx
<button onClick={(e) => {
  e.stopPropagation();
  setContentFor(p);
  setContentForm({
    description: p.description || '',
    specs: Array.isArray(p.specs) ? p.specs : [],
    research: Array.isArray(p.research) ? p.research : [],
  });
}} style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontSize:11,marginRight:8,textDecoration:'underline'}}>Content</button>
```

- [ ] **Step 3: Render the content modal at the bottom of the page JSX:**

```jsx
{contentFor && (
  <div onClick={()=>setContentFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:8,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24}}>
      <h2 style={{fontSize:20,fontWeight:700,color:'#0F1928',marginBottom:4}}>{contentFor.name}</h2>
      <p style={{color:'#7A7D88',fontSize:12,marginBottom:20}}>{contentFor.size} · {contentFor.sku}</p>
      <p style={{fontSize:11,color:'#A16207',background:'#FEF3C7',padding:8,borderRadius:4,marginBottom:16}}>If left empty, the product page shows the generic template.</p>

      <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Description</label>
      <textarea value={contentForm.description} onChange={e=>setContentForm(f=>({...f,description:e.target.value}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:120,marginBottom:4}} />
      <p style={{fontSize:10,color:'#7A7D88',marginBottom:16}}>{contentForm.description.length} characters</p>

      <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Specs (one per line)</label>
      <textarea value={contentForm.specs.join('\n')} onChange={e=>setContentForm(f=>({...f,specs:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80,marginBottom:16,fontFamily:'monospace'}} placeholder={'≥99% purity\nLyophilized form\nHPLC verified'} />

      <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Research links (one per line: Title | URL)</label>
      <textarea value={contentForm.research.map(r=>`${r.title} | ${r.url}`).join('\n')} onChange={e=>{
        const lines = e.target.value.split('\n').map(l=>l.trim()).filter(Boolean);
        const arr = lines.map(l => {
          const [title, url] = l.split('|').map(s=>s.trim());
          return { title: title||'', url: url||'' };
        }).filter(r => r.title && r.url);
        setContentForm(f=>({...f,research:arr}));
      }} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80,marginBottom:20,fontFamily:'monospace'}} placeholder={'BPC-157 effects on tendon healing | https://pubmed.ncbi.nlm.nih.gov/...'} />

      <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
        <button onClick={()=>setContentFor(null)} style={{padding:'8px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Cancel</button>
        <button onClick={async ()=>{
          const r = await fetch('/api/product-write', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ action:'update', id: contentFor.id, fields: contentForm }),
          });
          if (r.ok) {
            setInventory(prev => prev.map(x => x.id === contentFor.id ? { ...x, ...contentForm } : x));
            setContentFor(null);
          } else {
            const e = await r.json().catch(()=>({}));
            alert('Failed: '+(e.error||r.status));
          }
        }} style={{padding:'8px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Save Content</button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Smoke test (browser)**

Reload inventory. Click "Content" on BPC-157. Modal opens. Fill in description ("BPC-157 is a synthetic peptide..."), 2 specs, 1 research link. Save. Reload page → click Content again → values persist. Verify in Supabase: `SELECT name, description, specs, research FROM products WHERE sku='BP10';`

- [ ] **Step 5: Commit**

```bash
git add app/admin/inventory/page.jsx
git commit -m "Admin: Content modal on inventory rows (description/specs/research)"
```

---

## Phase 6 — Pricing + Dashboard updates

### Task 19: Add Suggested Retail column to pricing page

**Files:**
- Modify: `app/admin/pricing/page.jsx`

- [ ] **Step 1: At the top of the component, add a margin target state:**

```jsx
const [marginTarget, setMarginTarget] = useState(95);  // percent
```

- [ ] **Step 2: Add a margin target input near the existing average-margin display:**

```jsx
<div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}>
  <label style={{fontSize:12,color:'#8C919E'}}>Target margin %:</label>
  <input type="number" min="1" max="99" value={marginTarget} onChange={e=>setMarginTarget(Number(e.target.value)||95)} style={{width:60,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} />
</div>
```

- [ ] **Step 3: In the products table, add a "Suggested" column header and cell that shows `cost/10 / (1 - marginTarget/100)` rounded, with a click-to-apply.**

Add header:

```jsx
<th style={{padding:'8px 12px',textAlign:'right',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Suggested</th>
```

Add cell in the row mapping:

```jsx
<td style={{padding:'8px 12px',textAlign:'right'}}>
  {(() => {
    const pv = Number(p.cost) / 10;
    const sug = Math.round(pv / (1 - marginTarget / 100));
    return <button onClick={()=>updatePrice(p.id, sug)} style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontFamily:'monospace',fontSize:12,textDecoration:'underline'}}>${sug}</button>;
  })()}
</td>
```

- [ ] **Step 4: Smoke test (browser)**

Visit `/admin/pricing`. Set target margin to 90%. Suggested column updates. Click any suggestion → that product's retail updates.

- [ ] **Step 5: Commit**

```bash
git add app/admin/pricing/page.jsx
git commit -m "Admin: suggested-retail column on pricing page"
```

### Task 20: Add Open POs + In-transit value KPI cards to dashboard

**Files:**
- Modify: `app/admin/page.jsx`

- [ ] **Step 1: In the existing dashboard `useEffect`, also fetch open POs:**

Find the existing `load()` and add:

```jsx
const { data: openPos } = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?status=in.(submitted,partial)&select=total_cost`, {
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
}).then(r => r.json().then(d => ({ data: d })));
```

Or, since the existing code uses the supabase-js client, just:

```jsx
const { data: openPos } = await supabase.from('purchase_orders').select('total_cost').in('status', ['submitted','partial']);
```

Track in stats:

```jsx
setStats({
  ...,
  openPos: (openPos || []).length,
  inTransitValue: (openPos || []).reduce((s, p) => s + Number(p.total_cost || 0), 0),
});
```

- [ ] **Step 2: Add two cards to the existing KPI grid:**

Find the existing 4-card grid and either (a) make it 6 cards or (b) add a second row. Quickest option (a):

```jsx
{ label: 'Open POs',         value: stats.openPos,                                icon: '📥', color: '#A16207' },
{ label: 'In-transit value', value: '$' + (stats.inTransitValue || 0).toFixed(0), icon: '🚚', color: '#1D4ED8' },
```

Update `gridTemplateColumns: 'repeat(4, 1fr)'` → `'repeat(6, 1fr)'`.

- [ ] **Step 3: Smoke test (browser)**

Visit `/admin`. Should see 6 KPI cards including Open POs and In-transit value. With the test PO from Task 15, Open POs should be 1 (or 0 if you cleaned it up).

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.jsx
git commit -m "Admin: Open POs + In-transit value KPI cards on dashboard"
```

---

## Phase 7 — Storefront updates (active filter + dynamic product page + order email validation)

### Task 21: Add active filter to storefront catalog

**Files:**
- Modify: `../advnce-site/advnce-catalog.html` (line ~319, the `fetchProducts` function)

- [ ] **Step 1: Locate the fetch URL**

```bash
grep -n "fetch.*rest/v1/products" ../advnce-site/advnce-catalog.html
```

- [ ] **Step 2: Add `&active=is.true` to the query string**

The current line is roughly:
```javascript
const r=await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=cat.asc,name.asc&limit=500`,{
```

Change to:
```javascript
const r=await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&active=is.true&order=cat.asc,name.asc&limit=500`,{
```

- [ ] **Step 3: Smoke test**

```bash
cd ../advnce-site && python3 -m http.server 8080  # serve locally
```

Visit `http://localhost:8080/advnce-catalog.html`. Catalog should look the same. Then in admin (running on port 3000 in another terminal), hide a product. Reload catalog → that product should disappear.

(If it's hard to run python http.server alongside the next dev server, just push and verify after deploy.)

- [ ] **Step 4: Commit**

```bash
cd ../advnce-site && git add advnce-catalog.html && git commit -m "Storefront: filter inactive products from catalog"
```

### Task 22: Add active filter + dynamic content rendering to product page

**Files:**
- Modify: `../advnce-site/advnce-product.html`

- [ ] **Step 1: Add active filter to the per-SKU fetch (line ~232 in fetchProduct)**

```bash
grep -n "rest/v1/products?sku=eq" ../advnce-site/advnce-product.html
```

Change:
```javascript
fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${sku}&select=*`,{...
```

to:
```javascript
fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${sku}&active=is.true&select=*`,{...
```

Also add to the bulk product list fetch on the next line:
```javascript
fetch(`${SUPABASE_URL}/rest/v1/products?select=*&active=is.true&order=name.asc&limit=500`,{...
```

- [ ] **Step 2: Replace the "About this Compound" accordion to use `p.description` when set**

Find (around line 355):
```html
<div class="acc-body open"><p>${fullName}. Research-grade ${p.cat.toLowerCase()} compound supplied in lyophilized form for in-vitro laboratory research. Each lot is independently verified by HPLC analysis. Certificate of Analysis available on request. Intended for use by qualified researchers only in accordance with all applicable laws and regulations.</p></div>
```

Replace with:
```html
<div class="acc-body open">${p.description ? `<p>${p.description}</p>` : `<p>${fullName}. Research-grade ${p.cat.toLowerCase()} compound supplied in lyophilized form for in-vitro laboratory research. Each lot is independently verified by HPLC analysis. Certificate of Analysis available on request. Intended for use by qualified researchers only in accordance with all applicable laws and regulations.</p>`}</div>
```

- [ ] **Step 3: Replace the Specs accordion to use `p.specs` when non-empty**

Find the existing specs block (around line 359, contains `Keep out of reach of children`):
```html
<div class="acc-body"><ul>
  <li>Lyophilized peptide</li>
  <li>...existing static bullets...</li>
</ul></div>
```

Replace with:
```html
<div class="acc-body"><ul>
  ${(Array.isArray(p.specs) && p.specs.length)
    ? p.specs.map(s => `<li>${s}</li>`).join('')
    : `<li>Lyophilized peptide</li><li>Reconstitute with bacteriostatic water</li><li>Store refrigerated</li><li>Keep out of reach of children</li>`
  }
</ul></div>
```

(If the existing specs block has different bullets, copy those into the fallback string verbatim — the goal is to preserve the current generic content as fallback.)

- [ ] **Step 4: Add a Research accordion (only renders if `p.research` has entries)**

After the Legal Notice accordion (around line 374), insert:

```html
${(Array.isArray(p.research) && p.research.length) ? `
<div class="accordion">
  <button class="acc-hdr" onclick="toggleAcc(this)"><span>Research</span><span class="acc-icon">+</span></button>
  <div class="acc-body"><ul>
    ${p.research.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:none">${r.title} →</a></li>`).join('')}
  </ul></div>
</div>` : ''}
```

- [ ] **Step 5: Smoke test**

Edit BPC-157's content via admin (Task 18). Visit local product page `?sku=BP10` (or push and check live). About-this-compound should now show your custom description; Specs should reflect what you entered; Research accordion appears with your link.

Pick another product (e.g. TB-500) — leave content empty in admin. Its product page should still show the generic template (verifies fallback works).

- [ ] **Step 6: Commit**

```bash
cd ../advnce-site && git add advnce-product.html && git commit -m "Storefront: dynamic product page (description/specs/research from products row)"
```

### Task 23: Defense-in-depth — order email rejects inactive SKUs

**Files:**
- Modify: `../advnce-site/api/send-order-email.js`

- [ ] **Step 1: Find the existing per-SKU price-validation fetch (~line 60)**

```bash
grep -n "select=retail,name,stock" ../advnce-site/api/send-order-email.js
```

- [ ] **Step 2: Add `active` to the select**

Change:
```javascript
const skuRes = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(item.sku)}&select=retail,name,stock`, {
```

to:
```javascript
const skuRes = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(item.sku)}&select=retail,name,stock,active`, {
```

- [ ] **Step 3: Reject inactive SKUs immediately after the existing skuData check**

After:
```javascript
if (!skuData.length) return res.status(400).json({ error: `Invalid product: ${item.sku}` });
```

add:
```javascript
if (skuData[0].active === false) return res.status(400).json({ error: `Product no longer available: ${item.sku}` });
```

- [ ] **Step 4: Commit**

```bash
cd ../advnce-site && git add api/send-order-email.js && git commit -m "Storefront API: reject orders for inactive SKUs"
```

---

## Phase 8 — Push + smoke-test live

### Task 24: Push everything live

- [ ] **Step 1: Push adonis-next**

```bash
git push origin main
```

- [ ] **Step 2: Push advnce-site**

```bash
cd ../advnce-site && git push origin main
```

- [ ] **Step 3: Wait ~60 seconds for both Vercel deploys to complete**

- [ ] **Step 4: Smoke test all 5 new API routes via curl**

```bash
for r in vendor-write vendor-prices-write product-write purchase-write purchase-receive; do
  echo -n "/api/$r: "
  curl -s "https://adonis.pro/api/$r" -w "\n"
done
```

Each should return `{"status":"<route> is live"}`.

- [ ] **Step 5: End-to-end smoke test in production**

1. `https://adonis.pro/admin/vendors` — Eve + Weak appear.
2. Click into Eve, Pricing tab — see all priced products with current costs.
3. `https://adonis.pro/admin/purchases` → "+ New PO" → Eve → 1 line BPC-157 qty 5 → Save Draft → opens detail.
4. Submit (your own email is set as Eve's contact_email) — receive the PO email.
5. Receive Shipment → enter 5 → Submit. Stock for BPC-157 should jump by 50 vials. Cost stays at $25.
6. Verify in Supabase: `SELECT name, stock, cost, vendor FROM products WHERE sku='BP10';`
7. **Cleanup test data:** `DELETE FROM purchase_orders WHERE id='<test-po>';` then manually reset BPC-157's stock back to its pre-test value.

- [ ] **Step 6: Verify storefront still works**

- `https://www.advncelabs.com/advnce-catalog.html` — Bac Water still visible (from earlier work), no broken products.
- Hide a test product in admin → reload catalog → it disappears.
- Visit `https://www.advncelabs.com/advnce-product.html?sku=BP10` — if you set BPC-157 content earlier, you'll see it; otherwise generic template renders.
- Restore the test product to active in admin.

---

## Self-review (after writing the plan)

**Spec coverage check** (each section of the spec should map to at least one task):

- ✓ Schema (Sec 3) → Task 1, 2, 3
- ✓ RLS (Sec 3.3) → Task 1 (lockdown) + Task 12 step 2 (anon SELECT for admin pages)
- ✓ Data migration (Sec 3.4) → Task 3
- ✓ Sidebar nav (Sec 4.1) → Task 11
- ✓ Vendors page (Sec 4.2) → Tasks 12, 13
- ✓ Purchases page (Sec 4.3) → Tasks 14, 15
- ✓ Inventory hide toggle (Sec 4.4 + 8.2) → Task 16
- ✓ Compare vendors (Sec 4.4) → Task 17
- ✓ Content tab (Sec 4.4 addendum) → Task 18
- ✓ Suggested retail (Sec 4.5) → Task 19
- ✓ Dashboard KPIs (Sec 4.6) → Task 20
- ✓ API routes (Sec 5) → Tasks 5, 6, 7, 9, 10
- ✓ PO email (Sec 6) → Tasks 8, 9
- ✓ Receiving (Sec 7) → Tasks 10, 15
- ✓ Storefront content (Sec 8.1) → Task 22
- ✓ active filter (Sec 8.2) → Tasks 21, 22
- ✓ Order email validation (Sec 8.3) → Task 23
- ✓ Deploy order (Sec 9) → Task 24

**Type/name consistency:** All API routes use the same UUID validation regex; PO action discriminator names (`create|update|submit|resend|cancel|close`) consistent across `purchase-write` route + UI; `receive_now`/`unit_cost` field names match between UI (Task 15) and API (Task 10).

