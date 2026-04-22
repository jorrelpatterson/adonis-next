# Discount codes + ambassador lifetime attribution — design

**Date:** 2026-04-21
**Repo:** adonis-next + advnce-site
**Status:** approved, ready for implementation plan

## Goals

1. Customers can enter a code at checkout for a discount.
2. Two code types: **ambassador codes** (track commission, give first-time-buyer discount) and **standalone promo codes** (just discount, no commission).
3. Ambassador codes use **lifetime attribution** by phone number — first-time customers get a discount AND ambassador earns a bonus; repeat orders from the same customer pay the ambassador their volume-tier commission with no discount, no code re-entry needed.
4. Codes are **mutually exclusive** — one code per order, max.

## Behavior

### Ambassador code lifecycle (per customer)

| Stage | Detection | Customer pays | Ambassador (L1) earns | L2/L3 earn |
|---|---|---|---|---|
| **First sale** with code, customer's phone NOT in attribution table | Code present + new phone | **15% off** | **15% commission** (flat conversion bonus) | 5% / 2.5% per existing plan |
| **Repeat sale**, customer's phone IS in attribution table | Phone matches | Full price (code is ignored even if entered) | **Their volume tier %** (10/15/20%) | 5% / 2.5% per existing plan |
| **Repeat sale**, customer enters a DIFFERENT ambassador's code | Phone matches but different code | Full price; original ambassador credited | Original ambassador's tier % | Original chain |

**Attribution rule:** First ambassador to convert a customer keeps that customer for life. No poaching.

### Standalone promo code lifecycle

- Customer enters code (e.g. `LAUNCH25`) → server looks up `discount_codes` table → applies discount if active + not expired + within usage limit
- No ambassador commission paid
- Doesn't create or affect customer attribution
- Doesn't conflict with ambassador attribution — if a previously-attributed customer uses a promo code, they get the promo discount AND the original ambassador still earns their tier commission

### Code entry rules

- One field at checkout: **"Discount or referral code (optional)"**
- Server detects type by lookup: ambassadors first, then standalone promos
- If both an ambassador code and a promo code somehow match the same string, ambassador wins (more strategic value)
- Invalid/expired codes: gentle inline error, order proceeds without discount

### Phone normalization (attribution key)

- Strip everything non-digit
- If 11 digits and starts with `1`, drop the leading `1` (US)
- Resulting string is the attribution key (typically 10 digits)
- Examples: `(818) 555-1234`, `818.555.1234`, `+1-818-555-1234`, `1-818-555-1234`, `8185551234` all → `8185551234`
- **Phone becomes required at checkout** (currently optional)

## Data model

### New table: `discount_codes`
```sql
CREATE TABLE discount_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,           -- e.g. 'LAUNCH25'
  type         text NOT NULL CHECK (type IN ('percent','fixed')),
  amount       numeric NOT NULL,               -- 25 = 25% if type=percent, or $25 if type=fixed
  active       boolean NOT NULL DEFAULT true,
  expires_at   timestamptz,                    -- nullable (no expiry)
  usage_limit  integer,                        -- nullable (unlimited)
  used_count   integer NOT NULL DEFAULT 0,
  min_order    numeric,                        -- nullable (no minimum)
  max_discount numeric,                        -- nullable (no cap on $ off)
  notes        text,                           -- admin-only memo
  created_at   timestamptz DEFAULT now()
);
```

### New table: `customer_attribution`
```sql
CREATE TABLE customer_attribution (
  phone           text PRIMARY KEY,            -- normalized digits, e.g. '8185551234'
  ambassador_id   uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  ambassador_code text NOT NULL,               -- snapshot of the code used (in case ambassador's code changes later)
  first_order_id  text NOT NULL,               -- the AVL-2026-XXXXXX of the converting order
  attributed_at   timestamptz DEFAULT now()
);
```

### Modify `orders` table
Add columns:
- `attribution_phone   text` — normalized phone used for attribution lookup
- `discount_code       text` — the code customer entered (or null)
- `discount_type       text` — 'ambassador_first', 'ambassador_repeat', 'promo', or null
- `discount_amount     numeric` — actual $ discounted from the order
- `is_first_attributed boolean DEFAULT false` — true if this order created the attribution record

(`ref_code` stays as-is for backward compat; can be deprecated once new flow is stable.)

### Modify `commissions` (or commission log) table
Existing logging captures L1/L2/L3 amounts. Adjust `logCommissions` so that on a "first attributed" order, L1 gets a flat 15% commission; otherwise L1 gets their tier %.

## API changes

### `/api/send-order-email` (advnce-site)

New steps before order INSERT:

