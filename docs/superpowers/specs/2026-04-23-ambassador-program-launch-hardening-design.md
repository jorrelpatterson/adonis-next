# Ambassador Program Launch Hardening — Design

**Date:** 2026-04-23
**Status:** Design approved, ready for implementation planning
**Scope:** Close all launch-blocking gaps in the ambassador program so public ambassador signups + ambassador-code orders can be accepted today, then add hygiene and audit fixes that were deferred during the original build.

## Context

The ambassador program is split across two Next.js projects:

- **adonis-next** — admin dashboard (`app/admin/`) and admin-side API routes (`app/api/ambassador-*`, `app/api/discount-code-write`)
- **advnce-site** — public storefront + order creation path (`api/send-order-email.js`, `api/ambassador-notify.js`), public ambassador signup form (`advnce-ambassador.html`)

Both projects share the same Supabase backend. The public signup and the customer order path are implemented in advnce-site; the admin tooling (managing ambassadors, sending payout emails, managing discount codes) is in adonis-next.

**Production state verified against Supabase on 2026-04-23:**

- Tables present with expected columns: `ambassadors`, `referral_commissions`, `customer_attribution`, `discount_codes`, `orders`, `social_posts`, `products`.
- `ambassadors` columns: `id, name, email, code, phone, referred_by, tier, status, total_orders, total_earned, created_at`. Note: uses `status` (text) not `active` (bool).
- RPC `increment_ambassador_stats` exists and returns 204 (successful no-op) when called with a nonexistent ambassador id.
- One seed ambassador provisioned: `EZEKIELPHOTOGRAPHY`, starter tier, status=active, 0 orders.
- Zero rows in `referral_commissions`, `customer_attribution`, `discount_codes`.
- Two `orders` rows exist, neither with ambassador attribution.

**Launch definition:** public ambassador signups are live, seed ambassadors are sharing links today, customers can place orders using ambassador codes.

## Problem

Nine defects of varying severity block a safe launch:

