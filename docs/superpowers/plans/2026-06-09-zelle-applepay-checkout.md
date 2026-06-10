# Zelle / Apple Pay Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make storefront orders record as `pending_payment` in the admin `orders` table (guests included), show the buyer Zelle/Apple Pay instructions instead of a Stripe redirect, and let the admin confirm payment with the existing "Confirmed" button.

**Architecture:** The live storefront is the static, hand-maintained file `public/app.html` (compiled `React.createElement` style — Next does NOT process it, so config lives in JS constants, not env vars). We rewrite its `submitOrder` to POST the order to a new server route and render an on-screen payment-instructions overlay. **Why a server route:** the `orders` table has RLS that rejects inserts from the **anon** key (verified — error `42501`), so the order is inserted server-side with the **service-role key**, following the existing `presell-po-placed`/`purchase-write` pattern. This also makes guest checkout work and avoids exposing direct anon inserts. A new `/api/notify-customer` Resend route emails the payment instructions. The admin `/admin/orders` page already handles `pending_payment` → `Confirmed` and revenue counting — no admin code changes. The dead `/api/stripe` and `/api/checkout` routes are deleted.

**Tech Stack:** Static React-via-CDN PWA (`public/app.html`), Supabase PostgREST, Resend, Next.js App Router API route.

> **Repo policy note (MASTER-BRIEFING / CLAUDE.md):** Do NOT auto-commit. At each "Commit" step, stage the files and show Jorrel the diff for approval before committing. The commit commands below are the intended messages, not permission to commit unattended.

> **Spec:** `docs/superpowers/specs/2026-06-09-zelle-applepay-checkout-design.md`

---

## File Structure

- `public/app.html` — storefront. Modified in 4 places: payment-handle constants (~line 3006), `shippingInfo` state + reset (lines 3153, 7542), `payInfo` state + `submitOrder` rewrite (lines ~3150, 4198–4233), checkout form inputs/validation (line ~5941), payment overlay in main return (line ~7626).
- `app/api/place-order/route.js` — NEW. Public route that inserts the order with the service-role key (bypasses RLS; guest-capable).
- `app/api/notify-customer/route.js` — NEW. Customer payment-instructions email via Resend.
- `app/api/stripe/route.js` — DELETE (non-functional stub).
- `app/api/checkout/route.js` — DELETE (unused after this change).

**No admin, `lib/revenue.js`, or `package.json` changes.** The Pro/Elite subscription buttons use direct `buy.stripe.com` links (`STRIPE_LINKS`, `window.open`) and are unaffected.

---

## Task 1: Verify the `orders` table schema — ✅ DONE (2026-06-09)

**Result:** Probed the live `orders` table. Findings:

1. **All required columns exist** — a service-key insert with the full payload (`order_id, first_name, last_name, email, phone, address, city, state, zip, items, total, discount_amount, discount_code, status, created_at`) succeeded and echoed every field. The table also already has `paid_amount`, `discount_type`, `ref_code`, `pre_sell_status`, `tracking_*`, `is_invoice`, etc. **No migration needed.**
2. **RLS blocks the anon key** — the same insert with the **anon** key returns `{"code":"42501","message":"new row violates row-level security policy for table \"orders\""}`. This is why the old client-side insert only ever worked for logged-in (authenticated-role) users and guests vanished.

**Consequence (plan change):** the order must be inserted **server-side with the service-role key** via a new `/api/place-order` route (Task 3a), following the existing `presell-po-placed`/`purchase-write` pattern. `submitOrder` POSTs to that route instead of calling `supa.current.from('orders').insert(...)`. The probe row was inserted and deleted cleanly (DELETE → 204, re-query → `[]`).

---

## Task 2: Payment-handle constants + phone field on shipping state

**Files:**
- Modify: `public/app.html` (line ~3006, line 3153, line 7542)

- [ ] **Step 1: Add the payment-handle constants right after `SUPA_KEY`**

Find (line ~3006):

```js
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXhxcnZka3JpZXZicGxqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyNjAsImV4cCI6MjA4ODYxNzI2MH0.68LnOw8EvvTx_UUgHo1cuQ-7WuEre7L46AMyDFNAq30";
```

Replace with (append two lines):

