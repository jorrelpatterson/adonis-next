# Wholesale Application & Pricing Sheet — design

**Date:** 2026-05-18
**Author:** Claude (brainstormed with Jorrel)
**Repo:** `jorrelpatterson/adonis-next`
**Status:** Awaiting user review

---

## 1. What this is

A public application page at `advncelabs.com/wholesale` where prospective bulk buyers (resellers) submit a slim inquiry without seeing pricing, plus the admin tooling to approve them and email a branded PDF pricing sheet. Designed for the inbound interest advnce labs is starting to receive from resellers, with med spas / clinics / stockists on the roadmap (not in scope for this spec).

## 2. Goals

**Primary:** capture inbound wholesale inquiries with a discreet, brand-consistent form, then give the admin a clean approve → email-sheet workflow.

**Secondary:** establish the data model and login codes that will power a phase-2 wholesale portal (login-gated pricing page → wholesale checkout) without rework.

**Out of scope (deferred):**
- **Phase 2 wholesale portal** — login-gated `/wholesale/pricing` web page that reads from `peptides.js` live, then wholesale checkout. Mentioned in arch decisions so the data model accommodates it.
- **Auto-generated PDFs** from `peptides.js`. The sheet is a static designed artifact, manually updated.
- **Med spa / clinic / stockist programs.** Specifically: white-label / blank-vial fulfillment, professional licensure verification, scheduled drug compliance. Future work.
- **Order placement / wholesale checkout.** Approved buyers email/text orders to Jorrel; he records them manually in Supabase (`distributor_orders` table already exists).
- **Resale certificate / tax ID collection.** Explicitly excluded — buyers want to be discreet.
- **Auto-approval / auto-rejection.** All applications go to manual admin review.

## 3. Architectural decisions

**Keep the `distributors` table name.** Public-facing language is "Wholesale," but the DB table and admin nav stay `distributors`. Reduces churn; the existing admin page works.

**Per-SKU quantity-break pricing replaces the existing tier-discount model.** The current `tier` column (entry/standard/volume/wholesale at 50/55/60/65% off) becomes vestigial — every line item on a wholesale order is priced by the per-SKU quantity break the buyer hits in that order. The `tier` field is kept on the row as a relationship tag (no pricing function) so the existing admin UI continues to work; pricing logic will live in the (future) wholesale checkout. For this spec, pricing exists only on the static PDF.

**Quantity breaks:** `10–99 · 100–499 · 500–999 · 1000+`. Per-SKU, per-order — the buyer's pricing on each line is determined by how many units of that SKU are on that order.

**Order minimum: 10 units per SKU.** JIT drop-ship model — advnce labs uses the buyer's funds to order a fresh batch from vendor (Eve / Weak / etc.) and ships from there. No held inventory. **Lead time: 7–14 business days.**

**Static PDF sheet, not auto-generated.** Designed once in Canva/Figma to the advnce labs identity. Stored in Supabase Storage. Replaced by upload when prices change. Trade-off accepted: manual maintenance burden in exchange for design control. (Phase 2 may render an HTML version from `peptides.js` for the portal.)

**Strict advnce labs brand identity.** Dark Luxe: near-black background (`#050507`), warm cream type (`#E8E4E0`), gold accent (`#E8D5B7`), Cormorant Garamond display, Outfit body, JetBrains Mono for prices. Application page and PDF both match.

**Existing broken `/api/distributor-approval` endpoint:** the current admin page calls this endpoint but it doesn't exist. Spec corrects this by creating the route as part of the implementation.

## 4. Components

### 4.1 Public application page — `app/wholesale/page.jsx`

URL: `/wholesale`. Pure server component shell + client-side form component. Dark Luxe styling matching `public/index.html`.

**Form fields (7 inputs + 2 checkboxes, all required marked `*`):**

| Field | Type | Notes |
|---|---|---|
| Business name `*` | text | Or DBA |
| Contact name `*` | text | |
| Phone `*` | tel | |
| Email `*` | email | |
| Country `*` | select | Pre-populated list, defaults to United States |
| State / Province `*` | text | Free text — international varies |
| Expected monthly volume `*` | radio | `10–99` / `100–499` / `500–999` / `1000+` |
| Research/professional use only `*` | checkbox | "I confirm products are for research / professional use only." |
| Agree to wholesale terms `*` | checkbox | Links to `/wholesale-terms` (placeholder content until lawyer reviews) |

No pricing of any kind is shown on this page. Lead time (7–14 days) and minimum order (10 units per SKU) **are** shown as small footer copy so applicants know what they're signing up for.

**Anti-spam:** Cloudflare Turnstile (invisible). Falls back to honeypot field if `TURNSTILE_SITE_KEY` env var is unset.

**Submission flow:** POST to `/api/wholesale-apply`. On success, replace form with a confirmation screen: "Thanks. We review wholesale applications within 1–2 business days. You'll receive your login code and pricing sheet by email." No success redirect.

### 4.2 Public terms page — `app/wholesale-terms/page.jsx`

Placeholder copy: "Wholesale terms are being finalized — for current terms please email wholesale@advncelabs.com." Linked from the application checkbox. **Not** in scope to draft real terms — that's a lawyer task. The page exists only so the application checkbox has a real link to point at.

### 4.3 Submission API — `app/api/wholesale-apply/route.js`

POST handler. Validates required fields server-side, verifies Turnstile token (or honeypot), inserts row into `distributors` with `status='pending'`. Sends a single Resend email to admin notifying of the new application. Returns 200 / 4xx.

