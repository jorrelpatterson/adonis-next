# ADVNCE Status — Customer Rewards Program (Design Spec)

**Date:** 2026-06-09
**Status:** Approved by Jorrel (tier names, thresholds, gifts incl. NAD+ confirmed)
**Repos touched:** `advnce-site` (primary — checkout/order API, program page), `adonis-next` (admin order view, manual Supabase DDL)

## 1. Overview

Automatic loyalty program for advncelabs.com retail customers. No signup, no
points, no codes: every checkout looks up the customer's lifetime paid spend
(matched by email OR normalized phone — same pattern as ambassador
attribution) and applies their tier benefits automatically.

Calibration data (live orders table, 2026-03-23 → 2026-06-09): 33 real
orders, AOV $191, median $125, sales concentrated in Retatrutide (42 units).
Tier thresholds ≈ 3 / 6–8 / ~15 median orders. Gifts are deliberately
**lesser-bought, recurring-use items** so each gift seeds a new repeat
product line for a Reta-heavy customer base.

## 2. Program rules

| Tier | Lifetime paid spend | Ongoing discount | Unlock gift (free vial, one-time) | Other perks |
|---|---|---|---|---|
| Member | < $350 | — | — | status footer in emails |
| **MOMENTUM** | ≥ $350 | 5% | DSIP 5mg (SKU `DS5`, $32 retail) | — |
| **VELOCITY** | ≥ $1,000 | 10% | NAD+ 500mg (SKU `NA500`, $60 retail) | early access to restocks & pre-sells |
| **APEX** | ≥ $2,500 | 15% | SS-31 50mg (SKU `SS50`, $225 retail) | priority fulfillment; occasional surprise drop-ins (manual, at Jorrel's discretion) |

Tier names, thresholds, discount %, and gift SKUs live in **one config
block** (`LOYALTY_TIERS` constant in the order API; mirrored in the admin
where displayed). Swapping a gift SKU is a one-line change.

### 2.1 Spend computation

- `lifetimePaidSpend` = sum of `orders.total` for all prior orders matching
  the customer's email (case-insensitive) **or** normalized 10-digit phone,
  where `status IN ('confirmed','paid','processing','shipped','delivered')`.
- `pending_payment`, `sent`, and `cancelled` orders do NOT count.
- The **current** (not-yet-paid) order never counts toward the discount.

### 2.2 Discount (applies to FUTURE orders)

- Tier for the current checkout = f(lifetimePaidSpend from *past paid
  orders only*). The discount applies to this checkout if the customer had
  already earned the tier before this order.
- Tier % applies to **regular-priced items only**. Pre-sell items already
  carry the 25% pre-sell discount; tier % does not stack on top of them.
  (Deliberate margin decision: worst case otherwise = 25% + 15% + up to
  27.5% ambassador commissions.)
- Recorded on the order as `discount_type: 'loyalty'`,
  `discount_code: <tier name>`, `discount_amount: <dollars>`.

### 2.3 Gift unlock (applies to THIS order)

- If a tier's gift has not been granted before (see double-grant protection
  below) AND `lifetimePaidSpend + currentOrderFinalTotal ≥ threshold`, the
  order unlocks that tier. (Final total = post-discount, matching what joins
  lifetime spend once paid.) This also **grandfathers pre-program
  customers**: someone with $999 of historical spend gets the MOMENTUM and
  VELOCITY gifts on their first post-launch qualifying order — a deliberate
  launch reward for the existing base.
  On unlock: set `tier_unlocked: '<TIER>'` on the order and append the gift
  as a **$0 line item** (`{ sku, name, size, qty: 1, price: 0, retail,
  loyalty_gift: true }`).
- Gift ships with this order during normal manual fulfillment (only after
  Zelle payment confirms, so unpaid/cancelled orders cost nothing).
- If an order jumps multiple thresholds at once (e.g., $0 → $1,100), grant
  **all** crossed gifts; `tier_unlocked` records the highest tier.
- If a gift SKU is out of stock (`products.stock <= 0` or inactive), still
  set `tier_unlocked` but add no line item; flag in the admin email so
  Jorrel substitutes a comparable vial by hand.

### 2.4 Stacking rules

1. Loyalty tier discount vs. entered promo code → **better of the two,
   never both**. The losing discount is dropped silently (order email shows
   only the applied one).