1. **Phone normalization** — strip non-digits, drop leading 1 if 11-digit. Reject if < 10 digits with clear error.
2. **Attribution lookup** — `SELECT * FROM customer_attribution WHERE phone = ?`
   - If found: capture `attributed_ambassador_id` for commission logging; ignore any code customer entered (no discount applies)
   - If not found AND code present: validate code (ambassador or promo); if ambassador, apply 15% off and queue attribution insert
3. **Code validation** (only if no prior attribution):
   - Look up `code` in `ambassadors` table → if match, treat as ambassador code (15% off + 15% L1 bonus)
   - Else look up in `discount_codes` table → if active + not expired + within limit + meets min_order → apply
   - Else: log invalid code, proceed without discount
4. **Discount application** — recalculate `serverTotal` after discount; cap at `max_discount` if set
5. **Commission logging** — call `logCommissions` with new params: `is_first_attributed` flag determines whether L1 gets 15% bonus or their tier %; L2/L3 always per existing plan
6. **Order insert** — store all new columns
7. **Attribution insert** — if first-time + ambassador code, INSERT into `customer_attribution`
8. **Discount code usage increment** — `UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?` for promo codes

### Existing email templates

- Customer email: show discount line if applied (`-$X.XX (Code: LAUNCH25)`)
- Admin email: same + flag if attribution-only (no discount, repeat customer)

## Admin UI

### New page: `/admin/discount-codes`
- List of all `discount_codes` with: code, type, amount, active, expires, used_count / limit, min_order
- Create new code modal: code (auto-uppercase), type, amount, optional expiry/limit/min
- Toggle active, archive (soft-delete)

### New section on `/admin/ambassadors/[id]`
- "Attributed customers" table: phone (last 4 digits masked for privacy), first_order_at, total orders since, total revenue from, total commission earned

### `/admin/orders` update
- Order detail row shows: discount applied (if any), code used, ambassador attribution (if any), commission breakdown

### Checkout form (`advnce-checkout.html`)
- Add "Code (optional)" input above the cart summary
- Make phone field required (currently optional)
- Show inline discount line in cart summary if code applies (live revalidation on blur)

## Edge cases handled

- **Phone collision** (two real people share a number, e.g. household): they'll share attribution. Acceptable for v1; rare and not high-stakes.
- **Customer types different phone formats**: normalization solves
- **Customer doesn't enter phone**: blocked at form validation (required field)
- **Code stealing**: original attribution wins — second ambassador's code is ignored on repeat orders
- **Expired/invalid code**: server logs, order proceeds without discount, customer sees gentle warning in confirmation email
- **Refunds**: reversal of commission isn't auto-handled in v1 — admin manually adjusts via Supabase if needed (rare)
- **Promo code abuse**: `usage_limit` field caps total uses; can also enforce one-use-per-phone in future

## Out of scope (deferred)

- Per-customer one-use limits on promo codes (just `usage_limit` total cap for now)
- Stacking ambassador + promo (mutually exclusive per Option B)
- Free-shipping codes (no shipping cost charged today)
- BOGO / buy-X-get-Y mechanics
- Customer-facing "your ambassador" or attribution display
- Auto-attribution detection without code (e.g., URL parameter pre-filling)

## Verification plan

1. **First sale flow**: New customer (phone not in DB) enters Ambassador A's code → confirm 15% off applied + 15% commission logged to A + attribution row created
2. **Repeat sale, no code**: Same customer's phone, no code at checkout → confirm full price + tier % commission logged to A + L2/L3 chain credited
3. **Repeat sale, different ambassador's code**: Same phone enters Ambassador B's code → confirm full price + commission still goes to A (not B) + no discount
4. **Promo code**: New customer enters `TEST10` → confirm 10% off applied + no commission + `used_count` incremented
5. **Promo code over usage limit**: Set `usage_limit=1` and test 2nd order — confirm rejection
6. **Invalid code**: Enter garbage code — confirm order proceeds at full price with no error
7. **Phone format variations**: Try 5 formats of same number, confirm all attribute to same record

## File scope

**adonis-next:**
- `app/admin/discount-codes/page.jsx` — NEW
- `app/admin/ambassadors/[id]/page.jsx` — MODIFY (add Attributed Customers section; may need new file)
- `app/admin/orders/page.jsx` — MODIFY (show discount + attribution in order detail)
- `app/api/discount-code-write/route.js` — NEW (CRUD for codes)

**advnce-site:**
- `advnce-checkout.html` — MODIFY (code input + required phone)
- `api/send-order-email.js` — MODIFY (attribution lookup, code validation, discount application, commission logic)

**supabase/migrations:**
- `2026-04-21_discount_codes_and_attribution.sql` — NEW (3 schema changes: 2 new tables + columns on orders)
