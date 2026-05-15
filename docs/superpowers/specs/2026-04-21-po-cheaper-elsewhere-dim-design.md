# New-PO catalog: dim rows where another vendor is cheaper

**Date:** 2026-04-21
**Repo:** `adonis-next`
**File:** `app/admin/purchases/page.jsx`
**Status:** approved, ready for implementation

## Problem

When creating a new PO, the catalog table shows every product the selected vendor sells. There's no signal that another vendor offers the same product cheaper — easy to accidentally order at a higher price.

## Decision

For each row, dim it if another vendor is cheaper by any amount, and surface the cheaper vendor + their price as a subtitle under the cost cell. Row stays fully orderable.

## Behavior

For each `catalog` row:
1. Compute `minOtherCost` = minimum `cost_per_kit` across all `vendor_prices` rows for this product, excluding the currently-selected vendor.
2. If `minOtherCost < own cost`:
   - Set row `opacity: 0.55`
   - Cost cell shows: `$XX.XX` on top line, gray subtitle `↓ <VendorName> $YY` underneath
3. Otherwise: render as today (full opacity, no subtitle).

The qty input remains fully functional in both states — user can still place an order from the more expensive vendor (no hard block).

## Scope

Single-file change: [app/admin/purchases/page.jsx:144-176](app/admin/purchases/page.jsx#L144-L176). Data already loaded (the page fetches all `vendor_prices` and `vendors` on mount). No API/schema/migration changes.

## Out of scope

- Threshold tuning (any cheaper triggers the dim, no minimum savings)
- Sorting catalog by "cheapest first" (separate feature)
- Auto-redirecting to cheapest vendor (would defeat the user's choice)
