# Invoice paid-variance tracking

**Date:** 2026-04-27
**Status:** Design approved, pending implementation plan

## Problem

Customers regularly pay an amount that doesn't match the invoice total. Hosep paid $200 on a $232.80 invoice; Jake rounds to the nearest dollar; etc. Jorrel accepts these as "paid in full" but the system has no way to record the variance, so:

1. Dashboard revenue is inflated — it counts the invoiced total, not what actually came in.
2. There is no record of which customers under-pay or by how much, so patterns and leakage are invisible.
3. Cancelled invoices are also being summed into revenue today (separate but related bug).

## Goals

- Capture actual amount received separately from invoiced total.
- Make the capture step a single click for the common case (paid on the dot) and one keystroke for the off-amount case.
- Surface variance internally on the invoice detail and list pages.
- Make dashboard revenue reflect what was actually collected on settled orders only.

## Non-goals

- Partial payments with a remaining balance owed. Marking paid means "settled, accept whatever came in." Real partial-pay is a future feature if needed.
- Editing the customer-facing PDF after the fact. The PDF preserves the original invoiced total. Variance is internal-only.
- Automatic deposit matching (Zelle/Venmo/CashApp). Manual capture only.
- Retroactively backfilling `paid_amount` for invoices marked paid before this change. Treat NULL as "paid on the dot."

## Design

### 1. Data model

Add one nullable column to `orders`:

| Column        | Type    | Nullable | Notes                                              |
|---------------|---------|----------|----------------------------------------------------|
| `paid_amount` | numeric | yes      | Amount actually received. NULL until marked paid. |

Reads use `COALESCE(paid_amount, total)` (or JS `paid_amount ?? total`) so historical rows stay correct.

No `paid_at` column — `created_at` plus the status field is enough. No partial-pay status; the status set is unchanged (`sent → paid → shipped → delivered`, with `cancelled` from any pre-delivery state).

### 2. Mark Paid modal

On the invoice detail page (`app/admin/invoices/[id]/page.jsx`), replace the existing `sent → paid` status action with a **Mark Paid** button. Clicking opens a modal:

```
┌─ Mark AVL-INV-0003 paid ──────────┐
│  Invoiced:        $232.80         │
│                                    │
│  Amount received  [ $232.80   ]   │
│                                    │
│  Variance: $0.00                  │
│                                    │
│        [ Cancel ]  [ Confirm ]    │
└────────────────────────────────────┘
```

Behavior:

- Amount field pre-fills with `total`. User can override.
- Variance line recalculates live: `paid_amount − total`. Negative shown as `−$X.XX (short)`, positive as `+$X.XX (tip)`, zero shown as `$0.00`.
- Confirm POSTs to `/api/invoice-transition` with `{ id, status: 'paid', paid_amount }`.
- Server validates `paid_amount > 0` (reject zero/negative) and writes both `status` and `paid_amount` in the same PATCH.
- Existing inventory deduction on the `paid` transition is unchanged.

### 3. Variance display

**Invoice detail page** — when the invoice is paid AND `paid_amount` differs from `total`, show a 3-row block in place of the single Total line:

```
Invoiced       $232.80
Received       $200.00
Variance       −$32.80   (short)
```

When `paid_amount` equals `total` (or is NULL on a paid invoice), render the original single Total line — no clutter.

Color coding on the variance row: red for negative, green for positive, gray/muted for zero. Plain text tag — `(short)` or `(tip)`.

**Invoice list page** (`app/admin/invoices/page.jsx`) — beside the existing total column, show a subtle chip when there is variance: muted `−$32.80` next to the row's total. Rows without variance show nothing extra. No new column header — keeps the mobile table compact.

**Customer-facing public invoice / PDF** — unchanged. The PDF and public invoice page (`/invoice/<id>`) continue to show the original `total`. Variance is internal only.

### 4. Revenue calculation

`app/admin/page.jsx:28` currently computes:

```js
revenue: o.reduce((s, x) => s + Number(x.total || 0), 0)
```

This is wrong on two axes — it counts cancelled orders and uses invoiced (not received) totals. Replace with:

```js
revenue: o
  .filter(x => ['paid', 'shipped', 'delivered'].includes(x.status))
  .reduce((s, x) => s + Number(x.paid_amount ?? x.total ?? 0), 0)
```

Storefront (Stripe) orders have `paid_amount = NULL` → falls back to `total`, which is always exact for Stripe. Invoice orders use the captured `paid_amount`.

Extract a helper `collectedRevenue(order)` so the same rule is reused anywhere else "revenue" / "sales" / "collected" is surfaced. Grep for other callsites during implementation and update them.

**Side effect:** the two cancelled Hosep duplicates ($232.80 × 2) drop out of dashboard revenue automatically.

## Implementation surface

Files expected to change (writing-plans will confirm):

- `app/api/invoice-transition/route.js` — accept and persist `paid_amount` on the `paid` transition; validate `> 0`.
- `app/admin/invoices/[id]/page.jsx` — Mark Paid modal; variance display.
- `app/admin/invoices/page.jsx` — variance chip in row.
- `app/admin/page.jsx` — revenue calc fix; extract helper.
- `lib/` — new `collectedRevenue` helper (or co-located in dashboard if no other callsite).
- Supabase migration — `ALTER TABLE orders ADD COLUMN paid_amount numeric;`

## Open questions

None. All four design sections approved by Jorrel on 2026-04-27.
