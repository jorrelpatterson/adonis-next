-- Rename SLU-PP-322 → SLU-PP-332 to match Eve's sheet naming.
-- SKU stays SL322 (internal identifier); only the display name changes.

BEGIN;

UPDATE products
SET name = 'SLU-PP-332', updated_at = now()
WHERE sku = 'SL322';

COMMIT;
