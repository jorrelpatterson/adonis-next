-- sql/2026-04-29-news-candidate-flag.sql
-- Adds manual-flag capability so admin can hand-pick candidates the
-- Sunday curator MUST include in its weekly picks (subject only to the
-- needs_legal_review safety check).
-- Run in Supabase SQL editor.

alter table news_candidates
  add column if not exists flagged_for_curate boolean default false,
  add column if not exists flagged_at timestamptz;

create index if not exists news_candidates_flagged
  on news_candidates (flagged_at desc)
  where flagged_for_curate = true;
