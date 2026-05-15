# Pre-sell OOS — design

**Date:** 2026-04-23
**Author:** Claude (brainstormed with Jorrel)
**Repo:** `jorrelpatterson/advnce-site`
**Status:** Approved — moving to implementation plan

---

## 1. What this is

Turn out-of-stock products on advncelabs.com into a conversion lever and a demand-test signal. Today an OOS product sells at full retail with a muted "ships in 2–3 weeks" note — most visitors bounce. This feature adds a **25% pre-order discount** on eligible OOS products, queues the orders, and gives the admin a dashboard to decide when to place the next vendor PO.

## 2. Goals (in priority order)

**A. Anti-bounce / conversion (primary):** Convert visitors who land on an OOS product page into paying customers by offering a visible, material discount instead of an unactionable "out of stock" signal.

**B. Demand-test before PO (co-primary):** Aggregate pre-orders per SKU so Jorrel can see real demand before committing capital to a vendor PO. Especially valuable for hidden/slow-mover products that become visible via `active=true`.

**C. Cash-flow accelerator (bonus, not driving decisions):** Pre-order payments accumulate as future PO funding. Not a primary driver — no customer-facing "funded 6/10 vials" gamification.

## 3. Target set

A product is pre-sell eligible when **all** are true:

- `active = true` (visible on storefront)
- `stock = 0` (out of stock)
- `retail >= 45` (below this, 25% off nets almost no real dollar discount)
- `pre_sell_disabled = false` (new admin override, default false)

**Current universe (2026-04-23):** 52 products of 231 total. Hidden products (`active=false`, 142 of them) are unaffected and do not participate.

If Jorrel wants to demand-test a hidden product, he flips `active=true` on it — it automatically joins the pre-sell pool.

## 4. Discount model

- **Flat 25% off retail**, applied automatically at line-item level, no coupon code
- Computed server-side during checkout (client never trusted with price)
- **Stacks with WELCOME10** — first-timer gets 25% off (pre-sell) + 10% off (welcome code) = effective ~32.5% off
- Displayed on storefront as: `~~$68~~ **$51** — Pre-order price · Ships 2–3 weeks`
- Env-gated by `PRESELL_ENABLED=true` — when unset/false, all products fall back to current OOS behavior (full retail, "ships 2–3 weeks")

## 5. Schema changes

### New columns on `products` table

```sql
alter table products
  add column if not exists pre_sell_disabled boolean not null default false;
```

### New columns on `orders` table

```sql
alter table orders
  add column if not exists pre_sell_line_count integer not null default 0,
  add column if not exists pre_sell_subtotal_cents integer not null default 0,
  add column if not exists pre_sell_status text;
  -- pre_sell_status values: null (no pre-sell lines) | 'queued' | 'po_placed' | 'shipped' | 'cancelled'
```

### No new tables

Existing tables suffice. Pre-sell queue is a view over `orders` where `pre_sell_line_count > 0` and `pre_sell_status in ('queued', 'po_placed')`.

## 6. Storefront changes

### Product card (catalog grid)

When pre-sell eligible:
- Teal "PRE-ORDER" pill where the stock badge currently sits
- Price line shows: strikethrough regular retail + teal pre-sell price + small caption
- Example: `~~$68~~ **$51** · Pre-order`

### Product page

- Same pre-sell badge
- Price block: `~~$68.00~~ **$51.00**` with caption `25% pre-order discount · Ships 2–3 weeks after vendor PO places`
- Existing "Ships in 2–3 weeks" note stays (now it makes sense alongside the discount)
- Add to Cart button unchanged

### Cart / checkout

- Line items show original retail crossed out + discounted price
- Subtotal shows aggregate savings: "You save $X on pre-order items"
- Existing "Ships in 2 parts" messaging (for mixed carts) unchanged — already handles this case

## 7. Order processing

### On checkout

1. Server receives cart. For each line:
   - Look up product: `active`, `stock`, `retail`, `pre_sell_disabled`
   - If pre-sell eligible → apply 25% discount → mark line as `pre_sell=true` in order metadata
2. Compute order totals with discounts applied
3. Insert order row with:
   - `pre_sell_line_count` = count of pre-sell lines
   - `pre_sell_subtotal_cents` = sum of discounted subtotals
   - `pre_sell_status` = `'queued'` if any pre-sell lines, else null
4. Existing Stripe checkout + Resend email flows proceed

### Order confirmation email

Existing email, with a new block appended when `pre_sell_line_count > 0`:

> **A note on your pre-order**
>
> [Product A] and [Product B] are currently on pre-order at our 25% discount. We're queueing these up for our next vendor shipment. You'll get another email when the PO is placed (usually within 1–2 weeks), and tracking info as soon as they ship to you — typically 2–3 weeks from now.

### "PO placed" email (new)

Admin-triggered from `/admin/pre-sell`. Template:

