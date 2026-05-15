-- Track welcome 2 / welcome 3 sends per subscriber.
-- Welcome 1 is sent inline at signup (advnce-site/api/subscribe.js), so subscribed_at == welcome_1_sent_at.

ALTER TABLE IF EXISTS subscribers
  ADD COLUMN IF NOT EXISTS welcome_2_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_3_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscribers_welcome_2 ON subscribers(welcome_2_sent_at) WHERE welcome_2_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_welcome_3 ON subscribers(welcome_3_sent_at) WHERE welcome_3_sent_at IS NULL;
