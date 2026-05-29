-- Allow news-queue posts to live on the Content Calendar.
-- The news queue (`post_drafts`) renders 4-slide carousels; when approved they
-- are copied into `social_posts` as `post_type = 'news_card'` so the VA works
-- from a single calendar. Expand the CHECK to accept the new type.
-- Drop + recreate because Postgres has no "ALTER CONSTRAINT" for CHECK clauses.
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_post_type_check;
ALTER TABLE social_posts ADD CONSTRAINT social_posts_post_type_check
  CHECK (post_type IN (
    'compound_card',
    'mechanism_diagram',
    'stack_carousel',
    'research_quote',
    'standards_statement',
    'wordmark_hero',
    'principles_carousel',
    'positioning_manifesto',
    'receipt_card',
    'news_card'
  ));
