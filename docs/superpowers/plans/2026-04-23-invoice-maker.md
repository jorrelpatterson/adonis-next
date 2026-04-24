# Invoice Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an admin tool at `adonis.pro/admin/invoices` that creates branded PNG invoices + shareable public URLs for customer texts, then tracks the order through paid → shipped → delivered with inventory sync.

**Architecture:** Extend the existing `orders` table (invoices are admin-initiated orders). Admin pages + API routes live in `adonis-next` (Next.js App Router). The public view page `/invoice/<uuid>` lives in `advnce-site`. Image generation uses `sharp` (already in adonis-next). Invoice images stored in a new Supabase Storage bucket `invoices`.

**Tech Stack:** Next.js 14 App Router, Supabase REST + Storage, Resend, `sharp` for PNG rasterization, vanilla HTML for the public view page.

**Related docs:**
- Spec: [../specs/2026-04-23-invoice-maker-design.md](../specs/2026-04-23-invoice-maker-design.md)
- Existing `sharp` usage: `app/api/ambassador-images/personalize/route.js`
- Existing admin pattern reference: `app/admin/discount-codes/page.jsx`

---

## Phase 1 — Schema + invoice creation

### Task 1.1: SQL migration

**Files:**
- Create: `sql/2026-04-23-invoice-columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 2026-04-23: invoice maker feature — extend orders table

alter table orders
  add column if not exists is_invoice boolean not null default false,
  add column if not exists invoice_id text,
  add column if not exists invoice_image_path text,
  add column if not exists invoice_discount_pct numeric(5,2),
  add column if not exists invoice_discount_flat_cents integer,
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists created_by text;

create index if not exists orders_invoice_lookup_idx
  on orders(is_invoice, status, created_at desc)
  where is_invoice = true;

create unique index if not exists orders_invoice_id_uniq
  on orders(invoice_id) where invoice_id is not null;
```

- [ ] **Step 2: Surface the SQL to Jorrel to run in Supabase SQL editor**

