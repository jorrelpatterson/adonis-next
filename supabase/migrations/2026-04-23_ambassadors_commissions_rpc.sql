-- Capture ambassadors / referral_commissions / increment_ambassador_stats
-- from production so the schema is reproducible from migrations alone.
-- Uses IF NOT EXISTS + OR REPLACE so applying to existing prod is a no-op.
-- Also introduces ambassador_payouts (new in 2026-04-23 launch hardening spec).

CREATE TABLE IF NOT EXISTS ambassadors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  code          text UNIQUE NOT NULL,
  phone         text,
  referred_by   uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  tier          text NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter','builder','elite')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','banned')),
  total_orders  integer NOT NULL DEFAULT 0,
  total_earned  numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_commissions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          text NOT NULL,
  order_total       numeric NOT NULL,
  l1_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l2_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l3_ambassador_id  uuid REFERENCES ambassadors(id) ON DELETE SET NULL,
  l1_amount         numeric NOT NULL DEFAULT 0,
  l2_amount         numeric NOT NULL DEFAULT 0,
  l3_amount         numeric NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ambassador_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  period        text NOT NULL,
  l1_amount     numeric NOT NULL DEFAULT 0,
  l2_amount     numeric NOT NULL DEFAULT 0,
  l3_amount     numeric NOT NULL DEFAULT 0,
  total         numeric NOT NULL,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  sent_by       text,
  UNIQUE (ambassador_id, period)
);

-- Recreate the RPC in a transaction so the brief drop+create is atomic.
-- Defaults match production: only amb_id is required (per OpenAPI spec check 2026-04-23).
BEGIN;
DROP FUNCTION IF EXISTS increment_ambassador_stats(uuid, integer, numeric);
CREATE FUNCTION increment_ambassador_stats(
  amb_id uuid,
  order_increment integer DEFAULT 1,
  earned_increment numeric DEFAULT 0
) RETURNS void LANGUAGE sql AS $$
  UPDATE ambassadors
     SET total_orders = COALESCE(total_orders, 0) + order_increment,
         total_earned = COALESCE(total_earned, 0) + earned_increment
   WHERE id = amb_id;
$$;
COMMIT;