```js
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXhxcnZka3JpZXZicGxqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyNjAsImV4cCI6MjA4ODYxNzI2MH0.68LnOw8EvvTx_UUgHo1cuQ-7WuEre7L46AMyDFNAq30";
  const PAYMENT_HANDLE = "626-806-4475";
  const PAYMENT_NAME = "Jorrel Patterson";
```

> Note: a JS constant (not an env var) is correct here because `public/app.html` is a static file Next does not process — same reason `SUPA_URL`/`SUPA_KEY` are inline constants. The number is not secret.

- [ ] **Step 2: Add `phone` to the `shippingInfo` initial state**

Find (line 3153):

```js
  const [shippingInfo, setShippingInfo] = useState(() => ls("shippingInfo", { name: "", address: "", city: "", state: "", zip: "", email: "" }));
```

Replace with:

```js
  const [shippingInfo, setShippingInfo] = useState(() => ls("shippingInfo", { name: "", address: "", city: "", state: "", zip: "", email: "", phone: "" }));
```

- [ ] **Step 3: Add `phone` to the shipping reset**

Find (line 7542):

```js
      setShippingInfo({ name: "", address: "", city: "", state: "", zip: "", email: "" });
```

Replace with:

```js
      setShippingInfo({ name: "", address: "", city: "", state: "", zip: "", email: "", phone: "" });
```

- [ ] **Step 4: Verify the file still parses**

