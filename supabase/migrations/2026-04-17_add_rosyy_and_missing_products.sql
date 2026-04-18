-- ADD ROSYY VENDOR + 48 NEW PRODUCTS (active=false, ready to toggle on later)
-- run this FIRST in Supabase SQL editor

INSERT INTO vendors (name, contact_phone) VALUES ('Rosyy', 'TODO_WHATSAPP') ON CONFLICT (name) DO NOTHING;

INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('5-Amino-1MQ', '10mg / 3ml', 'Weight Loss', 'Weak', 125.0, 250, 0, '5AMI10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('5-Amino-1MQ', '50mg / 3ml', 'Weight Loss', 'Weak', 165.0, 330, 0, '5AMI50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('AOD-9604', '10mg / 3ml', 'Weight Loss', 'Weak', 189.0, 378, 0, 'AOD910', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Acetic Acid Water', '10ml / 3ml', 'Supplies', 'Weak', 11.0, 22, 0, 'ACET10M', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Acetic Acid Water', '3ml / 3ml', 'Supplies', 'Weak', 9.0, 18, 0, 'ACET3M', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Botulinum toxin', '100u / 3ml', 'Cosmetic', 'Eve', 145.0, 290, 0, 'BOTU100', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC+IPA Blend', '10mg / 3ml', 'GH', 'Weak', 99.0, 198, 0, 'CJCI10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC-1295 noDAC', '2mg / 3ml', 'GH', 'Weak', 45.0, 90, 0, 'CJC12', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC-1295 wDAC', '2mg / 3ml', 'GH', 'Weak', 73.0, 146, 0, 'CJC121', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Cagrilintide', '10mg / 3ml', 'Weight Loss', 'Rosyy', 199.0, 398, 0, 'CAGR10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Cagrilintide', '5mg / 3ml', 'Weight Loss', 'Eve', 115.0, 230, 0, 'CAGR5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('DSIP', '10mg / 3ml', 'Sleep', 'Weak', 85.0, 170, 0, 'DSIP10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('FOXO4', '10mg / 3ml', 'Longevity', 'Weak', 367.0, 734, 0, 'FOXO10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHK-Cu', '100mg / 3ml', 'Skin', 'Eve', 50.0, 100, 0, 'GHKC100', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHRP-2', '10mg / 3ml', 'GH', 'Weak', 55.0, 110, 0, 'GHRP10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHRP-2', '5mg / 3ml', 'GH', 'Weak', 29.0, 58, 0, 'GHRP5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Glutathione', '1200mg / 3ml', 'Longevity', 'Eve', 60.0, 120, 0, 'GLUT120', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HCG', '1000iu / 3ml', 'GH', 'Weak', 50.0, 100, 0, 'HCG1000', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HCG', '2000iu / 3ml', 'GH', 'Weak', 79.0, 158, 0, 'HCG2000', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HGH', '12iu / 3ml', 'GH', 'Weak', 69.0, 138, 0, 'HGH12I', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HGH', '24iu / 3ml', 'GH', 'Weak', 119.0, 238, 0, 'HGH24I', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HGH', '36iu / 3ml', 'GH', 'Rosyy', 200.0, 400, 0, 'HGH36I', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('IGF-DES', '2mg / 3ml', 'GH', 'Rosyy', 56.0, 112, 0, 'IGFD2', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Lemon Bottle', '10ml / 3ml', 'Weight Loss', 'Weak', 80.0, 160, 0, 'LEMO10M', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Lemon Bottle', '5ml / 3ml', 'Weight Loss', 'Eve', 70.0, 140, 0, 'LEMO5M', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Lemon Bottle', 'unknown / 3ml', 'Weight Loss', 'Rosyy', 69.0, 138, 0, 'LEMOU', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Lipo-B 216 (MIC)', '216mg / 3ml', 'Weight Loss', 'Rosyy', 69.0, 138, 0, 'LIPO216', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Lipo-C 120', '120mg / 3ml', 'Weight Loss', 'Rosyy', 69.0, 138, 0, 'LIPO120', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('MGF', '2mg / 3ml', 'GH', 'Weak', 63.0, 126, 0, 'F2', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('MOTS-c', '20mg / 3ml', 'Recovery', 'Weak', 126.0, 252, 0, 'MOTS20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Melanotan I', '10mg / 3ml', 'Hormonal', 'Rosyy', 57.0, 114, 0, 'MELA10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('NAD+', '1000mg / 3ml', 'Longevity', 'Weak', 99.0, 198, 0, 'NAD1000', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Oxytocin', '2mg / 3ml', 'Hormonal', 'Eve', 30.0, 60, 0, 'OXYT2', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Oxytocin Acetate', '2mg / 3ml', 'Hormonal', 'Rosyy', 28.0, 56, 0, 'OXYT21', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Oxytocin Acetate', '5mg / 3ml', 'Hormonal', 'Weak', 50.0, 100, 0, 'OXYT5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('PEG MGF', '2mg / 3ml', 'GH', 'Weak', 92.0, 184, 0, 'PEGM2', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '15mg / 3ml', 'Weight Loss', 'Eve', 110.0, 220, 0, 'RETA15', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '24mg / 3ml', 'Weight Loss', 'Eve', 155.0, 310, 0, 'RETA24', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '30mg / 3ml', 'Weight Loss', 'Eve', 190.0, 380, 0, 'RETA30', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '36mg / 3ml', 'Weight Loss', 'Eve', 220.0, 440, 0, 'RETA36', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '40mg / 3ml', 'Weight Loss', 'Eve', 255.0, 510, 0, 'RETA40', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '50mg / 3ml', 'Weight Loss', 'Eve', 310.0, 620, 0, 'RETA50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '60mg / 3ml', 'Weight Loss', 'Eve', 350.0, 700, 0, 'RETA60', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Selank', '10mg / 3ml', 'Cognitive', 'Weak', 72.0, 144, 0, 'SELA10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semax', '10mg / 3ml', 'Cognitive', 'Weak', 71.0, 142, 0, 'SEMA10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '45mg / 3ml', 'Weight Loss', 'Eve', 135.0, 270, 0, 'TIRZ45', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '50mg / 3ml', 'Weight Loss', 'Eve', 145.0, 290, 0, 'TIRZ50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '60mg / 3ml', 'Weight Loss', 'Eve', 165.0, 330, 0, 'TIRZ60', '🟡', false) ON CONFLICT (sku) DO NOTHING;

-- Total new products: 48