> **Your [product] is on the way to us.**
>
> We've just placed the purchase order with our vendor. Your [product] will ship to our warehouse over the next [N] days, and then ship direct to you the same day it arrives. You'll get tracking as soon as it leaves.

Marks all matching order lines `pre_sell_status = 'po_placed'`.

### Ship confirmation

Existing email, no changes.

## 8. Admin surface

### New page: `/admin/pre-sell`

Grouped by SKU:

| Product | Pre-orders | Queued $ | Oldest order age | Action |
|---|---|---|---|---|
| Retatrutide 10mg (RT10) | 8 orders / 8 units | $408 | 12 days | [Mark PO placed] [Cancel all] |
| CJC/Ipamorelin 10mg (CI10) | 3 orders / 3 units | $110 | 4 days | [Mark PO placed] [Cancel all] |
| … | | | | |

**"Mark PO placed"** action:
1. Confirmation dialog: "Confirm PO placed for X orders of [product]?"
2. Flips all open pre-sell order lines for that SKU to `pre_sell_status = 'po_placed'`
3. Triggers the "PO placed" email to each customer with an open pre-order
4. Logs the action for audit

**"Cancel all"** action (vendor-cancellation case):
1. Confirmation dialog with warning
2. Full refund via Stripe on each affected order line (not the whole order — just the pre-sell lines)
3. Sends apology email with credit offer
4. Sets product `pre_sell_disabled=true` so no new pre-orders for that SKU
5. Logs the action

### Inventory page dashboard tile (existing admin/inventory)

Small tile showing aggregate:

> **Pre-orders queued**
> 14 orders · 18 units across 6 SKUs · $920 queued · oldest 12 days

Links to `/admin/pre-sell`.

## 9. Phased rollout

### Phase 1 — customer-visible (ship first)

- Schema migrations
- Storefront pricing display (card + product + checkout)
- Server-side discount in checkout handler
- Order-confirmation email copy update
- `PRESELL_ENABLED` feature flag, default off in prod
- Ship to prod with flag off; manual test on preview with flag on

### Phase 2 — admin ops surface

- `/admin/pre-sell` page with queue view + action buttons
- "PO placed" email template
- Inventory dashboard tile
- `/admin/inventory` gets `pre_sell_disabled` toggle per product

### Phase 3 — cancel/refund flow

- "Cancel all" action with Stripe refund automation
- Apology + credit email
- Auto-sets `pre_sell_disabled=true` on cancelled SKUs

Phase 1 goes live fastest so real customer behavior starts generating signal. Phases 2 and 3 follow within days.

## 10. Edge cases

**Mixed cart (in-stock + pre-sell):** existing checkout already handles with "Ships in 2 parts" copy. Pre-sell lines discounted, in-stock lines full retail.

**Same customer orders same pre-sell SKU twice:** treated as two separate order lines. Both ship when the PO arrives.

**Stock becomes available before PO is placed:** If a pre-sell product goes from `stock=0` to `stock>0` while orders are queued, the existing orders stay locked at their pre-sell price (already paid). New orders hit the now-in-stock path at full retail. Admin is expected to "Mark PO placed" on the queued orders once they ship from general stock.

**Product gets disabled (`active=false`) while pre-orders are queued:** Existing pre-orders remain in the queue and ship normally. The storefront just stops accepting new pre-orders for that SKU. No auto-refund — those orders still get fulfilled.

**Customer abandons cart:** no record of intent captured. If we want a waitlist-without-payment later, that's a different feature.

**Discount stacking math:** pre-sell 25% applied first at line level; then WELCOME10 10% applied at order level. So on a $68 pre-sell item: $68 × 0.75 = $51 line price, then order-level WELCOME10 takes 10% off the whole order. Keeps the two discounts composable and visible in order totals.

## 11. Out of scope for v1

- Waitlist without payment (interest capture at $0)
- Per-product discount % (flat 25% only)
- Automatic PO trigger at threshold (admin decides manually)
- Customer-facing funding progress bar ("6 of 10 funded")
- Tiered urgency discounts (first-N get more off)
- Subscription/recurring pre-orders

## 12. Testing

- **Unit-style smoke tests** (`scripts/presell-smoke.mjs`): given a mock cart with pre-sell + in-stock lines, verify server computes correct line-level and order-level totals
- **Adversarial:** client sends a hand-crafted cart with fake low prices — server must override based on DB lookup
- **Manual QA** before flag flip:
  - OOS $55+ product → shows pre-sell price
  - OOS $40 product → stays at full retail (below floor)
  - Hidden product → does not appear on storefront
  - `pre_sell_disabled=true` on an OOS product → stays at full retail
  - Mixed cart → correct split totals + correct email copy
  - Admin "Mark PO placed" → emails fire, order rows update

## 13. Known follow-ups (not blocking)

- Cost-data audit — memory notes `cost` column has seed-bugged values across many products. Worth fixing independently so margin dashboards are accurate.
- Vendor cancellation playbook — document the ops flow (email template, Stripe refund policy limits, substitute-product offer)
