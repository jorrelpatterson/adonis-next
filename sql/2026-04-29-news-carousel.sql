-- sql/2026-04-29-news-carousel.sql
-- Peptide news carousel engine: 4 tables + 1 storage bucket.
-- Run in Supabase SQL editor.

-- ============================================================
-- 1. news_candidates — every scraped item
-- ============================================================
create table if not exists news_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  source_name text not null,
  tier text not null check (tier in ('A','B','C')),
  topic_tags text[] default '{}',
  title text not null,
  raw_content text,
  published_at timestamptz,
  scraped_at timestamptz default now(),
  status text default 'new' check (status in ('new','picked','skipped','cooldown')),
  cooldown_until timestamptz
);
create index if not exists news_candidates_status_published
  on news_candidates (status, published_at desc);
create index if not exists news_candidates_topic_tags
  on news_candidates using gin (topic_tags);

-- ============================================================
-- 2. post_drafts — curator output, one per slot
-- ============================================================
create table if not exists post_drafts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references news_candidates(id) on delete set null,
  slot_date date not null,
  status text default 'drafting' check (status in (
    'drafting','rendering','ready_for_review','needs_legal_review',
    'render_failed','approved','posted','skipped'
  )),
  accent_color text default 'teal' check (accent_color in ('teal','amber')),
  hook text not null,
  highlight_words text[] default '{}',
  slide_2_finding text,
  slide_3_mechanism text,
  slide_3_citation text,
  slide_4_takeaway text,
  caption text,
  hashtags text[],
  needs_legal_review boolean default false,
  image_urls text[],
  source_url text,
  citation_text text,
  curator_model text,
  created_at timestamptz default now(),
  approved_at timestamptz,
  posted_at timestamptz
);
create index if not exists post_drafts_status_slot
  on post_drafts (status, slot_date);

-- ============================================================
-- 3. source_health — per-source last-success/last-error
-- ============================================================
create table if not exists source_health (
  source_name text primary key,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  consecutive_failures int default 0
);

-- ============================================================
-- 4. post_drafts_history — snapshot before regenerate
-- ============================================================
create table if not exists post_drafts_history (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references post_drafts(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

-- ============================================================
-- 5. RLS — service-role-only (admin ops via SERVICE_KEY)
-- ============================================================
alter table news_candidates enable row level security;
alter table post_drafts enable row level security;
alter table source_health enable row level security;
alter table post_drafts_history enable row level security;
-- No policies = blocked for anon. SERVICE_KEY bypasses RLS.

-- ============================================================
-- 6. Storage bucket — public-read for slide PNGs
-- ============================================================
insert into storage.buckets (id, name, public)
values ('news-slides', 'news-slides', true)
on conflict (id) do nothing;

-- Anyone can read; only service-role can write.
create policy if not exists "news-slides public read"
  on storage.objects for select
  using (bucket_id = 'news-slides');
