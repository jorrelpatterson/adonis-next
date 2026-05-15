# OOS shipping copy on product page — design

**Date:** 2026-04-19
**Repo:** `advnce-site` (storefront)
**Status:** ready for implementation

## Problem

The product page treats out-of-stock (`stock === 0`) as a hard block: the Add-to-Order button is disabled and a red "Out of stock" message appears. But the checkout page was clearly designed to allow OOS items through with extended shipping copy ("Ships approximately 2 weeks after payment"). The product-page block makes the checkout's OOS handling unreachable, and customers can't pre-order items that are en route from a vendor.

## Decision

When `stock === 0` on the product page, allow the order anyway and replace the red blocker with neutral shipping-time copy.

## Behavior

| State | Stock note | Stock color | Add-to-Order button |
|---|---|---|---|
| In stock (≥5) | "In stock · Ships 2–4 days" | green (`#16A34A`) | enabled |
| Low stock (1–4) | "Only N remaining" | amber (`var(--amber)`) | enabled |
| **Out of stock (0)** | **"This ships in 2–3 weeks"** | **amber (`var(--amber)`)** | **enabled** |

## Scope of change

**Single file:** `advnce-site/advnce-product.html`, line 292.

```js
// before
if(stock===0){stockClass='stock-out';stockNote='Out of stock';btnClass='sold-out';btnText='Out of Stock'}

// after
if(stock===0){stockClass='stock-low';stockNote='This ships in 2–3 weeks'}
```

Reuses the existing `stock-low` class (amber) — no new CSS. The `.btn-order.sold-out` styling and the `.stock-out` color rule become unused but stay in the stylesheet (no cleanup needed; YAGNI cuts both ways).

## Out of scope

- **Catalog page** — already shows OOS items with no special styling. Stays clean (no badge).
- **Checkout page** — already shows "Ships approximately 2 weeks after payment" for OOS items. Unchanged.
- **Discount / crowdfund / waitlist mechanics** — captured separately in `memory/idea_pre_sell_oos_to_fund_pos.md` for a future design pass.

## Verification

After deploy, on `advncelabs.com/advnce-product.html?sku=<any-OOS-SKU>`:
1. Add-to-Order button is clickable and uses normal styling (not greyed out).
2. Below the button area, the stock line reads "This ships in 2–3 weeks" in amber.
3. Adding to cart works, cart shows the item, checkout proceeds, checkout shows the existing "Ships approximately 2 weeks after payment" copy.