Run: `node --check public/app.html 2>&1 | head` — Expected: an HTML-parse error is normal (it's an HTML file). Instead verify by loading the app in Step of Task 8. For now, sanity-grep:

Run: `grep -c "PAYMENT_HANDLE" public/app.html` — Expected: `1` or more (constant defined; used later in Task 5).

- [ ] **Step 5: Commit**

```bash
git add public/app.html
git commit -m "feat(checkout): add payment-handle constants and phone shipping field"
```

---

## Task 3a: Server route to place the order (`/api/place-order`)

Inserts the order with the **service-role key** (RLS rejects the anon key — verified in Task 1). Public/unauthenticated (guests use it). Mirrors the service-key + PostgREST pattern in `app/api/presell-po-placed/route.js`.

**Files:**
- Create: `app/api/place-order/route.js`

- [ ] **Step 1: Create the route**

```js
import { NextResponse } from 'next/server';

// POST /api/place-order — public storefront checkout.
// Inserts a pending_payment order with the service-role key (orders RLS
// rejects the anon key). Called by public/app.html submitOrder.
const ALLOWED = [
  'order_id', 'user_id', 'first_name', 'last_name', 'email', 'phone',
  'address', 'city', 'state', 'zip', 'items', 'total',
  'discount_amount', 'discount_code', 'status', 'created_at',
];

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate the essentials.
  if (!body.order_id || typeof body.order_id !== 'string') {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 });
  }
  if (typeof body.total !== 'number' || !Number.isFinite(body.total) || body.total < 0) {
    return NextResponse.json({ error: 'valid total required' }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  // Whitelist columns and force a safe status.
  const row = {};
  for (const k of ALLOWED) if (body[k] !== undefined) row[k] = body[k];
  row.status = 'pending_payment';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('place-order insert failed:', detail);
    return NextResponse.json({ error: 'Could not save order' }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: body.order_id });
}
```

> Forcing `row.status = 'pending_payment'` server-side means a malicious client can't self-mark an order paid. The column whitelist keeps unexpected fields out.

- [ ] **Step 2: Lint**

Run: `npm run lint 2>&1 | tail -20` — Expected: no errors referencing `app/api/place-order/route.js`.

- [ ] **Step 3: Commit**

```bash
git add app/api/place-order/route.js
git commit -m "feat(checkout): server route to place pending_payment orders (service key)"
```

---

## Task 3: Add `payInfo` state and rewrite `submitOrder`

**Files:**
- Modify: `public/app.html` (line 3150 area, lines 4198–4233)

- [ ] **Step 1: Add the `payInfo` state next to `showCheckout`**

Find (line 3150):

```js
  const [showCheckout, setShowCheckout] = useState(false);
```

Replace with:

```js
  const [showCheckout, setShowCheckout] = useState(false);
  const [payInfo, setPayInfo] = useState(null);
```

- [ ] **Step 2: Replace the entire `submitOrder` function (lines 4198–4233)**

Find the whole block starting at `const submitOrder = async () => {` (line 4198) through its closing `};` (line 4233) — this includes the unreachable dead code after the `return;` on line 4214. Replace the entire block with:

```js
  const submitOrder = async () => {
    try {
      const items = pepCart.map((c) => {
        const p = PEPTIDES.find((x) => x.id === c.pepId);
        return { name: p?.name || c.name || "Peptide", qty: c.qty, price: c.price, size: p?.size || "", cat: p?.cat || "", sku: p?.vendorSku || "", vendor: p?.vendor || "" };
      });
      const oid = "ORD-" + Date.now().toString(36).toUpperCase();
      const fullName = (shippingInfo.name || "").trim();
      const firstName = fullName.split(" ")[0] || "";
      const lastName = fullName.split(" ").slice(1).join(" ") || "";
      const email = shippingInfo.email || user?.email || "";
      const orderRow = {
        order_id: oid,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: shippingInfo.phone || "",
        address: shippingInfo.address || "",
        city: shippingInfo.city || "",
        state: shippingInfo.state || "",
        zip: shippingInfo.zip || "",
        items,
        total: cartFinal,
        discount_amount: discountAmt,
        discount_code: discountTier.label || null,
        status: "pending_payment",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (user) orderRow.user_id = user.id;
      try {
        const res = await fetch("/api/place-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderRow) });
        const placed = await res.json().catch(() => ({}));
        if (!res.ok || !placed?.success) { alert("We couldn't place your order: " + (placed?.error || ("HTTP " + res.status)) + ". Please try again or contact support."); return; }
      } catch (e) { alert("We couldn't place your order: " + e.message + ". Please try again or contact support."); return; }
      fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: oid, customer: fullName || email || "Guest", email, items, subtotal: cartTotal, discount: discountAmt, discountLabel: discountTier.label, total: cartFinal, shipping: shippingInfo }) }).catch(() => {});
      if (email) {
        fetch("/api/notify-customer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: oid, firstName, email, items, total: cartFinal, discount: discountAmt, discountLabel: discountTier.label, paymentHandle: PAYMENT_HANDLE, paymentName: PAYMENT_NAME }) }).catch(() => {});
      }
      const localOrder = { id: oid, items, subtotal: cartTotal, discount: discountAmt, discountLabel: discountTier.label, total: cartFinal, shipping: { ...shippingInfo }, status: "pending_payment", date: (/* @__PURE__ */ new Date()).toISOString() };
      setOrderHistory((prev) => [localOrder, ...prev]);
      setPayInfo({ orderId: oid, amount: cartFinal });
      setPepCart([]);
      SFX.celebrate();
    } catch (e) { alert("Order error: " + e.message); }
  };
```

Notes for the implementer:
- The order is inserted by the **`/api/place-order`** server route (Task 3a), not the client — the `orders` table's RLS rejects anon inserts (verified in Task 1). `orderRow` is the POST body.
- `total` is the post-discount `cartFinal`; the admin computes subtotal as `total + discount_amount`, so this is consistent.
- `discount_code` stores the human label (e.g. "Full Protocol — 10% off"); the admin shows it in parentheses on the discount line. There is no separate promo code in this flow.
- No `if (user)` gate on placing the order — guests are recorded. `user_id` is attached to the payload only when present.
- No Stripe call, no `window.location.href` redirect.

- [ ] **Step 3: Confirm the old Stripe call and direct client insert are gone**

Run: `grep -c "api/checkout" public/app.html` — Expected: `0`.
Run: `grep -c "window.location.href = data.url" public/app.html` — Expected: `0`.
Run: `grep -c 'from("orders").insert' public/app.html` — Expected: `0` (no client-side order insert remains).

- [ ] **Step 4: Commit**

```bash
git add public/app.html
git commit -m "feat(checkout): record pending_payment order (guests incl.), drop Stripe redirect"
```

---

## Task 4: Checkout form — add phone input, require email

**Files:**
- Modify: `public/app.html` (line ~5941, the checkout form `React.createElement` chain)

- [ ] **Step 1: Add a Phone input after the Email input**

Find (within line 5941):

```js
React.createElement("input", { placeholder: "Email (for tracking)", value: shippingInfo.email, onChange: (e) => setShippingInfo((p) => ({ ...p, email: e.target.value })), style: { ...s.inp, fontSize: 13, padding: "10px" } }))
```

Replace with (adds a phone input as a sibling before the inputs-container closes):

```js
React.createElement("input", { placeholder: "Email (for tracking)", value: shippingInfo.email, onChange: (e) => setShippingInfo((p) => ({ ...p, email: e.target.value })), style: { ...s.inp, fontSize: 13, padding: "10px" } }), /* @__PURE__ */ React.createElement("input", { placeholder: "Phone (optional)", value: shippingInfo.phone, onChange: (e) => setShippingInfo((p) => ({ ...p, phone: e.target.value })), style: { ...s.inp, fontSize: 13, padding: "10px" } }))
```

(The change: the `}))` that closed `[email input][inputs container]` becomes `}), [phone input]))`.)

- [ ] **Step 2: Require email on the Place Order button**

Find (within line 5941):

```js
disabled: !shippingInfo.name || !shippingInfo.address || !shippingInfo.zip, style: { ...s.btn, ...s.pri, flex: 2, justifyContent: "center", padding: "12px", fontSize: 13, borderRadius: 10, opacity: shippingInfo.name && shippingInfo.address && shippingInfo.zip ? 1 : 0.4 }
```

Replace with:

```js
disabled: !shippingInfo.name || !shippingInfo.address || !shippingInfo.zip || !shippingInfo.email, style: { ...s.btn, ...s.pri, flex: 2, justifyContent: "center", padding: "12px", fontSize: 13, borderRadius: 10, opacity: shippingInfo.name && shippingInfo.address && shippingInfo.zip && shippingInfo.email ? 1 : 0.4 }
```

> Email is now required so the customer can receive the payment-instructions email. (Phone stays optional.)

- [ ] **Step 3: Sanity check**

Run: `grep -c 'Phone (optional)' public/app.html` — Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add public/app.html
git commit -m "feat(checkout): add phone field, require email at checkout"
```

---

## Task 5: Payment-instructions overlay in the main return

**Files:**
- Modify: `public/app.html` (line ~7626, immediately before the `showPaywall` overlay)

- [ ] **Step 1: Insert the `payInfo` overlay as a sibling child**

Find (within line 7626) the seam between the floating-cart-bar block and the paywall block:

```js
  }, style: { padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", fontSize: 9, fontWeight: 700, cursor: "pointer" } }, "Clear")))), showPaywall && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }, onClick: () => setShowPaywall(false) }
```

Replace with (inserts `payInfo && React.createElement(...)` plus a comma before `showPaywall &&`):

```js
  }, style: { padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", fontSize: 9, fontWeight: 700, cursor: "pointer" } }, "Clear")))), payInfo && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" } }), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: "100%", maxWidth: 400, margin: "0 12px 20px", background: "rgba(14,16,22,0.97)", borderRadius: 22, border: "1px solid rgba(52,211,153,0.18)", padding: "28px 24px", boxShadow: "0 -8px 40px rgba(0,0,0,0.5)", animation: "springIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "✅"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: FD, fontSize: 22, fontWeight: 300, fontStyle: "italic", color: P.txS } }, "Order placed"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: FM, fontSize: 12, color: P.txD, marginTop: 4 } }, payInfo.orderId), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18, padding: "16px", borderRadius: 12, background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: P.txD, marginBottom: 6 } }, "To complete your order, send"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: FM, fontSize: 28, fontWeight: 700, color: P.gW } }, "$", payInfo.amount), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: P.txM, marginTop: 8, lineHeight: 1.6 } }, "via ", /* @__PURE__ */ React.createElement("strong", { style: { color: P.txS } }, "Zelle or Apple Pay"), " to"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: FM, fontSize: 18, fontWeight: 700, color: P.ok, marginTop: 4 } }, PAYMENT_HANDLE), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: P.txM, marginTop: 2 } }, PAYMENT_NAME), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#FBBF24", marginTop: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(251,191,36,0.06)" } }, "Put ", /* @__PURE__ */ React.createElement("strong", null, payInfo.orderId), " in the payment note so we can match it")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: P.txD, marginTop: 14, lineHeight: 1.5 } }, "We'll confirm your payment and ship within 24 hours. A copy of these instructions was emailed to you."), /* @__PURE__ */ React.createElement("button", { onClick: () => { setPayInfo(null); setShowCheckout(false); }, style: { ...s.btn, ...s.pri, width: "100%", justifyContent: "center", padding: "14px", fontSize: 13, borderRadius: 12, marginTop: 18 } }, "Done"))), showPaywall && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }, onClick: () => setShowPaywall(false) }
