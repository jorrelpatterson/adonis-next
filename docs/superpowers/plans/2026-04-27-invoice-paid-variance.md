# Invoice Paid-Variance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture the actual amount received on each invoice (separate from invoiced total), surface variance internally, and fix dashboard revenue to use collected amounts on settled orders only.

**Architecture:** Add a nullable `paid_amount` column to `orders`. The "Mark Paid" action becomes a modal that pre-fills the invoice total and lets the admin override before confirming; the API persists `paid_amount` alongside `status='paid'`. Variance is shown on the invoice detail page (3-row block) and as a subtle chip on the list page; the customer-facing PDF is untouched. Dashboard revenue switches to a shared `collectedRevenue(order)` helper that uses `paid_amount ?? total` and filters to `paid`/`shipped`/`delivered` only.

**Tech Stack:** Next.js 14 App Router · React (JS, no TS) · Supabase (PostgREST) · vanilla CSS / inline styles · no test framework configured (verification is curl + manual smoke test).

**Spec:** [`docs/superpowers/specs/2026-04-27-invoice-paid-variance-design.md`](../specs/2026-04-27-invoice-paid-variance-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `sql/2026-04-27-invoice-paid-amount.sql` | create | Adds `paid_amount numeric` column to `orders`; Jorrel pastes into Supabase SQL editor. |
| `lib/revenue.js` | create | Single helper `collectedRevenue(order)` — the one place that decides "what counts as collected." |
| `app/api/invoice-transition/route.js` | modify | Accept `paid_amount` in request body on `paid` transition; validate `> 0`; persist alongside status PATCH. |
| `app/api/invoice-list/route.js` | modify | Add `paid_amount` to the explicit column select. |
| `app/admin/invoices/[id]/page.jsx` | modify | Replace plain "Mark paid" button with a modal that captures `paid_amount`. Render variance block when paid amount differs. |
| `app/admin/invoices/page.jsx` | modify | Add variance chip beside the total cell. |
| `app/admin/page.jsx` | modify | Use `collectedRevenue` helper, filter to settled statuses. |

`app/api/invoice-get/route.js` does `select=*`, so `paid_amount` flows through automatically — no change needed.

---

## Task 1: Add `paid_amount` column

**Files:**
- Create: `sql/2026-04-27-invoice-paid-amount.sql`

- [ ] **Step 1: Write the SQL migration**

```sql
-- 2026-04-27: invoice paid-variance — capture actual amount received vs invoiced total
-- Run in Supabase SQL editor (project: efuxqrvdkrievbpljlaf)

alter table orders
  add column if not exists paid_amount numeric;

-- Verify:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name='orders' and column_name='paid_amount';
-- Expected: paid_amount, numeric, YES
```

- [ ] **Step 2: Operator runs SQL in Supabase**

Hand the file path to Jorrel. He pastes the contents into the Supabase SQL editor and runs it. Wait for confirmation that the verify query returns one row.

- [ ] **Step 3: Verify column from terminal**

Run (replace key with the value in `.env.local`):

```bash
curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?select=id,paid_amount&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Expected: a JSON array with one row containing `paid_amount: null`. A 4xx with "column ... does not exist" means the migration didn't run.

- [ ] **Step 4: Commit**

```bash
git add sql/2026-04-27-invoice-paid-amount.sql
git commit -m "sql: add orders.paid_amount column for invoice variance tracking"
```

---

## Task 2: Backend — accept and persist `paid_amount` on transition

**Files:**
- Modify: `app/api/invoice-transition/route.js:53-92`

- [ ] **Step 1: Read the file**

Already documented in spec — relevant section is the `POST` handler that builds `patch` and PATCHes the row. Need to (a) extract `paid_amount` from body, (b) validate when status is `paid`, (c) include in `patch`.

- [ ] **Step 2: Update the body destructure**

Find:

```js
  const body = await request.json().catch(() => ({}));
  const { id, status, tracking_number, tracking_carrier, notify_email } = body;
  if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 });
