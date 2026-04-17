# Vendor Pricing, Purchase Orders, Receiving & Compound Content

**Date:** 2026-04-17
**Status:** Approved (pending implementation plan)
**Owner:** Jorrel Patterson
**Repos affected:** `adonis-next` (admin + API routes), `advnce-site` (storefront product page, order-email validation)

---

## 1. Goals

Build the inventory-economics backbone for advnce labs:

1. **Multi-vendor pricing sheets in admin** — for every product, record what each vendor charges. Today only one vendor and one cost are stored per product.
2. **Purchase order workflow** — draft a PO against a vendor, system emails it on submit.
3. **Line-by-line receiving** — when a shipment lands, confirm received quantities per item; stock and cost basis update automatically.
4. **Hide-from-storefront toggle** — manage products in admin that aren't publicly listed.
5. **Per-product content management** — admin can author the "about this compound" prose, specs, and research links that today are hardcoded as a generic template.

Underlying objective: when Jorrel decides to restock, he can compare vendor prices, place the order, and have the system keep cost-of-goods + on-hand inventory truthful.

## 2. Non-Goals (v1)

- No PDF PO generation. HTML email is enough.
- No multi-recipient PO email (one vendor contact per PO; can forward).
- No FIFO/weighted-average cost basis. Latest received cost only.
- No storefront-facing vendor info (vendors are internal).
- No vendor portal / vendor self-service.
- No automatic vendor_prices update from invoice cost — invoice variations stay on the PO line, sheet stays manual-authoritative.
- No PO approval workflow (single admin user).
- No automatic reorder triggers based on stock thresholds.

## 3. Schema

### 3.1 New tables (4)

```sql
-- Vendors lookup (Eve, Weak, future)
CREATE TABLE vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  contact_email text,
  contact_phone text,
  notes         text,
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Per-vendor pricing sheet (one row per product per vendor)
CREATE TABLE vendor_prices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid REFERENCES vendors(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id) ON DELETE CASCADE,
  cost_per_kit numeric NOT NULL,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(vendor_id, product_id)
);

-- Purchase orders (header)
CREATE TABLE purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       text UNIQUE NOT NULL,        -- "PO-2026-0001"
  vendor_id       uuid REFERENCES vendors(id),
  status          text NOT NULL DEFAULT 'draft', -- draft|submitted|partial|received|cancelled
  total_cost      numeric,
  notes           text,
  submitted_at    timestamptz,
  received_at     timestamptz,
  closed_at       timestamptz,                  -- force-close (vendor short-shipped permanently)
  last_emailed_at timestamptz,                  -- updated on submit + resend
  created_at      timestamptz DEFAULT now()
);

-- PO line items
CREATE TABLE purchase_order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id        uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id   integer REFERENCES products(id),
  qty_ordered  integer NOT NULL,             -- # of 10-vial kits
  unit_cost    numeric NOT NULL,             -- snapshot at PO time
  qty_received integer DEFAULT 0,
  received_at  timestamptz                   -- timestamp of first receive on this line
);
```

### 3.2 Changes to existing `products` table

No new columns. Repurpose existing:

- **`vendor`** — becomes "preferred / most-recently-used vendor." Auto-set by the receiving flow to whoever shipped the latest stock. Used as a default in the new-PO form and (optionally) as advisory display.
- **`cost`** — becomes "latest received cost" (per 10-vial kit). Auto-updated by the receiving flow.
- **`active`** — already defaulted to `true` but never enforced. Now drives the storefront filter (hidden in admin if `false`).
- **`description`** — currently empty string for all rows. Now populated via admin Content tab; rendered on product page when non-empty.
- **`specs`** (jsonb array) — same. Each entry is a string bullet. Rendered on product page when non-empty.
- **`research`** (jsonb array) — same. Each entry is `{title, url}`. Rendered on product page when non-empty under a new "Research" accordion.

### 3.3 RLS

All four new tables: **RLS enabled, no `anon` policies.** Admin reads + writes go through server-side API routes using `SUPABASE_SERVICE_KEY` (mirrors the `ambassador-write` pattern fixed earlier today).

`products`: existing `Allow all on products` policy stays (admin pricing depends on it). When the product-write API route lands (Section 5), we can revisit tightening.

### 3.4 One-time data migration (run once after tables exist)

```sql
-- 1. Seed vendors from existing distinct values
INSERT INTO vendors (name) SELECT DISTINCT vendor FROM products WHERE vendor IS NOT NULL;

-- 2. Seed vendor_prices from current product (vendor, cost) pairs
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT v.id, p.id, p.cost
FROM products p JOIN vendors v ON v.name = p.vendor
WHERE p.cost IS NOT NULL;
```

