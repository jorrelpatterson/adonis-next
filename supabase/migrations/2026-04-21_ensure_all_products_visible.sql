-- Ensure every SKU in vendor JSONs has a products row + is active.
-- Uses ON CONFLICT DO NOTHING so existing products are untouched.
-- After insert, UPDATE active=true for any matching SKUs (in case they were hidden).
-- Default cost = cheapest vendor's cost_per_kit, default retail = (cost/10)*1.5 rounded.
-- User should re-set retail prices via admin after this.

BEGIN;

-- Insert missing products (ON CONFLICT skips existing)
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('AOD-9604', '5mg', 'Weight Loss', 'Weak', 99.0, 30.0, 0, '5AD', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('5-Amino-1MQ', '5mg', 'Weight Loss', 'Rosyy', 42.0, 13.0, 0, '5AM', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Adipotide', '5mg', 'Weight Loss', 'Weak', 140.0, 42.0, 0, 'ADP5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('AICAR', '50mg', 'Weight Loss', 'Weak', 60.0, 18.0, 0, 'AI50', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('ARA-290', '10mg', 'Immune', 'Rosyy', 63.0, 19.0, 0, 'AR10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('B12', '10ml', 'Skin', 'Weak', 39.0, 12.0, 0, 'B12', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC+TB Blend', '10mg', 'Recovery', 'Rosyy', 90.0, 27.0, 0, 'BB10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC+TB Blend', '20mg', 'Recovery', 'Eve', 170.0, 51.0, 0, 'BB20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BBG Blend', '70mg', 'Recovery', 'Eve', 195.0, 58.0, 0, 'BBG70', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC-157', '10mg', 'Recovery', 'Rosyy', 64.0, 19.0, 0, 'BP10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('BPC-157', '5mg', 'Recovery', 'Eve', 40.0, 12.0, 0, 'BP5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Cerebrolysin', '60mg', 'Cognitive', 'Rosyy', 22.0, 7.0, 0, 'CB60', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC-1295 wDAC', '5mg', 'Growth Hormone', 'Rosyy', 165.0, 50.0, 0, 'CD5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC-1295 noDAC', '10mg', 'Growth Hormone', 'Weak', 135.0, 40.0, 0, 'CND10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CJC-1295 noDAC', '5mg', 'Growth Hormone', 'Weak', 75.0, 22.0, 0, 'CND5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CagriSema', '10mg', 'Weight Loss', 'Weak', 150.0, 45.0, 0, 'CS10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('CagriSema', '5mg', 'Weight Loss', 'Eve', 100.0, 30.0, 0, 'CS5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Dermorphin', '5mg', 'Recovery', 'Weak', 36.0, 11.0, 0, 'DM5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('DSIP', '15mg', 'Sleep', 'Eve', 100.0, 30.0, 0, 'DS15', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('DSIP', '5mg', 'Sleep', 'Eve', 40.0, 12.0, 0, 'DS5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Epitalon', '10mg', 'Longevity', 'Eve', 50.0, 15.0, 0, 'EP10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Epitalon', '50mg', 'Longevity', 'Rosyy', 127.0, 38.0, 0, 'EP50', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HCG', '10000iu', 'Growth Hormone', 'Rosyy', 148.0, 44.0, 0, 'G10K', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HCG', '5000iu', 'Growth Hormone', 'Rosyy', 78.0, 23.0, 0, 'G5K', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHRP-6', '10mg', 'Growth Hormone', 'Rosyy', 48.0, 14.0, 0, 'G610', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHRP-6', '5mg', 'Growth Hormone', 'Eve', 25.0, 8.0, 0, 'G65', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HMG', '75iu', 'Growth Hormone', 'Weak', 63.0, 19.0, 0, 'G75', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GHK-Cu', '50mg', 'Skin', 'Eve', 30.0, 9.0, 0, 'GC50', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GKP Blend', '70mg', 'Recovery', 'Eve', 120.0, 36.0, 0, 'GKP70', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('GLOW50 Blend', '50mg', 'Recovery', 'Eve', 160.0, 48.0, 0, 'GL50', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Glutathione', '1500mg', 'Longevity', 'Eve', 70.0, 21.0, 0, 'GT1500', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Glutathione', '600mg', 'Longevity', 'Eve', 35.0, 10.0, 0, 'GT600', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HGH', '10iu', 'Growth Hormone', 'Weak', 50.0, 15.0, 0, 'H10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('HGH', '15iu', 'Growth Hormone', 'Eve', 80.0, 24.0, 0, 'H15', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('IGF-1 LR3', '0.1mg', 'Growth Hormone', 'Rosyy', 36.0, 11.0, 0, 'IG01', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('IGF-1 LR3', '1mg', 'Growth Hormone', 'Eve', 210.0, 63.0, 0, 'IG1', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('IGF-DES', '1mg', 'Growth Hormone', 'Eve', 60.0, 18.0, 0, 'IGD1', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Ipamorelin', '10mg', 'Growth Hormone', 'Weak', 65.0, 20.0, 0, 'IP10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Ipamorelin', '5mg', 'Growth Hormone', 'Eve', 45.0, 14.0, 0, 'IP5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('KLOW', '80mg', 'Recovery', 'Rosyy', 219.0, 66.0, 0, 'KL80', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Kisspeptin-10', '10mg', 'Hormonal', 'Weak', 85.0, 26.0, 0, 'KS10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Kisspeptin-10', '5mg', 'Hormonal', 'Weak', 50.0, 15.0, 0, 'KS5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('KPV', '10mg', 'Immune', 'Rosyy', 58.0, 17.0, 0, 'KV10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('KPV', '5mg', 'Immune', 'Weak', 38.0, 11.0, 0, 'KV5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('LL-37', '5mg', 'Immune', 'Rosyy', 91.0, 27.0, 0, 'LL5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('MOTS-c', '10mg', 'Growth Hormone', 'Weak', 69.0, 21.0, 0, 'MC10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('MOTS-c', '40mg', 'Growth Hormone', 'Rosyy', 185.0, 56.0, 0, 'MC40', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Melanotan I', '5mg', 'Weight Loss', 'Eve', 50.0, 15.0, 0, 'MT1', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Melanotan II', '10mg', 'Weight Loss', 'Eve', 45.0, 14.0, 0, 'MT2', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Melatonin', '10mg', 'Skin', 'Weak', 184.0, 55.0, 0, 'MTN10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Mazdutide', '10mg', 'Weight Loss', 'Weak', 199.0, 60.0, 0, 'MZ10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('NAD+', '100mg', 'Longevity', 'Weak', 40.0, 12.0, 0, 'NA100', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('NAD+', '500mg', 'Longevity', 'Weak', 69.0, 21.0, 0, 'NA500', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Snap-8', '10mg', 'Cognitive', 'Weak', 42.0, 13.0, 0, 'NP8', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Oxytocin Acetate', '10mg', 'Sleep', 'Weak', 85.0, 26.0, 0, 'OT10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Pinealon', '10mg', 'Longevity', 'Rosyy', 63.0, 19.0, 0, 'PI10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Pinealon', '20mg', 'Longevity', 'Rosyy', 97.0, 29.0, 0, 'PI20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Pinealon', '5mg', 'Longevity', 'Rosyy', 41.0, 12.0, 0, 'PI5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('PNC-27', '10mg', 'Immune', 'Rosyy', 165.0, 50.0, 0, 'PNC10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('PNC-27', '5mg', 'Immune', 'Rosyy', 95.0, 28.0, 0, 'PNC5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('PT-141', '10mg', 'Hormonal', 'Eve', 60.0, 18.0, 0, 'PT10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '10mg', 'Weight Loss', 'Eve', 85.0, 26.0, 0, 'RT10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '20mg', 'Weight Loss', 'Eve', 135.0, 40.0, 0, 'RT20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Retatrutide', '5mg', 'Weight Loss', 'Eve', 50.0, 15.0, 0, 'RT5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Selank', '11mg', 'Cognitive', 'Eve', 65.0, 20.0, 0, 'SK11', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Selank', '5mg', 'Cognitive', 'Weak', 42.0, 13.0, 0, 'SK5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SLU-PP-322', '5mg', 'Metabolic', 'Rosyy', 129.0, 39.0, 0, 'SL322', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide', '10mg', 'Weight Loss', 'Eve', 45.0, 14.0, 0, 'SM10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide', '15mg', 'Weight Loss', 'Eve', 55.0, 16.0, 0, 'SM15', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide', '20mg', 'Weight Loss', 'Eve', 70.0, 21.0, 0, 'SM20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide', '30mg', 'Weight Loss', 'Eve', 90.0, 27.0, 0, 'SM30', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semaglutide', '5mg', 'Weight Loss', 'Eve', 30.0, 9.0, 0, 'SM5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Sermorelin', '10mg', 'Growth Hormone', 'Rosyy', 108.0, 32.0, 0, 'SR10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Sermorelin', '5mg', 'Growth Hormone', 'Rosyy', 68.0, 20.0, 0, 'SR5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SS-31', '10mg', 'Recovery', 'Eve', 85.0, 26.0, 0, 'SS10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('SS-31', '50mg', 'Recovery', 'Eve', 340.0, 102.0, 0, 'SS50', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Survodutide', '10mg', 'Weight Loss', 'Eve', 280.0, 84.0, 0, 'SV10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semax', '11mg', 'Cognitive', 'Eve', 55.0, 16.0, 0, 'SX11', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Semax', '5mg', 'Cognitive', 'Weak', 42.0, 13.0, 0, 'SX5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Thymosin Alpha-1', '10mg', 'Immune', 'Rosyy', 165.0, 50.0, 0, 'TA10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Thymosin Alpha-1', '5mg', 'Immune', 'Rosyy', 89.0, 27.0, 0, 'TA5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('TB-500', '10mg', 'Recovery', 'Eve', 135.0, 40.0, 0, 'TB10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('TB-500', '5mg', 'Recovery', 'Eve', 75.0, 22.0, 0, 'TB5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tesamorelin', '10mg', 'Growth Hormone', 'Eve', 185.0, 56.0, 0, 'TE10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tesamorelin', '15mg', 'Growth Hormone', 'Eve', 230.0, 69.0, 0, 'TE15', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tesamorelin', '5mg', 'Growth Hormone', 'Eve', 100.0, 30.0, 0, 'TE5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Thymalin', '10mg', 'Longevity', 'Rosyy', 61.0, 18.0, 0, 'TM10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '10mg', 'Weight Loss', 'Eve', 45.0, 14.0, 0, 'TZ10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '15mg', 'Weight Loss', 'Eve', 55.0, 16.0, 0, 'TZ15', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '20mg', 'Weight Loss', 'Eve', 70.0, 21.0, 0, 'TZ20', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '30mg', 'Weight Loss', 'Eve', 90.0, 27.0, 0, 'TZ30', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '40mg', 'Weight Loss', 'Eve', 120.0, 36.0, 0, 'TZ40', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Tirzepatide', '5mg', 'Weight Loss', 'Eve', 35.0, 10.0, 0, 'TZ5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('VIP', '10mg', 'Immune', 'Rosyy', 141.0, 42.0, 0, 'VP10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('VIP', '5mg', 'Immune', 'Rosyy', 77.0, 23.0, 0, 'VP5', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Bac Water', '10ml', 'Supplies', 'Weak', 9.0, 5, 0, 'WA10', '🟡', true) ON CONFLICT (sku) DO NOTHING;
INSERT INTO products (name, size, cat, vendor, cost, retail, stock, sku, risk, active) VALUES ('Bac Water', '3ml', 'Supplies', 'Weak', 6.0, 5, 0, 'WA3', '🟡', true) ON CONFLICT (sku) DO NOTHING;

-- Unhide any matching SKUs (in case they were active=false)
UPDATE products SET active = true WHERE sku IN (
  '5AD',  '5AM',  'ADP5',  'AI50',  'AR10',  'B12',  'BB10',  'BB20',  'BBG70',  'BP10',  'BP5',  'CB60',  'CD5',  'CND10',  'CND5',  'CS10',  'CS5',  'DM5',  'DS15',  'DS5',  'EP10',  'EP50',  'G10K',  'G5K',  'G610',  'G65',  'G75',  'GC50',  'GKP70',  'GL50',  'GT1500',  'GT600',  'H10',  'H15',  'IG01',  'IG1',  'IGD1',  'IP10',  'IP5',  'KL80',  'KS10',  'KS5',  'KV10',  'KV5',  'LL5',  'MC10',  'MC40',  'MT1',  'MT2',  'MTN10',  'MZ10',  'NA100',  'NA500',  'NP8',  'OT10',  'PI10',  'PI20',  'PI5',  'PNC10',  'PNC5',  'PT10',  'RT10',  'RT20',  'RT5',  'SK11',  'SK5',  'SL322',  'SM10',  'SM15',  'SM20',  'SM30',  'SM5',  'SR10',  'SR5',  'SS10',  'SS50',  'SV10',  'SX11',  'SX5',  'TA10',  'TA5',  'TB10',  'TB5',  'TE10',  'TE15',  'TE5',  'TM10',  'TZ10',  'TZ15',  'TZ20',  'TZ30',  'TZ40',  'TZ5',  'VP10',  'VP5',  'WA10',  'WA3'
) AND active = false;

COMMIT;