```

Replace with:

```js
  const body = await request.json().catch(() => ({}));
  const { id, status, tracking_number, tracking_carrier, notify_email, paid_amount } = body;
  if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 });

  if (status === 'paid') {
    const n = Number(paid_amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: 'paid_amount must be a positive number' }, { status: 400 });
    }
  }
```

- [ ] **Step 3: Persist `paid_amount` in the patch**

Find:

```js
  const patch = { status };
  if (status === 'shipped') {
```

Replace with:

```js
  const patch = { status };
  if (status === 'paid') {
    patch.paid_amount = Number(paid_amount);
  }
  if (status === 'shipped') {
```

- [ ] **Step 4: Smoke test from terminal**

Start the dev server in another shell: `npm run dev`. Then in this shell:

```bash
# Get a sent-status invoice id (or use the AVL-INV-0001 trick — first create a test one via the admin UI if needed)
# Login first to get the cookie; substitute your actual admin password.
ADMIN_COOKIE=$(curl -s -c - -X POST http://localhost:3000/api/admin-auth \
  -H 'Content-Type: application/json' \
  -d '{"password":"'$ADMIN_PASSWORD'"}' | grep adonis_admin | awk '{print $7}')

# Bad request (missing paid_amount) — should 400
curl -s -X POST http://localhost:3000/api/invoice-transition \
  -H "Content-Type: application/json" \
  -H "Cookie: adonis_admin=$ADMIN_COOKIE" \
  -d '{"id":"<some-sent-invoice-uuid>","status":"paid"}'
# Expected: {"error":"paid_amount must be a positive number"}

# Bad request (zero) — should 400
curl -s -X POST http://localhost:3000/api/invoice-transition \
  -H "Content-Type: application/json" \
  -H "Cookie: adonis_admin=$ADMIN_COOKIE" \
  -d '{"id":"<some-sent-invoice-uuid>","status":"paid","paid_amount":0}'
# Expected: {"error":"paid_amount must be a positive number"}
```

Don't run the success case yet — the UI flow will exercise it end-to-end in Task 4.

- [ ] **Step 5: Commit**

```bash
git add app/api/invoice-transition/route.js
git commit -m "invoice-transition: require paid_amount on paid transition"
```

---

## Task 3: Backend — surface `paid_amount` in list payload

**Files:**
- Modify: `app/api/invoice-list/route.js:16`

- [ ] **Step 1: Add the column to the select clause**

Find:

```js
  const qs = parts.join('&') + '&select=id,invoice_id,first_name,last_name,email,phone,total,status,created_at,tracking_number,items,invoice_image_path';
```

Replace with:

```js
  const qs = parts.join('&') + '&select=id,invoice_id,first_name,last_name,email,phone,total,paid_amount,status,created_at,tracking_number,items,invoice_image_path';
```

- [ ] **Step 2: Smoke test the API**

```bash
curl -s "http://localhost:3000/api/invoice-list" \
  -H "Cookie: adonis_admin=$ADMIN_COOKIE" | python3 -m json.tool | head -40
```

Expected: each invoice object now includes `"paid_amount": null` (or a number for any later-marked-paid invoices).

- [ ] **Step 3: Commit**

```bash
git add app/api/invoice-list/route.js
git commit -m "invoice-list: include paid_amount in returned columns"
```

---

## Task 4: UI — Mark Paid modal on invoice detail page

**Files:**
- Modify: `app/admin/invoices/[id]/page.jsx`

This task replaces the existing one-click `transition('paid')` flow with a small modal that captures the actual amount received. The existing stock-warning logic must be preserved — it runs *before* the modal opens, so the admin still sees the warning before they get to enter the amount.

- [ ] **Step 1: Add modal state**

Find (around `app/admin/invoices/[id]/page.jsx:33-35`):

```js
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
```

Replace with:

```js
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [payModal, setPayModal] = useState(null); // { paidAmount: string }
```

- [ ] **Step 2: Update the `transition` helper to forward `paid_amount`**

The existing function already spreads `extra` into the request body — no change needed to the fetch call. But the stock-confirm currently fires inside `transition('paid')`. We're moving stock-confirm to a separate function so it runs before the modal opens.

Find (around `app/admin/invoices/[id]/page.jsx:66-92`):

```js
  async function transition(newStatus, extra = {}) {
    if (newStatus === 'paid') {
      const warnings = await checkStockForPaid();
      if (warnings.length) {
        const lines = warnings.map((w) => `  ${w.sku} (${w.name}): need ${w.qty}, have ${w.stock}`).join('\n');
        if (!confirm(
          `Marking paid will decrement stock. Some items don't have enough:\n\n${lines}\n\n` +
          `Stock will floor at 0 — the remainder is effectively pre-ordered.\nProceed anyway?`,
        )) return;
      } else {
        if (!confirm('Mark this invoice paid? This will decrement inventory.')) return;
      }
    } else {
      if (!confirm(`Transition this invoice to "${newStatus}"?`)) return;
    }
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: newStatus, ...extra }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    if (r.ok) load();
    else alert('Error: ' + (body.error || r.status));
  }
```

Replace with:

```js
  async function transition(newStatus, extra = {}) {
    // 'paid' has its own modal-driven flow (openPayModal) — never call transition('paid') directly.
    if (newStatus !== 'paid') {
      if (!confirm(`Transition this invoice to "${newStatus}"?`)) return;
    }
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: newStatus, ...extra }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    if (r.ok) load();
    else alert('Error: ' + (body.error || r.status));
  }

  async function openPayModal() {
    const warnings = await checkStockForPaid();
    if (warnings.length) {
      const lines = warnings.map((w) => `  ${w.sku} (${w.name}): need ${w.qty}, have ${w.stock}`).join('\n');
      if (!confirm(
        `Marking paid will decrement stock. Some items don't have enough:\n\n${lines}\n\n` +
        `Stock will floor at 0 — the remainder is effectively pre-ordered.\nProceed anyway?`,
      )) return;
    }
    setPayModal({ paidAmount: (Number(inv.total) || 0).toFixed(2) });
  }

  async function confirmPaid() {
    const n = Number(payModal.paidAmount);
    if (!Number.isFinite(n) || n <= 0) {
      alert('Enter a positive amount.');
      return;
    }
    setActing(true);
    const r = await fetch('/api/invoice-transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status: 'paid', paid_amount: n }),
    });
    const body = await r.json().catch(() => ({}));
    setActing(false);
    setPayModal(null);
    if (r.ok) load();
    else alert('Error: ' + (body.error || r.status));
  }
