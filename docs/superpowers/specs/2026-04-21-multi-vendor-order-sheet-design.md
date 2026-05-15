# Multi-Vendor Order Sheet — design

**Date:** 2026-04-21
**Repo:** `adonis-next`
**Status:** approved, ready for plan

## Problem

Today, every PO is single-vendor. To restock 30 items across Eve + Weak + Rosyy you have to build three separate POs and manually decide which vendor to source each item from. The new-PO catalog dim feature (commit `5df4f08`) flags wrong-vendor risk row-by-row but doesn't fix the underlying workflow: it's tedious and error-prone.

## Decision

Add a **Multi-Vendor Order Sheet** — one page where you set quantities for any product across the catalog, and the system auto-routes each line to its cheapest vendor with full per-line + bulk override. On submit, it splits the order into separate POs grouped by vendor (one per vendor that has items).

The existing per-vendor "+ New PO" flow at `/admin/purchases` stays untouched as a manual single-vendor path.

## User experience

**Entry point:** new "+ Multi-Vendor PO" button on `/admin/purchases`, alongside the existing "+ New PO" button. Routes to `/admin/purchases/multi`.

**Page layout:**

```
[ Multi-Vendor Order Sheet ]                        [ Cancel ]

[ Search products + SKU... ]    [ Filter: All / In stock / Out / Pending ]
[ Bulk override: All to [ Vendor ▾ ] ]              [ Reset to cheapest ]

┌──────────────────┬──────┬──────┬──────┬──────────────┬──────┬─────┬──────┐
│ Product          │ Size │ SKU  │ On   │ Vendor       │ Unit │ Qty │ Line │
│                  │      │      │ hand │              │      │     │      │
├──────────────────┼──────┼──────┼──────┼──────────────┼──────┼─────┼──────┤
│ BPC-157          │ 5mg  │ BP5  │ 0v   │ [ Eve ▾ ]    │ $40  │ 0   │ $0   │
│ BPC-157          │ 10mg │ BP10 │ 0v   │ [ Rosyy ▾ ]  │ $64  │ 1   │ $64  │
│ Cerebrolysin     │ 60mg │ CB60 │ 0v   │ [ Rosyy ▾ ]  │ $22  │ 0   │ $0   │
│ ...                                                                       │
└──────────────────┴──────┴──────┴──────┴──────────────┴──────┴─────┴──────┘

┌─ Summary ─────────────────────────────────────────────────────────────────┐
│ Will create 2 POs:                                                        │
│  • Rosyy — 1 line, 1 kit, $64.00                                          │
│  • Eve   — 0 lines (skipped)                                              │
│ Total: 1 line, 1 kit, $64.00                                              │
└───────────────────────────────────────────────────────────────────────────┘

[ Notes (applies to all POs) ___________________________________________ ]

[ Submit Order ]
```

**Key behaviors:**

1. **Default vendor selection** — for each product, the dropdown defaults to the vendor with the lowest `cost_per_kit`. If no vendor has a price for a product, the row shows `(no vendor data)` and qty input is disabled.
2. **Per-row override** — clicking the vendor dropdown lists every vendor that carries that product, sorted cheapest-first, each labeled `Vendor $XX`. Selecting a different vendor immediately recalculates the unit price and line total for that row.
3. **Bulk override** — "All to [Vendor ▾]" button at the top. Picking a vendor flips every row to that vendor IF that vendor carries the product. Rows where the vendor doesn't have the product stay on their current vendor and show a small `(no price from <BulkVendor>)` annotation.
4. **Reset to cheapest** — undoes any overrides, reverts every row to the cheapest vendor.
5. **Filters** — same stock filters as inventory page (All / In stock / Out / Pending). Default: All.
6. **Search** — by product name or SKU, same as inventory.
7. **Summary preview** — live count of how many POs will be created, vendor by vendor, with subtotals.
8. **Submit** — splits items by `vendor_id`, calls existing `/api/purchase-write` once per vendor (sequentially), reports back which POs were created. If one fails mid-batch, surface the failure clearly and don't auto-retry — user decides what to do.

## Data flow

- Loads on mount: `products` (id, sku, name, size, stock), `vendors` (id, name), `vendor_prices` (vendor_id, product_id, cost_per_kit), `purchase_orders` + `purchase_order_items` (for pending PO badges).
- Builds a `cheapestByPid` map at render time from `vendor_prices`.
- Local state holds `qty by product_id` and `vendor override by product_id`.
- On submit, groups `{product_id, qty, unit_cost, vendor_id}` rows by `vendor_id`, calls `POST /api/purchase-write` once per group with `{ action: 'create', vendor_id, items: [...], notes }`.

## API

**Reuse `/api/purchase-write`** as-is. No new endpoint. The frontend orchestrates the N calls and aggregates results. Trade-off: not transactional — if the second call fails, the first PO is already created. For MVP this is acceptable: PO creation is rare, failures are visible in the UI, and the user can manually delete a half-created PO from `/admin/purchases` if needed. If transactional behavior becomes important later, add `POST /api/purchase-write-multi` that wraps everything in a Postgres transaction.

## File structure

- **New:** `app/admin/purchases/multi/page.jsx` — the order sheet page.
- **Modified:** `app/admin/purchases/page.jsx` — add "+ Multi-Vendor PO" button alongside "+ New PO".

Decompose `multi/page.jsx` into local helpers (no separate files needed at this size):
- Top-level state + data fetching
- `OrderRow` component — one row of the table
- `Summary` component — the "Will create N POs" panel
- `submitOrder()` — the per-vendor split + sequential POST orchestration

## Out of scope (deliberately deferred)

- **Transactional multi-PO submit** — see API note above. Use sequential client-side calls for now.
- **Quantity autosuggest based on past usage** — separate feature; capture for later if useful.
- **Per-vendor MOQ / freight handling** — vendors may have minimum order amounts or shipping fees that would change which vendor is "cheapest" for a small order. Not modeled today; user manages by override.
- **Saved order drafts** — qty overrides aren't persisted across page reloads. Use the page in one sitting. localStorage persistence can be added later if needed.
- **Bulk add from CSV** — capture for later if useful.

## Verification plan

After deploy:
1. Visit `/admin/purchases` → see "+ Multi-Vendor PO" button next to "+ New PO".
2. Click → land on `/admin/purchases/multi` with full product table loaded.
3. Each row defaults to cheapest vendor; verify against `vendor_prices` for 3-4 known products.
4. Override one row's vendor → unit price + line total update immediately.
5. Use "All to Eve" bulk → every row that Eve carries flips; rows Eve doesn't carry stay put with annotation.
6. Set qty on items spanning 2+ vendors → Summary shows the right per-vendor breakdown.
7. Submit → confirm each PO is created in `/admin/purchases` list with correct vendor + items + total.
8. Test failure path: stub one PO POST to fail → verify UI surfaces clearly which POs were created vs which failed.