After migration, Jorrel fills in cross-vendor prices manually as he encounters them (e.g. Eve's price for a product currently sourced from Weak only).

## 4. Admin UI

### 4.1 Sidebar nav

Existing: `Dashboard · Inventory · Orders · Pricing · Ambassadors · Distributors`
**Add at end:** `Vendors · Purchases`

### 4.2 New page: `/admin/vendors`

- **List view** — every vendor with badge (active/inactive), # priced products, total ever-spent (sum of received POs).
- **Detail view per vendor** — two tabs:
  - **Details** — name, contact email, phone, notes, active toggle.
  - **Pricing sheet** — every product as a row with two columns:
    - "Sells it?" toggle (presence in `vendor_prices`)
    - Cost per kit (numeric input)
  - Bulk-paste support: textarea accepting one line per product as `SKU,cost`, processes as upsert.

### 4.3 New page: `/admin/purchases`

- **List view** — every PO with status badge (`Draft` / `Submitted` / `Partial` / `Received` / `Cancelled`), vendor, # items, total, created date.
- **"+ New PO"** form:
  1. Pick vendor → loads pricing sheet.
  2. Add line items: search products limited to that vendor's catalog → qty (kits) → unit_cost auto-fills from `vendor_prices` (editable). Line total auto-calcs.
  3. Optional notes.
  4. **Save Draft** (saves only) or **Submit** (locks editing, generates PO email per Section 6).
- **PO detail view** — modes by status:
  - `draft` — fully editable, "Submit" button.
  - `submitted` — read-only header, "Receive Shipment" button, "Resend PO email" button, "Cancel PO" button.
  - `partial` — read-only with received qty per line, "Receive Shipment" button (continue receiving), "Close PO (forced)" button.
  - `received` — read-only with all received qty + dates.
  - `cancelled` — read-only, dimmed.

### 4.4 Updates to existing `/admin/inventory`

- **Hide toggle** per row (eye icon) → flips `products.active` via the new `/api/product-write` route. Hidden rows show with grayed styling + "Hidden" badge but remain manageable.
- **Default vendor** column (auto-updates to whoever you bought from most recently).
- **Last cost** column (auto-updated by receiving flow).
- **Compare vendors** link per row → small modal showing all `vendor_prices` for that product side-by-side, highlighting the cheapest.
- **New "Content" tab** on the product edit/create form:
  - **Description** — textarea (paragraph + bold support). The "about this compound" prose. Char counter.
  - **Specs** — list editor (add/remove rows), each row is a short bullet string.
  - **Research** — list editor, each row has title + URL.
  - Note text: "If left empty, the page shows the generic template."

### 4.5 Updates to existing `/admin/pricing`

- **"Suggested retail"** column — `latest_cost × (1 / (1 - margin_target))`. Click to apply per row. Margin target is a page-level setting (default 95%).

### 4.6 Updates to `/admin/dashboard`

- Two new KPI cards:
  - **Open POs** — count of `submitted` POs.
  - **In-transit value** — sum of `total_cost` for `submitted` POs.

## 5. Server-side API routes (all in `adonis-next`)

All routes use `SUPABASE_SERVICE_KEY` server-side. All accept JSON, return JSON. All POST.

| Route | Purpose |
|---|---|
| `POST /api/vendor-write` | Create / update / delete vendors. Action discriminator: `{action: 'create'|'update'|'delete', ...}`. |
| `POST /api/vendor-prices-write` | Upsert / delete pricing sheet entries. Bulk endpoint accepts `entries: [{vendor_id, product_id, cost_per_kit}]`. |
| `POST /api/purchase-write` | Create draft / update draft / submit / cancel PO. Submit triggers PO email (Section 6). |
| `POST /api/purchase-receive` | Receive shipment line-by-line. Updates stock, cost, vendor on `products`; updates `qty_received` on lines; recomputes PO status. See Section 7. |
| `POST /api/product-write` | Toggle `active`, update content fields (description/specs/research), and any other admin product writes. Replaces the direct Supabase calls currently in `/admin/inventory`. |

GET handlers on each route return `{status: '<route> is live'}` for smoke-testing.

## 6. Purchase Order email flow

### 6.1 Trigger
On `purchase-write` with `action: 'submit'`:
1. Generate next `po_number` for current year. Format: `PO-YYYY-NNNN` where `NNNN` is the year-resetting sequence, zero-padded to 4 digits (`0001`, `0002`, …). Compute as `SELECT coalesce(max(substr(po_number, 9)::int), 0) + 1 FROM purchase_orders WHERE po_number LIKE 'PO-' || extract(year from now()) || '-%'`. Catch UNIQUE violation on insert and retry once.
2. UPDATE the PO: `status = 'submitted', submitted_at = now(), last_emailed_at = now()`.
3. Send email via Resend.

### 6.2 Email
- **From:** `advnce labs <orders@advncelabs.com>`
- **To:** `vendor.contact_email`
- **BCC:** `jorrelpatterson@gmail.com`
- **Reply-To:** `orders@advncelabs.com`
- **Subject:** `Purchase Order PO-YYYY-NNNN — advnce labs`
- **Body:** branded HTML matching the existing email design system (header logo, dark navy + cyan):
  1. Header — logo + brand strip.
  2. PO header box — number, submitted date, vendor name.
  3. **Ship-to** — pulled from new env var `SHIPPING_ADDRESS` on the `adonis-next` Vercel project.
  4. Line items table: SKU · Name · Size · Qty (kits) · Unit cost · Line total.
  5. Total.
  6. Notes block (only if PO has notes).
  7. Footer: contact info.

### 6.3 Resend button
On submitted/partial PO detail view, **"Resend PO email"** re-sends the same content, updates `last_emailed_at`.

### 6.4 New env var (Vercel)
`SHIPPING_ADDRESS` on `adonis-next` project — multiline string. Example:
```
Jorrel Patterson
123 Main St
City, CA 90210
```

## 7. Receiving + cost basis updates

### 7.1 UI
On submitted/partial PO detail, **"Receive Shipment"** opens a modal listing every line:

| Product | Size | Ordered | Received so far | Receive now (input) | Unit cost (input) |

- "Receive now" defaults to remaining balance (`qty_ordered - qty_received`). Set to 0 to skip.
- "Unit cost" pre-fills with line's stored unit_cost; editable if invoice differs.
- Submit Receipt button.

### 7.2 Server-side `/api/purchase-receive`
For each line where `receive_now > 0`:
1. `purchase_order_items.qty_received += receive_now`.
2. `purchase_order_items.received_at = COALESCE(received_at, now())`.
3. If `unit_cost` was edited, update it on the line.
4. `products.stock += receive_now * 10` (each kit = 10 vials).
5. `products.cost = unit_cost` (latest received cost — chosen design choice).
6. `products.vendor = vendor.name`.
7. `products.updated_at = now()`.

After processing all lines:
- All lines fully received (`qty_received >= qty_ordered` ∀ lines) → `status = 'received'`, `received_at = now()`.
- Otherwise → `status = 'partial'`.

### 7.3 Edge cases
- **Over-receive** — silently allowed; stock just goes up.
- **Partial receive** — stays `partial`, can receive again later.
- **Vendor short-shipped permanently** — "Close PO (forced)" button on the PO detail view flips status to `received`, sets `closed_at = now()` regardless of remaining balance.
- **Cost-basis vs pricing-sheet divergence** — invoice cost edits update `purchase_order_items.unit_cost` and `products.cost`, but **NOT** `vendor_prices`. Pricing sheet stays manually authoritative.

### 7.4 No email confirmation on receipt
You're the one doing it; UI feedback is enough.

## 8. Compound content rendering (storefront)

### 8.1 `advnce-site/advnce-product.html`
- Main accordion ("About this compound"): if `p.description` non-empty → render it. Else → keep existing generic template (no breaking change).
- Specs section: if `p.specs` array has entries → render as bullets. Else → render the current generic bullet list (same fallback behavior as the description). Once a product has specs entered, those replace the generic list for that product only.
- New "Research" accordion: if `p.research` array has entries → render as link list. Else → hide.

Result: products with content get the rich page; products without content keep the current look until backfilled.

### 8.2 `advnce-site/advnce-catalog.html` and `advnce-site/advnce-product.html`
Add `&active=is.true` to the Supabase product fetches. Inactive products never appear publicly.

### 8.3 `advnce-site/api/send-order-email.js`
The per-SKU lookup loop already fetches the product. Add `active` to the select; reject the order with 400 if any line item has `active=false`. Defense-in-depth so direct-URL ordering of hidden products is impossible.

## 9. Migration / deploy order

1. Apply schema migration (4 new tables) in Supabase.
2. Run one-time data seed (Section 3.4).
3. Set `SHIPPING_ADDRESS` env var in Vercel for `adonis-next`.
4. Deploy `adonis-next` (new API routes + admin pages + inventory updates).
5. Deploy `advnce-site` (active filter + dynamic product page rendering + order-email validation).
6. Smoke-test all 5 GET handlers return live.
7. Smoke-test: create a draft PO, submit it (real email to a test vendor address), receive a shipment, verify stock/cost/vendor on the product update.

## 10. Out of scope (future)

- Per-vendor shipping addresses (move `SHIPPING_ADDRESS` from env to `vendors.ship_to_address`).
- PDF PO attachment.
- Reorder thresholds + auto-draft POs when stock low.
- Vendor portal / vendor self-serve price updates.
- Per-batch FIFO / weighted-average cost basis.
- Multiple admin users + PO approval workflow.
- Automatic exchange rate handling for international vendors.