```

> Uses only tokens already in scope at the main return: `FD`, `FM`, `P.txS`, `P.txD`, `P.txM`, `P.gW`, `P.ok`, `s.btn`, `s.pri`, and the `springIn` animation (reused from the paywall modal).

- [ ] **Step 2: Sanity check**

Run: `grep -c "payInfo &&" public/app.html` — Expected: `1`.
Run: `grep -c "Order placed" public/app.html` — Expected: `1`.

- [ ] **Step 3: Commit**

```bash
git add public/app.html
git commit -m "feat(checkout): on-screen Zelle/Apple Pay payment instructions overlay"
```

---

## Task 6: New `/api/notify-customer` route (payment-instructions email)

**Files:**
- Create: `app/api/notify-customer/route.js`

- [ ] **Step 1: Create the route**

Modeled on `app/api/notify/route.js` (same Resend call, same `from`), but addressed to the customer and centered on the pay-to instructions.

```js
import { NextResponse } from 'next/server';

// POST /api/notify-customer — emails the buyer their Zelle/Apple Pay
// payment instructions after placing a pending_payment order.
// Public endpoint (called from public/app.html submitOrder).
export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { orderId, firstName, email, items, total, discount, discountLabel, paymentHandle, paymentName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Missing customer email' }, { status: 400 });
    }

    const itemRows = (items || []).map(i =>
      `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-size:13px;color:#1A1C22">${i.name}${i.size ? ' · ' + i.size : ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:12px;color:#7A7D88;text-align:center">${i.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:13px;color:#1A1C22;text-align:right;font-weight:700">${i.price === 0 ? 'FREE' : '$' + (i.price * i.qty)}</td>
      </tr>`
    ).join('');

    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>Complete your order ${orderId}</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
    ${logo}
    <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase">Order received</span>
  </div>

  <div style="background:#F4F2EE;padding:40px 32px">

    <div style="font-size:15px;color:#1A1C22;margin-bottom:20px">Hi ${firstName || 'there'}, thanks for your order. <strong>One more step</strong> — send payment to complete it.</div>

    <div style="border:2px solid #00A0A8;background:#FAFBFC;border-radius:6px;padding:24px;margin-bottom:28px;text-align:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Send via Zelle or Apple Pay</div>
      <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:42px;font-weight:900;color:#00A0A8;letter-spacing:-1px;line-height:1;margin:4px 0">$${total}</div>
      <div style="font-size:18px;font-weight:700;color:#1A1C22;margin-top:10px">${paymentHandle}</div>
      <div style="font-size:13px;color:#7A7D88;margin-top:2px">${paymentName}</div>
      <div style="margin-top:16px;padding:10px 12px;background:#FFFBEB;border-radius:4px;font-size:12px;color:#A16207">Put <strong>${orderId}</strong> in the payment note so we can match your payment.</div>
    </div>

    <div style="margin-bottom:24px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Your order ${orderId}</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E4E7EC;border-radius:4px;overflow:hidden">
        <thead><tr style="background:#FAFBFC">
          <th style="padding:10px 12px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Item</th>
          <th style="padding:10px 12px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Price</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#FFFBEB;border-radius:3px;margin-top:10px"><span style="font-size:13px;font-weight:700;color:#A16207">${discountLabel || 'Discount'}</span><span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#A16207">-$${discount}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:14px 12px;background:#FAFBFC;border-radius:3px;margin-top:10px;border:1px solid #E4E7EC"><span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:700;color:#1A1C22;letter-spacing:1px;text-transform:uppercase">Total due</span><span style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:900;color:#00A0A8">$${total}</span></div>
    </div>

    <div style="font-size:12px;color:#7A7D88;line-height:1.7">Once we receive your payment we'll confirm your order and ship within 24 hours. Questions? Just reply to this email.</div>

  </div>

  <div style="background:#1A1C22;padding:18px 32px;border-radius:0 0 6px 6px;text-align:center">
    <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2;margin:0;text-transform:uppercase">advnce labs &middot; advncelabs.com</p>
  </div>