### 4.4 Approval-email API — `app/api/distributor-approval/route.js` (NEW — currently broken/missing)

POST `{ distributor_id }`. Server-side:
- Look up distributor row; verify `status='approved'` and `login_code` present
- Look up current pricing sheet PDF in Supabase Storage (`wholesale-sheets/current.pdf`)
- Send Resend email with PDF attachment using new branded template

### 4.5 Admin updates — `app/admin/distributors/page.jsx`

Existing approve flow stays. Three additions:

1. **"Current Pricing Sheet" tile** at the top of the page next to the existing KPI tiles. Shows: current filename, uploaded date, "Replace" button → opens file picker → uploads to Supabase Storage at `wholesale-sheets/current.pdf` (backs up the old one to `wholesale-sheets/archive/<timestamp>.pdf`).
2. **"Send Pricing Sheet" button** in each approved distributor's expanded row — calls `/api/distributor-approval` (the resend-email flow already wired in the existing UI, just needs the API to actually work).
3. **No changes to tier dropdown / discount labels.** The 50/55/60/65 % off labels stay on the existing admin UI for backwards compatibility, but they no longer affect pricing. A small italic note added near the tier control: *"Tier is informational only — wholesale pricing is per-SKU on the published sheet."*

### 4.6 Pricing sheet — designed PDF artifact

Not code. Designed once in Canva or Figma to match Dark Luxe:
- Background `#050507`, text `#E8E4E0`, gold accent `#E8D5B7`
- Display: Cormorant Garamond italic for "advnce labs" and section heads
- Body: Outfit
- Mono: JetBrains Mono for product names and prices
- Header: brand mark, "WHOLESALE PRICING · 2026 Q2" (versioned by quarter)
- Table columns: Product | 10–99 | 100–499 | 500–999 | 1000+
- 130+ products from `lib/constants/peptides.js`, organized by category
- Footer: lead time, min order, research-use disclaimer, contact email for orders
- 1 sheet per spread, multi-page is fine for full catalog

Initial Q2 prices to be set manually by Jorrel — not derived programmatically. Spec doesn't lock the numbers.

## 5. Schema changes

### `distributors` table

Add columns (most likely exist already in some form; this is the required end-state):

```sql
alter table distributors
  add column if not exists country text,           -- ISO country name; defaults to 'United States' on form
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists internal_notes text;    -- admin-only, never shown to applicant
```

Existing `expected_volume` column should accept the four bucket strings (`10-99`, `100-499`, `500-999`, `1000+`). No schema change if already text.

`tier` column kept as-is — usage shifts from pricing-driver to relationship tag. No data migration needed.

### Supabase Storage

New bucket: `wholesale-sheets`
- Public read: **off** (admin-only; we attach to email rather than link)
- Service-role write
- Paths:
  - `wholesale-sheets/current.pdf` — the active sheet
  - `wholesale-sheets/archive/<YYYY-MM-DD-HHMMSS>.pdf` — old versions

## 6. Environment variables (new)

- `TURNSTILE_SITE_KEY` — public, used in app/wholesale page
- `TURNSTILE_SECRET_KEY` — server-side verification in `/api/wholesale-apply`
- `WHOLESALE_NOTIFY_EMAIL` — admin email to notify on new applications (defaults to existing admin notify address if present)

Existing already-required: `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 7. Email templates (Resend)

Two new templates, both rendered server-side in the API route:

**A. New-application admin notification** (`/api/wholesale-apply` → admin):
- Subject: `New wholesale inquiry — <business_name>`
- Body: all submitted fields in a readable table, link to admin distributors page
- Plain-text + minimal HTML; brand styling not required

**B. Approval email** (`/api/distributor-approval` → applicant):
- Subject: `Welcome to advnce labs Wholesale`
- Body: Dark Luxe HTML email, advnce labs wordmark, welcome copy, login code (for future portal), lead time + min order reminders, contact email for placing orders
- Attachment: `wholesale-sheets/current.pdf` renamed for the buyer (e.g. `advncelabs-wholesale-Q2-2026.pdf`)

## 8. Navigation

Footer-only link on `public/index.html`: "Wholesale Inquiries" → `/wholesale`. No header nav. URL is shareable for outbound DMs / emails. No homepage hero CTA.

## 9. Phase 2 (not in this spec, but informs design)

- Login-gated `/wholesale/pricing` HTML sheet pulled from `peptides.js` (so prices stay live)
- Wholesale checkout flow (Stripe with net-30 option, separate from retail)
- Med spa / clinic vertical with white-label / blank-vial fulfillment
- Stockist program with branded product on shelves

All buyer data already collected supports these — no schema rework expected.

## 10. Open items / risks

- **Terms copy:** placeholder until reviewed by counsel. Not blocking the launch but needs to be replaced.
- **PDF storage privacy:** bucket is private; access is admin-only via service-role key when attaching. If buyers re-share the PDF, that's accepted (same as Canva-emailed sheets).
- **`tier` field UX in admin:** the existing 4-tier dropdown stays as a tag, but it's now misleading copy. A small note disclaims this. A cleaner long-term solution is to repurpose the field as a relationship tag (e.g., "trusted partner / on hold / VIP") — out of scope for this spec.
- **Initial pricing:** the PDF won't ship until Jorrel sets wholesale prices for ~130 products. This is the rate-limit for the program going live, not a code task.
