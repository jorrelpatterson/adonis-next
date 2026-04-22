-- Discount codes + ambassador lifetime attribution.
-- See docs/superpowers/specs/2026-04-21-discount-codes-and-lifetime-attribution-design.md

BEGIN;

-- 1. Standalone promo codes (NOT ambassador codes — those are in ambassadors.code)
CREATE TABLE IF NOT EXISTS discount_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  type         text NOT NULL CHECK (type IN ('percent','fixed')),
  amount       numeric NOT NULL CHECK (amount > 0),
  active       boolean NOT NULL DEFAULT true,
  expires_at   timestamptz,
  usage_limit  integer,
  used_count   integer NOT NULL DEFAULT 0,
  min_order    numeric,
  max_discount numeric,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read discount_codes" ON discount_codes;
CREATE POLICY "anon read discount_codes" ON discount_codes FOR SELECT TO anon USING (active = true);

-- 2. Customer attribution by normalized phone (10-digit, no formatting)
CREATE TABLE IF NOT EXISTS customer_attribution (
  phone           text PRIMARY KEY,
  ambassador_id   uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  ambassador_code text NOT NULL,
  first_order_id  text NOT NULL,
  attributed_at   timestamptz DEFAULT now()
);

ALTER TABLE customer_attribution ENABLE ROW LEVEL SECURITY;
-- No anon read — admin only via service key

-- 3. Orders columns for discount + attribution metadata
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attribution_phone   text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code        text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type        text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount      numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_first_attributed  boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_attribution_phone ON orders(attribution_phone);
CREATE INDEX IF NOT EXISTS idx_customer_attribution_ambassador ON customer_attribution(ambassador_id);

COMMIT;