</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: [email],
        subject: `Complete your order ${orderId} — send $${total} via Zelle or Apple Pay`,
        html,
      }),
    });

    const result = await res.json();

    if (res.ok) {
      return NextResponse.json({ success: true, emailId: result.id });
    } else {
      console.error('notify-customer Resend error:', result);
      return NextResponse.json({ error: result.message || 'Email send failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('notify-customer error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Lint the new route**

Run: `npm run lint 2>&1 | tail -20` — Expected: no errors referencing `app/api/notify-customer/route.js`.

- [ ] **Step 3: Commit**

```bash
git add app/api/notify-customer/route.js
git commit -m "feat(email): customer Zelle/Apple Pay payment-instructions email"
```

---

## Task 7: Delete the dead Stripe routes

**Files:**
- Delete: `app/api/stripe/route.js`
- Delete: `app/api/checkout/route.js`

- [ ] **Step 1: Confirm nothing references them**

Run: `grep -rn "api/checkout\|api/stripe" public app lib 2>/dev/null | grep -v node_modules` — Expected: no results (the `submitOrder` reference was removed in Task 3). If anything appears, stop and resolve before deleting.

- [ ] **Step 2: Delete the routes**

```bash
git rm app/api/stripe/route.js app/api/checkout/route.js
```

- [ ] **Step 3: Build to confirm nothing breaks**

Run: `npm run build 2>&1 | tail -25` — Expected: build succeeds; no module-not-found for the removed routes. (The Pro/Elite `buy.stripe.com` links are plain URLs and are unaffected.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(checkout): remove unused Stripe checkout + stub webhook routes"
```

---

## Task 8: End-to-end manual verification

`public/app.html` has no unit-test harness, so verify in a real browser + real Supabase/admin. Use a disposable email you control.

**Files:** none.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (port 3000).

- [ ] **Step 2: Place a GUEST order**

In a private/incognito window (so no Supabase user session), open `http://localhost:3000/app.html`, go to Peptides → Browse, add a peptide to cart, open checkout, fill Full Name + Street + City + State + ZIP + **Email (your test address)**, leave Phone blank, click **Place Order**.

Expected: the **payment-instructions overlay** appears showing the order number, `$<amount>`, "Zelle or Apple Pay", `626-806-4475`, `Jorrel Patterson`, and "Put ORD-XXXX in the payment note". No redirect to Stripe.

- [ ] **Step 3: Confirm the order landed for a guest**

```bash
SB="https://efuxqrvdkrievbpljlaf.supabase.co"
KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"' ')
curl -s "$SB/rest/v1/orders?select=order_id,first_name,last_name,email,status,total&order=created_at.desc&limit=3" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Expected: your order at the top, `status: "pending_payment"`, correct `first_name`/`last_name`/`email`/`total`. (This proves the guest path — the old code would have written nothing.)

- [ ] **Step 4: Confirm it shows in admin and can be confirmed**

Open `http://localhost:3000/admin/orders` (log in if prompted). Expected: the order appears with the customer name, email, items, total, and a **Pending Payment** amber badge; it is NOT counted in the Revenue tile. Expand it, click **Confirmed**. Expected: badge flips to Confirmed and the Revenue tile increases by the order total (per `lib/revenue.js`).

- [ ] **Step 5: Confirm the customer email arrived**

Check the test inbox. Expected: an email "Complete your order ORD-XXXX — send $X via Zelle or Apple Pay" with the pay-to number, name, order number, and item summary. (If `RESEND_API_KEY`/sender domain isn't set up locally, this may not send in dev — verify the `/api/notify-customer` request returned 200 in the dev-server console, and confirm on the production/preview deploy.)

- [ ] **Step 6: Clean up the test order**

```bash
curl -s -X DELETE "$SB/rest/v1/orders?order_id=eq.<YOUR_TEST_ORDER_ID>" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

- [ ] **Step 7: Final commit (if any cleanup changes) and done**

No code changes expected here. If verification surfaced a fix, make it, re-verify, and commit with a descriptive message.

---

## Self-Review

**Spec coverage:**
- Storefront order write in admin schema, guest-capable, `pending_payment` → Task 3 ✔
- Name split into first/last + phone field → Tasks 2, 3, 4 ✔
- On-screen payment instructions (number/name/amount/order-note) → Task 5 ✔
- Customer payment-instructions email via Resend → Task 6 ✔
- Admin notify still fires → Task 3 (keeps `/api/notify` call) ✔
- Admin confirmation via existing Confirmed button → Task 8 Step 4 (no code) ✔
- Delete dead `/api/stripe` + `/api/checkout` → Task 7 ✔
- Schema verification + migration safety net → Task 1 ✔
- Pay-to value 626-806-4475 / Jorrel Patterson → Task 2 (constants), Task 5/6 (usage) ✔
- Subscription links unaffected → Task 7 Step 3 note ✔

**Deviation from spec (intentional):** spec proposed `NEXT_PUBLIC_PAYMENT_HANDLE` env var; implemented as a JS constant in `app.html` because that static file is not processed by Next (same as the existing `SUPA_URL`/`SUPA_KEY` constants). Number is non-secret. Noted in Task 2.

**Placeholder scan:** none — every step has exact code/commands.

**Type/name consistency:** `payInfo` shape `{ orderId, amount }` set in Task 3, read in Task 5. `orderRow` columns match the Task 1 probe and the admin reader (`order_id`, `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `items`, `total`, `discount_amount`, `discount_code`, `status`, `created_at`). `notify-customer` payload keys (`orderId`, `firstName`, `email`, `items`, `total`, `discount`, `discountLabel`, `paymentHandle`, `paymentName`) match between Task 3 (sender) and Task 6 (handler).

---

## Task 8: End-to-end verification — ✅ DONE (2026-06-09)

Exercised the real routes against the live dev server + Supabase (test rows inserted and deleted):

- `/api/place-order` (full submitOrder shape) → `success:true`; row lands as `pending_payment` with correct name/email/items/total (service-key readback confirmed). Guest path (no `user_id`) works. Validation: empty items → 400, missing email → 400.
- `app.html` whole-bundle JS parse check passes (caught + fixed a missing `)` in the overlay during this step).
- `npm run build` → Compiled successfully; `/api/place-order`, `/api/notify-customer`, `/api/orders-list`, `/api/order-status` all registered; `/api/stripe` + `/api/checkout` gone.

## Tasks 9–11: Admin read/update path (ADDED after Task 8 discovery)

**Discovery:** the `orders` table RLS blocks the **anon** key for SELECT too — anon saw **0 of 37** real orders (`content-range: */0` vs service `0-36/37`). The admin Orders page read with the anon key, so it displayed nothing; the Invoices page worked only because it uses a service-key route (`/api/invoice-list`). User approved extending scope to fix the read/update path.

- **`app/api/orders-list/route.js`** (NEW) — GET, `requireRole('admin','va')`, service-key read of all orders (`select=*&order=created_at.desc&limit=1000`).
- **`app/api/order-status/route.js`** (NEW) — POST, `requireRole('admin')`, service-key status PATCH. Validates status ∈ {pending_payment, confirmed, processing, shipped, delivered, cancelled}. NOTE: `orders` has **no `updated_at` column** (verified) — the PATCH writes `{ status }` only.
- **`app/admin/orders/page.jsx`** — load now fetches `/api/orders-list` (`credentials:'include'`); `updateStatus` POSTs `/api/order-status`; removed the dead anon `sbFetch` helper + `SUPABASE_URL`/`SUPABASE_KEY` constants.

**Verified loop:** orders-list unauth → 401; with admin cookie → 37 orders; a freshly placed checkout order appears as `pending_payment`; `/api/order-status` flips it to `confirmed` (service-key readback confirms); invalid status → 400; unauth status update → 401. All test rows cleaned up. Final `npm run build` → Compiled successfully.

**Pre-existing issue noted, NOT fixed (out of scope):** the admin Orders page "Send & Ship" button calls `/api/shipping-confirm`, which does not exist (404). Flagged for a separate follow-up.
