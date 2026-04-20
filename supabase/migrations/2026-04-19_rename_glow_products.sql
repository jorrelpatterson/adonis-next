-- Rename BBG Blend → "Glow Plus" and tighten GLOW50 → "Glow"
-- Both products contain BPC-157 + TB-500 + GHK-Cu, just in different doses.
--   Glow      (GL50)  = 50mg total: BPC 5  + TB 10 + GHK 35
--   Glow Plus (BBG70) = 70mg total: BPC 10 + TB 10 + GHK 50

BEGIN;

-- BBG70 → Glow Plus
UPDATE products
SET name = 'Glow Plus',
    description = REGEXP_REPLACE(
                    REGEXP_REPLACE(COALESCE(description,''), 'BBG\s*Blend', 'Glow Plus', 'gi'),
                    '\mBBG\M', 'Glow Plus', 'g'
                  ),
    updated_at = now()
WHERE sku = 'BBG70';

-- GL50 → Glow
UPDATE products
SET name = 'Glow',
    description = REGEXP_REPLACE(
                    REGEXP_REPLACE(COALESCE(description,''), 'GLOW\s*50\s*Blend', 'Glow', 'gi'),
                    '\mGLOW\s*50\M', 'Glow', 'gi'
                  ),
    updated_at = now()
WHERE sku = 'GL50';

-- Sanity check (uncomment to inspect):
-- SELECT sku, name, LEFT(description, 200) AS desc_preview FROM products WHERE sku IN ('BBG70','GL50');

COMMIT;