Paste into [SQL editor](https://supabase.com/dashboard/project/efuxqrvdkrievbpljlaf/sql/new). Verify:

```sql
select column_name from information_schema.columns
where table_name = 'orders'
  and column_name in ('is_invoice','invoice_id','invoice_image_path','invoice_discount_pct','invoice_discount_flat_cents','tracking_number','tracking_carrier','shipped_at','delivered_at','created_by');
-- expect 10 rows
```

- [ ] **Step 3: Create the Supabase Storage bucket**

In Supabase dashboard → Storage → **New bucket**:
- Name: `invoices`
- Public: yes (anyone with URL can GET)
- File size limit: 10 MB

- [ ] **Step 4: Commit**

```bash
git add sql/2026-04-23-invoice-columns.sql
git commit -m "invoice: sql migration — extend orders with invoice columns"
```

---

### Task 1.2: Invoice ID generator + number sequence

**Files:**
- Create: `lib/invoiceId.js`

- [ ] **Step 1: Write the helper**

```js
// Generates sequential human-friendly invoice IDs: AVL-INV-0001, AVL-INV-0002, ...
// Not collision-free if two invoices created in the same millisecond on different
// instances, but we have a UNIQUE constraint on invoice_id so the worst case is
// a 500 and admin retries.

export async function nextInvoiceId(supabaseUrl, serviceKey) {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=invoice_id&invoice_id=not.is.null&order=invoice_id.desc&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
  );
  if (!r.ok) throw new Error('invoiceId lookup failed: ' + await r.text());
  const rows = await r.json();
  const lastSeq = rows[0]?.invoice_id
    ? parseInt(rows[0].invoice_id.split('-').pop(), 10)
    : 0;
  const next = (isNaN(lastSeq) ? 0 : lastSeq) + 1;
  return `AVL-INV-${String(next).padStart(4, '0')}`;
}
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check lib/invoiceId.js
git add lib/invoiceId.js
git commit -m "invoice: sequential invoice ID generator"
```

---

### Task 1.3: Invoice image template + renderer

**Files:**
- Create: `lib/invoiceImage.js`

This renders the HTML that the approved mockup showed, then rasterizes to PNG via `sharp`.

- [ ] **Step 1: Write the HTML template + render function**

```js
// Renders an invoice PNG from structured data. Uses sharp's built-in SVG
// rasterization; we hand it a single large SVG string produced from the
// invoice data. Fonts are approximated via generic sans-serif in SVG since
// custom fonts require more plumbing; the text is still readable and
// branded by color palette.

import sharp from 'sharp';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function centsToDollars(cents) {
  return '$' + (cents / 100).toFixed(2);
}

// Build the invoice as a big SVG. Width 1200px, height grows with line count.
// Returns {svg: string, heightPx: number}.
function buildSvg(inv) {
  const W = 1200;
  const PAD = 72;
  const lineHeight = 64;

  // Compute layout heights
  const headerH = 104;
  const titleBlockH = 180;
  const toBlockH = 120;
  const itemHeaderH = 32;
  const itemsH = inv.items.length * lineHeight + 16;
  const totalsH = 200 + (inv.discount_pct || inv.discount_flat_cents ? 40 : 0);
  const zelleH = 240;
  const linkH = 60;
  const footH = 48;
  const H = headerH + titleBlockH + toBlockH + itemHeaderH + itemsH + totalsH + zelleH + linkH + footH;

  // Colors
  const ink = '#1A1C22', cream = '#F4F2EE', cyan = '#00A0A8', amber = '#E07C24',
        dim = '#7A7D88', bg2 = '#ECEAE4', rule = 'rgba(0,0,0,0.08)';

  // Item rows
  let itemsSvg = '';
  let y = headerH + titleBlockH + toBlockH + itemHeaderH + 24;
  for (const it of inv.items) {
    const nm = esc(it.name);
    const sub = `${esc(it.size || '')} · ${esc(it.sku)} · qty ${it.qty}`;
    const price = '$' + (it.price * it.qty).toFixed(2);
    itemsSvg += `
      <text x="${PAD}" y="${y}" font-family="sans-serif" font-size="22" font-weight="700" fill="${ink}">${nm}</text>
      <text x="${PAD}" y="${y + 22}" font-family="monospace" font-size="14" fill="${dim}" letter-spacing="1.5">${sub.toUpperCase()}</text>
      <text x="${W - PAD}" y="${y + 10}" font-family="monospace" font-size="22" fill="${ink}" text-anchor="end">${price}</text>
      <line x1="${PAD}" y1="${y + 36}" x2="${W - PAD}" y2="${y + 36}" stroke="${rule}" stroke-width="1"/>
    `;
    y += lineHeight;
  }

  // Totals
  const totalsStartY = headerH + titleBlockH + toBlockH + itemHeaderH + itemsH + 40;
  let totalsSvg = `<line x1="${PAD}" y1="${totalsStartY - 16}" x2="${W - PAD}" y2="${totalsStartY - 16}" stroke="${ink}" stroke-width="2"/>`;
  let ty = totalsStartY + 10;
  totalsSvg += `
    <text x="${PAD}" y="${ty}" font-family="sans-serif" font-size="20" fill="${ink}">Subtotal</text>
    <text x="${W - PAD}" y="${ty}" font-family="monospace" font-size="20" fill="${ink}" text-anchor="end">${centsToDollars(inv.subtotal_cents)}</text>
  `;
  ty += 36;
  if (inv.discount_pct || inv.discount_flat_cents) {
    const discLabel = inv.discount_pct
      ? `Discount · ${inv.discount_pct}% off`
      : `Discount · ${centsToDollars(inv.discount_flat_cents)} off`;
    totalsSvg += `
      <text x="${PAD}" y="${ty}" font-family="sans-serif" font-size="20" fill="${amber}">${esc(discLabel)}</text>
      <text x="${W - PAD}" y="${ty}" font-family="monospace" font-size="20" fill="${amber}" text-anchor="end">−${centsToDollars(inv.discount_applied_cents)}</text>
    `;
    ty += 36;
  }
  totalsSvg += `
    <line x1="${PAD}" y1="${ty - 8}" x2="${W - PAD}" y2="${ty - 8}" stroke="${rule}" stroke-width="1"/>
    <text x="${PAD}" y="${ty + 28}" font-family="sans-serif" font-size="28" font-weight="700" fill="${ink}">Total</text>
    <text x="${W - PAD}" y="${ty + 28}" font-family="monospace" font-size="34" font-weight="700" fill="${cyan}" text-anchor="end">${centsToDollars(inv.total_cents)}</text>
  `;

  // Zelle block
  const zelleStartY = H - linkH - footH - zelleH;
  const zelleSvg = `
    <rect x="0" y="${zelleStartY}" width="${W}" height="${zelleH}" fill="${ink}"/>
    <text x="${PAD}" y="${zelleStartY + 44}" font-family="monospace" font-size="18" fill="${cyan}" letter-spacing="4">HOW TO PAY</text>
    <text x="${PAD}" y="${zelleStartY + 90}" font-family="sans-serif" font-size="36" font-weight="900" fill="${cream}" letter-spacing="2">SEND VIA ZELLE</text>
    <text x="${PAD}" y="${zelleStartY + 132}" font-family="monospace" font-size="20" fill="${cream}" opacity="0.85">1. Open Zelle in your bank app</text>
    <text x="${PAD}" y="${zelleStartY + 164}" font-family="monospace" font-size="20" fill="${cream}" opacity="0.85">2. Send <tspan fill="${cyan}" font-weight="700">${centsToDollars(inv.total_cents)}</tspan> to <tspan font-weight="700">6268064475</tspan></text>
    <text x="${PAD}" y="${zelleStartY + 196}" font-family="monospace" font-size="20" fill="${cream}" opacity="0.85">3. Memo: <tspan font-weight="700">${esc(inv.invoice_id)}</tspan></text>
    <text x="${PAD}" y="${zelleStartY + 224}" font-family="monospace" font-size="16" fill="${cream}" opacity="0.6">Ships in 2–3 business days once payment confirms</text>
  `;

  // Link strip
  const linkY = zelleStartY + zelleH;
  const linkSvg = `
    <rect x="0" y="${linkY}" width="${W}" height="${linkH}" fill="${bg2}"/>
    <text x="${W/2}" y="${linkY + 38}" font-family="monospace" font-size="18" fill="${dim}" text-anchor="middle" letter-spacing="3">VIEW FULL INVOICE · <tspan fill="${cyan}" text-decoration="underline">advncelabs.com/invoice/${esc(inv.uuid_short)}</tspan></text>
  `;

  // Footer
  const footY = linkY + linkH;
  const footSvg = `
    <text x="${W/2}" y="${footY + 32}" font-family="monospace" font-size="14" fill="${dim}" text-anchor="middle" letter-spacing="2" opacity="0.7">ALL PRODUCTS FOR RESEARCH USE ONLY · NOT FOR HUMAN CONSUMPTION · NOT EVALUATED BY THE FDA</text>
  `;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <rect width="${W}" height="${H}" fill="${cream}"/>
      <rect x="0" y="0" width="${W}" height="${headerH}" fill="${ink}"/>
      <text x="${PAD}" y="${headerH/2 + 14}" font-family="sans-serif" font-size="34" font-weight="900" fill="${cream}" letter-spacing="5">advnce <tspan fill="${dim}" font-weight="300">labs</tspan></text>
      <text x="${W - PAD}" y="${headerH/2 + 10}" font-family="monospace" font-size="18" fill="${dim}" text-anchor="end" letter-spacing="4">INVOICE · ${esc(inv.invoice_id).toUpperCase()}</text>
      <text x="${PAD}" y="${headerH + 70}" font-family="serif" font-size="72" font-weight="300" fill="${ink}">Order <tspan fill="${cyan}" font-style="italic">Summary.</tspan></text>
      <text x="${PAD}" y="${headerH + 108}" font-family="monospace" font-size="16" fill="${dim}" letter-spacing="3">ISSUED ${esc(inv.issued_at)}  ·  DUE WITHIN 48 HOURS</text>
      <line x1="${PAD}" y1="${headerH + titleBlockH - 40}" x2="${W - PAD}" y2="${headerH + titleBlockH - 40}" stroke="${rule}" stroke-width="1"/>
      <text x="${PAD}" y="${headerH + titleBlockH - 8}" font-family="monospace" font-size="14" fill="${dim}" letter-spacing="3">BILL TO</text>
      <text x="${W - PAD}" y="${headerH + titleBlockH - 8}" font-family="monospace" font-size="14" fill="${dim}" text-anchor="end" letter-spacing="3">FROM</text>
      <text x="${PAD}" y="${headerH + titleBlockH + 26}" font-family="sans-serif" font-size="22" font-weight="700" fill="${ink}">${esc(inv.customer.name)}</text>
      <text x="${PAD}" y="${headerH + titleBlockH + 54}" font-family="sans-serif" font-size="18" fill="${ink}">${esc(inv.customer.address_line1)}</text>
      <text x="${PAD}" y="${headerH + titleBlockH + 80}" font-family="sans-serif" font-size="18" fill="${ink}">${esc(inv.customer.address_line2)}</text>
      <text x="${W - PAD}" y="${headerH + titleBlockH + 26}" font-family="sans-serif" font-size="22" font-weight="700" fill="${ink}" text-anchor="end">advnce labs</text>
      <text x="${W - PAD}" y="${headerH + titleBlockH + 54}" font-family="sans-serif" font-size="18" fill="${ink}" text-anchor="end">orders@advncelabs.com</text>
      <text x="${W - PAD}" y="${headerH + titleBlockH + 80}" font-family="sans-serif" font-size="18" fill="${ink}" text-anchor="end">advncelabs.com</text>
      <line x1="${PAD}" y1="${headerH + titleBlockH + toBlockH - 20}" x2="${W - PAD}" y2="${headerH + titleBlockH + toBlockH - 20}" stroke="${rule}" stroke-width="1"/>
      ${itemsSvg}
      ${totalsSvg}
      ${zelleSvg}
      ${linkSvg}
      ${footSvg}
    </svg>`,
    heightPx: H,
  };
}

