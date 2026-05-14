-- ============================================================
-- money/career protocol — schema migration
-- Run in: https://supabase.com/dashboard → SQL Editor
-- Spec: docs/superpowers/specs/2026-05-13-money-career-protocol-design.md
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- career_profiles: one row per user; master career profile artifacts
-- ----------------------------------------------------------------
create table if not exists career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  resume_text text,
  resume_file_url text,
  wizard_fields jsonb,
  interview_transcript jsonb,
  profile_md text,
  profile_summary_md text,
  profile_status text not null default 'pending',  -- pending | resume_uploaded | wizard_done | interview_done | ready
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_profiles_user_idx on career_profiles(user_id);
create index if not exists career_profiles_status_idx on career_profiles(profile_status);

-- ----------------------------------------------------------------
-- career_target_companies: global watchlist (shared across users in v1)
-- ----------------------------------------------------------------
create table if not exists career_target_companies (
  id uuid primary key default gen_random_uuid(),
  source text not null,         -- 'greenhouse' | 'lever' | 'ashby' | 'workable'
  slug text not null,
  name text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(source, slug)
);

-- ----------------------------------------------------------------
-- career_jobs: every job ever ingested (global, dedup'd)
-- ----------------------------------------------------------------
create table if not exists career_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text,
  url text not null,
  title text not null,
  company text not null,
  location text,
  remote_type text,             -- 'remote' | 'hybrid' | 'onsite' | null
  comp_min int,
  comp_max int,
  comp_currency text default 'USD',
  description text,
  posted_at timestamptz,
  ingested_at timestamptz not null default now(),
  dedup_hash text not null,
  raw jsonb,
  unique(dedup_hash)
);

create index if not exists career_jobs_ingested_idx on career_jobs(ingested_at desc);
create index if not exists career_jobs_source_idx on career_jobs(source);

-- ----------------------------------------------------------------
-- career_user_jobs: per-user × per-job join (scored + filtered + status)
-- ----------------------------------------------------------------
create table if not exists career_user_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references career_jobs(id) on delete cascade,
  score int,                    -- 0-100, null if filter_passed=false
  score_reasoning text,
  recommendation text,          -- 'apply' | 'research' | 'skip'
  filter_passed boolean not null default true,
  filter_reason text,
  status text not null default 'feed',  -- feed | starred | submitted | archived | dismissed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, job_id)
);

create index if not exists career_user_jobs_user_status_idx on career_user_jobs(user_id, status);
create index if not exists career_user_jobs_score_idx on career_user_jobs(user_id, score desc nulls last) where status = 'feed';

-- ----------------------------------------------------------------
-- career_tailored_resumes: on-demand artifact cache, keyed (user, job)
-- ----------------------------------------------------------------
create table if not exists career_tailored_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references career_jobs(id) on delete cascade,
  vars_json jsonb not null,
  html_designed text,
  markdown_ats text,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, job_id)
);

-- ----------------------------------------------------------------
-- career_applications: submitted apps + follow-up state
-- ----------------------------------------------------------------
create table if not exists career_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references career_jobs(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  follow_up_at timestamptz not null,
  follow_up_completed_at timestamptz,
  outcome text,                 -- no_response | rejected | screen | interview | offer | declined | accepted
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_applications_user_idx on career_applications(user_id);
create index if not exists career_applications_followup_idx on career_applications(follow_up_at) where follow_up_completed_at is null;

-- ----------------------------------------------------------------
-- RLS: enable on all per-user tables. Service-role bypasses RLS.
-- ----------------------------------------------------------------
alter table career_profiles enable row level security;
alter table career_user_jobs enable row level security;
alter table career_tailored_resumes enable row level security;
alter table career_applications enable row level security;

-- (jobs + target_companies are globally readable; rely on service-role for writes)

drop policy if exists career_profiles_user_select on career_profiles;
create policy career_profiles_user_select on career_profiles
  for select using (auth.uid() = user_id);

drop policy if exists career_user_jobs_user_select on career_user_jobs;
create policy career_user_jobs_user_select on career_user_jobs
  for select using (auth.uid() = user_id);

drop policy if exists career_user_jobs_user_update on career_user_jobs;
create policy career_user_jobs_user_update on career_user_jobs
  for update using (auth.uid() = user_id);

drop policy if exists career_tailored_resumes_user_select on career_tailored_resumes;
create policy career_tailored_resumes_user_select on career_tailored_resumes
  for select using (auth.uid() = user_id);

drop policy if exists career_applications_user_select on career_applications;
create policy career_applications_user_select on career_applications
  for select using (auth.uid() = user_id);

drop policy if exists career_applications_user_update on career_applications;
create policy career_applications_user_update on career_applications
  for update using (auth.uid() = user_id);
