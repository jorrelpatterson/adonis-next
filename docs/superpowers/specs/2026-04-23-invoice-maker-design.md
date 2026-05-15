# Invoice Maker — design

**Date:** 2026-04-23
**Author:** Claude (brainstormed with Jorrel)
**Repo:** `jorrelpatterson/adonis-next` (admin) + `jorrelpatterson/advnce-site` (public invoice view page)
**Status:** Approved — moving to implementation plan

---

## 1. What this is

A tool in the adonis.pro admin that lets Jorrel turn a customer text into a tracked order in under a minute. Pick items from the catalog, enter or look up contact info, optionally apply a discount, click "Create invoice." The tool generates a branded PNG (for attaching to the text thread) and a shareable URL like `advncelabs.com/invoice/<id>`. From the same admin screen Jorrel transitions the invoice through its lifecycle — sent → paid → shipped → delivered — with each transition updating inventory and optionally notifying the customer.

## 2. Goals

**Primary:** collapse the "customer texts Jorrel, Jorrel computes price in his head, writes manual instructions, customer pays, Jorrel tries to remember who paid what" workflow into an admin surface that captures the order, tracks payment, and produces a polished shareable artifact.

**Secondary:** feeds the same `orders` table the storefront writes to, so all revenue / inventory / reporting stays unified.

**Out of scope (deferred):** ambassador-facing version. Captured as a separate future project (see `todo_invoice_ambassadors.md` memory).

## 3. Architectural decisions

**Store invoices as orders, not a separate table.** The existing `orders` table already has: items JSONB, discount fields, status, contact info, attribution phone. An invoice is an admin-initiated order. Extending the table is cleaner than a parallel model.

**Two deliverables per invoice: image + link.** The image catches attention in a text; the link lets the customer reference back, see current status, and get an updated tracking URL once shipped. Same underlying data drives both.

**Storefront-public invoice page.** The link lives at `advncelabs.com/invoice/<uuid>` — a standalone HTML page served from the advnce-site repo. No auth required — whoever has the URL can view it. UUID is unguessable.

**Image generation with `sharp`.** Already in the adonis-next codebase (used for personalized ambassador images). Reuse it. Render an HTML template server-side, rasterize to PNG, store in Supabase Storage.

**All admin routes in adonis-next.** Consistent with the single-admin decision from the pre-sell migration. Public invoice view page lives in advnce-site.

## 4. Schema changes

### New columns on `orders`

```sql
alter table orders
  add column if not exists is_invoice boolean not null default false,
  add column if not exists invoice_id text,                     -- human-readable, e.g. "AVL-INV-0142"
  add column if not exists invoice_image_path text,             -- supabase storage path
  add column if not exists invoice_discount_pct numeric(5,2),   -- 0-100, null if none
  add column if not exists invoice_discount_flat_cents integer, -- null if none
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,               -- 'usps' | 'ups' | 'fedex' | 'dhl'
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists created_by text;                     -- 'admin' for now; 'ambassador:<code>' in v2

create index if not exists orders_invoice_lookup_idx
  on orders(is_invoice, status, created_at desc)
  where is_invoice = true;

create unique index if not exists orders_invoice_id_uniq
  on orders(invoice_id) where invoice_id is not null;
```

### New Supabase Storage bucket

- Name: `invoices`
- Public read, service-role write
- Path: `invoices/<invoice_id>.png`

## 5. Status lifecycle

Five stages. Transitions are admin button clicks in the invoice detail view. Each transition updates the row and optionally emails the customer.

```
draft ──► sent ──► paid ──► shipped ──► delivered
                    │          │
                    └──► cancelled (from any pre-delivery stage)
```