```

- [ ] **Step 3: Wire the Mark paid button to the modal**

Find (around `app/admin/invoices/[id]/page.jsx:224`):

```jsx
              {canMarkPaid && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={() => transition('paid')}>Mark paid</button>}
```

Replace with:

```jsx
              {canMarkPaid && <button style={{ ...cs.btn, ...cs.btnPrimary }} disabled={acting} onClick={openPayModal}>Mark paid</button>}
```

- [ ] **Step 4: Render the modal**

Find the closing of the return block (around `app/admin/invoices/[id]/page.jsx:231-233`):

```jsx
        </div>
      </div>
    </div>
  );
}
```

Replace with:

```jsx
        </div>
      </div>

      {payModal && (
        <div
          onClick={() => setPayModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,25,40,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, padding: 24, width: 360, maxWidth: '92vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ ...cs.label, marginBottom: 12 }}>Mark {inv.invoice_id} paid</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 14, marginBottom: 14 }}>
              <span style={{ color: '#7A7D88' }}>Invoiced</span>
              <span>${(Number(inv.total) || 0).toFixed(2)}</span>
            </div>

            <label style={{ ...cs.label, display: 'block', marginBottom: 6 }}>Amount received</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: 9, color: '#7A7D88', fontFamily: 'monospace' }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={payModal.paidAmount}
                onChange={(e) => setPayModal({ paidAmount: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmPaid(); }}
                style={{ width: '100%', padding: '8px 12px 8px 22px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 14, fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            {(() => {
              const total = Number(inv.total) || 0;
              const paid = Number(payModal.paidAmount);
              if (!Number.isFinite(paid)) return null;
              const v = paid - total;
              const color = v < 0 ? '#DC2626' : v > 0 ? '#16A34A' : '#7A7D88';
              const tag = v < 0 ? ' (short)' : v > 0 ? ' (tip)' : '';
              const sign = v < 0 ? '−' : v > 0 ? '+' : '';
              return (
                <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 13, color, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Variance</span>
                  <span>{sign}${Math.abs(v).toFixed(2)}{tag}</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button style={{ ...cs.btn, ...cs.btnSecondary }} onClick={() => setPayModal(null)} disabled={acting}>Cancel</button>
              <button style={{ ...cs.btn, ...cs.btnPrimary }} onClick={confirmPaid} disabled={acting}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Manual smoke test**

In the browser, with `npm run dev` running:

1. Go to `/admin/invoices`. Click `+ New invoice`. Fill enough to create a test invoice; submit. Note the invoice id.
2. Open the new invoice. Click **Mark paid**. Confirm the inventory dialog. The modal opens with the total pre-filled.
3. Type `200` (or any amount different from the total). Variance line shows the diff in red with `(short)` or green with `(tip)`.
4. Click **Confirm**. Page reloads, status pill is now `paid`.
5. Verify in Supabase (or via curl): `paid_amount` is set to 200, `status` is `paid`. Inventory has been decremented for each item.
6. Sanity-check: open another sent invoice, click **Mark paid**, leave the amount as the pre-filled total, click **Confirm**. Should mark paid with `paid_amount` equal to the total — no variance.
7. Sanity-check the rejection path: in DevTools console, run a fetch with `paid_amount: 0` against `/api/invoice-transition`. Expect 400.

- [ ] **Step 6: Commit**

```bash
git add app/admin/invoices/\[id\]/page.jsx
git commit -m "invoice detail: Mark Paid modal captures actual amount received"
```

---

## Task 5: UI — variance block on invoice detail page

**Files:**
- Modify: `app/admin/invoices/[id]/page.jsx:208-211`

Render a 3-row block (Invoiced / Received / Variance) in place of the single Total line whenever the invoice is paid AND `paid_amount` differs from `total`. Otherwise keep the existing Total line.

- [ ] **Step 1: Replace the Total block**

Find (around `app/admin/invoices/[id]/page.jsx:208-211`):

```jsx
            <div style={{ borderTop: '2px solid #0F1928', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
              <div>Total</div>
              <div style={{ color: '#00A0A8' }}>${inv.total?.toFixed?.(2) || inv.total}</div>
            </div>
```

Replace with:

```jsx
            {(() => {
              const total = Number(inv.total) || 0;
              const paid = inv.paid_amount == null ? null : Number(inv.paid_amount);
              const showVariance = paid != null && Math.abs(paid - total) >= 0.005;
              if (!showVariance) {
                return (
                  <div style={{ borderTop: '2px solid #0F1928', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontFamily: 'monospace', fontSize: 18 }}>
                    <div>Total</div>
                    <div style={{ color: '#00A0A8' }}>${total.toFixed(2)}</div>
                  </div>
                );
              }
              const v = paid - total;
              const color = v < 0 ? '#DC2626' : '#16A34A';
              const tag = v < 0 ? ' (short)' : ' (tip)';
              const sign = v < 0 ? '−' : '+';
              return (
                <div style={{ borderTop: '2px solid #0F1928', marginTop: 10, paddingTop: 10, fontFamily: 'monospace', fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#7A7D88' }}>Invoiced</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 700, fontSize: 16, color: '#00A0A8' }}>
                    <span style={{ color: '#0F1928' }}>Received</span>
                    <span>${paid.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color }}>
                    <span>Variance</span>
                    <span>{sign}${Math.abs(v).toFixed(2)}{tag}</span>
                  </div>
                </div>
              );
            })()}
```

- [ ] **Step 2: Manual smoke test**

1. Reload the invoice from Task 4 (the one paid at $200 against $232.80 total).
2. The right-hand items section now shows three lines: Invoiced $232.80, Received $200.00, Variance −$32.80 (short) in red.
3. Reload the second invoice (paid on the dot). It still shows the single `Total $X.XX` line.

- [ ] **Step 3: Commit**

```bash
git add app/admin/invoices/\[id\]/page.jsx
git commit -m "invoice detail: variance block when paid amount differs from total"
```

---

## Task 6: UI — variance chip on invoice list

**Files:**
- Modify: `app/admin/invoices/page.jsx:113`

Show a subtle muted chip beside the total when there's variance, otherwise nothing extra.

- [ ] **Step 1: Replace the Total cell**

Find (around `app/admin/invoices/page.jsx:113`):

```jsx
                  <td style={cs.td}><strong>${inv.total?.toFixed?.(2) || inv.total}</strong></td>
```

Replace with:

```jsx
                  <td style={cs.td}>
                    <strong>${(Number(inv.total) || 0).toFixed(2)}</strong>
                    {(() => {
                      const total = Number(inv.total) || 0;
                      const paid = inv.paid_amount == null ? null : Number(inv.paid_amount);
                      if (paid == null || Math.abs(paid - total) < 0.005) return null;
                      const v = paid - total;
                      const color = v < 0 ? '#991B1B' : '#065F46';
                      const bg = v < 0 ? '#FEE2E2' : '#D1FAE5';
                      const sign = v < 0 ? '−' : '+';
                      return (
                        <span style={{ marginLeft: 8, padding: '2px 7px', borderRadius: 999, background: bg, color, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
                          {sign}${Math.abs(v).toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
```

- [ ] **Step 2: Manual smoke test**

1. Go to `/admin/invoices`.
2. The row for the $200-on-$232.80 invoice shows `$232.80  −$32.80` (small red chip).
3. Rows for invoices with no variance show only the total — no chip.

- [ ] **Step 3: Commit**

```bash
git add app/admin/invoices/page.jsx
git commit -m "invoice list: variance chip beside total when paid differs"
```

---

## Task 7: Create `collectedRevenue` helper

**Files:**
- Create: `lib/revenue.js`

- [ ] **Step 1: Write the helper**

```js
// Single source of truth for "what counts as collected revenue."
//
// - Only paid/shipped/delivered orders count. Sent invoices haven't been paid;
//   cancelled orders shouldn't inflate revenue.
// - Use paid_amount when present (admin-entered actual amount on invoices),
//   fall back to total (always exact for Stripe storefront orders).
const SETTLED = new Set(['paid', 'shipped', 'delivered']);

export function collectedRevenue(order) {
  if (!order || !SETTLED.has(order.status)) return 0;
  const paid = order.paid_amount;
  if (paid != null && Number.isFinite(Number(paid))) return Number(paid);
  return Number(order.total) || 0;
}

export function totalCollectedRevenue(orders) {
  return (orders || []).reduce((s, o) => s + collectedRevenue(o), 0);
}
```

- [ ] **Step 2: Sanity check the import path**

```bash
node --input-type=module -e "import('./lib/revenue.js').then(m => { \
  console.log(m.collectedRevenue({ status: 'paid', paid_amount: 200, total: 232.8 })); \
  console.log(m.collectedRevenue({ status: 'paid', total: 100 })); \
  console.log(m.collectedRevenue({ status: 'cancelled', total: 100 })); \
  console.log(m.collectedRevenue({ status: 'sent', total: 100 })); \
  console.log(m.totalCollectedRevenue([{status:'paid',total:50},{status:'cancelled',total:50},{status:'shipped',paid_amount:99,total:100}])); \
})"
```

Expected output:

```
200
100
0
0
149
```

- [ ] **Step 3: Commit**

```bash
git add lib/revenue.js
git commit -m "lib/revenue: collectedRevenue helper using paid_amount on settled orders"
```

---

## Task 8: Fix dashboard revenue

**Files:**
- Modify: `app/admin/page.jsx:25-32`

- [ ] **Step 1: Import the helper**

Find the existing imports at the top of `app/admin/page.jsx` (anywhere among the import lines near the top) and add:

```js
import { totalCollectedRevenue } from '../../lib/revenue';
```

- [ ] **Step 2: Use it in the stats setter**

Find (around `app/admin/page.jsx:25-32`):

```js
      setStats({
        products: p.length,
        orders: o.length,
        revenue: o.reduce((s, x) => s + Number(x.total || 0), 0),
        lowStock: p.filter(x => x.stock <= 3 && x.cat !== 'Supplies').length,
        openPos: (openPos || []).length,
        inTransitValue: (openPos || []).reduce((s, p) => s + Number(p.total_cost || 0), 0),
      });
```

Replace with:

```js
      setStats({
        products: p.length,
        orders: o.length,
        revenue: totalCollectedRevenue(o),
        lowStock: p.filter(x => x.stock <= 3 && x.cat !== 'Supplies').length,
        openPos: (openPos || []).length,
        inTransitValue: (openPos || []).reduce((s, p) => s + Number(p.total_cost || 0), 0),
      });
```

- [ ] **Step 3: Manual smoke test**

1. Reload `/admin`.
2. The Revenue tile should now reflect *only* paid/shipped/delivered orders, using the actual paid amount on invoices.
3. Compute the expected number by hand: query Supabase for orders with status in (paid, shipped, delivered), sum `COALESCE(paid_amount, total)`. Confirm the dashboard tile matches.

```bash
curl -s "https://efuxqrvdkrievbpljlaf.supabase.co/rest/v1/orders?status=in.(paid,shipped,delivered)&select=status,total,paid_amount" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | python3 -c "
import json, sys
rows = json.load(sys.stdin)
print(round(sum((r['paid_amount'] if r['paid_amount'] is not None else r['total']) for r in rows), 2))
"
```

The printed number must equal the dashboard tile.

- [ ] **Step 4: Commit**

```bash
git add app/admin/page.jsx
git commit -m "dashboard: revenue uses collected helper (paid_amount, settled only)"
```

---

## Task 9: Sweep for other revenue callsites

**Files:** any others surfaced by grep

Other admin pages may show "revenue" / "sales" / "collected" using the old, incorrect calc. Catch them now.

- [ ] **Step 1: Grep**

```bash
grep -rn -i --include='*.js' --include='*.jsx' \
  -e 'reduce.*total' \
  -e 'revenue' -e 'salesTotal' -e 'collected' \
  app lib | grep -v node_modules | grep -v lib/revenue.js
```

- [ ] **Step 2: Triage results**

For each hit, decide:

- If it sums `order.total` across orders → replace with `totalCollectedRevenue(orders)` and import the helper.
- If it's labels/UI text only → ignore.
- If it's a different concept (e.g., subtotal of items inside one invoice — which legitimately uses `it.price * it.qty`) → ignore.

Document each hit in the commit message so the audit trail is explicit.

- [ ] **Step 3: For each callsite that needs the helper**

Apply the same pattern as Task 8 — add the import, replace the reduce. Show the diff inline; do not write a vague "update similar callsites" instruction.

- [ ] **Step 4: Commit (only if changes made)**

```bash
git add <files>
git commit -m "sweep: route remaining revenue callsites through collectedRevenue"
```

If grep finds no other real callsites, skip the commit and leave a note in the final summary that the sweep found no other revenue callsites needing the helper.

---

## Task 10: End-to-end verification

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: build succeeds with no errors. Lint warnings unrelated to this work are acceptable.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no new errors introduced by these changes.

- [ ] **Step 3: Full UI smoke**

With `npm run dev`:

1. Create a fresh test invoice via `/admin/invoices/new`.
2. Open it, click **Mark paid**, override the amount (e.g., total minus $10), confirm. Status flips to paid; variance row appears on detail page in red with `(short)`.
3. Back on `/admin/invoices`, the row shows the variance chip beside the total.
4. Mark another invoice paid at exactly the total. Detail page shows the original single Total line (no variance block); list row shows no chip.
5. `/admin` Revenue tile reflects what was actually collected on settled orders only.

- [ ] **Step 4: Final commit (only if anything changed)**

If smoke surfaced bugs, fix them as separate commits. Once green, no extra commit needed.

---

## Out of scope (do NOT do in this plan)

- Editing or regenerating the customer-facing invoice PDF after marking paid.
- Partial-payment / "still owes X" flows.
- Automatic Zelle/Venmo/CashApp matching.
- Backfilling `paid_amount` on already-paid historical invoices.
- Restructuring the invoice detail page beyond the variance block (it's gotten long; leave that for its own session).
