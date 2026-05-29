# Compound Spotlight Email Campaigns — Design Spec

**Date:** 2026-05-28
**Owner:** Jorrel Patterson
**Status:** Approved (brainstorm complete; implementation plan next)

---

## 1. Purpose

Ship a branded, editorial email campaign system for **advncelabs.com** that fires a compound-spotlight email whenever a new compound (or restocked compound) comes into inventory — and also supports manual one-off sends when something is worth talking about regardless of stock state. Each send is the email-channel equivalent of the IG "There's a peptide for that" carousel: layman hook → campaign payoff → research-grade reveal → CTA.

This is not a transactional system. It is a marketing-editorial system with the same review-before-send discipline as the existing `/admin/marketing/news` queue.

---

## 2. Scope

**In scope**

- New Supabase tables to store drafts, per-recipient send records, and an opt-out suppression list.
- Auto-draft creation when stock crosses 0 → positive (via hook in existing inventory write paths).
- Manual draft creation from the admin UI.
- Admin queue at `/admin/marketing/email-campaigns` for review, edit, preview, and send.
- A Resend-backed send pipeline with per-recipient tracking and resume-on-failure.
- A signed-token unsubscribe endpoint and footer link on every send.
- Mirror of the `peptide-for-that` hook library into Supabase as the structured source for draft pre-fill.

**Out of scope (deferred)**