| Status | Meaning | Side effects on entry |
|---|---|---|
| `draft` | Admin is composing; no customer-facing artifact yet | — |
| `sent` | Image + link generated; admin has what to text | Image rendered to Supabase Storage; invoice URL usable; no inventory impact |
| `paid` | Admin confirmed Zelle payment received | **Decrements stock** on each line item; no customer email (admin texts them) |
| `shipped` | Admin entered tracking or marked shipped | `shipped_at` timestamp; customer email: "Your order shipped" with tracking link if set |
| `delivered` | Admin marked delivered (or tracking webhook if ever wired) | `delivered_at` timestamp; no email |
| `cancelled` | Admin cancelled pre-delivery | If already paid: restock inventory + log the refund-needed for Jorrel's Zelle follow-up |

**Existing `orders.status`** already uses `pending_payment`. We keep it and add the new values. Storefront orders keep their existing flow; invoice orders use the expanded lifecycle.

## 6. Admin UI

### `/admin/invoices` — list view

- Filter by status (default: active = draft/sent/paid/shipped), date range, search by name/email/invoice-id
- Columns: Invoice ID · Customer · Items summary · Total · Status (colored pill) · Age
- "+ New invoice" primary button (top right)
- Row click → detail view

### `/admin/invoices/new` — editor

- **Contact form** — name, phone, email, address. Below the form, a "Pick past customer" link that opens a search (email or phone lookup against `orders` table) and auto-fills on select.
- **Items picker** — search field with live results from `products` (name, sku, size, retail, stock). Click to add to cart below. Each cart row: qty input, unit price (editable — defaults to retail but admin can override), line total.
- **Discount** — two optional inputs: percent-off field and flat-dollar-off field. Admin can use either or both. Shown on invoice as separate line(s).
- **Notes** — optional text, printed on the invoice image.
- **Preview pane (right column)** — live-updating render of the invoice image as admin edits. Same layout as the final PNG.
- **Create invoice button** — locks the draft, generates the PNG, returns to detail view.

### `/admin/invoices/<id>` — detail view

- Invoice image preview at top with **[ Copy image ]** and **[ Download PNG ]** buttons
- Shareable link with **[ Copy link ]** button
- Customer contact block
- Line items + totals
- Timeline of status events (created → sent → paid → shipped → delivered)
- **Status action buttons** (context-aware — only show valid next transitions):
  - From `sent`: **[ Mark paid ]**
  - From `paid`: **[ Mark shipped ]** (opens tracking modal)
  - From `shipped`: **[ Mark delivered ]**
  - Any pre-delivered: **[ Cancel invoice ]**
- Tracking number field (editable when status = `shipped` or later)
- "Customer viewed X times" counter (if we wire view logging — v2, not blocking)

## 7. Public invoice page — `advncelabs.com/invoice/<uuid>`

Standalone HTML page served from the advnce-site repo. Fetches the invoice from Supabase REST using the UUID as the key (not `invoice_id` — UUIDs are unguessable; `AVL-INV-0142` is sequential and guessable).

Displays:
- Same branded layout as the image (cream bg, brand fonts)
- Customer greeting + invoice items + total
- Current status pill ("Awaiting payment" / "Payment confirmed — preparing to ship" / "Shipped · tracking 1Z999…" / "Delivered")
- If status = `sent` or `paid`: prominent Zelle payment instructions with amount + phone number + memo
- If status = `shipped` and tracking_number present: clickable tracking URL (USPS/UPS/FedEx/DHL auto-detected from carrier field)
- Research-use-only disclaimer footer

The page is read-only — customer can't edit anything. All transitions happen in admin.

## 8. Image generation

Server-side using `sharp` + an HTML template → PNG rasterization flow. Output 1200×(variable height, ~1400-1800 depending on line count) for crisp rendering in SMS/iMessage previews.

Template matches the approved mockup: dark header with logo + invoice ID, cream body with cream title + meta, from/bill-to columns, line items table, totals block with discount callout, dark Zelle box, footer with invoice link + RUO disclaimer.

