-- Add 81 oral tablet SKUs from Eve's 2026-04-21 finished products sheet.
-- All hidden by default (active=false) except DHA20 (Dihexa) which user wants activated.
-- Format: 'Tablets' is the unifying category aspect; sub-categorized by function (Anabolic/SARM/PCT/Pharma/etc.)
-- ON CONFLICT DO NOTHING for safety.

BEGIN;

-- Insert products
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Clenbuterol', '40mcg x 100 tabs', 'Stimulant', 'Eve', 15, 30.0, 0, 'CB40', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Clomiphene (Clomid)', '50mg x 100 tabs', 'PCT', 'Eve', 20, 40.0, 0, 'CD50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Letrozole', '2.5mg x 100 tabs', 'PCT', 'Eve', 15, 30.0, 0, 'LZ25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Fluoxymesterone (Halotestin)', '10mg x 100 tabs', 'Anabolic', 'Eve', 80, 160.0, 0, 'FX10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dianabol (Methandrostenolone)', '10mg x 100 tabs', 'Anabolic', 'Eve', 18, 36.0, 0, 'D10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dianabol (Methandrostenolone)', '20mg x 100 tabs', 'Anabolic', 'Eve', 25, 50.0, 0, 'D20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dianabol (Methandrostenolone)', '50mg x 100 tabs', 'Anabolic', 'Eve', 41, 82.0, 0, 'D50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Mesterolone (Proviron)', '10mg x 100 tabs', 'PCT', 'Eve', 25, 50.0, 0, 'P10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Mesterolone (Proviron)', '25mg x 100 tabs', 'PCT', 'Eve', 48, 96.0, 0, 'P25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Methenolone Acetate (Primobolan)', '10mg x 100 tabs', 'Anabolic', 'Eve', 65, 130.0, 0, 'M10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Methenolone Acetate (Primobolan)', '25mg x 100 tabs', 'Anabolic', 'Eve', 105, 210.0, 0, 'M25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Methenolone Acetate (Primobolan)', '50mg x 100 tabs', 'Anabolic', 'Eve', 190, 380.0, 0, 'M50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Superdrol (Methyldrostanolone)', '10mg x 100 tabs', 'Anabolic', 'Eve', 36, 72.0, 0, 'SD10TAB', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('T3 (Liothyronine sodium)', '25mcg x 100 tabs', 'Thyroid', 'Eve', 14, 28.0, 0, 'T325', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('T3 (Liothyronine sodium)', '40mcg x 100 tabs', 'Thyroid', 'Eve', 14, 28.0, 0, 'T340', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('T4 (Levothyroxine)', '40mcg x 100 tabs', 'Thyroid', 'Eve', 14, 28.0, 0, 'T440', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Anavar (Oxandrolone)', '10mg x 100 tabs', 'Anabolic', 'Eve', 26, 52.0, 0, 'X10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Anavar (Oxandrolone)', '25mg x 100 tabs', 'Anabolic', 'Eve', 47, 94.0, 0, 'X25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Anavar (Oxandrolone)', '50mg x 100 tabs', 'Anabolic', 'Eve', 81, 162.0, 0, 'X50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Anadrol (Oxymetholone)', '50mg x 100 tabs', 'Anabolic', 'Eve', 41, 82.0, 0, 'OXP50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Winstrol (Stanozolol)', '10mg x 100 tabs', 'Anabolic', 'Eve', 19, 38.0, 0, 'W10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Winstrol (Stanozolol)', '20mg x 100 tabs', 'Anabolic', 'Eve', 24, 48.0, 0, 'W20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Winstrol (Stanozolol)', '50mg x 100 tabs', 'Anabolic', 'Eve', 45, 90.0, 0, 'W50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Turinabol (Chlordehydromethyltestosterone)', '10mg x 100 tabs', 'Anabolic', 'Eve', 25, 50.0, 0, 'CT10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Turinabol (Chlordehydromethyltestosterone)', '25mg x 100 tabs', 'Anabolic', 'Eve', 50, 100.0, 0, 'CT25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Turinabol (Chlordehydromethyltestosterone)', '50mg x 100 tabs', 'Anabolic', 'Eve', 80, 160.0, 0, 'CT50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tamoxifen (Nolvadex)', '20mg x 100 tabs', 'PCT', 'Eve', 15, 30.0, 0, 'T20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Aromasin (Exemestane)', '25mg x 100 tabs', 'PCT', 'Eve', 45, 90.0, 0, 'XE25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Anastrozole (Arimidex)', '1mg x 100 tabs', 'PCT', 'Eve', 15, 30.0, 0, 'DEX1', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Sildenafil (Viagra)', '100mg x 100 tabs', 'Pharma', 'Eve', 15, 30.0, 0, 'SD100', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tadalafil (Cialis)', '20mg x 100 tabs', 'Pharma', 'Eve', 15, 30.0, 0, 'DT20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Cock Bombs', '70mg x 100 tabs', 'Hormonal', 'Eve', 20, 40.0, 0, 'B70', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('DHB (1-Testosterone cypionate)', '10mg x 100 tabs', 'Anabolic', 'Eve', 35, 70.0, 0, '1TT10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Salbutamol', '20mg x 100 tabs', 'Stimulant', 'Eve', 15, 30.0, 0, 'SB20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Methylstenbolone', '10mg x 100 tabs', 'Anabolic', 'Eve', 55, 110.0, 0, 'MSB10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tesofensine', '500mcg x 100 tabs', 'Weight Loss', 'Eve', 45, 90.0, 0, 'T500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('LGD-4033 (Ligandrol)', '10mg x 100 tabs', 'SARM', 'Eve', 40, 80.0, 0, 'L40', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('MK-677 (Ibutamoren)', '10mg x 100 tabs', 'SARM', 'Eve', 40, 80.0, 0, 'M6', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SR9009', '10mg x 100 tabs', 'SARM', 'Eve', 50, 100.0, 0, 'S9', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('RAD140 (Testolone)', '10mg x 100 tabs', 'SARM', 'Eve', 50, 100.0, 0, 'R14', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Ostarine (MK-2866)', '25mg x 100 tabs', 'SARM', 'Eve', 35, 70.0, 0, 'M28', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('AICAR (oral)', '10mg x 100 tabs', 'Metabolic', 'Eve', 60, 120.0, 0, 'A10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Andarine S4', '25mg x 100 tabs', 'SARM', 'Eve', 35, 70.0, 0, 'S040', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GW-501516 (Cardarine)', '10mg x 100 tabs', 'SARM', 'Eve', 35, 70.0, 0, 'G50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('YK11', '10mg x 100 tabs', 'SARM', 'Eve', 80, 160.0, 0, 'Y1', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Cabergoline', '0.25mg x 100 tabs', 'PCT', 'Eve', 80, 160.0, 0, 'CG25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Finasteride', '5mg x 100 tabs', 'Pharma', 'Eve', 20, 40.0, 0, 'FS5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Flibanserin (Addyi)', '100mg x 30 tabs', 'Hormonal', 'Eve', 15, 30.0, 0, 'FB100', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('M1T (17a-Methyl-1-testosterone)', '10mg x 100 tabs', 'Anabolic', 'Eve', 30, 60.0, 0, 'M1T10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Prednisone', '10mg x 100 tabs', 'Pharma', 'Eve', 15, 30.0, 0, 'PDN10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('DNP', '200mg x 50 tabs', 'Weight Loss', 'Eve', 60, 120.0, 0, 'PND', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC-157 (oral tablet)', '500mcg x 100 tabs', 'Recovery', 'Eve', 60, 120.0, 0, 'B157', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC-157 (oral capsule)', '500mcg x 60 caps', 'Recovery', 'Eve', 45, 90.0, 0, 'BC500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide (oral)', '500mcg x 25 tabs', 'Weight Loss', 'Eve', 20, 40.0, 0, 'SMM2', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide (oral)', '3mg x 25 tabs', 'Weight Loss', 'Eve', 60, 120.0, 0, 'SMM3', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide (oral)', '7mg x 25 tabs', 'Weight Loss', 'Eve', 100, 200.0, 0, 'SMM7', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide (oral)', '500mcg x 25 tabs', 'Weight Loss', 'Eve', 20, 40.0, 0, 'TR500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('5-Amino-1MQ (oral)', '50mg x 25 tabs', 'Weight Loss', 'Eve', 35, 70.0, 0, 'AMQ50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Androxal (Enclomiphene)', '25mg x 100 tabs', 'PCT', 'Eve', 80, 160.0, 0, 'EC25', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Telmisartan', '40mg x 100 tabs', 'Pharma', 'Eve', 25, 50.0, 0, 'TM40', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Finasteride', '1mg x 100 tabs', 'Pharma', 'Eve', 20, 40.0, 0, 'FAN1', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dutasteride', '1mg x 100 tabs', 'Pharma', 'Eve', 20, 40.0, 0, 'DUT1', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Ivermectin', '5mg x 100 tabs', 'Pharma', 'Eve', 20, 40.0, 0, 'LV5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '250mcg x 100 tabs', 'Metabolic', 'Eve', 25, 50.0, 0, 'SLU250', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '500mcg x 100 tabs', 'Metabolic', 'Eve', 25, 50.0, 0, 'SLU500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '1000mcg x 100 tabs', 'Metabolic', 'Eve', 30, 60.0, 0, 'SLU1000', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '5mg x 100 tabs', 'Metabolic', 'Eve', 45, 90.0, 0, 'SLU5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '20mg x 100 tabs', 'Metabolic', 'Eve', 80, 160.0, 0, 'SLU120', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332', '50mg x 100 tabs', 'Metabolic', 'Eve', 128, 256.0, 0, 'SL50TAB', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332 (capsule)', '100mg x 100 caps', 'Metabolic', 'Eve', 128, 256.0, 0, 'SL100TAB', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Minoxidil', '5mg x 100 tabs', 'Pharma', 'Eve', 15, 30.0, 0, 'MD5', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('KPV (oral)', '500mcg x 100 tabs', 'Immune', 'Eve', 50, 100.0, 0, 'KP500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC + TB-500 Blend (oral)', '1000mcg x 100 tabs', 'Recovery', 'Eve', 160, 320.0, 0, 'BB500', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Methylene Blue', '1mg x 100 tabs', 'Cognitive', 'Eve', 20, 40.0, 0, 'MB20', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BAM15 (capsule)', '50mg x 60 caps', 'Weight Loss', 'Eve', 110, 220.0, 0, 'BAM50', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-332 + BAM15 Combo', '300mcg x 60 caps', 'Metabolic', 'Eve', 35, 70.0, 0, 'SB300', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Orforglipron', '6mg x 100 tabs', 'Weight Loss', 'Eve', 130, 260.0, 0, 'ORF6', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Orforglipron', '12mg x 100 tabs', 'Weight Loss', 'Eve', 249, 498.0, 0, 'ORF12', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dihexa', '20mg x 25 tabs', 'Cognitive', 'Eve', 130, 260.0, 0, 'DHA20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Isotretinoin (Accutane)', '10mg x 100 tabs', 'Pharma', 'Eve', 20, 40.0, 0, 'ISO10', '🟡', false) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dapoxetine (Priligy)', '30mg x 100 tabs', 'Hormonal', 'Eve', 30, 60.0, 0, 'DAP30', '🟡', false) ON CONFLICT (sku) DO NOTHING;

-- Insert vendor_prices for Eve
INSERT INTO vendor_prices (vendor_id, product_id, cost_per_kit)
SELECT (SELECT id FROM vendors WHERE name='Eve'), p.id, v.cost
FROM products p JOIN (VALUES
  ('CB40', 15),
  ('CD50', 20),
  ('LZ25', 15),
  ('FX10', 80),
  ('D10', 18),
  ('D20', 25),
  ('D50', 41),
  ('P10', 25),
  ('P25', 48),
  ('M10', 65),
  ('M25', 105),
  ('M50', 190),
  ('SD10TAB', 36),
  ('T325', 14),
  ('T340', 14),
  ('T440', 14),
  ('X10', 26),
  ('X25', 47),
  ('X50', 81),
  ('OXP50', 41),
  ('W10', 19),
  ('W20', 24),
  ('W50', 45),
  ('CT10', 25),
  ('CT25', 50),
  ('CT50', 80),
  ('T20', 15),
  ('XE25', 45),
  ('DEX1', 15),
  ('SD100', 15),
  ('DT20', 15),
  ('B70', 20),
  ('1TT10', 35),
  ('SB20', 15),
  ('MSB10', 55),
  ('T500', 45),
  ('L40', 40),
  ('M6', 40),
  ('S9', 50),
  ('R14', 50),
  ('M28', 35),
  ('A10', 60),
  ('S040', 35),
  ('G50', 35),
  ('Y1', 80),
  ('CG25', 80),
  ('FS5', 20),
  ('FB100', 15),
  ('M1T10', 30),
  ('PDN10', 15),
  ('PND', 60),
  ('B157', 60),
  ('BC500', 45),
  ('SMM2', 20),
  ('SMM3', 60),
  ('SMM7', 100),
  ('TR500', 20),
  ('AMQ50', 35),
  ('EC25', 80),
  ('TM40', 25),
  ('FAN1', 20),
  ('DUT1', 20),
  ('LV5', 20),
  ('SLU250', 25),
  ('SLU500', 25),
  ('SLU1000', 30),
  ('SLU5', 45),
  ('SLU120', 80),
  ('SL50TAB', 128),
  ('SL100TAB', 128),
  ('MD5', 15),
  ('KP500', 50),
  ('BB500', 160),
  ('MB20', 20),
  ('BAM50', 110),
  ('SB300', 35),
  ('ORF6', 130),
  ('ORF12', 249),
  ('DHA20', 130),
  ('ISO10', 20),
  ('DAP30', 30)
) AS v(sku, cost) ON p.sku = v.sku
ON CONFLICT (vendor_id, product_id) DO UPDATE SET cost_per_kit = EXCLUDED.cost_per_kit;

COMMIT;