-- Add missing vendor_prices for products that exist in DB but had our_sku=null in JSONs.
-- Maps by name+size (since our_sku was the gap). Idempotent via ON CONFLICT.

BEGIN;

-- ===== Eve =====
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT (SELECT id FROM vendors WHERE name='Eve'), p.id, v.cost
FROM products p JOIN (VALUES
  ('BOTU100', 145),
  ('CJCI10', 100),
  ('CAGR10', 200),
  ('CAGR5', 115),
  ('GHKC100', 50),
  ('GLUT120', 60),
  ('LEMO5M', 70),
  ('LIPO216', 70),
  ('LIPO120', 70),
  ('OXYT2', 30),
  ('RETA15', 110),
  ('RETA24', 155),
  ('RETA30', 190),
  ('RETA36', 220),
  ('RETA40', 255),
  ('RETA50', 310),
  ('RETA60', 350),
  ('TIRZ45', 135),
  ('TIRZ50', 145),
  ('TIRZ60', 165)
) AS v(sku, cost) ON p.sku = v.sku
ON CONFLICT (vendor_id, product_id) DO UPDATE SET cost_per_kit = EXCLUDED.cost_per_kit;

-- ===== Weak =====
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT (SELECT id FROM vendors WHERE name='Weak'), p.id, v.cost
FROM products p JOIN (VALUES
  ('5AMI10', 125),
  ('5AMI50', 165),
  ('AOD910', 189),
  ('ACET10M', 11),
  ('ACET3M', 9),
  ('CJCI10', 99),
  ('CJC12', 45),
  ('CJC121', 73),
  ('CAGR10', 231),
  ('CAGR5', 119),
  ('DSIP10', 85),
  ('FOXO10', 367),
  ('GHKC100', 50),
  ('GHRP10', 55),
  ('GHRP5', 29),
  ('HCG1000', 50),
  ('HCG2000', 79),
  ('HGH12I', 69),
  ('HGH24I', 119),
  ('LEMO10M', 80),
  ('LIPO216', 80),
  ('F2', 63),
  ('MOTS20', 126),
  ('MELA10', 68),
  ('NAD1000', 99),
  ('OXYT21', 30),
  ('OXYT5', 50),
  ('PEGM2', 92),
  ('RETA15', 128),
  ('RETA30', 258),
  ('RETA40', 308),
  ('RETA50', 388),
  ('RETA60', 468),
  ('SELA10', 72),
  ('SEMA10', 71),
  ('TIRZ60', 228)
) AS v(sku, cost) ON p.sku = v.sku
ON CONFLICT (vendor_id, product_id) DO UPDATE SET cost_per_kit = EXCLUDED.cost_per_kit;

-- ===== Rosyy =====
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT (SELECT id FROM vendors WHERE name='Rosyy'), p.id, v.cost
FROM products p JOIN (VALUES
  ('CJCI10', 111),
  ('CAGR10', 199),
  ('CAGR5', 115),
  ('GHKC100', 54),
  ('GLUT120', 60),
  ('HGH24I', 150),
  ('HGH36I', 200),
  ('IGFD2', 56),
  ('LEMOU', 69),
  ('LIPO216', 69),
  ('LIPO120', 69),
  ('MELA10', 57),
  ('NAD1000', 150),
  ('OXYT21', 28),
  ('RETA15', 125),
  ('RETA24', 175),
  ('RETA30', 215),
  ('RETA36', 240),
  ('RETA40', 285),
  ('RETA50', 355),
  ('RETA60', 420),
  ('TIRZ45', 148),
  ('TIRZ50', 158),
  ('TIRZ60', 182)
) AS v(sku, cost) ON p.sku = v.sku
ON CONFLICT (vendor_id, product_id) DO UPDATE SET cost_per_kit = EXCLUDED.cost_per_kit;

COMMIT;