Generated once when the admin transitions `draft → sent`. Uploaded to Supabase Storage at `invoices/<invoice_id>.png`. Public URL stored in `invoice_image_path` for the admin detail view to display.

Regenerated if admin edits anything after sending? **No for v1** — once sent, it's locked. If something is wrong, cancel + create new. Keeps complexity down.

## 9. Emails

**Customer emails only on status transitions:**
- **On `shipped`:** "Your advnce labs order has shipped" with tracking link if present, invoice link for reference
- **On `cancelled` (post-paid):** apology email matching the pre-sell cancel pattern — asks them to reply for Zelle refund or store credit

**No email on `sent`** — Jorrel sends the text himself with the image + link.

**No email on `paid`** — redundant with Jorrel's own confirmation message.

**No email on `delivered`** — assumed; don't spam.

Existing Resend API key + `from: 'advnce labs <orders@advncelabs.com>'` pattern.

## 10. Inventory sync

- **Decrement on `paid`:** `update products set stock = greatest(0, stock - <qty>) where sku = <sku>` for each line
- **Increment on `cancelled` after `paid`:** reverse the decrement for each line
- Invoice for an OOS item is allowed — Jorrel might be pre-selling an item he's about to reorder. He can apply a pre-order discount manually at his discretion. No automatic pre-sell flag.

## 11. Edge cases

- **Customer replies to invoice link with questions:** they reply to the email (`orders@advncelabs.com`) — separate concern (the inbox issue is on the open-to-do list).
- **Invoice sent for an item that goes out of stock before paid:** nothing automated; admin sees stock=0 when marking paid and handles it offline. Future enhancement: warn admin at paid time if stock insufficient.
- **Invoice image fails to generate:** transition still completes, detail view shows "image generation failed — retry" button.
- **Duplicate invoice_id:** DB unique constraint catches it; generator retries with +1.
- **Admin accidentally creates invoice with $0 discount %:** treated as no discount (don't render discount line).

## 12. Tracking carrier detection

When admin enters a tracking number + selects carrier, the public page generates a clickable URL:
- USPS: `https://tools.usps.com/go/TrackConfirmAction?tLabels=<n>`
- UPS: `https://www.ups.com/track?tracknum=<n>`
- FedEx: `https://www.fedex.com/fedextrack/?tracknumbers=<n>`
- DHL: `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=<n>`

## 13. Phasing

### Phase 1 — schema + creation

- Schema migration
- `/admin/invoices/new` editor
- Server-side invoice save endpoint
- Image generation on save
- Basic `/admin/invoices` list + `/admin/invoices/<id>` detail with image + link display
- Public `/invoice/<uuid>` page on advnce-site

Ship here: Jorrel can create invoices, get an image + link, text them to customers.

### Phase 2 — status lifecycle + inventory sync

- Status transition buttons + endpoints
- Inventory decrement on paid, restore on cancel
- `shipped` + tracking number flow
- Ship confirmation email
- Cancel + apology email

### Phase 3 — polish

- "Pick past customer" search in editor
- Invoice image live preview in editor
- Better list filters
- Copy-to-clipboard helpers
- Customer view counter

Phases are serially dependent but each is shippable.

## 14. Out of scope for v1

- Ambassador-facing invoice creation — separate future project
- Auto-carrier detection from tracking number format (just a dropdown)
- Partial refunds (full cancel only)
- Multi-currency
- Tax line
- Editable invoice after `sent` status
- Webhooks from shipping carriers to auto-update status

## 15. Testing

- Create invoice with 1 item, no discount → saves, image renders, link works
- Create invoice with 3 items, 10% discount → totals math checks, discount line on image
- Create invoice with flat discount → correct line render
- Transition draft → sent → paid → shipped → delivered; stock decrements on paid
- Transition paid → cancelled; stock restores
- Public invoice link accessible without auth; shows current status; tracking link works after shipped
- Image fits in 1200px width with long customer names + long product names
- Admin lookup by past customer returns prior order's contact details
