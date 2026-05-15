# Reorder reminders

**Date:** 2026-04-27
**Status:** Design approved, pending implementation plan

## Problem

Customers buy peptides that run out on predictable timelines (an RT10 vial typically lasts ~5 weeks at common doses). Today there's no signal sent when supply is about to run dry — customers either remember on their own and re-order, or they lapse. We're losing repeat revenue we could capture with a well-timed nudge.

## Goals

- Detect, per delivered order line item, when the customer is likely running out.
- Send two emails — a soft nudge ~14 days before, an urgent reminder ~3 days before.
- Don't spam: if the customer has already re-ordered the same SKU since the original delivery, suppress.
- Do this for the SKUs we have dosing data for; cleanly skip everything else (bac water, syringes, anything without a known runout cadence).
- Don't degrade trust: only send to real email addresses, only on orders that were actually delivered.

## Non-goals

- Customer-facing unsubscribe / per-SKU "don't remind me" toggle (v2).
- Admin preview UI of upcoming reminders (v2 — can compute on demand from the same scan logic).
- SMS reminders (v2).
- Cross-order summaries — if a customer has 3 different orders all running out in the same window, they get up to 3 emails (one per order). Multiple SKUs *within the same order* are combined into one email.
- Predicting partial-vial usage or storage degradation — we use a fixed `typical_days_supply` per SKU.

## Design

### 1. Data model

**`products` table** — add one nullable column:

| Column                | Type | Nullable | Notes                                                      |
|-----------------------|------|----------|------------------------------------------------------------|
| `typical_days_supply` | int  | yes      | Manual override. NULL → fall through to peptides.js auto-compute. Both NULL → no reminders for this SKU. |

**New table `reorder_reminders_sent`** — append-only audit log so we don't dupe.

```sql
create table reorder_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  reminder_type text not null check (reminder_type in ('14d', '3d')),
  sent_at timestamptz not null default now(),
  email_to text not null,
  unique (order_id, sku, reminder_type)
);
create index reorder_reminders_sent_lookup on reorder_reminders_sent(order_id, sku);
```

The unique constraint is the source of truth for "already sent" — even if the cron runs twice in a day or a deploy retries it, we cannot double-send.

No `scheduled_at` column anywhere — runout date is computed fresh from `delivered_at + (days_per_unit × qty)` on every cron pass. This avoids stale schedules if `typical_days_supply` is tuned later.

### 2. Duration computation

New helper `lib/reorderDuration.js`:

```js
export function daysSupply(sku, productRow, qty = 1) { /* see below */ }
```

Resolution order:

1. If `productRow.typical_days_supply` is set (not null) → return `typical_days_supply × qty`.
2. Else look up `lib/constants/peptides.js` by `vendorSku === sku`. If found AND `freq !== 'as_needed'` AND `dose` is parseable as a number-or-range with units:
   - Parse vial size (e.g. `size: "10mg"` → 10 mg). Strip non-numeric/decimal chars; reject if no number.
   - Parse dose (`"0.25-2.4mg/wk"` → midpoint of range = 1.325 mg per dose). Convert mcg → mg if needed.
   - Frequency multiplier (doses per week): `daily` → 7, `2x_week` → 2, `weekly` → 1, anything else → null.
   - `days = round((vial_mg / weekly_dose_mg) × 7) × qty`.
3. On any parse failure or unknown frequency → return `null`. Cron treats null as "skip this line item."

The parser is **intentionally conservative**: better to silently skip than to send a poorly-timed reminder. SKUs without a computed value will surface in admin, and Jorrel can populate `typical_days_supply` manually.

### 3. Cron logic

New endpoint: `app/api/cron/reorder-reminders/route.js`. Wired up in `vercel.json` to fire daily at noon UTC (≈ 4 AM PT).

Pseudocode:

