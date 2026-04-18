-- Pending PO from Eve (imported from peptide_inventory_and_labels.xlsx 2026-04-18)
-- Run in Supabase SQL editor.

WITH new_po AS (
  INSERT INTO purchase_orders (po_number, vendor_id, status, total_cost, notes, submitted_at)
  SELECT 'PO-2026-0001', id, 'submitted', 1350, 'Imported from xlsx 2026-04-18. Order placed manually with Eve before adonis-next PO system. Recording for tracking + receiving workflow.', '2026-04-18T18:08:53Z'
  FROM vendors WHERE name = 'Eve'
  RETURNING id
)
INSERT INTO purchase_order_items (po_id, product_id, qty_ordered, unit_cost)
SELECT new_po.id, p.id, v.kits, v.cost
FROM new_po, products p JOIN (VALUES
  ('SM15', 1, 55),
  ('RT10', 1, 85),
  ('BP10', 1, 70),
  ('CND10', 1, 100),
  ('MC40', 1, 200),
  ('SX5', 1, 45),
  ('DS5', 1, 40),
  ('TE5', 1, 100),
  ('SR10', 1, 115),
  ('NA500', 1, 70),
  ('SS50', 1, 340),
  ('GT1500', 1, 70),
  ('WA10', 4, 15)
) AS v(sku, kits, cost) ON p.sku = v.sku;