export async function renderInvoicePng(inv) {
  const { svg } = buildSvg(inv);
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

export { buildSvg };
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check lib/invoiceImage.js
git add lib/invoiceImage.js
git commit -m "invoice: sharp-based PNG renderer matching approved mockup"
```

---

### Task 1.4: Invoice save API — `POST /api/invoice-write`

**Files:**
- Create: `app/api/invoice-write/route.js`

- [ ] **Step 1: Write the endpoint**

```js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';
import { nextInvoiceId } from '../../../lib/invoiceId';
import { renderInvoicePng } from '../../../lib/invoiceImage';
import { randomUUID } from 'node:crypto';

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { customer, items, discount_pct, discount_flat_cents, notes } = body;

  // Validate
  if (!customer || !customer.name || !customer.address || !customer.city || !customer.state || !customer.zip) {
    return NextResponse.json({ error: 'customer name + address required' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'at least one item required' }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: 'max 20 items per invoice' }, { status: 400 });
  }
  const pct = discount_pct == null ? null : Number(discount_pct);
  const flat = discount_flat_cents == null ? null : Math.round(Number(discount_flat_cents));
  if (pct != null && (isNaN(pct) || pct < 0 || pct > 100)) {
    return NextResponse.json({ error: 'discount_pct must be 0-100' }, { status: 400 });
  }
  if (flat != null && (isNaN(flat) || flat < 0)) {
    return NextResponse.json({ error: 'discount_flat_cents must be non-negative' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Validate items against DB and normalize
  const normalizedItems = [];
  let subtotalCents = 0;
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!qty || qty < 1 || qty > 50) {
      return NextResponse.json({ error: `bad qty for ${it.sku}` }, { status: 400 });
    }
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=name,size,retail,stock`, { headers, cache: 'no-store' });
    if (!pr.ok) return NextResponse.json({ error: 'product lookup failed' }, { status: 500 });
    const pdata = await pr.json();
    if (!pdata.length) return NextResponse.json({ error: `unknown sku: ${it.sku}` }, { status: 400 });
    const priceCents = Math.round((it.price != null ? Number(it.price) : Number(pdata[0].retail)) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: `bad price for ${it.sku}` }, { status: 400 });
    }
    normalizedItems.push({
      sku: it.sku,
      name: pdata[0].name,
      size: pdata[0].size,
      qty,
      price: priceCents / 100,
    });
    subtotalCents += priceCents * qty;
  }

  // Compute discount
  let discountAppliedCents = 0;
  if (pct != null) discountAppliedCents += Math.round(subtotalCents * pct / 100);
  if (flat != null) discountAppliedCents += flat;
  if (discountAppliedCents > subtotalCents) discountAppliedCents = subtotalCents;
  const totalCents = subtotalCents - discountAppliedCents;

  // Generate invoice_id + order_id
  const invoiceId = await nextInvoiceId(SUPABASE_URL, SERVICE_KEY);
  const uuid = randomUUID();
  const orderId = `AVL-${new Date().getUTCFullYear()}-${invoiceId.split('-').pop()}`;
  const issuedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Render PNG
  const png = await renderInvoicePng({
    invoice_id: invoiceId,
    uuid_short: uuid.slice(0, 8),
    issued_at: issuedAt,
    customer: {
      name: customer.name,
      address_line1: customer.address,
      address_line2: `${customer.city}, ${customer.state} ${customer.zip}`,
    },
    items: normalizedItems,
    subtotal_cents: subtotalCents,
    discount_pct: pct,
    discount_flat_cents: flat,
    discount_applied_cents: discountAppliedCents,
    total_cents: totalCents,
  });

  // Upload to Supabase Storage
  const objectPath = `${invoiceId}.png`;
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/invoices/${encodeURIComponent(objectPath)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/png', 'x-upsert': 'true' },
    body: png,
  });
  if (!upRes.ok) {
    return NextResponse.json({ error: 'image upload failed: ' + await upRes.text() }, { status: 500 });
  }

  // Insert order row
  const orderPayload = {
    id: uuid,
    order_id: orderId,
    first_name: customer.name.split(' ')[0] || customer.name,
    last_name: customer.name.split(' ').slice(1).join(' ') || '',
    email: customer.email || null,
    phone: customer.phone || null,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    notes: notes || null,
    items: normalizedItems,
    total: totalCents / 100,
    status: 'sent',
    is_invoice: true,
    invoice_id: invoiceId,
    invoice_image_path: objectPath,
    invoice_discount_pct: pct,
    invoice_discount_flat_cents: flat,
    created_by: 'admin',
    created_at: new Date().toISOString(),
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(orderPayload),
  });
  if (!insRes.ok) {
    return NextResponse.json({ error: 'order insert failed: ' + await insRes.text() }, { status: 500 });
  }
  const inserted = await insRes.json();
  return NextResponse.json({ invoice: inserted[0] });
}
```

- [ ] **Step 2: Syntax check + commit**

```bash
node --check app/api/invoice-write/route.js
git add app/api/invoice-write/route.js
git commit -m "invoice: POST /api/invoice-write — create, render PNG, upload, insert"
```

---

### Task 1.5: Invoice list API — `GET /api/invoice-list`

**Files:**
- Create: `app/api/invoice-list/route.js`

- [ ] **Step 1: Write the endpoint**

```js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');  // optional filter
  const search = searchParams.get('q');        // optional name/email search

  const parts = ['is_invoice=eq.true', 'order=created_at.desc', 'limit=200'];
  if (status && status !== 'all') parts.push(`status=eq.${encodeURIComponent(status)}`);
  const qs = parts.join('&') + '&select=id,invoice_id,first_name,last_name,email,phone,total,status,created_at,tracking_number,items,invoice_image_path';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?${qs}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  let rows = await r.json();

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((o) =>
      (o.first_name + ' ' + o.last_name).toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q) ||
      (o.invoice_id || '').toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ invoices: rows });
}
```

- [ ] **Step 2: Commit**

```bash
node --check app/api/invoice-list/route.js
git add app/api/invoice-list/route.js
git commit -m "invoice: GET /api/invoice-list with status filter + search"
```

---

### Task 1.6: Invoice detail API — `GET /api/invoice-get?id=...`

**Files:**
- Create: `app/api/invoice-get/route.js`

- [ ] **Step 1: Write the endpoint**

```js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const invoice = rows[0];

  // Public image URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/invoices/${encodeURIComponent(invoice.invoice_image_path)}`;
  invoice.image_url = publicUrl;
  invoice.public_url = `https://www.advncelabs.com/invoice/${invoice.id.slice(0, 8)}`;
  return NextResponse.json({ invoice });
}
```

- [ ] **Step 2: Commit**

```bash
node --check app/api/invoice-get/route.js
git add app/api/invoice-get/route.js
git commit -m "invoice: GET /api/invoice-get — detail by uuid"
```

---

### Task 1.7: Admin list page

**Files:**
- Create: `app/admin/invoices/page.jsx`
- Modify: `app/admin/layout.jsx` (add nav entry)

- [ ] **Step 1: Add nav entry**

In `app/admin/layout.jsx`, append after the Pre-sell entry in the NAV array:

```js
  { href: '/admin/invoices',     label: 'Invoices',     icon: '📄' },
```

- [ ] **Step 2: Write the list page**

```jsx
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STATUSES = ['all', 'sent', 'paid', 'shipped', 'delivered', 'cancelled'];

const cs = {
  h1:    { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 4 },
  sub:   { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  bar:   { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  input: { padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, background: '#FAFBFC', outline: 'none', fontFamily: 'inherit' },
  btn:   { padding: '9px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase', background: '#00A0A8', color: '#fff', textDecoration: 'none', display: 'inline-block' },
  chip:  { padding: '6px 12px', border: '1px solid #E4E7EC', borderRadius: 999, fontSize: 11, cursor: 'pointer', background: '#fff', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 },
  chipActive: { background: '#00A0A8', color: '#fff', borderColor: '#00A0A8' },
  table: { width: '100%', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' },
  th:    { padding: '12px 14px', background: '#F8F9FB', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' },
  td:    { padding: '13px 14px', borderTop: '1px solid #E4E7EC', fontSize: 13, verticalAlign: 'middle' },
  pill:  { padding: '3px 9px', borderRadius: 999, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' },
};

const statusColor = (s) => ({
  sent: { bg: '#FEF3C7', fg: '#92400E' },
  paid: { bg: '#DBEAFE', fg: '#1E40AF' },
  shipped: { bg: '#E0E7FF', fg: '#4338CA' },
  delivered: { bg: '#D1FAE5', fg: '#065F46' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}[s] || { bg: '#F3F4F6', fg: '#374151' });

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [statusFilter, search]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('q', search);
    const r = await fetch('/api/invoice-list?' + params.toString(), { credentials: 'include', cache: 'no-store' });
    if (r.ok) {
      const { invoices } = await r.json();
      setInvoices(invoices || []);
    }
    setLoading(false);
  }

  function ageDays(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  return (
    <div style={{ padding: 28, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={cs.h1}>Invoices</h1>
          <div style={cs.sub}>admin-created orders</div>
        </div>
        <Link href="/admin/invoices/new" style={cs.btn}>+ New invoice</Link>
      </div>

      <div style={cs.bar}>
        {STATUSES.map((s) => (
          <button key={s} style={{ ...cs.chip, ...(statusFilter === s ? cs.chipActive : {}) }} onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
        <input style={{ ...cs.input, marginLeft: 'auto', width: 220 }} placeholder="Search name, email, invoice id" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#7A7D88' }}>Loading…</div>}
      {!loading && invoices.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: '#7A7D88', fontFamily: 'monospace', letterSpacing: 2 }}>No invoices yet. Click + NEW INVOICE to create one.</div>
      )}
      {!loading && invoices.length > 0 && (
        <table style={cs.table}>
          <thead>
            <tr>
              <th style={cs.th}>Invoice</th>
              <th style={cs.th}>Customer</th>
              <th style={cs.th}>Items</th>
              <th style={cs.th}>Total</th>
              <th style={cs.th}>Status</th>
              <th style={cs.th}>Age</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const sc = statusColor(inv.status);
              const itemsSummary = (inv.items || []).slice(0, 2).map((i) => i.name).join(', ') + (inv.items?.length > 2 ? ` +${inv.items.length - 2}` : '');
              return (
                <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/invoices/${inv.id}`}>
                  <td style={cs.td}>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoice_id}</div>
                  </td>
                  <td style={cs.td}>
                    <div style={{ fontWeight: 700 }}>{inv.first_name} {inv.last_name}</div>
                    <div style={{ fontSize: 11, color: '#7A7D88' }}>{inv.email || inv.phone || ''}</div>
                  </td>
                  <td style={{ ...cs.td, fontSize: 12, color: '#374151' }}>{itemsSummary}</td>
                  <td style={cs.td}><strong>${inv.total?.toFixed?.(2) || inv.total}</strong></td>
                  <td style={cs.td}><span style={{ ...cs.pill, background: sc.bg, color: sc.fg }}>{inv.status}</span></td>
                  <td style={{ ...cs.td, color: '#7A7D88', fontFamily: 'monospace', fontSize: 11 }}>{ageDays(inv.created_at)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/invoices/page.jsx app/admin/layout.jsx
git commit -m "invoice: admin list page with filters + search"
```

---

### Task 1.8: Admin create page

**Files:**
- Create: `app/admin/invoices/new/page.jsx`

- [ ] **Step 1: Write the create page**

```jsx
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const cs = {
  h1:    { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 20 },
  section: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, background: '#FAFBFC', outline: 'none', fontFamily: 'inherit' },
  row:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 },
  btn:   { padding: '10px 18px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnPrimary: { background: '#00A0A8', color: '#fff' },
  btnSecondary: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  itemRow: { display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px 30px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #F3F4F6' },
  removeBtn: { background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 },
  search: { position: 'relative' },
  results: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E4E7EC', borderRadius: 4, maxHeight: 280, overflow: 'auto', zIndex: 10 },
  resultRow: { padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderTop: '1px solid #F3F4F6' },
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', city: '', state: '', zip: '' });
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [discountPct, setDiscountPct] = useState('');
  const [discountFlat, setDiscountFlat] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Search products
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/products?active=is.true&or=(name.ilike.*${encodeURIComponent(q)}*,sku.ilike.*${encodeURIComponent(q)}*)&select=sku,name,size,retail,stock&limit=8`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      setResults(r.ok ? await r.json() : []);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function addItem(p) {
    setItems([...items, { sku: p.sku, name: p.name, size: p.size, qty: 1, price: p.retail }]);
    setQuery(''); setResults([]);
  }

  function updateItem(idx, field, val) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: field === 'qty' ? parseInt(val, 10) || 1 : (field === 'price' ? parseFloat(val) || 0 : val) };
    setItems(next);
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const pctNum = parseFloat(discountPct) || 0;
  const flatNum = parseFloat(discountFlat) || 0;
  const discountApplied = Math.min(subtotal, (subtotal * pctNum / 100) + flatNum);
  const total = subtotal - discountApplied;

  async function submit() {
    setError(null);
    if (!customer.name || !customer.address || !customer.city || !customer.state || !customer.zip) {
      setError('Customer name + full address are required'); return;
    }
    if (items.length === 0) {
      setError('Add at least one item'); return;
    }
    setSaving(true);
    const r = await fetch('/api/invoice-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        customer,
        items: items.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
        discount_pct: pctNum > 0 ? pctNum : null,
        discount_flat_cents: flatNum > 0 ? Math.round(flatNum * 100) : null,
        notes: notes || null,
      }),
    });
    const body = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok) {
      router.push(`/admin/invoices/${body.invoice.id}`);
    } else {
      setError(body.error || 'create failed');
    }
  }

  async function lookupPastCustomer() {
    const q = prompt('Search past customer by phone or email:');
    if (!q) return;
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?or=(phone.eq.${encodeURIComponent(q)},email.eq.${encodeURIComponent(q.toLowerCase())})&select=first_name,last_name,email,phone,address,city,state,zip&order=created_at.desc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    const data = r.ok ? await r.json() : [];
    if (data.length) {
      const d = data[0];
      setCustomer({
        name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        phone: d.phone || '', email: d.email || '',
        address: d.address || '', city: d.city || '', state: d.state || '', zip: d.zip || '',
      });
    } else {
      alert('No past customer found');
    }
  }

  return (
    <div style={{ padding: 28, flex: 1, maxWidth: 900 }}>
      <h1 style={cs.h1}>New Invoice</h1>

      <div style={cs.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={cs.label}>Customer</div>
          <button style={{ ...cs.btn, ...cs.btnSecondary, padding: '4px 10px', fontSize: 10 }} onClick={lookupPastCustomer}>Pick past customer</button>
        </div>
        <div style={cs.row}>
          <div style={{ gridColumn: 'span 2' }}><label style={cs.label}>Name</label><input style={cs.input} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></div>
          <div><label style={cs.label}>Phone</label><input style={cs.input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
          <div><label style={cs.label}>Email</label><input style={cs.input} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={cs.label}>Address</label><input style={cs.input} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></div>
        <div style={cs.row}>
          <div style={{ gridColumn: 'span 2' }}><label style={cs.label}>City</label><input style={cs.input} value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></div>
          <div><label style={cs.label}>State</label><input style={cs.input} value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} /></div>
          <div><label style={cs.label}>ZIP</label><input style={cs.input} value={customer.zip} onChange={(e) => setCustomer({ ...customer, zip: e.target.value })} /></div>
        </div>
      </div>

      <div style={cs.section}>
        <div style={cs.label}>Items</div>
        <div style={cs.search}>
          <input style={cs.input} placeholder="Search product by name or SKU…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && (
            <div style={cs.results}>
              {results.map((p) => (
                <div key={p.sku} style={cs.resultRow} onClick={() => addItem(p)}>
                  <strong>{p.name}</strong> <span style={{ color: '#7A7D88', fontFamily: 'monospace', fontSize: 11 }}>{p.sku} · {p.size} · ${p.retail}{p.stock === 0 ? ' · OOS' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {items.map((it, i) => (
              <div key={i} style={cs.itemRow}>
                <div>
                  <div style={{ fontWeight: 700 }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: '#7A7D88', fontFamily: 'monospace' }}>{it.sku} · {it.size}</div>
                </div>
                <input style={cs.input} type="number" min="1" value={it.qty} onChange={(e) => updateItem(i, 'qty', e.target.value)} />
                <input style={cs.input} type="number" step="0.01" value={it.price} onChange={(e) => updateItem(i, 'price', e.target.value)} />
                <div style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>${(it.price * it.qty).toFixed(2)}</div>
                <button style={cs.removeBtn} onClick={() => removeItem(i)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cs.section}>
        <div style={cs.label}>Discount (optional)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={cs.label}>% off</label><input style={cs.input} type="number" min="0" max="100" placeholder="e.g. 10" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} /></div>
          <div><label style={cs.label}>$ off (flat)</label><input style={cs.input} type="number" min="0" step="0.01" placeholder="e.g. 5.00" value={discountFlat} onChange={(e) => setDiscountFlat(e.target.value)} /></div>
        </div>
      </div>

      <div style={cs.section}>
        <label style={cs.label}>Notes (optional, shown on invoice)</label>
        <textarea style={{ ...cs.input, minHeight: 60, fontFamily: 'inherit' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div style={{ ...cs.section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, color: '#7A7D88' }}>Subtotal: ${subtotal.toFixed(2)}</div>
          {discountApplied > 0 && <div style={{ fontSize: 13, color: '#E07C24' }}>Discount: −${discountApplied.toFixed(2)}</div>}
          <div style={{ fontSize: 22, fontWeight: 700, color: '#00A0A8', fontFamily: 'monospace' }}>${total.toFixed(2)}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => router.push('/admin/invoices')}>Cancel</button>
          <button style={{ ...cs.btn, ...cs.btnPrimary }} onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create & send'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#DC2626', marginTop: 12 }}>{error}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/invoices/new/page.jsx
git commit -m "invoice: admin create page — customer form, item picker, discount, submit"
```

---

### Task 1.9: Admin detail page

**Files:**
- Create: `app/admin/invoices/[id]/page.jsx`

- [ ] **Step 1: Write the detail page**

```jsx
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const cs = {
  wrap: { padding: 28, flex: 1, maxWidth: 1100 },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 2 },
  sub: { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 },
  label: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  btn: { padding: '10px 18px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnPrimary: { background: '#00A0A8', color: '#fff' },
  btnSecondary: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  btnDanger: { background: '#DC2626', color: '#fff' },
  pill: { padding: '4px 12px', borderRadius: 999, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #F3F4F6' },
};

const statusColor = (s) => ({
  sent: { bg: '#FEF3C7', fg: '#92400E' },
  paid: { bg: '#DBEAFE', fg: '#1E40AF' },
  shipped: { bg: '#E0E7FF', fg: '#4338CA' },
  delivered: { bg: '#D1FAE5', fg: '#065F46' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
}[s] || { bg: '#F3F4F6', fg: '#374151' });

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/invoice-get?id=${id}`, { credentials: 'include' });
    if (r.ok) {
      const { invoice } = await r.json();
      setInv(invoice);
    }
    setLoading(false);
  }

  async function transition(newStatus, extra = {}) {
    if (!confirm(`Transition invoice to "${newStatus}"?`)) return;
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: newStatus, ...extra }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    if (r.ok) { load(); }
    else { alert('Error: ' + (body.error || r.status)); }
  }

  async function markShipped() {
    const tn = prompt('Tracking number (leave blank for "shipped without tracking"):');
    if (tn === null) return;
    const carrier = tn ? (prompt('Carrier? usps / ups / fedex / dhl', 'usps') || 'usps').toLowerCase() : null;
    transition('shipped', { tracking_number: tn || null, tracking_carrier: carrier });
  }

  async function cancel() {
    if (!confirm('Cancel this invoice?')) return;
    transition('cancelled');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Copied.');
  }

  if (loading) return <div style={cs.wrap}>Loading…</div>;
  if (!inv) return <div style={cs.wrap}>Invoice not found.</div>;

  const sc = statusColor(inv.status);
  const canMarkPaid = inv.status === 'sent';
  const canMarkShipped = inv.status === 'paid';
  const canMarkDelivered = inv.status === 'shipped';
  const canCancel = !['delivered', 'cancelled'].includes(inv.status);

  return (
    <div style={cs.wrap}>
      <Link href="/admin/invoices" style={{ fontSize: 11, color: '#7A7D88', textDecoration: 'none', fontFamily: 'monospace', letterSpacing: 1 }}>← BACK</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
        <div>
          <h1 style={cs.h1}>{inv.invoice_id}</h1>
          <div style={cs.sub}>Created {new Date(inv.created_at).toLocaleString()}</div>
        </div>
        <span style={{ ...cs.pill, background: sc.bg, color: sc.fg }}>{inv.status}</span>
      </div>

      <div style={cs.twoCol}>
        <div>
          <div style={cs.section}>
            <div style={cs.label}>Invoice image</div>
            {inv.image_url && <img src={inv.image_url} style={{ width: '100%', border: '1px solid #E4E7EC', borderRadius: 4, marginTop: 8 }} alt="invoice" />}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <a href={inv.image_url} download={`${inv.invoice_id}.png`} style={{ ...cs.btn, ...cs.btnSecondary, textDecoration: 'none' }}>Download PNG</a>
              <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => copyToClipboard(inv.image_url)}>Copy image URL</button>
            </div>
          </div>

          <div style={cs.section}>
            <div style={cs.label}>Shareable link</div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 10, background: '#F8F9FB', borderRadius: 4, marginTop: 8 }}>{inv.public_url}</div>
            <button style={{ ...cs.btn, ...cs.btnSecondary, marginTop: 8 }} onClick={() => copyToClipboard(inv.public_url)}>Copy link</button>
          </div>
        </div>

        <div>
          <div style={cs.section}>
            <div style={cs.label}>Customer</div>
            <div style={{ marginTop: 6, fontWeight: 700 }}>{inv.first_name} {inv.last_name}</div>
            <div style={{ fontSize: 13 }}>{inv.email || '—'}</div>
            <div style={{ fontSize: 13 }}>{inv.phone || '—'}</div>
            <div style={{ fontSize: 13, color: '#7A7D88', marginTop: 6 }}>{inv.address}<br />{inv.city}, {inv.state} {inv.zip}</div>
          </div>

          <div style={cs.section}>
            <div style={cs.label}>Items</div>
            {(inv.items || []).map((it, i) => (
              <div key={i} style={cs.itemRow}>
                <div>
                  <strong>{it.name}</strong>
                  <div style={{ fontSize: 11, color: '#7A7D88', fontFamily: 'monospace' }}>{it.sku} · {it.size} · qty {it.qty}</div>
                </div>
                <div style={{ fontFamily: 'monospace' }}>${(it.price * it.qty).toFixed(2)}</div>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #0F1928', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
              <div>Total</div><div style={{ color: '#00A0A8' }}>${inv.total?.toFixed?.(2) || inv.total}</div>
            </div>
          </div>

          {inv.tracking_number && (
            <div style={cs.section}>
              <div style={cs.label}>Tracking</div>
              <div style={{ marginTop: 6, fontFamily: 'monospace' }}>{inv.tracking_carrier?.toUpperCase()}: {inv.tracking_number}</div>
            </div>
          )}

          <div style={cs.section}>
            <div style={cs.label}>Actions</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {canMarkPaid && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={() => transition('paid')}>Mark paid</button>}
              {canMarkShipped && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={markShipped}>Mark shipped</button>}
              {canMarkDelivered && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={() => transition('delivered')}>Mark delivered</button>}
              {canCancel && <button style={{ ...cs.btn, ...cs.btnDanger }} disabled={acting} onClick={cancel}>Cancel invoice</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/invoices/[id]/page.jsx
git commit -m "invoice: admin detail page with image preview, link, status actions"
```

---

### Task 1.10: Public invoice view page (on advnce-site)

**Files:**
- Create: `/Volumes/Alexandria/AI Projects/advnce-site/invoice.html`
- Create: `/Volumes/Alexandria/AI Projects/advnce-site/vercel.json` rewrite entry

The public page lives at `advncelabs.com/invoice/<uuid-short>`. The UUID short is the first 8 chars of the order's UUID. The page fetches from Supabase REST using the short uuid against a computed match.

Since we store the full UUID as `id`, and the public URL uses the first 8 chars, we need a lookup by prefix. Simplest: the page fetches `?id=like.<short>*` and returns the first match. Unguessable enough for this purpose (36 bits of entropy).

- [ ] **Step 1: Add rewrite rule to advnce-site vercel.json**

Edit `advnce-site/vercel.json`, add to `rewrites` (create the array if absent):

```json
  "rewrites": [
    { "source": "/invoice/:id", "destination": "/invoice.html?id=:id" }
  ],
```

- [ ] **Step 2: Create `advnce-site/invoice.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Invoice — advnce labs</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#F4F2EE;--bg2:#ECEAE4;--cyan:#00A0A8;--amber:#E07C24;--ink:#1A1C22;--dim:#7A7D88;--rule:rgba(0,0,0,0.08);--fn:'Barlow Condensed',sans-serif;--fm:'JetBrains Mono',monospace;--fd:'Cormorant Garamond',serif}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:Arial,Helvetica,sans-serif;padding:20px 12px;min-height:100vh}
.wrap{max-width:640px;margin:0 auto;background:#fff;border:1px solid var(--rule);overflow:hidden}
.iv-header{background:var(--ink);color:var(--bg);padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
.iv-logo{font-family:var(--fn);font-size:18px;letter-spacing:5px;text-transform:lowercase}
.iv-logo strong{font-weight:900}.iv-logo span{color:var(--dim)}
.iv-lbl{font-family:var(--fm);font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase}
.body{padding:32px 32px 24px}
.title{font-family:var(--fd);font-weight:300;font-size:42px;line-height:1;margin-bottom:6px}
.title em{font-style:italic;color:var(--cyan)}
.meta{font-family:var(--fm);font-size:10px;color:var(--dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}
.status-pill{display:inline-block;padding:6px 14px;border-radius:999px;font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:20px}
.status-sent{background:#FEF3C7;color:#92400E}
.status-paid{background:#DBEAFE;color:#1E40AF}
.status-shipped{background:#E0E7FF;color:#4338CA}
.status-delivered{background:#D1FAE5;color:#065F46}
.status-cancelled{background:#FEE2E2;color:#991B1B}
.to{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:14px 0;margin-bottom:22px}
.to-lbl{font-family:var(--fm);font-size:9px;color:var(--dim);letter-spacing:3px;text-transform:uppercase;margin-bottom:6px}
.item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:14px}
.item:last-child{border:none}
.item-sub{font-family:var(--fm);font-size:9px;color:var(--dim);letter-spacing:1.5px;text-transform:uppercase;margin-top:3px}
.totals{border-top:2px solid var(--ink);margin-top:8px;padding-top:12px}
.trow{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.trow.disc{color:var(--amber)}
.trow.grand{border-top:1px solid var(--rule);margin-top:8px;padding-top:12px;font-size:16px;font-weight:700}
.trow.grand .v{color:var(--cyan);font-family:var(--fm);font-size:22px}
.zelle{background:var(--ink);color:var(--bg);padding:24px 32px;margin:24px -32px 0}
.zelle-lbl{font-family:var(--fm);font-size:10px;color:var(--cyan);letter-spacing:4px;text-transform:uppercase;margin-bottom:10px}
.zelle-t{font-family:var(--fn);font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px}
.zelle-steps{font-family:var(--fm);font-size:13px;line-height:1.9;color:rgba(244,242,238,0.85)}
.zelle-steps strong{color:var(--bg);font-weight:700}
.zelle-amt{color:var(--cyan);font-weight:700}
.tracking{background:var(--bg2);padding:18px 32px;margin:0 -32px;border-top:1px solid var(--rule)}
.tracking a{color:var(--cyan);font-family:var(--fm);font-size:13px;letter-spacing:1.5px}
.foot{padding:14px 20px;text-align:center;font-family:var(--fm);font-size:8px;color:var(--dim);letter-spacing:1.5px;line-height:1.8;text-transform:uppercase;border-top:1px solid var(--rule)}
.empty{padding:80px 20px;text-align:center;color:var(--dim);font-family:var(--fm);font-size:12px;letter-spacing:2px;text-transform:uppercase}
</style>
</head>
<body>
<div class="wrap" id="wrap"><div class="empty">Loading…</div></div>
<script>
const SUPABASE_URL='https://efuxqrvdkrievbpljlaf.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXhxcnZka3JpZXZicGxqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyNjAsImV4cCI6MjA4ODYxNzI2MH0.68LnOw8EvvTx_UUgHo1cuQ-7WuEre7L46AMyDFNAq30';

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

function trackingUrl(carrier, num) {
  const n = encodeURIComponent(num || '');
  return {
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
    ups: `https://www.ups.com/track?tracknum=${n}`,
    fedex: `https://www.fedex.com/fedextrack/?tracknumbers=${n}`,
    dhl: `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`,
  }[carrier] || '#';
}

(async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id || id.length < 6) return show('Invalid invoice link.');

  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=like.${encodeURIComponent(id)}*&is_invoice=eq.true&select=*&limit=1`, { headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) return show('Invoice not found. Check the link and try again.');
  render(rows[0]);
})();

function show(msg) {
  document.getElementById('wrap').innerHTML = `<div class="empty">${esc(msg)}</div>`;
}

function render(inv) {
  const items = inv.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discPct = inv.invoice_discount_pct;
  const discFlatCents = inv.invoice_discount_flat_cents;
  const discApplied = Math.min(subtotal, (subtotal * (discPct || 0) / 100) + ((discFlatCents || 0) / 100));
  const total = inv.total;

  const status = inv.status;
  const statusLabel = {
    sent: 'Awaiting payment',
    paid: 'Payment confirmed · preparing to ship',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }[status] || status;

  const zelleBlock = (status === 'sent') ? `
    <div class="zelle">
      <div class="zelle-lbl">How to pay</div>
      <div class="zelle-t">Send via Zelle</div>
      <div class="zelle-steps">
        1. Open Zelle in your bank app<br>
        2. Send <span class="zelle-amt">$${total.toFixed(2)}</span> to <strong>6268064475</strong><br>
        3. Memo: <strong>${esc(inv.invoice_id)}</strong><br>
        4. Ships in 2–3 business days once payment confirms
      </div>
    </div>` : '';

  const trackingBlock = (status === 'shipped' && inv.tracking_number) ? `
    <div class="tracking">
      <div class="to-lbl">Tracking</div>
      <a href="${trackingUrl(inv.tracking_carrier, inv.tracking_number)}" target="_blank" rel="noopener">${esc((inv.tracking_carrier || '').toUpperCase())} · ${esc(inv.tracking_number)} →</a>
    </div>` : '';

  const discLine = (discApplied > 0) ? `
    <div class="trow disc">
      <div>${discPct ? `Discount · ${discPct}% off` : `Discount · $${(discFlatCents/100).toFixed(2)} off`}</div>
      <div>−$${discApplied.toFixed(2)}</div>
    </div>` : '';

  document.getElementById('wrap').innerHTML = `
    <div class="iv-header">
      <div class="iv-logo"><strong>advnce</strong> <span>labs</span></div>
      <div class="iv-lbl">${esc(inv.invoice_id)}</div>
    </div>
    <div class="body">
      <div class="status-pill status-${status}">${esc(statusLabel)}</div>
      <h1 class="title">Order <em>Summary.</em></h1>
      <div class="meta">Issued ${new Date(inv.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>

      <div class="to">
        <div class="to-lbl">Bill to</div>
        <div><strong>${esc(inv.first_name)} ${esc(inv.last_name)}</strong></div>
        <div style="font-size:13px">${esc(inv.address)}<br>${esc(inv.city)}, ${esc(inv.state)} ${esc(inv.zip)}</div>
      </div>

      ${items.map(it => `
        <div class="item">
          <div>
            <div><strong>${esc(it.name)}</strong></div>
            <div class="item-sub">${esc(it.size || '')} · ${esc(it.sku)} · QTY ${it.qty}</div>
          </div>
          <div style="font-family:var(--fm)">$${(it.price * it.qty).toFixed(2)}</div>
        </div>
      `).join('')}

      <div class="totals">
        <div class="trow"><div>Subtotal</div><div style="font-family:var(--fm)">$${subtotal.toFixed(2)}</div></div>
        ${discLine}
        <div class="trow grand"><div>Total</div><div class="v">$${total.toFixed(2)}</div></div>
      </div>

      ${zelleBlock}
    </div>

    ${trackingBlock}

    <div class="foot">
      advnce labs · advncelabs.com · orders@advncelabs.com<br>
      All products for research use only · Not for human consumption · Not evaluated by the FDA
    </div>`;
}
</script>
</body>
</html>
```

- [ ] **Step 3: Commit both repo changes**

```bash
# in advnce-site
cd "/Volumes/Alexandria/AI Projects/advnce-site"
git add invoice.html vercel.json
git commit -m "invoice: public view page at /invoice/<short>"
git push origin main
```

---

### Task 1.11: Phase 1 smoke test

- [ ] **Step 1: Run the SQL migration (Jorrel)**

Paste `sql/2026-04-23-invoice-columns.sql` in Supabase SQL editor, run. Create the `invoices` storage bucket.

- [ ] **Step 2: Push adonis-next Phase 1**

```bash
cd "/Volumes/Alexandria/AI Projects/adonis-next"
git push origin main
```

- [ ] **Step 3: Log into adonis.pro/admin, click Invoices, click + New invoice**

Enter test data (use your own address), add one $49 item, create. Expect: redirect to detail page showing the image and link.

- [ ] **Step 4: Open the shareable link in incognito**

Expect: public page renders, shows Zelle pay instructions, invoice ID matches.

---

## Phase 2 — status lifecycle + inventory + emails

### Task 2.1: Invoice transition API — `POST /api/invoice-transition`

**Files:**
- Create: `app/api/invoice-transition/route.js`

- [ ] **Step 1: Write the endpoint**

```js
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const VALID_NEXT = {
  sent: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shippedEmailHtml({ firstName, invoiceId, carrier, trackingNumber, publicUrl }) {
  const trackingBlock = trackingNumber ? `<p style="font-size:15px;line-height:1.6">Tracking: <strong>${esc(carrier?.toUpperCase() || '')} ${esc(trackingNumber)}</strong></p>` : '';
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">Shipping update</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;margin:0 0 20px">Your order is <span style="color:#00A0A8">on the way.</span></h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${esc(firstName) ? 'Hi ' + esc(firstName) + ', ' : ''}your advnce labs order ${esc(invoiceId)} just left our warehouse.</p>
${trackingBlock}
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:20px 0 28px"><a href="${esc(publicUrl)}" style="color:#00A0A8">View your invoice →</a></p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · research use only · not for human consumption</p>
</div>
</div></body></html>`;
}

function cancelEmailHtml({ firstName, invoiceId, totalCents }) {
  const amount = (totalCents / 100).toFixed(2);
  const creditAmount = (totalCents * 1.1 / 100).toFixed(2);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">About your order</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1;margin:0 0 20px">We've cancelled invoice ${esc(invoiceId)}.</h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">Hi ${esc(firstName) || 'there'}, we had to cancel this order.</p>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px"><strong>Reply with your preference:</strong></p>
<ul style="font-size:15px;line-height:1.8;color:#1A1C22;margin:0 0 24px;padding-left:24px">
  <li><strong>Full refund</strong> via Zelle ($${amount}) back to the number you paid from.</li>
  <li><strong>Store credit + 10%</strong> ($${creditAmount}) usable on anything.</li>
</ul>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 28px">Sorry for the friction.</p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · orders@advncelabs.com</p>
</div>
</div></body></html>`;
}

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { id, status, tracking_number, tracking_carrier } = await request.json().catch(() => ({}));
  if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 });
  if (!Object.keys(VALID_NEXT).includes(status) && status !== 'paid' && status !== 'shipped' && status !== 'delivered' && status !== 'cancelled') {
    return NextResponse.json({ error: 'bad status' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Load current invoice
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&is_invoice=eq.true&select=*&limit=1`, { headers, cache: 'no-store' });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const inv = rows[0];

  // Validate transition
  const allowed = VALID_NEXT[inv.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `cannot transition ${inv.status} → ${status}` }, { status: 400 });
  }

  // Build patch
  const patch = { status };
  if (status === 'shipped') {
    patch.shipped_at = new Date().toISOString();
    if (tracking_number) patch.tracking_number = tracking_number;
    if (tracking_carrier) patch.tracking_carrier = tracking_carrier;
  }
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();

  const pr = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!pr.ok) return NextResponse.json({ error: await pr.text() }, { status: 500 });

  // Inventory sync
  if (status === 'paid') {
    for (const it of (inv.items || [])) {
      // Fetch current stock, decrement (floor at 0)
      const sr = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=stock`, { headers, cache: 'no-store' });
      const srd = sr.ok ? await sr.json() : [];
      if (!srd.length) continue;
      const newStock = Math.max(0, (srd[0].stock || 0) - (it.qty || 1));
      await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ stock: newStock }),
      });
    }
  }
  if (status === 'cancelled' && ['paid', 'shipped'].includes(inv.status)) {
    // Restore inventory
    for (const it of (inv.items || [])) {
      const sr = await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=stock`, { headers, cache: 'no-store' });
      const srd = sr.ok ? await sr.json() : [];
      if (!srd.length) continue;
      const newStock = (srd[0].stock || 0) + (it.qty || 1);
      await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ stock: newStock }),
      });
    }
  }

  // Send customer email
  const publicUrl = `https://www.advncelabs.com/invoice/${id.slice(0, 8)}`;
  if (status === 'shipped' && inv.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: inv.email,
        subject: `Your advnce labs order has shipped.`,
        html: shippedEmailHtml({
          firstName: inv.first_name || '',
          invoiceId: inv.invoice_id,
          carrier: tracking_carrier || inv.tracking_carrier,
          trackingNumber: tracking_number || inv.tracking_number,
          publicUrl,
        }),
      }),
    });
  }
  if (status === 'cancelled' && inv.email) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: inv.email,
        subject: `About your advnce labs order ${inv.invoice_id}`,
        html: cancelEmailHtml({
          firstName: inv.first_name || '',
          invoiceId: inv.invoice_id,
          totalCents: Math.round((inv.total || 0) * 100),
        }),
      }),
    });
  }

  return NextResponse.json({ ok: true, status, id });
}
```

- [ ] **Step 2: Syntax check + commit + push**

```bash
node --check app/api/invoice-transition/route.js
git add app/api/invoice-transition/route.js
git commit -m "invoice: POST /api/invoice-transition with inventory sync + emails"
git push origin main
```

---

### Task 2.2: End-to-end test

- [ ] **Step 1: Create a new invoice** (admin UI)
- [ ] **Step 2: Mark paid** (verify `products.stock` on one of the items decremented by qty)
- [ ] **Step 3: Mark shipped with tracking**  (verify customer got email; verify public page shows tracking link)
- [ ] **Step 4: Mark delivered** (no email; public page shows delivered state)
- [ ] **Step 5: Create another invoice, mark paid, then cancel** (verify stock restored + apology email)

---

## Phase 3 — polish (optional, can defer)

### Task 3.1: Past customer search in editor

Already in the new-invoice page as `prompt()`-based lookup. Upgrade to an inline search UI if usage grows. Skip for v1.

### Task 3.2: Live invoice image preview

Show a live-updating SVG preview in the editor sidebar as admin edits. Upgrade once the editor is battle-tested.

### Task 3.3: View counter on public page

Add a `view_count` column + increment on page load. Skip for v1.

---

## Stop-points (cannot proceed without Jorrel)

1. **Task 1.1 Steps 2-3** — SQL migration must be run + storage bucket must be created before Phase 1 works.

Everything else runs through.

---

## Success criteria

**Phase 1:** Admin creates an invoice with 1-3 items + optional discount. Browser redirects to detail view showing the PNG image (generated) and a working `advncelabs.com/invoice/<id>` link. Customer can visit the link without auth and see the invoice + Zelle instructions.

**Phase 2:** Admin can transition the invoice through sent → paid → shipped → delivered. Stock decrements on paid. Shipped state sends customer email with tracking link. Cancel restores stock and sends apology email.

**Phase 3:** (deferred polish)

---

## Scope self-check

Spec sections mapped to tasks:
- § 3 architectural decisions → Task 1.1 (schema), Task 1.3 (sharp image), Task 1.10 (advnce-site public page)
- § 4 schema changes → Task 1.1
- § 5 status lifecycle → Task 2.1 (with VALID_NEXT map)
- § 6 admin UI list / new / detail → Tasks 1.7 / 1.8 / 1.9
- § 7 public invoice page → Task 1.10
- § 8 image generation → Task 1.3
- § 9 emails → Task 2.1 (shipped + cancelled inline)
- § 10 inventory sync → Task 2.1 (loop over items)
- § 11 edge cases → addressed in-line
- § 12 tracking carrier → Task 1.10 (public page renderer) + Task 2.1 (stored on row)
- § 13 phasing → matches implementation phases
- § 15 testing → Task 1.11 + Task 2.2