- A/B testing of subject lines or layouts.
- Open/click analytics ingestion via Resend webhooks (we'll log `resend_id` for now; analytics can read it later).
- Behavioral campaigns (post-purchase, abandoned cart, win-back) — separate spec when needed.
- Discount codes attached to compound emails — explicitly rejected during brainstorm (Q4: option B).
- Resend Broadcasts / Resend Audiences integration — explicitly rejected (Q5: option A).

---

## 3. Decisions made during brainstorm

| # | Question | Decision |
|---|---|---|
| Q2 | Trigger / creation flow | **D — both** manual + auto on restock |
| Q3 | Audience | **B** — subscribers ∪ past_customers ∪ ambassadors, deduplicated by lowercase email |
| Q4 | CTA & commercial intent | **B** — editorial body + direct product CTA, no discount codes |
| Q5 | System architecture | **A** — mirror the news system (drafts table + admin queue + per-recipient send loop) |
| — | Approval before send | **Always required** — auto-drafts never auto-send |
| — | Send cadence | **Always create a draft on restock**, but enforce **≥ 7 days between sends**. When multiple drafts are ready, queue staggers them. |
| — | Hook/research source of truth | **Mirror `docs/marketing/peptide-for-that-campaign.md` into a `compound_marketing` Supabase table.** The .md remains the human-editable source; a one-shot sync script writes it to Supabase. The draft generator reads from Supabase. |

---

## 4. Email template — locked

See `email-layout-v5.html` in `.superpowers/brainstorm/`. Final structure top to bottom:

| Section | Treatment |
|---|---|
| **Header** | Logo lockup left, eyebrow `DISPATCH NO. {n} / {CATEGORY · SUBCATEGORY}` right. JetBrains Mono cyan eyebrow. |
| **Hook** | Italic Cormorant Garamond 36px, ink color, in quotes. Pulled from the peptide-for-that library (e.g. `"Lost the connection?"`). |
| **Campaign payoff** | `There's a peptide for that.` — Barlow Condensed 900, cyan, 26px, 4px letter-spacing, two-line layout, hairline divider beneath. This is the IG slide-1 → slide-2 transition translated to email. Appears on every send unmodified. |
| **Compound reveal** | Compound name in Barlow Condensed 900, 84px, ink, -2px letter-spacing, uppercase. Italic Cormorant cyan tagline directly below. |
| **Layman lead** | One short Arial paragraph (15px, 1.75 line-height). Plain-English framing of what the compound is/does in everyday terms. |
| **Layman bridge** | One short Arial paragraph re-establishing the editorial voice (`Researchers have been studying it for decades. What they're examining isn't romance — it's the underlying neurochemistry of attachment.`). |
| **Divider** | 1px `#E4E7EC` hairline. |
| **"What the research investigates"** | Barlow Condensed cyan label, then 3 arrow bullets in Arial 14px. Each bullet ends with a citation in parens. |
| **Now-in-stock stamp** *(conditional)* | Full-width amber band `#E07C24`, ink text in Barlow Condensed 900 34px, 5px letter-spacing, single line `Now in stock`. Shown when `show_stock_stamp = true`. |
| **CTA** | Cyan button, Barlow Condensed 700, `Order {Compound} →`, centered, links to `product_url`. |
| **Citations + RUO** | JetBrains Mono 10px dim, centered. `CITATIONS · …` line then `What you do with the research is up to you and your clinician.` line. |
| **Footer** | Dark navy band, JetBrains Mono 8px dim. Contact line + RUO disclaimer + `{unsubscribe_url}`. |

Brand fonts (Barlow Condensed, Cormorant Garamond, JetBrains Mono) loaded via Google Fonts preconnect. Cream `#F4F2EE` body background per the brand identity doc.

Implementation: a single HTML file at `templates/email/compound-spotlight.html` with `{{PLACEHOLDER}}` tokens, rendered by a small server-side template function (same pattern as the existing welcome-email inline-template approach, but extracted to a reusable file).

**Template placeholders**

```
{{HOOK}}                 — italic-Cormorant hook from peptide-for-that
{{COMPOUND_NAME}}        — uppercase compound display name
{{TAGLINE}}              — italic-Cormorant cyan tagline
{{LAYMAN_LEAD}}          — paragraph 1
{{LAYMAN_BRIDGE}}        — paragraph 2
{{BULLET_1}}
{{BULLET_2}}
{{BULLET_3}}
{{CITATIONS_SHORT}}      — comma-separated short cites for the bottom line
{{CATEGORY_LABEL}}       — "SOCIAL · BONDING" etc., for header eyebrow
{{DISPATCH_NO}}          — integer, monotonic across the campaign
{{PRODUCT_URL}}          — direct link to the product page
{{STOCK_STAMP_BLOCK}}    — server inserts the full amber stamp HTML or empty string based on show_stock_stamp
{{UNSUBSCRIBE_URL}}      — signed-token URL for the recipient
```

---

## 5. Data model

Three new tables, one new column on existing `subscribers`.

### 5.1 `compound_email_drafts`

One row per planned send. Created either by the restock trigger or by the admin "New" button.

```
id                      uuid pk
dispatch_no             int unique  -- monotonic; assigned on creation
compound_slug           text not null  -- e.g. 'oxytocin'
compound_name           text not null  -- display, e.g. 'Oxytocin'
product_url             text not null
category_label          text          -- 'SOCIAL · BONDING'
hook                    text          -- pulled from compound_marketing
tagline                 text          -- italic cyan line
layman_lead             text          -- author writes per-send (may pre-fill)
layman_bridge           text
bullet_1                text
bullet_2                text
bullet_3                text
citations_short         text          -- e.g. 'CARTER 2014 · HEINRICHS 2003'
show_stock_stamp        bool not null default true
trigger                 text not null check (trigger in ('restock','manual'))
status                  text not null default 'draft'
                              check (status in ('draft','ready','sending','sent','failed'))
created_at              timestamptz default now()
scheduled_at            timestamptz   -- next eligible send slot, auto-computed
sent_at                 timestamptz
recipient_count         int default 0
recipient_count_sent    int default 0
recipient_count_failed  int default 0
created_by              text          -- admin email or 'system'
notes                   text          -- internal-only freeform
```

**`status` transitions:**

```
draft  →  ready   (admin clicks "Mark ready" — required fields validated)
ready  →  sending (admin clicks "Send now" — system locks the row)
sending → sent    (all per-recipient sends attempted, count fields finalized)
sending → failed  (catastrophic failure, e.g. Resend API down on all calls)
```

### 5.2 `compound_email_recipients`

One row per recipient per send. Source of truth for who got what and when.

```
id           uuid pk
draft_id     uuid fk → compound_email_drafts(id)
email        text not null  -- lowercased
name         text
source       text not null  -- 'subscriber' | 'customer' | 'ambassador'
sent_at      timestamptz
resend_id    text          -- Resend message id, for later webhook correlation
status       text not null default 'pending'
                   check (status in ('pending','sent','failed','skipped'))
error        text          -- on failure
```

Indexes: `(draft_id, status)`, `(email)`.

### 5.3 `compound_email_unsubscribes`

Email-only suppression for past_customers/ambassadors not present in `subscribers`. Subscribers use the new column instead (see 5.4).

```
id              uuid pk
email           text not null unique  -- lowercased
unsubscribed_at timestamptz default now()
source_draft_id uuid          -- which send prompted the unsubscribe
```

### 5.4 New column on existing `subscribers` table

```
ALTER TABLE subscribers
  ADD COLUMN compound_email_unsubscribed_at timestamptz;
```

Welcome emails still send to all subscribers (this column does not gate them). Only compound-spotlight sends respect it.

### 5.5 `compound_marketing`

Mirror of `docs/marketing/peptide-for-that-campaign.md`. Populated by a one-shot sync script; can be re-run to refresh.

```
compound_slug    text pk          -- 'oxytocin'
compound_name    text not null    -- 'Oxytocin'
category         text             -- 'Sexual Health'
subcategory      text             -- 'Bonding' (free-form; supplies the category_label suffix)
hook             text             -- '"Lost the connection?"'
research_angle   text             -- 'Bonding, social cognition, anxiolytic research'
citation_primary text             -- 'Carter 2014'
mod_risk         text             -- 'Low' / 'Medium' / 'High'
ig_blocked       bool default false  -- true for weight-loss compounds (email-only)
product_url      text
updated_at       timestamptz default now()
```

---

## 6. Restock trigger

Two existing routes mutate inventory upward:

- `app/api/purchase-receive/route.js` — incoming PO received.
- `app/api/inventory-adjust/route.js` — manual adjustment by admin.

Both will call a new helper at `lib/onStockRise.js`:

```
onStockRise({ sku, previous_qty, new_qty, source })
```

Logic:

1. If `previous_qty > 0` or `new_qty <= 0` → no-op.
2. Look up `product → compound_slug` (from `products` table or a SKU→slug map).
3. Look up `compound_marketing` row by slug.
4. **Insert** a `compound_email_drafts` row with `trigger='restock'`, `status='draft'`, fields pre-filled from `compound_marketing` (hook, category_label = `{category} · {subcategory}`, tagline blank, layman fields blank, bullets blank, citations from `citation_primary`). `compound_name` and `product_url` from the product row. `dispatch_no` = `(SELECT COALESCE(MAX(dispatch_no),0)+1 FROM compound_email_drafts)`.
5. `scheduled_at` = `GREATEST(now(), last_sent_at + interval '7 days')` where `last_sent_at` is the latest `sent_at` across all drafts. Used as a display/sort hint; not enforced at send time except by the admin UI showing "earliest available."
6. **No dedupe based on time-since-last-send.** Per the brainstorm decision: every restock event creates a draft. Admin can delete duplicates in the queue if undesired.
7. Log an admin notification (optional v2 — for v1 the draft just appears in the queue).

Failure modes: if `compound_marketing` has no row for the slug, still create the draft with whatever fields are available; the queue UI shows a "needs copy" badge and the admin authors from scratch.

---

## 7. Recipient pipeline

When admin clicks **Send** on a `ready` draft:

```
recipients = (
  SELECT email, first_name AS name, 'subscriber' AS source
  FROM subscribers
  WHERE compound_email_unsubscribed_at IS NULL
)
UNION (
  SELECT lower(email) AS email, name, 'ambassador' AS source
  FROM ambassadors
  WHERE email IS NOT NULL
)
UNION (
  -- past_customers from orders table
  SELECT DISTINCT lower(customer_email) AS email, customer_name AS name, 'customer' AS source
  FROM orders
  WHERE customer_email IS NOT NULL
)

-- then drop any in the suppression list
EXCEPT lower(email) IN (SELECT email FROM compound_email_unsubscribes)

-- finally, dedupe by lower(email), preferring source priority subscriber > ambassador > customer
```

The deduped list is bulk-inserted into `compound_email_recipients` with `status='pending'` and `draft.recipient_count` is set. Sending proceeds row-by-row (see section 8).

---

## 8. Send pipeline

New route: `app/api/compound-email-send/route.js` (admin-only). The route is chunked so it can survive Vercel's per-invocation time limit.

```
POST /api/compound-email-send
body: { draft_id: uuid, chunk_size?: number (default 500) }
returns: {
  draft_id,
  status,              -- 'sending' | 'sent'
  processed_this_call, -- int
  sent_total,
  failed_total,
  remaining            -- int; admin client loops until remaining === 0
}
```

Flow:

1. Verify admin role (`requireRole(request,'admin','va')`).
2. Load draft.
3. **First-call branch** — if `draft.status='ready'`:
   - Transition to `status='sending'`.
   - Build recipient list per section 7.
   - Bulk-insert all rows into `compound_email_recipients` with `status='pending'`.
   - Set `draft.recipient_count` to the deduped total.
4. **Process chunk** — select up to `chunk_size` recipients where `status='pending'` and `draft_id` matches. For each:
   - Substitute `{{UNSUBSCRIBE_URL}}` with a signed token URL: `https://www.advncelabs.com/api/email-unsub?t={jwt}`. JWT carries `{ email, exp: 90d }`, signed with `EMAIL_UNSUB_SECRET`.
   - POST to Resend `/emails`.
   - Update recipient row with `sent_at`, `resend_id`, `status='sent'` or `'failed'` + `error`.
   - Throttle: ~5 req/sec via a 200ms delay between sends.
5. Recompute `recipient_count_sent` and `recipient_count_failed` from the recipients table.
6. If no `pending` rows remain → set `draft.sent_at = now()`, `status='sent'`.
7. Return the status payload. Admin client re-invokes the route until `remaining === 0`.

A 500-recipient chunk at 200ms/send = 100 seconds — comfortably under the 5-min Vercel Hobby timeout.

**Resume route:** `POST /api/compound-email-resume` body `{ draft_id }` — re-queues `failed` recipients back to `pending` and toggles draft `status` back to `sending`. The admin client then calls `/api/compound-email-send` again until drain.

Idempotency: a `sent` row is never re-sent (the chunk query filters on `status='pending'`).

---

## 9. Admin UI — `/admin/marketing/email-campaigns`

Server component, mirrors the structure of `/admin/marketing/news/page.jsx`.

**Sections (top to bottom)**

1. **Needs copy** — drafts where any required layman field is blank. Visual: red-amber accent on card.
2. **Ready to send** — drafts with `status='ready'`. Each card shows: dispatch_no, compound_name, hook (preview line), scheduled_at, recipient_count_estimate, and three buttons: `Preview` / `Edit` / `Send`.
3. **Sent (last 30)** — `status='sent'`, ordered by `sent_at desc`. Read-only cards with metrics (`recipient_count`, `sent`, `failed`).
4. **Failed / partial** — any draft with `status='failed'` or `status='sending'` and a `recipient_count_sent < recipient_count`. `Resume` button per card.

**Per-card inline edit** — client component, similar to `DraftCard.jsx` in news. Editable fields: `hook`, `tagline`, `layman_lead`, `layman_bridge`, `bullet_1/2/3`, `citations_short`, `category_label`, `show_stock_stamp`, `scheduled_at`, `notes`. Not editable post-creation: `compound_slug`, `compound_name`, `product_url`, `dispatch_no`, `trigger`. (If admin needs to switch which compound a draft is about, delete it and create a new one.)

**Preview** — opens `/admin/marketing/email-campaigns/[id]/preview` which renders the email template with substituted fields and surfaces it in an iframe at email width (600px), framed by `#E8E6E2` background so it reads like an inbox preview.

**Send button** — opens a confirm modal: "Send `{compound_name}` dispatch to ~{recipient_count_estimate} recipients. Earliest schedule allows: {scheduled_at}. Proceed?" with explicit Confirm/Cancel.

**New** button at top → blank draft form, admin chooses compound_slug from a dropdown of in-stock products.

---

## 10. Unsubscribe flow

New route: `app/api/email-unsub/route.js` (public, no auth).

```
GET /api/email-unsub?t={jwt}
```

1. Verify JWT signature; extract `{ email }`.
2. If email exists in `subscribers`: set `compound_email_unsubscribed_at = now()`.
3. Otherwise: upsert into `compound_email_unsubscribes`.
4. Return a simple branded HTML page: "You're unsubscribed from compound dispatches. Transactional emails (order confirmations, etc.) are unaffected." Cream background, brand fonts.

Footer of every send includes: `<a href="{unsubscribe_url}" style="color:rgba(244,242,238,0.45);text-decoration:underline">Unsubscribe</a>` alongside the existing footer text.

---

## 11. Environment & secrets

Existing env vars cover most needs. One new:

- `EMAIL_UNSUB_SECRET` — for signing unsubscribe JWTs. Add to Vercel preview + production.

No changes to `RESEND_API_KEY`, Supabase keys, or `ADMIN_PASSWORD`.

---

## 12. Compliance & brand guardrails

- All copy must comply with the voice rules in `docs/brand/advncelabs-brand-identity.md` (no "treats/cures/heals", no outcome claims, RUO framing always). The admin queue will not enforce this — it's an editorial discipline on the author.
- Footer disclaimer on every send: `Research-grade compounds for in-vitro laboratory use only. Not for human consumption. Not evaluated by the FDA.`
- Every send carries an unsubscribe link.
- IG-blocked weight-loss compounds (`compound_marketing.ig_blocked = true`) are explicitly eligible — email is their only channel per the campaign doc.

---

## 13. Open questions (resolved before implementation)

None at this time. Items deferred to v2:

- Resend webhook ingestion for open/click analytics.
- Vercel Queues migration if send chunking proves unwieldy.
- Per-compound suppression (e.g. "don't send oxytocin emails to people who already bought oxytocin in the last 90 days").
- A/B subject line testing.

---

## 14. Implementation order (preview — full plan to be written by writing-plans skill next)

1. Schema migration: three new tables + one new column + `compound_marketing` table.
2. Sync script: `peptide-for-that-campaign.md` → `compound_marketing`. One-shot, idempotent.
3. Template file: `templates/email/compound-spotlight.html` with placeholders.
4. Restock helper: `lib/onStockRise.js` + hook into `purchase-receive` and `inventory-adjust`.
5. Admin queue page + DraftCard component.
6. Send route + recipient builder + Resend loop.
7. Unsubscribe route + branded confirmation page.
8. Manual end-to-end test with a single test email recipient.
9. Live test with a small subscriber subset before opening the floodgates.
