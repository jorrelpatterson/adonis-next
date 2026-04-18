-- One-shot reconciliation: align products.cost with the cheapest current vendor_price.
-- WHY: the 2026-04-17 seed bug fix only updated vendor_prices, leaving products.cost
-- carrying stale ~55%-of-real-price values. Going forward, /api/purchase-receive
-- updates products.cost from each line's unit_cost, so we don't need a recurring job.

BEGIN;

WITH cheapest AS (
  SELECT product_id, MIN(cost_per_kit) AS min_cost
  FROM vendor_prices
  WHERE cost_per_kit IS NOT NULL
  GROUP BY product_id
)
UPDATE products p
SET cost = c.min_cost,
    updated_at = now()
FROM cheapest c
WHERE p.id = c.product_id
  AND (p.cost IS NULL OR ABS(COALESCE(p.cost, 0) - c.min_cost) > 0.5);

-- Quick sanity check (run this after the UPDATE in the SQL editor):
-- SELECT sku, name, cost FROM products WHERE sku IN ('5AM','BP10','TZ10','RT10') ORDER BY sku;

COMMIT;
