-- =========================================================================
-- Record 3 POs from xlsx + Jorrel's vendor attribution (2026-04-18)
-- Eve: pending shipment, status=submitted
-- Weak: arrived, status=received (Survodutide OOS, swapped for 3× Reta 10mg)
-- Rosyy: 3 of 4 items arrived, status=partial (Epitalon 50mg never came; +$60 freight)
-- Run in Supabase SQL editor.
-- =========================================================================

-- Cleanup if a prior version of PO-2026-0001 was inserted by an earlier run:
DELETE FROM purchase_orders WHERE po_number IN ('PO-2026-0001','PO-2026-0002','PO-2026-0003');

-- ===== EVE — pending (PO-2026-0001) =====
WITH new_po AS (
  INSERT INTO purchase_orders (po_number, vendor_id, status, total_cost, notes, submitted_at)
  SELECT 'PO-2026-0001', id, 'submitted', 1350, 'Imported from xlsx 2026-04-18 — Eve pending shipment, not yet arrived.', '2026-04-18T18:42:14Z'
  FROM vendors WHERE name = 'Eve' RETURNING id
)
INSERT INTO purchase_order_items (po_id, product_id, qty_ordered, unit_cost)
SELECT new_po.id, p.id, v.kits, v.cost FROM new_po, products p JOIN (VALUES
  ('SM15', 1, 55),
  ('RT10', 1, 85),
  ('BP10', 1, 70),
  ('CJCI10', 1, 100),
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

-- ===== WEAK — received (PO-2026-0002) =====
WITH new_po AS (
  INSERT INTO purchase_orders (po_number, vendor_id, status, total_cost, notes, submitted_at, received_at)
  SELECT 'PO-2026-0002', id, 'received', 997, 'Imported from xlsx 2026-04-18 — Weak arrived shipment. Survodutide 10mg was OOS; Weak substituted with 3 boxes of Retatrutide 10mg at no extra charge.', '2026-04-18T18:42:14Z', '2026-04-18T18:42:14Z'
  FROM vendors WHERE name = 'Weak' RETURNING id
)
INSERT INTO purchase_order_items (po_id, product_id, qty_ordered, unit_cost, qty_received, received_at)
SELECT new_po.id, p.id, v.kits, v.cost, v.kits, '2026-04-18T18:42:14Z' FROM new_po, products p JOIN (VALUES
  ('BBG70', 1, 228),
  ('LL5', 1, 92),
  ('SELA10', 1, 72),
  ('SEMA10', 1, 71),
  ('RT10', 3, 99),
  ('TB10', 1, 169),
  ('MT2', 1, 68)
) AS v(sku, kits, cost) ON p.sku = v.sku;

-- ===== ROSYY — partial (PO-2026-0003) — Epitalon 50mg never arrived; $60 freight included =====
WITH new_po AS (
  INSERT INTO purchase_orders (po_number, vendor_id, status, total_cost, notes, submitted_at, received_at)
  SELECT 'PO-2026-0003', id, 'partial', 508, 'Imported from xlsx 2026-04-18. Rosyy shipment — KL80 + GHKC100 + G610 arrived; Epitalon 50mg never came. Includes $60 freight (not a line item).', '2026-04-18T18:42:14Z', '2026-04-18T18:42:14Z'
  FROM vendors WHERE name = 'Rosyy' RETURNING id
)
INSERT INTO purchase_order_items (po_id, product_id, qty_ordered, unit_cost, qty_received, received_at)
SELECT new_po.id, p.id, v.kits, v.cost, v.received, '2026-04-18T18:42:14Z' FROM new_po, products p JOIN (VALUES
  ('KL80', 1, 219, 1),
  ('EP50', 1, 127, 0),
  ('GHKC100', 1, 54, 1),
  ('G610', 1, 48, 1)
) AS v(sku, kits, cost, received) ON p.sku = v.sku;

-- ===== UPDATE products.cost + vendor for arrived items =====
-- Weak items (received now reflects Weak as latest source)
UPDATE products SET cost = 228, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'BBG70';
UPDATE products SET cost = 92, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'LL5';
UPDATE products SET cost = 72, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'SELA10';
UPDATE products SET cost = 71, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'SEMA10';
UPDATE products SET cost = 99, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'RT10';
UPDATE products SET cost = 169, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'TB10';
UPDATE products SET cost = 68, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'MT2';
UPDATE products SET cost = 9, vendor = 'Weak', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'WA10';
-- Rosyy items
UPDATE products SET cost = 219, vendor = 'Rosyy', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'KL80';
UPDATE products SET cost = 54, vendor = 'Rosyy', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'GHKC100';
UPDATE products SET cost = 48, vendor = 'Rosyy', updated_at = '2026-04-18T18:42:14Z' WHERE sku = 'G610';