1. Six admin-intended API routes in adonis-next are publicly callable and use `SUPABASE_SERVICE_KEY` — anyone with the URL can delete all ambassadors, spam welcome emails, create bogus discount codes, or send fake payout emails. Routes: `ambassador-welcome`, `ambassador-message`, `ambassador-payout`, `ambassador-write`, `ambassador-content-digest`, `discount-code-write`.
2. [app/api/ambassador-content-digest/route.js:66](../app/api/ambassador-content-digest/route.js#L66) queries `&active=is.true` but the `ambassadors` table has `status` (text) instead of `active` (bool). Route returns zero ambassadors on every call; no digest ever gets sent.
3. [app/api/ambassador-write/route.js](../app/api/ambassador-write/route.js) `ALLOWED_FIELDS` omits `status` — admin cannot pause or resume an ambassador without deleting the record (which also destroys their commission history via FK cascade).
4. [app/api/ambassador-message/route.js](../app/api/ambassador-message/route.js) inserts the `message` body into HTML with only newline-to-`<br>` substitution — admin-injected HTML tags (e.g., `<script>`) execute in the recipient's email client. Self-XSS is low-severity but easy to fix.
5. `ambassador-welcome` hardcodes the admin notification address as `jorrelpatterson@gmail.com` at [app/api/ambassador-welcome/route.js:53](../app/api/ambassador-welcome/route.js#L53). Same in advnce-site's `send-order-email.js` and `ambassador-notify.js`. Makes future admin-email rotation a code change.
6. No audit log of ambassador payouts — admin can accidentally re-send the same payout email twice.
7. Schema for `ambassadors`, `referral_commissions`, and the `increment_ambassador_stats` RPC is not captured in any migration file. The tables exist in the production Supabase project but cannot be rebuilt from this repo if Supabase is ever reset or cloned for staging.
8. End-to-end flow (ambassador code entered at checkout → order created with correct discount fields → `customer_attribution` row written → `referral_commissions` L1 row written with 15% first-sale bonus → ambassador `total_orders`/`total_earned` incremented via RPC) has never been verified with a real order. A silent break anywhere in the chain would go unnoticed until someone asks why their commission didn't land.
9. Dead code at [app/admin/ambassadors/page.jsx:37](../app/admin/ambassadors/page.jsx#L37) — wasteful IIFE `(amb=>amb)({code:''}).code||''` that evaluates to empty string. Trivial cleanup.

## Non-goals

- **Replacing the SERVICE_KEY + admin-cookie pattern with a proper Supabase auth JWT flow.** Considered and dropped: the cookie gate closes the attack surface, and a JWT swap is a rewrite of admin authentication that would destabilize the admin UI right at launch. Revisit later.
- **Rate limiting.** Considered and dropped: once the cookie gate is in place, only authenticated admins can hit the email routes, so the abuse vector is self-abuse. Not worth the complexity of an in-memory-per-lambda rate limiter today.
- **Changes to the storefront checkout UI, product catalog, or Stripe/Zelle flows.** Out of scope.
- **Changing advnce-site's ambassador signup form, commission rates, or tier thresholds.** Out of scope.
- **Fixing `app/api/stripe/route.js` (Stripe webhook).** That route is for adonis.pro subscriptions, not the Zelle-based ambassador order path. Orthogonal concern.
- **Moving admin writes to a proper RLS policy model.** The admin UI currently reads via anon key + RLS and writes via server-side service-key proxies. Keeping that pattern for now.

## Design

### 1. Admin auth helper: `lib/requireAdmin.js`

New file in adonis-next. Single exported function:

```js
import { NextResponse } from 'next/server';

export function requireAdmin(request) {
  const cookie = request.cookies.get('adonis_admin');
  if (!cookie || cookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
```

Matches the logic in `middleware.js` so the source of truth is the same cookie.

Applied at the top of six routes:
- `app/api/ambassador-welcome/route.js`
- `app/api/ambassador-message/route.js`
- `app/api/ambassador-payout/route.js`
- `app/api/ambassador-write/route.js`
- `app/api/ambassador-content-digest/route.js`
- `app/api/discount-code-write/route.js`

Each route adds, as the first line of its `POST` handler:

```js
const unauth = requireAdmin(request); if (unauth) return unauth;
```

The admin UI already sends credentials by default (same-origin cookies), so no client change is needed.

### 2. Content-digest field fix

[app/api/ambassador-content-digest/route.js:66](../app/api/ambassador-content-digest/route.js#L66): change `&active=is.true` → `&status=eq.active`. One line.

### 3. ambassador-write: add `status` field + admin UI Pause/Resume

Extend `ALLOWED_FIELDS` to include `status`. Validate against `['active','paused','banned']`. Reject unknown values with 400.

In the admin ambassadors page, add a small action button per ambassador row: "Pause" if `status='active'`, "Resume" if `status='paused'`, hidden if `status='banned'` (banned is a stronger action, set only via the full edit form to avoid one-click reinstatement of a banned ambassador). Clicking PATCHes via `/api/ambassador-write`. Status displayed as a pill badge (green for active, amber for paused, red for banned).

Rationale: hard-deleting ambassadors breaks commission history via FK. Pausing lets you stop an abusive ambassador from earning future commissions without losing the paper trail.

### 4. Validation and escaping hardening

**ambassador-message** ([app/api/ambassador-message/route.js](../app/api/ambassador-message/route.js)):

Add an `esc()` helper and escape the message body before the newline-to-`<br>` transform:

```js
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const safeMessage = esc(message).replace(/\n/g, '<br>');
```

Same treatment for `subject` and the ambassador's `name` before they land in HTML.

**ambassador-write** ([app/api/ambassador-write/route.js](../app/api/ambassador-write/route.js)):

- Email: validate with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, reject 400 otherwise.
- Phone: normalize via same rule as advnce-site's `send-order-email.js:normalizePhone` — strip non-digits, drop leading `1` if length 11, reject if final length is not 10. Store as 10-digit string or null.
- Name: trim and reject if empty or if length > 120 chars. No character-class restriction (permissive to international names).
- Code: keep existing `[A-Z0-9]{2,20}` validation and uppercase normalization.

**discount-code-write** ([app/api/discount-code-write/route.js](../app/api/discount-code-write/route.js)):

Replace hard DELETE with soft delete: the `delete` action PATCHes `active=false` instead of DELETEing the row. Preserves history for any orders that used the code. Admin UI toggle already exists for re-activation.

### 5. `ADMIN_EMAIL` env var

Add `ADMIN_EMAIL` to all three places that currently hardcode the admin notification address:

- `adonis-next/app/api/ambassador-welcome/route.js`
- `advnce-site/api/send-order-email.js`
- `advnce-site/api/ambassador-notify.js`

Usage: `const adminEmail = process.env.ADMIN_EMAIL || 'jorrelpatterson@gmail.com';`

Default stays `jorrelpatterson@gmail.com` so behavior doesn't change on deploy. Both Vercel projects get a note added to their README (or a new `DEPLOYMENT.md`) reminding the operator to set `ADMIN_EMAIL=info@advncelabs.com` once the advncelabs.com → Gmail forwarding is live (post-launch chore, not blocking).

### 6. Payout audit log

New table `ambassador_payouts` added in the migration file (§8):

```sql
CREATE TABLE IF NOT EXISTS ambassador_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  period        text NOT NULL,           -- e.g. '2026-04'
  l1_amount     numeric NOT NULL DEFAULT 0,
  l2_amount     numeric NOT NULL DEFAULT 0,
  l3_amount     numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  sent_by       text,                    -- admin identifier; empty until we add admin accounts
  UNIQUE (ambassador_id, period)
);
```

The `UNIQUE (ambassador_id, period)` constraint prevents the same payout period from being recorded twice for the same ambassador. Duplicate inserts return a 409 from PostgREST; the payout API route catches this and returns a friendly "already sent this period" message to the admin UI.

**`ambassador-payout` route change:** the request payload gains an `ambassador.id` field (the admin UI already has it in local state, so passing it is a one-line change). The route validates it as a UUID. After the Resend email send succeeds, it inserts a row into `ambassador_payouts` using the passed `id` as the FK. If the insert fails because of the unique constraint, the email still sent (can't un-send), but the route returns `{ warning: 'Payout already recorded for this period' }` and the admin UI shows it.

**Admin UI change in the payout-send form:** before submit, check the latest `ambassador_payouts` row for this ambassador. If a row exists with the same `period`, show a confirm dialog ("You already sent a payout for 2026-04 on 2026-05-01 totaling $X. Send again?") so the duplicate is caught client-side before the email fires. The server-side unique constraint is the backstop.

**Admin UI change:** per-ambassador row shows `Last payout: $X on YYYY-MM-DD` if any payout exists, otherwise `Never paid`. Pulled from a second query to `ambassador_payouts` grouped by `ambassador_id` with `max(sent_at)`.

### 7. Migration file for schema reproducibility

New file: `supabase/migrations/2026-04-23_ambassadors_commissions_rpc.sql`

Contents captured from production (use `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` so running against current prod is a no-op):

```sql
-- Ambassadors
CREATE TABLE IF NOT EXISTS ambassadors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  code          text UNIQUE NOT NULL,
  phone         text,
  referred_by   uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  tier          text NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter','builder','elite')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','banned')),
  total_orders  integer NOT NULL DEFAULT 0,
  total_earned  numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Referral commissions (L1/L2/L3 chain per order)
CREATE TABLE IF NOT EXISTS referral_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          text NOT NULL,
  order_total       numeric NOT NULL,
  l1_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l2_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l3_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l1_amount         numeric NOT NULL DEFAULT 0,
  l2_amount         numeric NOT NULL DEFAULT 0,
  l3_amount         numeric NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

-- Payout audit log (new in this spec)
CREATE TABLE IF NOT EXISTS ambassador_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  period        text NOT NULL,
  l1_amount     numeric NOT NULL DEFAULT 0,
  l2_amount     numeric NOT NULL DEFAULT 0,
  l3_amount     numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  sent_by       text,
  UNIQUE (ambassador_id, period)
);

-- RPC: atomically increment an ambassador's running totals when a commission is logged
CREATE OR REPLACE FUNCTION increment_ambassador_stats(
  amb_id uuid, order_increment integer, earned_increment numeric
) RETURNS void LANGUAGE sql AS $$
  UPDATE ambassadors
     SET total_orders = COALESCE(total_orders, 0) + order_increment,
         total_earned = COALESCE(total_earned, 0) + earned_increment
   WHERE id = amb_id;
$$;
```

Before committing the file, the exact column types and nullability will be re-verified against production using a `pg_catalog` query to avoid drift between assumptions and reality.

RLS policies are intentionally not captured in this migration — whatever is in prod stays in prod. We can audit those in a follow-up.

### 8. Admin UI cleanups

- Remove dead IIFE at [app/admin/ambassadors/page.jsx:37](../app/admin/ambassadors/page.jsx#L37). Replace with the plain lookup it was trying to be.
- Add status badge column to ambassadors list.
- Add "Last payout" column pulling from `ambassador_payouts` (§6).
- Add Pause / Resume button (§3).

No other UI changes. Styling matches existing admin page conventions (dark theme, monospace headers, serif body).

### 9. End-to-end smoke test

New file: `scripts/smoke-ambassador-flow.js`

Runs against production Supabase (requires `SUPABASE_SERVICE_KEY` in env). Uses a phone number reserved for testing so it can be cleaned up deterministically.

**Test 1: First-time ambassador conversion**
1. Ensure seed ambassador `EZEKIELPHOTOGRAPHY` exists and `total_orders=0`.
2. POST to `advnce-site` `/api/send-order-email` with: test customer, reserved test phone `5555550100`, the seed ambassador's code, one low-dollar item from the products catalog.
3. Assert within 5 seconds:
   - `orders` row with new order_id has `discount_type='ambassador_first'`, `is_first_attributed=true`, `attribution_phone='5555550100'`, `discount_amount > 0`.
   - `customer_attribution` has one row with `phone='5555550100'`, `ambassador_code='EZEKIELPHOTOGRAPHY'`.
   - `referral_commissions` has one row with `order_id=<new>`, `l1_amount > 0` (should be 15% of total for a first sale), `l2_amount=0`, `l3_amount=0` (seed ambassador has no `referred_by`).
   - `ambassadors.EZEKIELPHOTOGRAPHY.total_orders = 1`, `total_earned > 0`.
4. Cleanup: DELETE the order, attribution, commission. Reset ambassador totals to 0.

**Test 2: Repeat customer**
1. Re-insert the attribution row from Test 1 (pretending the first order was already attributed).
2. POST a second order from the same phone with a different ambassador code.
3. Assert:
   - `orders` row has `discount_type='ambassador_repeat'`, `is_first_attributed=false`, `discount_amount=0` (no discount on repeats).
   - No new `customer_attribution` row.
   - `referral_commissions` has a row with `l1_amount` = 10% of total (starter tier rate, not 15% first-sale bonus).
4. Cleanup.

**Test 3: Promo code (no ambassador)**
1. Create discount code `SMOKETEST10` (10% off) via `/api/discount-code-write`.
2. POST an order with a fresh phone and `code=SMOKETEST10`.
3. Assert:
   - `orders.discount_type='promo'`, `discount_amount` = 10% of total.
   - `discount_codes.SMOKETEST10.used_count` went from 0 → 1.
   - No `customer_attribution` row.
   - No `referral_commissions` row.
4. Cleanup: delete the test code (soft delete), delete the order.

Script exits 0 on all pass, 1 on any fail, prints which assertion failed and the actual vs expected values.

Runs locally pre-launch and is checked into the repo so it can be re-run at any time for regression coverage.

### Order of implementation

1. Migration file (§7) — standalone, re-verified against prod, safe to commit first.
2. `requireAdmin` helper (§1) and apply to the six routes.
3. Content-digest fix (§2).
4. ambassador-write `status` field + validation (§3, §4 email/phone/name parts).
5. ambassador-message HTML escaping (§4).
6. discount-code-write soft delete (§4).
7. `ADMIN_EMAIL` env var threading (§5).
8. `ambassador_payouts` insert in payout route (§6).
9. Admin UI updates: status badge, Pause/Resume button, Last payout column, dead-code removal (§3, §6, §8).
10. Smoke test script (§9).
11. Run smoke test against production, fix any breaks, ship.

## Pre-launch checklist (manual, outside this spec)

- [ ] `ADMIN_EMAIL` env var set on both Vercel projects (or defaults acceptable).
- [ ] Smoke test passes end-to-end against production.
- [ ] One test order placed via the real checkout UI (`advnce-checkout.html`) to confirm the form wiring still works — not just the API path.
- [ ] Ambassador dashboard (`advnce-dashboard.html?code=EZEKIELPHOTOGRAPHY`) loads and shows correct totals after smoke test cleanup.
- [ ] info@advncelabs.com forwarding: deferred. Can be done post-launch by flipping one env var once a forwarding rule (Cloudflare Email Routing or registrar-provided) is set up.

## Testing

- **Smoke test script (§9)** is the primary integration test.
- **Unit-level testing** is not set up in this repo (no jest/vitest configured). Adding a test framework is out of scope for today. Individual route changes are small enough to review by eye.
- **Manual admin UI verification:** after implementation, log into `/admin/ambassadors`, verify list renders, Pause/Resume works, payout history column appears, status badges render.

## Risks

- **Production data drift during migration capture (§7):** if the actual columns or constraints differ from what was observed, the migration file will be wrong even though it runs as a no-op against current prod. Mitigation: re-verify using `information_schema` queries before committing.
- **Same-origin cookie assumption (§1):** if the admin UI ever gets served from a different domain than the API routes, the cookie gate breaks. Mitigation: both are same-origin on the adonis.pro deployment today. Revisit if that changes.
- **Smoke test side effects (§9):** test orders create real Supabase rows until cleanup runs. If the script crashes mid-test, manual cleanup is needed. Mitigation: reserved test phone `5555550100` makes orphan rows easy to identify.
- **`ambassador_payouts` unique constraint is after-the-fact:** the first time an admin sends a payout for a period that was paid previously via the old route (before this spec), there's no prior row, so no duplicate detection. Mitigation: acceptable — no payouts have been sent yet (seed ambassador has 0 orders). This is a forward-looking safety net.
