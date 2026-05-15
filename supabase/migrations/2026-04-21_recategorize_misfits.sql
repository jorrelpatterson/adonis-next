-- Recategorize misfits to align with the 6 type buckets (Peptide / Steroid / SARM / Pharma / Supply / Cosmetic).
-- Cat changes ONLY — no schema or data structure changes.

BEGIN;

-- Pharma fixes: prescription drugs previously bucketed as "Hormonal" (which maps to Peptide bucket).
-- Cock Bombs (sex enhancement combo), Flibanserin (Addyi for HSDD), Dapoxetine (Priligy SSRI for PE)
UPDATE products SET cat = 'Pharma', updated_at = now() WHERE sku IN ('B70', 'FB100', 'DAP30');

-- Bug fix: Melatonin was assigned 'Skin' by my ensure-migration categorizer because the substring 'mela'
-- matched the rule for melanotan. It's a tablet hormone (OTC supplement), should be Pharma.
UPDATE products SET cat = 'Pharma', updated_at = now() WHERE sku = 'MTN10';

-- Cosmetic expansion: items currently scattered across Pharma/Cognitive/etc. that customers shop as cosmetics.
-- NP8 = Snap-8 (peptide Botox alternative for wrinkles)
-- MD5 = Minoxidil (hair growth)
-- FAN1 = Finasteride 1mg (hair-loss dose, vs FS5 = 5mg prostate dose stays Pharma)
-- DUT1 = Dutasteride (hair)
UPDATE products SET cat = 'Cosmetic', updated_at = now() WHERE sku IN ('NP8', 'MD5', 'FAN1', 'DUT1');

COMMIT;