```
SECRET-CHECK request header (consistent with existing welcome-emails cron pattern).

LOAD all orders where:
  status = 'delivered'
  AND delivered_at >= now() - 365 days  (cap horizon)
  AND email IS NOT NULL
  AND email NOT LIKE '%@invoice.local'

LOAD products keyed by sku (one query, all rows). Used for typical_days_supply lookup.

LOAD reorder_reminders_sent rows for these order_ids in one query, into a Set keyed by `${order_id}|${sku}|${reminder_type}`.

FOR each order:
  collect line items into "due_today" buckets:
    bucket_14d = []
    bucket_3d  = []
  FOR each line item (sku, qty):
    productRow = products[sku]
    if productRow is missing → skip
    days = daysSupply(sku, productRow, qty)
    if days is null → skip
    runout_date  = order.delivered_at + days days
    days_until   = floor(runout_date - today, in days)

    # 3-day grace catches up if the cron skipped a day
    if days_until in [12, 13, 14, 15] AND not in sent_set('14d'):
      bucket_14d.push({ sku, productName: productRow.name })
    elif days_until in [1, 2, 3, 4] AND not in sent_set('3d'):
      bucket_3d.push({ sku, productName: productRow.name })

  FOR each non-empty bucket:
    # Dedup: any newer delivered order for same identity+sku?
    if any sku in bucket has a newer delivered order for same email-or-phone → drop those skus
    if bucket is now empty → skip
    SEND email (one email per bucket, listing all SKUs in the bucket)
    INSERT into reorder_reminders_sent for each (order_id, sku, reminder_type)
    on insert conflict, skip — race-safe via unique constraint

RETURN { processed: N, sent_14d: X, sent_3d: Y }
```

The same order can produce **at most one 14d email and one 3d email** total (multiple SKUs combined per email). Across orders, the same customer can receive multiple emails if they have separate orders running out concurrently — that's intentional and rare.

### 4. Email content

Two templates in the cron route, following the existing Resend pattern (cream background, Barlow Condensed headlines, JetBrains Mono microcopy, RUO footer). Mirrors the style of `shippedEmailHtml` in `app/api/invoice-transition/route.js`.

**14-day nudge** — subject and body:

> Subject: `Planning ahead — your {ProductName1} runs low in about two weeks`
>
> Hi {first_name},
>
> Based on typical use, your {ProductName1}{, plus N more if multiple} from order {invoice_id_or_order_id} is likely to run out in around two weeks.
>
> Most customers re-order now to avoid a gap.
>
> [Reorder {ProductName1} →]
>
> All products are for research and laboratory use. Not for human consumption.

**3-day urgent** — same template, sharper copy:

> Subject: `Running low on {ProductName1} — quick reorder?`
>
> Hi {first_name},
>
> You're likely to run out of {ProductName1}{, plus N more} in the next few days.
>
> [Order now →]

CTA links to the catalog filtered by SKU (or the product's individual page if available). For invoice orders without a `first_name`, the salutation drops to "Hi —". For orders with multiple running-out SKUs, the email lists all of them with one combined CTA to the catalog.

### 5. Dedup details

Customer identity for dedup:
- If `email` is real (not `@invoice.local`) → use lower-cased email.
- Else if `phone` is non-empty → normalize to digits-only.
- Else → no dedup possible, treat as unique.

Dedup query (per order, just before sending): "for this customer identity, are there any other orders with status=`delivered`, items containing this SKU, and `delivered_at > current_order.delivered_at`?" If yes, suppress this SKU from the email.

This means: the FIRST order to be delivered will get reminders. If a re-order is delivered later, the original's pending reminders silently die.

### 6. Vercel cron configuration

Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/reorder-reminders", "schedule": "0 12 * * *" }
  ]
}
```

The route validates `Authorization: Bearer ${CRON_SECRET}` matching `vercel.json`'s automatic Vercel cron auth header (same pattern as the existing welcome-emails cron).

## Implementation surface

Files expected to change (writing-plans will confirm):

- `sql/2026-04-27-reorder-reminders.sql` — schema migration.
- `lib/reorderDuration.js` — new helper.
- `app/api/cron/reorder-reminders/route.js` — new cron endpoint.
- `vercel.json` — add cron entry (verify existing schema; should already have a crons array from welcome-emails).
- `app/admin/inventory/page.jsx` (or a new page) — minor: surface `typical_days_supply` editable inline so Jorrel can populate over time. Optional but recommended for v1 since the auto-compute won't cover everything.

## Open questions

None. All design choices approved by Jorrel on 2026-04-27.
