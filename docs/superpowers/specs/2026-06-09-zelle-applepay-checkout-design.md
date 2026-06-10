# Zelle / Apple Pay checkout + admin payment confirmation

**Date:** 2026-06-09
**Status:** Approved design, ready for implementation plan

## Problem

Storefront checkout orders never reliably reach `/admin/orders`. Tracing the flow surfaced
a broken handoff between three pieces:

1. **`/api/stripe` webhook is a non-functional stub.** The `checkout.session.completed`
   case only `console.log`s with a `// TODO`. It never writes to Supabase, never verifies
   the signature. There is no server-side source of truth that a payment happened.
2. **`submitOrder` in `public/app.html` writes the order optimistically, before payment,
   and only for logged-in users.** Guests create no order row at all. The row is written
   with `status: "confirmed"` at "clicked checkout," not "paid." Errors are swallowed by
   `catch(e){}`.
3. **Column-shape mismatch.** The storefront insert writes `id` / `customer` / `shipping`,
   but `/admin/orders/page.jsx` reads `order_id` / `first_name` / `last_name` / `address` /
   `city` / `state` / `zip` / `items` / `total`. Even a successful write shows blank.

The actual payment method is **Zelle or Apple Pay (person-to-person / Apple Cash) to one
phone number** — payment happens out-of-band, after the order is placed. So Stripe card
processing for the peptide storefront is not wanted at all.

## Key finding: the admin side is already built for this

`/admin/orders` already has:
- A `pending_payment` status (amber badge) in its `STATUS` map.
- An "Update Status → **Confirmed**" button — this *is* the payment-confirmation action.
- `lib/revenue.js`, which counts only `paid | confirmed | processing | shipped | delivered`
  as collected revenue. `pending_payment` deliberately does not count until confirmed.

So no new admin surface is needed. The bug lives entirely in the storefront write.

**Out of scope / unaffected:** the Pro/Elite subscription buttons (`app.html` ~line 673-674)
use direct `buy.stripe.com` payment links, not `/api/checkout`. They are untouched by this work.

## Design

### 1. Storefront order write — rewrite `submitOrder` (`public/app.html`)

- Build the order in the **admin's real schema**:
  `order_id`, `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `state`,
  `zip`, `items` (array of `{ name, size, qty, price }`), `total`, `discount_amount`,
  `discount_code`, `status: 'pending_payment'`, `created_at`. Attach `user_id` when the
  buyer is logged in.
- **Remove the `if (user)` gate** so guest orders are recorded.
- Split the existing single "Full Name" checkout field into `first_name` / `last_name`
  (split on first space; everything after the first token is the last name). Add an
  **optional Phone** field to the checkout form.
- Generate `order_id` as `ORD-<base36 timestamp, uppercase>` (existing convention). This
  doubles as the payment memo/reference.
- Insert via Supabase PostgREST, then render the payment screen (below). **No Stripe redirect.**
- Keep the existing in-app "Orders" tab behavior so the buyer sees their order as pending.
- Do not swallow insert errors silently — surface a failure to the buyer so an order is
  never lost without anyone knowing.

### 2. Payment instructions screen (replaces the Stripe redirect)

After a successful insert, show a confirmation screen with:
- Order number (`ORD-XXXX`).
- Amount due.
- **"Send $X via Zelle or Apple Pay to 626-806-4475 (Jorrel Patterson). Put your order
  number ORD-XXXX in the note."**

The pay-to number and name come from a new public env var **`NEXT_PUBLIC_PAYMENT_HANDLE`**
(value: `626-806-4475`) plus a display name, so they are not hard-coded in the bundle.

### 3. Customer email — new `/api/notify-customer`

A Resend email modeled on the existing `/api/notify`, sent from `orders@advncelabs.com`
to the **customer**, containing the same pay-to instructions plus an order summary. This
hedges against the buyer closing the tab before paying — Zelle/Apple Pay payments commonly
happen minutes or hours later from a phone.

The existing admin `/api/notify` email still fires, so Jorrel is alerted to each new
pending order.

### 4. Admin payment confirmation — no new code

Jorrel opens `/admin/orders`, sees the order as **Pending Payment**, and clicks
**Confirmed** when the Zelle/Apple Pay transfer arrives. `lib/revenue.js` then counts it
as revenue. Already works today.

### 5. Cleanup & schema safety

- Delete the dead `/api/stripe` stub webhook and the now-unused `/api/checkout` route.
  (Subscription payment links are unaffected — they do not use these routes.)
- The `orders` table is currently empty and has no migration file in `sql/`. The
  implementation must **verify the expected columns exist** (e.g. a test insert with the
  full shape) and, if any are missing, ship a migration SQL file in `sql/` to be applied
  by hand (Supabase migrations are manual in this project).

## Decisions / YAGNI

- **No `paid_amount` on orders yet.** Zelle/Apple Pay can arrive partial or wrong, but
  clicking "Confirmed" is sufficient for now. Add `paid_amount` (mirroring invoices) only
  if partial payments become a real problem.
- **No Stripe for the storefront.** Card processing is fully removed from the peptide
  checkout path.

## Implementation note (discovered during build, 2026-06-09)

The `orders` table has RLS that **rejects inserts from the anon key** (verified: error `42501`).
The old client-side insert only worked for logged-in (authenticated-role) users, which is
why guests vanished. Fix: the order is inserted by a new **server route `/api/place-order`**
using the **service-role key** (the existing `presell-po-placed`/`purchase-write` pattern).
`submitOrder` POSTs to it rather than calling Supabase directly. The `orders` schema was
confirmed complete via a service-key probe — no migration needed; `paid_amount` already
exists for later use.

## Affected files

- `public/app.html` — `submitOrder` rewrite (POST to `/api/place-order`), checkout form
  (name split + phone field), payment instructions screen.
- `app/api/place-order/route.js` — new service-key insert route (guest-capable).
- `app/api/notify-customer/route.js` — new customer payment-instructions email.
- `app/api/stripe/route.js` — delete.
- `app/api/checkout/route.js` — delete.
- `.env.local` / Vercel env — add `NEXT_PUBLIC_PAYMENT_HANDLE` (and display name).
- `sql/2026-06-09-orders-*.sql` — only if the verify step finds missing columns.

## Success criteria

- A **guest** checkout creates an `orders` row with `status: 'pending_payment'` that appears
  in `/admin/orders` with a correct name, email, items, and total.
- The buyer sees on-screen and emailed instructions to pay 626-806-4475 via Zelle/Apple Pay
  with their order number as the note.
- Clicking **Confirmed** in admin moves the order out of pending and into counted revenue.
- No Stripe redirect occurs from the peptide storefront; subscription links still work.
