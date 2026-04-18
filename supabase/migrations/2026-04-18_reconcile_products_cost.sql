-- One-shot reconciliation: align products.cost AND products.vendor with the cheapest current vendor_price.
-- WHY: the 2026-04-17 seed bug fix only updated vendor_prices, leaving products.cost
-- carrying stale ~55%-of-real-price values, and products.vendor as a static label
-- that didn't reflect actual sourcing decisions. Going forward, /api/purchase-receive
-- updates both fields from each line's unit_cost + PO vendor.

BEGIN;

WITH ranked AS (
  SELECT vp.product_id,
         vp.cost_per_kit,
         v.name AS vendor_name,
         ROW_NUMBER() OVER (PARTITION BY vp.product_id ORDER BY vp.cost_per_kit ASC) AS rn
  FROM vendor_prices vp
  JOIN vendors v ON v.id = vp.vendor_id
  WHERE vp.cost_per_kit IS NOT NULL
)
UPDATE products p
SET cost = r.cost_per_kit,
    vendor = r.vendor_name,
    updated_at = now()
FROM ranked r
WHERE p.id = r.product_id
  AND r.rn = 1
  AND (p.cost IS NULL
       OR ABS(COALESCE(p.cost, 0) - r.cost_per_kit) > 0.5
       OR p.vendor IS DISTINCT FROM r.vendor_name);

-- Sanity check (run after the UPDATE in the SQL editor):
-- SELECT sku, name, vendor, cost FROM products WHERE sku IN ('5AM','BP10','TZ10','RT10') ORDER BY sku;

COMMIT;
