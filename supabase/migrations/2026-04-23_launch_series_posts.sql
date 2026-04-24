-- 5-post launch series for advnce labs Instagram. Staircase cadence:
-- Day 0 wordmark → Day 2 principles → Day 4 positioning → Day 6 receipt → Day 9 catalog.

-- Expand post_type CHECK to accept the 4 new launch templates. Drop + recreate
-- because Postgres has no "ALTER CONSTRAINT" for CHECK clauses.
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
    'receipt_card'
  ));

-- Seed the 5 launch posts. Status = 'draft' so they don't show up in the
-- scheduled calendar until the user moves them explicitly. Editing captions
-- and scheduling is done from /admin/marketing/content.
INSERT INTO social_posts (id, scheduled_date, post_type, image_path, caption, status, source_compound)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '2026-04-24',
    'wordmark_hero',
    '/social-images/launch-01-wordmark.png',
    'A quiet opening.

advnce labs is now live.

We supply research-grade peptide compounds to qualified investigators. Every compound documented. Every lot traceable. Every batch accounted for.

We don''t make health claims. We don''t position as a supplement. We don''t stand in for your clinician.

We''re a chemical supplier. Full stop.

advncelabs.com

—
For research use only. Not for human consumption. Not evaluated by the FDA.

#peptideresearch #researchchemicals #biohackingscience #peptidescience',
    'draft',
    NULL
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '2026-04-26',
    'principles_carousel',
    '/social-images/launch-02-principles-1.png',
    'Three principles. No exceptions.

Most of the peptide market runs on opacity. Generic white-label. Mystery lot numbers. Claims they can''t back up.

We''re building the opposite of that.

If you research this space seriously, you already know the difference. If you don''t, this is what to look for — not just with us. With anyone.

Standards matter. Especially here.

#researchgrade #peptidequality #researchintegrity #biohacking',
    'draft',
    NULL
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '2026-04-28',
    'positioning_manifesto',
    '/social-images/launch-03-positioning.png',
    'We want to be unusually clear about what we are.

A chemical supplier. The compounds are research chemicals — a classification that carries legal weight and one we take seriously.

That means: the language we use is research language. The customers we serve are investigators. The documentation we ship makes protocol work possible, not wellness marketing.

The framing isn''t a disclaimer. It''s the product.

If you know why that distinction matters, you''re exactly who we built this for.

#researchonly #labchemistry #peptidescience #researchstandards',
    'draft',
    NULL
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    '2026-04-30',
    'receipt_card',
    '/social-images/launch-04-receipt.png',
    'The lot number on the vial matches the lot number on the COA.

This is the kind of detail most buyers never ask about. It is also the kind of detail that separates a compound you can do real work with from one you can''t.

Purity stated. Method documented. Batch traceable.

Any compound from our catalog — ask us for the COA. We''ll send it. That''s the standard. For every lot. Every time.

#coa #certificateofanalysis #traceability #researchgrade #peptidepurity',
    'draft',
    NULL
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    '2026-05-03',
    'compound_card',
    '/social-images/compound-bp10.png',
    'The catalog is open.

Five compounds to start — one from each research area we''re most frequently asked about. Full catalog is at advncelabs.com.

Every compound ships with manufacturer COA on request. Lot numbers are traceable. Purity stated, not assumed.

First-time subscribers get WELCOME10 at checkout. No expiry. No minimum.

Link in bio.

—
Carousel slides: BPC-157 (regenerative) · TB-500 (recovery) · Tirzepatide (metabolic) · NAD+ (longevity) · Sermorelin (endocrine). When posting, upload all 5 images in order from public/social-images/ (compound-bp10, -tb10, -tz10, -na500, -sr10).

#peptideresearch #researchpeptides #biohackingscience #peptidescience #bpc157 #tb500 #glp1research #nad',
    'draft',
    'BPC-157'
  );
