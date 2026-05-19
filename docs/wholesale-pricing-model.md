# Wholesale Pricing Model

**Last updated:** 2026-05-19
**Status:** Locked-in after iteration. Source of truth for the pricing sheet generator.
**Generator:** [`scripts/generate-wholesale-sheet.mjs`](../scripts/generate-wholesale-sheet.mjs)
**Output (gitignored):** `wholesale-pricing-template.html` (open in Chrome → Cmd+P → Save as PDF → upload via `/admin/distributors`)

---

## How to regenerate the sheet

```bash
node scripts/generate-wholesale-sheet.mjs
open wholesale-pricing-template.html
```

Pulls live from Supabase `products` table (active rows only) every run. No stale data.

---

## Bucket structure (per-SKU, per-order)

Buyers can only purchase in 10-vial increments per SKU. The bucket is determined by how many vials of *that specific SKU* are in the order.

| Tier | Order quantity (vials of one SKU) |
|---|---|
| **A** | 10–90 |
| **B** | 100–190 |
| **C** | 200–290 |
| **D** | 300–390 |
| **E** | 400–490 |
| **F** | 500+ |

---

## Pricing formula (in order of operation)

### 1. Raw "% off retail" ladder

| Tier | Discount | Formula |
|---|---|---|
| A | 50% off retail | `retail × 0.50` |
| B | 60% off retail | `retail × 0.40` |
| C | 65% off retail | `retail × 0.35` |
| D | 75% off retail | `retail × 0.25` |
| E | 80% off retail | `retail × 0.20` |
| F | 90% off retail | `retail × 0.10` |

### 2. Floor (margin protection)

```
floor = cost_per_vial + $4
```

Each tier price is raised to the floor if the raw formula would drop below it. Ensures at minimum $4 markup per vial on every wholesale transaction.

> **Unit gotcha:** the `products.cost` column in Supabase is stored per **10-pack**, not per vial. The script divides by 10 to get per-vial cost. If you ever add a new product, log cost the same way (the cost of buying 10 vials from the vendor).

### 3. Cap (wholesale must beat retail by ≥5%)

```
cap = retail × 0.95
```

Each tier price is capped at this maximum. Wholesale buyers should always see a meaningful discount vs. retail. If even tier A's floor exceeds the cap, the product gets caps applied (best-effort) and may show a flat ladder.

### 4. Gap rule (no two adjacent tiers may have the same price)

After floor + cap, enforce a $2-minimum gap between adjacent tiers, walking from F (highest volume, lowest price) upward to A (lowest volume, highest price):

```javascript
e = min(max(e, f + 2), cap)
d = min(max(d, e + 2), cap)
c = min(max(c, d + 2), cap)
b = min(max(b, c + 2), cap)
a = min(max(a, b + 2), cap)
```

If the cap forces equality (rare, for very low-margin products), the cap wins.

**Side effect worth knowing:** for thin-margin products where the raw formula would plateau at the floor (e.g., AOD-9604 5mg with $9.90 cost / $37 retail), the gap rule pushes the lower-volume tiers up. The product ends up MORE profitable than the pure "% off retail" formula would dictate. Not literally "50% off retail" anymore — it's "50% off retail OR cost+$4+$2×position_above_F, whichever higher, capped at retail×0.95."

### 5. Viability filter

Products where `floor > cap` (i.e., `cost + $4 > retail × 0.95`) are completely hidden from the sheet. They can't be sold wholesale ≥5% off retail without losing money. The script logs the hidden list to the console so it's visible.

With current data + the gap rule, **84 of 87 active products are viable.** Only 3 hidden.

### 6. Display

- Each price rounded to nearest dollar (`Math.round`)
- Tier F price rendered in cyan + 11pt to draw the eye (it's the headline number)
- Retail price shown in muted gray for context
- Categories ordered: Weight Loss → GH → Longevity → Recovery → Immune → Cognitive → Sexual Health → Sleep → Skin → Cosmetic → Peptide Blend → Pharma → Supplies

---

## Worked examples

### Retatrutide 10mg

- DB cost: $85 (per 10-pack) → **$8.50/vial**
- Retail: $99
- Floor: $12.50
- Cap: $94.05

| Tier | Raw | After floor | After cap | After gap rule | Final |
|---|---|---|---|---|---|
| A | $49.50 | $49.50 | $49.50 | $49.50 | **$50** |
| B | $39.60 | $39.60 | $39.60 | $39.60 | **$40** |
| C | $34.65 | $34.65 | $34.65 | $34.65 | **$35** |
| D | $24.75 | $24.75 | $24.75 | $24.75 | **$25** |
| E | $19.80 | $19.80 | $19.80 | $19.80 | **$20** |
| F | $9.90 | $12.50 | $12.50 | $12.50 | **$13** |

### AOD-9604 5mg (thin-margin example)

- DB cost: $99 (per 10-pack) → **$9.90/vial**
- Retail: $37
- Floor: $13.90
- Cap: $35.15

| Tier | Raw | After floor | After cap | After gap rule | Final |
|---|---|---|---|---|---|
| A | $18.50 | $18.50 | $18.50 | $23.90 | **$24** |
| B | $14.80 | $14.80 | $14.80 | $21.90 | **$22** |
| C | $12.95 | $13.90 | $13.90 | $19.90 | **$20** |
| D | $9.25 | $13.90 | $13.90 | $17.90 | **$18** |
| E | $7.40 | $13.90 | $13.90 | $15.90 | **$16** |
| F | $3.70 | $13.90 | $13.90 | $13.90 | **$14** |

Without the gap rule, tiers C–F would all flat at $14. The gap rule turns this into a clean stepped ladder.

---

## Customer-facing language for the sheet

- **"PRICES PER VIAL · ORDERS IN 10-UNIT INCREMENTS · MIN 10 PER SKU"** — banner at top
- **"HOW TO READ THE TIERS · A 10–90 · B 100–190 · C 200–290 · D 300–390 · E 400–490 · F 500+"** — legend
- Footer: lead time 7–14 business days, research use only disclaimer, contact wholesale@advncelabs.com

---

## When to revisit the formula

- New product categories added → may need different floor/cap/discount rules
- Vendor costs shift significantly → regenerate; gap rule will push pricing up
- A buyer pushes back on a specific tier → consider per-product price overrides (not currently implemented; would need a `wholesale_overrides` table or JSON map)

---

## Brand reference

The sheet renders per the advnce labs brand identity at [`docs/brand/advncelabs-brand-identity.md`](brand/advncelabs-brand-identity.md):
- Cream `#F4F2EE` background, ink `#1A1C22` text
- Cyan `#00A0A8` primary accent (headlines, top-tier prices)
- Amber `#E07C24` secondary accent (logo dot, DRAFT marker)
- Barlow Condensed + Cormorant Garamond + JetBrains Mono
- Canonical SVG logo (cyan ascending line + amber dot)

Do not deviate. If the brand guide is updated, also update [`scripts/generate-wholesale-sheet.mjs`](../scripts/generate-wholesale-sheet.mjs).