2. Ambassador 15% first-order discount targets new customers (no tier yet)
   → no interaction.
3. Ambassador-attributed repeat customers get their tier discount AND the
   ambassador still earns commission (deliberate: both flywheels keep
   spinning; worst-case stack APEX 15% + 27.5% L1-L3 commissions = 42.5%
   off gross — accepted).
4. Tier discount never applies to pre-sell-priced line items (§2.2).

## 3. Customer touchpoints

1. **Checkout (`advnce-checkout.html`)** — after the customer enters
   email/phone, no client-side change is required for correctness (server
   computes everything), but show the applied tier discount on the success
   screen, returned by the API alongside the verified total.
2. **Order confirmation email** (customer) — status footer on every order:
   `Lifetime: $480 · MOMENTUM (5% applied) · $520 to VELOCITY (10%)`.
   On a crossing order, replace footer with a celebration block:
   `You just hit VELOCITY — a free NAD+ 500mg is in your box, and 10% now
   applies to every future order.`
3. **Admin alert email** — include tier, unlock flag, and out-of-stock gift
   warning if applicable.
4. **Program page** (`advnce-rewards.html` on advnce-site, linked from nav/
   footer) — explains tiers, thresholds, gifts, and "automatic — no signup"
   in the cream-luxe brand style (per `docs/brand/` guide in advnce-site).
5. **Admin orders view** (`adonis-next` `app/admin/orders/page.jsx`) — show
   customer tier badge + `tier_unlocked` gift flag on each order row/detail
   so fulfillment knows to include the vial.

## 4. Data changes (manual Supabase DDL — no linked CLI)

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_unlocked text;          -- 'MOMENTUM' | 'VELOCITY' | 'APEX' | null
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loyalty_tier text;           -- tier in effect at checkout time | null
```

- `discount_type` gains the value `'loyalty'` (column is text; no enum DDL
  needed — verify before assuming).
- **No new tables.** Lifetime spend is computed at checkout time from the
  orders table (order volume is tiny; a customers roll-up table is Phase 2).

## 5. Implementation surfaces

| Piece | Repo / file | Change |
|---|---|---|
| Core logic | `advnce-site/api/send-order-email.js` | lifetime-spend lookup, tier calc, better-of discount resolution, gift line-item injection, email footer/celebration blocks, `LOYALTY_TIERS` config |
| Success screen | `advnce-site/advnce-checkout.html` | display tier discount + gift from API response |
| Program page | `advnce-site/advnce-rewards.html` (new) | static marketing page |
| Admin orders | `adonis-next/app/admin/orders/page.jsx` | tier badge, gift-included flag |
| DDL | Supabase SQL editor (manual) | §4 columns |

## 6. Edge cases & decisions

- **Identity fragmentation:** a customer using a new email AND new phone
  starts a fresh history. Accepted (same limitation as ambassador
  attribution today). Admin can't merge identities in Phase 1.
- **Email vs phone mismatch** (same person, two records): lookup is OR —
  matching either field links the history.
- **Refunds/cancellations:** cancelled orders never count. There is no
  refund status today; if one is added later, exclude it from
  `PAID_STATUSES`.
- **`confirmed` status counts as paid** — it follows Zelle receipt in the
  current flow. Verify against actual usage during implementation; if it
  turns out to be pre-payment, drop it from the list.
- **Gift double-grant protection:** before granting a gift, check that no
  prior order for this customer already has `tier_unlocked` at or above
  that tier (rank = position in the `LOYALTY_TIERS` config array). Handles
  the case where a counted order later gets cancelled and spend dips back
  under a threshold.
- **Bac Water auto-adds** are regular-priced items and receive the tier
  discount like anything else; only pre-sell-priced lines are excluded.

## 7. Out of scope (Phase 2 candidates)

- Customers roll-up page in admin (lifetime spend, tier, last order).
- Reorder-reminder emails timed to the ~5-week consumption cycle.
- Customer-facing "check my status" lookup on the site.
- Rolling 12-month tier windows (revisit if margins compress at scale).
- Identity merge tooling.

## 8. Success metrics

- Repeat-purchase rate (orders per unique customer) before vs. after.
- Attach rate of gifted products (DSIP/NAD+/SS-31) on subsequent orders —
  the "hook" metric.
- Blended loyalty discount cost as % of repeat revenue (target ≤ 5%).
