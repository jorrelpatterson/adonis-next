-- Adonis user profiles — the server-side row for each Adonis user.
--
-- Architecture:
-- - Supabase Auth's `auth.users` table is the canonical user identity (email, password hash, etc.)
-- - This `adonis_profiles` table stores Adonis-specific data: tier, Stripe linkage, subscription status.
-- - User-editable profile fields (weight, age, goals, etc.) currently stay in localStorage.
--   When Phase 4 multi-device sync ships, those fields move here too.
--
-- IMPORTANT: This is a SEPARATE namespace from advnce labs customers.
-- Adonis users and advnce labs customers are intentionally NOT linked at MVP
-- (per legal firewall + product simplicity decision 2026-04-29).
--
-- Run in Supabase SQL editor. Idempotent — safe to re-run.

BEGIN;

-- 1. Profile table
CREATE TABLE IF NOT EXISTS adonis_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  stripe_customer_id TEXT UNIQUE,
  subscription_status TEXT,        -- 'active' | 'past_due' | 'canceled' | etc.
  subscription_id TEXT,            -- Stripe subscription ID
  current_period_end TIMESTAMPTZ,  -- when their access expires
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION adonis_profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS adonis_profiles_updated_at_trg ON adonis_profiles;
CREATE TRIGGER adonis_profiles_updated_at_trg
  BEFORE UPDATE ON adonis_profiles
  FOR EACH ROW EXECUTE FUNCTION adonis_profiles_set_updated_at();

-- 3. Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_adonis_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO adonis_profiles (id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_adonis ON auth.users;
CREATE TRIGGER on_auth_user_created_adonis
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_adonis_user();

-- 4. Row-level security: each user sees only their own profile
ALTER TABLE adonis_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON adonis_profiles;
CREATE POLICY "Users read own profile" ON adonis_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON adonis_profiles;
CREATE POLICY "Users update own profile" ON adonis_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Note: INSERT is handled by the trigger above (SECURITY DEFINER bypasses RLS).
-- DELETE is intentionally not allowed at the user level — handled via cascade
-- when auth.users row is deleted.

-- 5. Index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS adonis_profiles_stripe_customer_idx
  ON adonis_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMIT;

-- Sanity check (run separately):
-- SELECT id, tier, subscription_status FROM adonis_profiles LIMIT 5;
