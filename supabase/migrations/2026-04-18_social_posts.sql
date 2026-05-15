-- Social posts table for /admin/content (spec 2026-04-18)

CREATE TABLE IF NOT EXISTS social_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date  date NOT NULL,
  post_type       text NOT NULL CHECK (post_type IN ('compound_card','mechanism_diagram','stack_carousel','research_quote','standards_statement')),
  image_path      text NOT NULL,
  caption         text NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','posted','archived')),
  source_compound text,
  posted_at       timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read social_posts" ON social_posts;
CREATE POLICY "anon read social_posts" ON social_posts FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_social_posts_date ON social_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
