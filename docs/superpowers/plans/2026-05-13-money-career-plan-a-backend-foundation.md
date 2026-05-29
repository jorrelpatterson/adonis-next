# money/career — Plan A: Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend foundation for the `money/career` protocol: Supabase schema (all six tables, RLS-enabled), the six job-source ingestors (Greenhouse, Lever, Ashby, Workable, Adzuna, JSearch), dedup, pre-filter, and the daily ingest cron. End state: cron writes fresh job rows into `career_jobs` daily; smoke-testable via curl + Supabase dashboard. Per-user scoring, profile generation, and tailoring come in Plans B and C.

**Architecture:** Server-side Next.js route handlers + Supabase. All six source-ingestor modules follow the same shape (fetch from public/free APIs → normalize to a `RawJob` record). The cron orchestrator fans them out in parallel, dedupes by content hash, drops obvious mismatches via a keyword pre-filter, then upserts new rows into `career_jobs`. No per-user logic in this plan — per-user scoring lands in Plan C. Code is JavaScript (ESM in `lib/`/`app/`, CommonJS in `scripts/`), matching adonis-next conventions per `CLAUDE.md`.

**Tech Stack:** Next.js 14 App Router, Supabase (service-role key for admin writes), Vercel cron, native `fetch`. No new npm dependencies (jorrel-os uses none for ingest either).

**Spec:** `docs/superpowers/specs/2026-05-13-money-career-protocol-design.md`

---

## File Structure

```
sql/
  2026-05-13-career-protocol.sql     — CREATE: all six career_* tables + RLS policies

config/
  career-target-companies.json       — CREATE: seed list of ~10 ATS-board companies
  career-search-params.json          — CREATE: Adzuna/JSearch queries + exclude_title_keywords

lib/career/
  types.js                           — CREATE: JSDoc typedefs (RawJob, IngestSummary, etc.)
  supabase.js                        — CREATE: server-only admin client (service-role)
  dedup.js                           — CREATE: dedupHash(rawJob) → 32-char sha256 hex
  pre-filter.js                      — CREATE: shouldExcludeByTitle(title, keywords)
  sources/
    greenhouse.js                    — CREATE: fetchGreenhouse() → RawJob[]
    lever.js                         — CREATE: fetchLever() → RawJob[]
    ashby.js                         — CREATE: fetchAshby() → RawJob[]
    workable.js                      — CREATE: fetchWorkable() → RawJob[]
    adzuna.js                        — CREATE: fetchAdzuna() → RawJob[]
    jsearch.js                       — CREATE: fetchJSearch() → RawJob[]

app/api/cron/career/ingest/
  route.js                           — CREATE: GET handler — orchestrator

scripts/
  smoke-career-ingest.js             — CREATE: standalone node smoke runner

vercel.json                          — MODIFY: add /api/cron/career/ingest entry
.env.local                           — MODIFY: ensure ADZUNA_APP_ID/KEY, RAPIDAPI_KEY, CRON_SECRET set
```

**Env vars required (must exist in `.env.local` and Vercel project env):**
- `NEXT_PUBLIC_SUPABASE_URL` — already set
- `SUPABASE_SERVICE_KEY` — already set (adonis-next convention); fallback `SUPABASE_SERVICE_ROLE_KEY`
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` — NEW; get from developer.adzuna.com (free tier: 1K calls/mo)
- `RAPIDAPI_KEY` — NEW; get from rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch (free tier: 200 req/mo)
- `CRON_SECRET` — already set; reused for the new cron

---

## Task 1: Database schema migration

**Files:**
- Create: `sql/2026-05-13-career-protocol.sql`

- [ ] **Step 1: Write the SQL migration**

```sql
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
```

- [ ] **Step 2: Apply the migration in Supabase dashboard**

Open https://supabase.com/dashboard → the adonis/advnce project → SQL Editor → New query → paste contents of `sql/2026-05-13-career-protocol.sql` → Run.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verify the six tables exist**

In Supabase dashboard → Table Editor, confirm these tables now exist in `public` schema:
- `career_profiles`
- `career_target_companies`
- `career_jobs`
- `career_user_jobs`
- `career_tailored_resumes`
- `career_applications`

- [ ] **Step 4: Commit**

```bash
git add sql/2026-05-13-career-protocol.sql
git commit -m "sql: career protocol schema — 6 tables + RLS for money/career"
```

---

## Task 2: Career types module (JSDoc)

**Files:**
- Create: `lib/career/types.js`

- [ ] **Step 1: Write the types module**

```js
// lib/career/types.js
//
// JSDoc typedefs for the career module. Adonis-next is JS-only (per CLAUDE.md),
// so we lean on JSDoc for documentation and editor hints.

/**
 * @typedef {'greenhouse' | 'lever' | 'ashby' | 'workable' | 'adzuna' | 'jsearch'} JobSource
 */

/**
 * @typedef {Object} RawJob
 * @property {JobSource} source
 * @property {string} [source_id]
 * @property {string} url
 * @property {string} title
 * @property {string} company
 * @property {string|null} [location]
 * @property {boolean} [remote]
 * @property {number|null} [salary_min]
 * @property {number|null} [salary_max]
 * @property {string} [salary_currency]
 * @property {string|null} [description]
 * @property {string|null} [posted_at]  // ISO timestamp
 * @property {unknown} [raw]            // original payload for debugging
 */

/**
 * @typedef {Object} IngestSummary
 * @property {JobSource} source
 * @property {number} fetched
 * @property {number} inserted
 * @property {number} duplicates
 * @property {number} pre_filtered
 * @property {string[]} errors
 */

/**
 * Map a remote flag + location string to the canonical remote_type enum.
 * @param {boolean|undefined} remoteFlag
 * @param {string|null|undefined} location
 * @returns {'remote'|'hybrid'|'onsite'|null}
 */
export function deriveRemoteType(remoteFlag, location) {
  const loc = (location || '').toLowerCase();
  if (remoteFlag || /\bremote\b/.test(loc)) return 'remote';
  if (/\bhybrid\b/.test(loc)) return 'hybrid';
  if (loc.trim()) return 'onsite';
  return null;
}

export {};
```

- [ ] **Step 2: Smoke-test the helper**

```bash
node --input-type=module -e "
import { deriveRemoteType } from './lib/career/types.js';
console.log(deriveRemoteType(true, null));            // 'remote'
console.log(deriveRemoteType(false, 'San Francisco, CA')); // 'onsite'
console.log(deriveRemoteType(false, 'Remote - US'));  // 'remote'
console.log(deriveRemoteType(false, 'Hybrid - NYC')); // 'hybrid'
console.log(deriveRemoteType(false, ''));             // null
"
```

Expected output:
```
remote
onsite
remote
hybrid
null
```

- [ ] **Step 3: Commit**

```bash
git add lib/career/types.js
git commit -m "career: types + deriveRemoteType helper"
```

---

## Task 3: Supabase admin client

**Files:**
- Create: `lib/career/supabase.js`

- [ ] **Step 1: Write the admin client**

```js
// lib/career/supabase.js
//
// Server-only Supabase client using the service-role key. Bypasses RLS.
// NEVER import this from a client component or anything that ends up in the browser bundle.

import { createClient } from '@supabase/supabase-js';

let _admin = null;

export function getCareerSupabaseAdmin() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[career] Supabase env not configured. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    );
  }

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
```

- [ ] **Step 2: Smoke-test that the client connects**

```bash
# Load .env.local so NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY are set.
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/supabase.js').then(async ({ getCareerSupabaseAdmin }) => {
  const sb = getCareerSupabaseAdmin();
  const { count, error } = await sb.from('career_target_companies').select('*', { count: 'exact', head: true });
  if (error) { console.error('FAIL', error); process.exit(1); }
  console.log('OK count=' + (count ?? 0));
});
"
```

Expected output: `OK count=0` if Task 1 ran but Task 6 hasn't seeded yet, or the seeded count otherwise. The key signal is "OK" + a numeric count (no error).

- [ ] **Step 3: Commit**

```bash
git add lib/career/supabase.js
git commit -m "career: server-only Supabase admin client"
```

---

## Task 4: Dedup hash

**Files:**
- Create: `lib/career/dedup.js`

- [ ] **Step 1: Write the dedup module**

```js
// lib/career/dedup.js
//
// Aggressive content-hash for collapsing the same job posted to multiple boards.
// hash = sha256(company | title | state-or-remote), truncated to 32 hex chars.
// Lifted from jorrel-os/lib/dedupe.ts and translated to JS.

import { createHash } from 'node:crypto';

const STATE_PATTERN = /\b([A-Z]{2})\b/;

function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractState(loc) {
  if (!loc) return '';
  const m = loc.match(STATE_PATTERN);
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {import('./types.js').RawJob} job
 * @returns {string} 32-char hex
 */
export function dedupHash(job) {
  const company = normalize(job.company);
  const title = normalize(job.title);
  const region = job.remote ? 'remote' : extractState(job.location);
  const key = `${company}|${title}|${region}`;
  return createHash('sha256').update(key).digest('hex').slice(0, 32);
}
```

- [ ] **Step 2: Smoke-test with known inputs**

```bash
node --input-type=module -e "
import { dedupHash } from './lib/career/dedup.js';

const a = { source: 'greenhouse', url: '', title: 'VP of Sales', company: 'Sunrun', location: 'San Francisco, CA', remote: false };
const b = { source: 'lever', url: '', title: 'VP of Sales ', company: 'Sunrun', location: 'San Francisco, CA', remote: false };
const c = { source: 'greenhouse', url: '', title: 'VP of Sales', company: 'Sunrun', location: 'Remote - US', remote: true };

console.log('a:', dedupHash(a));
console.log('b:', dedupHash(b));   // should EQUAL a (whitespace + source ignored)
console.log('c:', dedupHash(c));   // should DIFFER (remote vs CA)
console.log('a===b:', dedupHash(a) === dedupHash(b));
console.log('a===c:', dedupHash(a) === dedupHash(c));
"
```

Expected: `a===b: true`, `a===c: false`.

- [ ] **Step 3: Commit**

```bash
git add lib/career/dedup.js
git commit -m "career: dedup hash — sha256(company|title|region)"
```

---

## Task 5: Pre-filter (exclude_title_keywords)

**Files:**
- Create: `lib/career/pre-filter.js`

- [ ] **Step 1: Write the pre-filter module**

```js
// lib/career/pre-filter.js
//
// Drop obvious-mismatch listings before they reach the scorer.
// Scoring is the expensive step; pre-filter saves ~45% on the firehose per
// jorrel-os doc pattern #7.

/**
 * @param {string|null|undefined} title
 * @param {string[]} excludeKeywords  — case-insensitive substring match
 * @returns {{excluded: boolean, matchedKeyword: string|null}}
 */
export function shouldExcludeByTitle(title, excludeKeywords) {
  if (!title) return { excluded: true, matchedKeyword: '(empty title)' };
  const lower = title.toLowerCase();
  for (const kw of excludeKeywords || []) {
    if (!kw) continue;
    if (lower.includes(kw.toLowerCase())) {
      return { excluded: true, matchedKeyword: kw };
    }
  }
  return { excluded: false, matchedKeyword: null };
}
```

- [ ] **Step 2: Smoke-test**

```bash
node --input-type=module -e "
import { shouldExcludeByTitle } from './lib/career/pre-filter.js';
const kws = ['SDR', 'Engineer', 'Designer', 'Recruiter'];
console.log(shouldExcludeByTitle('Sales Development Representative (SDR)', kws)); // excluded
console.log(shouldExcludeByTitle('VP of Sales', kws));                            // not excluded
console.log(shouldExcludeByTitle('Staff Software Engineer', kws));                // excluded
console.log(shouldExcludeByTitle('', kws));                                       // excluded (empty)
"
```

Expected: rows 1, 3, 4 show `excluded: true`; row 2 `excluded: false`.

- [ ] **Step 3: Commit**

```bash
git add lib/career/pre-filter.js
git commit -m "career: pre-filter — drop titles matching exclude_keywords"
```

---

## Task 6: Watchlist + search-params config

**Files:**
- Create: `config/career-target-companies.json`
- Create: `config/career-search-params.json`

- [ ] **Step 1: Write the watchlist JSON**

```json
{
  "_comment": "Initial watchlist for the operator persona. Edit the career_target_companies table in Supabase for live changes without redeploying. This file is fallback-only.",
  "greenhouse": [
    { "slug": "sunrun",     "name": "Sunrun",         "notes": "residential solar — biggest" },
    { "slug": "palmetto",   "name": "Palmetto",       "notes": "residential solar" },
    { "slug": "goodleap",   "name": "GoodLeap",       "notes": "home improvement finance" },
    { "slug": "thumbtack",  "name": "Thumbtack",      "notes": "home services marketplace" },
    { "slug": "angi",       "name": "Angi",           "notes": "home services" },
    { "slug": "salesloft",  "name": "Salesloft",      "notes": "sales engagement" },
    { "slug": "gongio",     "name": "Gong",           "notes": "revenue intelligence" },
    { "slug": "apolloio",   "name": "Apollo.io",      "notes": "sales platform" },
    { "slug": "mindbody",   "name": "Mindbody",       "notes": "vertical SaaS — wellness" },
    { "slug": "boulevard",  "name": "Boulevard",      "notes": "vertical SaaS — beauty" }
  ],
  "lever": [
    { "slug": "sunpower",       "name": "SunPower",        "notes": "residential solar" },
    { "slug": "freedomforever", "name": "Freedom Forever", "notes": "solar — alumni" }
  ],
  "ashby": [],
  "workable": []
}
```

- [ ] **Step 2: Write the search-params JSON**

```json
{
  "_comment": "Adzuna/JSearch query lists + exclude-title-keywords. Tuned for adonis operator persona (sales leadership, founder-adjacent, GM, RevOps).",

  "adzuna": {
    "country": "us",
    "results_per_page": 50,
    "max_pages": 2,
    "queries": [
      "VP of Sales",
      "Chief Revenue Officer",
      "Head of Sales",
      "Head of Revenue",
      "Head of GTM",
      "VP Business Development",
      "VP Strategic Accounts",
      "Director of Sales",
      "VP Partnerships",
      "VP Channel Sales"
    ],
    "salary_min": 120000,
    "max_days_old": 14
  },

  "jsearch": {
    "queries": [
      "VP Sales SaaS",
      "Chief Revenue Officer home services",
      "Head of GTM",
      "VP Business Development clean energy",
      "Head of Channel Sales"
    ],
    "country": "us",
    "remote_only": false,
    "include_remote": true,
    "date_posted": "week",
    "employment_types": "FULLTIME",
    "max_pages_per_query": 1
  },

  "filters": {
    "exclude_title_keywords": [
      "Sales Development Representative",
      "SDR", "BDR", "Junior", "Associate", "Entry", "Intern",
      "Engineer", "Engineering", "Designer", "Researcher",
      "Recruiter", "Sourcer",
      "Product Manager", "Product Designer",
      "Data Scientist", "Data Analyst",
      "Accountant", "Office Manager",
      "Executive Assistant", "Administrative Assistant",
      "Customer Success Manager", "Customer Support", "Customer Service",
      "Technical Writer", "Paralegal", "Legal Counsel"
    ],
    "exclude_company_keywords": ["MLM", "Cutco"]
  }
}
```

- [ ] **Step 3: Seed `career_target_companies` from the JSON via Supabase SQL editor**

Paste the following into Supabase SQL Editor and run:

```sql
insert into career_target_companies (source, slug, name, notes, active) values
  ('greenhouse', 'sunrun',         'Sunrun',         'residential solar — biggest', true),
  ('greenhouse', 'palmetto',       'Palmetto',       'residential solar', true),
  ('greenhouse', 'goodleap',       'GoodLeap',       'home improvement finance', true),
  ('greenhouse', 'thumbtack',      'Thumbtack',      'home services marketplace', true),
  ('greenhouse', 'angi',           'Angi',           'home services', true),
  ('greenhouse', 'salesloft',      'Salesloft',      'sales engagement', true),
  ('greenhouse', 'gongio',         'Gong',           'revenue intelligence', true),
  ('greenhouse', 'apolloio',       'Apollo.io',      'sales platform', true),
  ('greenhouse', 'mindbody',       'Mindbody',       'vertical SaaS — wellness', true),
  ('greenhouse', 'boulevard',      'Boulevard',      'vertical SaaS — beauty', true),
  ('lever',      'sunpower',       'SunPower',       'residential solar', true),
  ('lever',      'freedomforever', 'Freedom Forever','solar alumni', true)
on conflict (source, slug) do nothing;
```

Expected: "Success. 12 rows inserted." (or 0 if re-running).

- [ ] **Step 4: Verify the rows exist**

In Supabase Table Editor, open `career_target_companies` — should show 12 rows.

- [ ] **Step 5: Commit**

```bash
git add config/career-target-companies.json config/career-search-params.json
git commit -m "career: seed watchlist (12 boards) + adzuna/jsearch search params"
```

---

## Task 7: Greenhouse source ingestor

**Files:**
- Create: `lib/career/sources/greenhouse.js`

- [ ] **Step 1: Write the ingestor**

```js
// lib/career/sources/greenhouse.js
//
// Pull from Greenhouse public job boards.
// Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
// No auth required for public boards.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' assert { type: 'json' };

function stripHtml(s) {
  return (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'greenhouse')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[greenhouse] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.greenhouse || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchGreenhouse() {
  const targets = await loadTargets();
  const out = [];

  for (const t of targets) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t.slug)}/jobs?content=true`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[greenhouse] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.jobs?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.jobs) {
        out.push({
          source: 'greenhouse',
          source_id: String(j.id),
          url: j.absolute_url,
          title: j.title?.trim(),
          company: companyName,
          location: j.location?.name ?? null,
          remote: /remote/i.test(j.location?.name ?? ''),
          description: stripHtml(j.content),
          posted_at: j.updated_at,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[greenhouse] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[greenhouse] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
```

- [ ] **Step 2: Smoke-test against a real public board**

```bash
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/greenhouse.js').then(async ({ fetchGreenhouse }) => {
  const jobs = await fetchGreenhouse();
  console.log('Total:', jobs.length);
  console.log('Sample:', JSON.stringify(jobs[0], null, 2).slice(0, 600));
});
"
```

Expected: prints "Total: 100+" (Sunrun + others typically have hundreds of listings). Sample shows a RawJob shape with `source: 'greenhouse'`, title, company, etc.

If "Total: 0" — check that target rows exist in `career_target_companies` (Task 6).

- [ ] **Step 3: Commit**

```bash
git add lib/career/sources/greenhouse.js
git commit -m "career: greenhouse source ingestor"
```

---

## Task 8: Lever source ingestor

**Files:**
- Create: `lib/career/sources/lever.js`

- [ ] **Step 1: Write the ingestor**

```js
// lib/career/sources/lever.js
//
// Pull from Lever public postings.
// Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
// No auth required.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' assert { type: 'json' };

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'lever')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[lever] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.lever || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchLever() {
  const targets = await loadTargets();
  const out = [];

  for (const t of targets) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(t.slug)}?mode=json`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[lever] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;

      const companyName = t.name ?? t.slug;
      for (const p of data) {
        const loc = p.categories?.location ?? null;
        out.push({
          source: 'lever',
          source_id: p.id,
          url: p.hostedUrl || p.applyUrl,
          title: p.text?.trim(),
          company: companyName,
          location: loc,
          remote: /remote/i.test(loc ?? '') || /remote/i.test(p.text ?? ''),
          description: stripHtml(p.descriptionPlain ?? p.description ?? ''),
          posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
          raw: p,
        });
      }
    } catch (err) {
      console.error(`[lever] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[lever] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
```

- [ ] **Step 2: Smoke-test**

```bash
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/lever.js').then(async ({ fetchLever }) => {
  const jobs = await fetchLever();
  console.log('Total:', jobs.length);
  console.log('Sample:', JSON.stringify(jobs[0], null, 2).slice(0, 500));
});
"
```

Expected: "Total: 10+" (SunPower + Freedom Forever between them usually have several dozen postings).

- [ ] **Step 3: Commit**

```bash
git add lib/career/sources/lever.js
git commit -m "career: lever source ingestor"
```

---

## Task 9: Ashby source ingestor

**Files:**
- Create: `lib/career/sources/ashby.js`

- [ ] **Step 1: Write the ingestor**

```js
// lib/career/sources/ashby.js
//
// Pull from Ashby public job boards.
// Endpoint: https://api.ashbyhq.com/posting-api/job-board/{slug}
// No auth required.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' assert { type: 'json' };

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'ashby')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[ashby] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.ashby || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchAshby() {
  const targets = await loadTargets();
  if (!targets.length) {
    console.log('[ashby] no targets configured, skipping');
    return [];
  }
  const out = [];

  for (const t of targets) {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(t.slug)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[ashby] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.jobs?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.jobs) {
        out.push({
          source: 'ashby',
          source_id: j.id,
          url: j.jobUrl ?? j.applyUrl ?? `https://jobs.ashbyhq.com/${t.slug}/${j.id}`,
          title: j.title?.trim(),
          company: companyName,
          location: j.location ?? null,
          remote: !!j.isRemote || /remote/i.test(j.location ?? ''),
          description: stripHtml(j.descriptionPlain ?? j.descriptionHtml ?? ''),
          posted_at: j.publishedAt ?? null,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[ashby] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[ashby] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
```

- [ ] **Step 2: Smoke-test**

```bash
# Note: ashby has no seeded targets in Task 6's seed, so this should print 0.
# To smoke-test against a real Ashby board, optionally insert a test row:
#   insert into career_target_companies (source, slug, name, active)
#   values ('ashby', 'ramp', 'Ramp', true) on conflict do nothing;
# then re-run. Remember to remove or deactivate the test row after.

set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/ashby.js').then(async ({ fetchAshby }) => {
  const jobs = await fetchAshby();
  console.log('Total:', jobs.length);
  if (jobs.length) console.log('Sample:', JSON.stringify(jobs[0], null, 2).slice(0, 500));
});
"
```

Expected: "Total: 0" (no seeded targets), OR if you inserted a test ashby target: "Total: 20+".

- [ ] **Step 3: Commit**

```bash
git add lib/career/sources/ashby.js
git commit -m "career: ashby source ingestor"
```

---

## Task 10: Workable source ingestor

**Files:**
- Create: `lib/career/sources/workable.js`

- [ ] **Step 1: Write the ingestor**

```js
// lib/career/sources/workable.js
//
// Pull from Workable public job boards.
// Endpoint: https://apply.workable.com/api/v3/accounts/{slug}/jobs
// No auth required.

import { getCareerSupabaseAdmin } from '../supabase.js';
import fallbackTargets from '../../../config/career-target-companies.json' assert { type: 'json' };

function stripHtml(s) {
  return (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function loadTargets() {
  try {
    const sb = getCareerSupabaseAdmin();
    const { data, error } = await sb
      .from('career_target_companies')
      .select('slug, name')
      .eq('source', 'workable')
      .eq('active', true);
    if (error) throw error;
    if (data?.length) return data;
  } catch (err) {
    console.warn('[workable] DB targets unavailable, using config fallback:', err.message);
  }
  return (fallbackTargets.workable || []).map(t => ({ slug: t.slug, name: t.name }));
}

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchWorkable() {
  const targets = await loadTargets();
  if (!targets.length) {
    console.log('[workable] no targets configured, skipping');
    return [];
  }
  const out = [];

  for (const t of targets) {
    const url = `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(t.slug)}/jobs`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[workable] ${res.status} for slug "${t.slug}"`);
        continue;
      }
      const data = await res.json();
      if (!data.results?.length) continue;

      const companyName = t.name ?? t.slug;
      for (const j of data.results) {
        const locParts = [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', ');
        out.push({
          source: 'workable',
          source_id: j.shortcode ?? j.id,
          url: j.url ?? j.application_url ?? `https://apply.workable.com/${t.slug}/j/${j.shortcode}`,
          title: j.title?.trim(),
          company: companyName,
          location: locParts || null,
          remote: !!j.remote || /remote/i.test(locParts),
          description: stripHtml(j.description),
          posted_at: j.published_on ?? null,
          raw: j,
        });
      }
    } catch (err) {
      console.error(`[workable] fetch failed for "${t.slug}":`, err.message);
    }
  }

  console.log(`[workable] fetched ${out.length} listings across ${targets.length} boards`);
  return out;
}
```

- [ ] **Step 2: Smoke-test**

```bash
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/workable.js').then(async ({ fetchWorkable }) => {
  const jobs = await fetchWorkable();
  console.log('Total:', jobs.length);
});
"
```

Expected: "Total: 0" (no seeded targets in Task 6).

- [ ] **Step 3: Commit**

```bash
git add lib/career/sources/workable.js
git commit -m "career: workable source ingestor"
```

---

## Task 11: Adzuna source ingestor

**Files:**
- Create: `lib/career/sources/adzuna.js`

- [ ] **Step 1: Ensure env vars are set**

Get a free Adzuna developer account at https://developer.adzuna.com/. Add to `.env.local`:

```
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

Also add these to Vercel:
```bash
echo "your_app_id" | vercel env add ADZUNA_APP_ID production
echo "your_app_key" | vercel env add ADZUNA_APP_KEY production --sensitive
```

- [ ] **Step 2: Write the ingestor**

```js
// lib/career/sources/adzuna.js
//
// Aggregator. Pulls broad operator-track queries from Adzuna's catch-all index.
// Docs: https://developer.adzuna.com/
// Free tier: 1,000 calls/month.

import searchParams from '../../../config/career-search-params.json' assert { type: 'json' };

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn('[adzuna] skipped — ADZUNA_APP_ID / ADZUNA_APP_KEY not set');
    return [];
  }

  const cfg = searchParams.adzuna;
  const out = [];

  for (const query of cfg.queries) {
    for (let page = 1; page <= cfg.max_pages; page++) {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/${cfg.country}/search/${page}`);
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', appKey);
      url.searchParams.set('results_per_page', String(cfg.results_per_page));
      url.searchParams.set('what', query);
      url.searchParams.set('salary_min', String(cfg.salary_min));
      url.searchParams.set('max_days_old', String(cfg.max_days_old));
      url.searchParams.set('content-type', 'application/json');

      try {
        const res = await fetch(url.toString());
        if (!res.ok) {
          console.warn(`[adzuna] ${res.status} for "${query}" page ${page}`);
          break;
        }
        const data = await res.json();
        if (!data.results?.length) break;

        for (const r of data.results) {
          out.push({
            source: 'adzuna',
            source_id: r.id,
            url: r.redirect_url,
            title: r.title?.trim(),
            company: r.company?.display_name?.trim() ?? 'Unknown',
            location: r.location?.display_name ?? null,
            remote: /remote/i.test(r.location?.display_name ?? '') || /remote/i.test(r.title ?? ''),
            salary_min: r.salary_min ?? null,
            salary_max: r.salary_max ?? null,
            salary_currency: 'USD',
            description: r.description ?? null,
            posted_at: r.created ?? null,
            raw: r,
          });
        }
      } catch (err) {
        console.error(`[adzuna] fetch failed for "${query}":`, err.message);
        break;
      }
    }
  }

  console.log(`[adzuna] fetched ${out.length} listings`);
  return out;
}
```

- [ ] **Step 3: Smoke-test**

```bash
# Load env vars from .env.local if not already in shell
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/adzuna.js').then(async ({ fetchAdzuna }) => {
  const jobs = await fetchAdzuna();
  console.log('Total:', jobs.length);
  console.log('Sample:', JSON.stringify(jobs[0], null, 2).slice(0, 500));
});
"
```

Expected: "Total: 200+" (10 queries × 2 pages × up to 50 results, post-Adzuna dedup may reduce). Burns ~20 Adzuna API calls — well inside the 1K/month free tier.

- [ ] **Step 4: Commit**

```bash
git add lib/career/sources/adzuna.js
git commit -m "career: adzuna source ingestor"
```

---

## Task 12: JSearch source ingestor

**Files:**
- Create: `lib/career/sources/jsearch.js`

- [ ] **Step 1: Ensure env var is set**

Get a free RapidAPI key for JSearch: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch. Add to `.env.local`:

```
RAPIDAPI_KEY=your_rapidapi_key
```

Also add to Vercel:
```bash
echo "your_rapidapi_key" | vercel env add RAPIDAPI_KEY production --sensitive
```

- [ ] **Step 2: Write the ingestor**

```js
// lib/career/sources/jsearch.js
//
// Aggregator. Wraps Google for Jobs via JSearch (RapidAPI).
// Free tier: 200 requests/month. Use sparingly — 5 queries × 1 page = 5 calls/day = 150/month.

import searchParams from '../../../config/career-search-params.json' assert { type: 'json' };

/**
 * @returns {Promise<import('../types.js').RawJob[]>}
 */
export async function fetchJSearch() {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    console.warn('[jsearch] skipped — RAPIDAPI_KEY not set');
    return [];
  }

  const cfg = searchParams.jsearch;
  const out = [];

  for (const query of cfg.queries) {
    for (let page = 1; page <= cfg.max_pages_per_query; page++) {
      const url = new URL('https://jsearch.p.rapidapi.com/search');
      url.searchParams.set('query', query);
      url.searchParams.set('page', String(page));
      url.searchParams.set('num_pages', '1');
      url.searchParams.set('country', cfg.country);
      url.searchParams.set('date_posted', cfg.date_posted);
      url.searchParams.set('employment_types', cfg.employment_types);
      if (cfg.remote_only) url.searchParams.set('remote_jobs_only', 'true');

      try {
        const res = await fetch(url.toString(), {
          headers: {
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
        });
        if (!res.ok) {
          console.warn(`[jsearch] ${res.status} for "${query}"`);
          break;
        }
        const data = await res.json();
        if (!data.data?.length) break;

        for (const r of data.data) {
          const locParts = [r.job_city, r.job_state, r.job_country].filter(Boolean).join(', ');
          out.push({
            source: 'jsearch',
            source_id: r.job_id,
            url: r.job_apply_link,
            title: r.job_title?.trim(),
            company: r.employer_name?.trim() ?? 'Unknown',
            location: locParts || null,
            remote: !!r.job_is_remote,
            salary_min: r.job_min_salary ?? null,
            salary_max: r.job_max_salary ?? null,
            salary_currency: r.job_salary_currency ?? 'USD',
            description: r.job_description ?? null,
            posted_at: r.job_posted_at_timestamp
              ? new Date(r.job_posted_at_timestamp * 1000).toISOString()
              : null,
            raw: r,
          });
        }
      } catch (err) {
        console.error(`[jsearch] fetch failed for "${query}":`, err.message);
        break;
      }
    }
  }

  console.log(`[jsearch] fetched ${out.length} listings`);
  return out;
}
```

- [ ] **Step 3: Smoke-test**

```bash
set -a; source .env.local; set +a

node --input-type=module -e "
import('./lib/career/sources/jsearch.js').then(async ({ fetchJSearch }) => {
  const jobs = await fetchJSearch();
  console.log('Total:', jobs.length);
  console.log('Sample:', JSON.stringify(jobs[0], null, 2).slice(0, 500));
});
"
```

Expected: "Total: 50+". Burns 5 RapidAPI calls.

- [ ] **Step 4: Commit**

```bash
git add lib/career/sources/jsearch.js
git commit -m "career: jsearch source ingestor"
```

---

## Task 13: Cron ingest orchestrator route

**Files:**
- Create: `app/api/cron/career/ingest/route.js`

- [ ] **Step 1: Write the route**

```js
// app/api/cron/career/ingest/route.js
//
// Daily cron — runs at 0 14 * * * UTC (6am PT).
// Pulls from all 6 sources in parallel, dedupes, applies pre-filter,
// upserts new rows into career_jobs.
//
// Auth: either Vercel cron user-agent OR Bearer CRON_SECRET header.

import { NextResponse } from 'next/server';
import { fetchGreenhouse } from '../../../../../lib/career/sources/greenhouse.js';
import { fetchLever } from '../../../../../lib/career/sources/lever.js';
import { fetchAshby } from '../../../../../lib/career/sources/ashby.js';
import { fetchWorkable } from '../../../../../lib/career/sources/workable.js';
import { fetchAdzuna } from '../../../../../lib/career/sources/adzuna.js';
import { fetchJSearch } from '../../../../../lib/career/sources/jsearch.js';
import { dedupHash } from '../../../../../lib/career/dedup.js';
import { shouldExcludeByTitle } from '../../../../../lib/career/pre-filter.js';
import { deriveRemoteType } from '../../../../../lib/career/types.js';
import { getCareerSupabaseAdmin } from '../../../../../lib/career/supabase.js';
import searchParams from '../../../../../config/career-search-params.json' assert { type: 'json' };

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

const SOURCE_PRIORITY = {
  greenhouse: 4,
  lever: 3,
  ashby: 3,
  workable: 3,
  adzuna: 2,
  jsearch: 1,
};

export async function GET(req) {
  // Auth
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!isVercelCron && expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const summaries = [];
  const allFetched = [];

  // 1. Fan out to all sources in parallel
  const sources = [
    ['greenhouse', fetchGreenhouse],
    ['lever', fetchLever],
    ['ashby', fetchAshby],
    ['workable', fetchWorkable],
    ['adzuna', fetchAdzuna],
    ['jsearch', fetchJSearch],
  ];
  const results = await Promise.allSettled(sources.map(([, fn]) => fn()));
  results.forEach((r, i) => {
    const [source] = sources[i];
    if (r.status === 'fulfilled') {
      allFetched.push(...r.value);
      summaries.push({ source, fetched: r.value.length, inserted: 0, duplicates: 0, pre_filtered: 0, errors: [] });
    } else {
      summaries.push({ source, fetched: 0, inserted: 0, duplicates: 0, pre_filtered: 0, errors: [String(r.reason)] });
    }
  });

  // 2. Pre-filter by title (exclude obvious mismatches)
  const excludeKeywords = searchParams.filters?.exclude_title_keywords ?? [];
  const postFilter = [];
  for (const job of allFetched) {
    if (!job.title || !job.company) continue;
    const { excluded } = shouldExcludeByTitle(job.title, excludeKeywords);
    if (excluded) {
      const s = summaries.find(x => x.source === job.source);
      if (s) s.pre_filtered += 1;
      continue;
    }
    postFilter.push(job);
  }

  // 3. Dedupe — same job from multiple sources collapses to one row, prefer ATS.
  const bestByHash = new Map();
  for (const job of postFilter) {
    const hash = dedupHash(job);
    const existing = bestByHash.get(hash);
    if (!existing || SOURCE_PRIORITY[job.source] > SOURCE_PRIORITY[existing.source]) {
      bestByHash.set(hash, job);
    }
  }

  // 4. Look up which hashes already exist in DB
  const sb = getCareerSupabaseAdmin();
  const hashes = Array.from(bestByHash.keys());
  let existingSet = new Set();
  if (hashes.length) {
    const { data: existingRows } = await sb
      .from('career_jobs')
      .select('dedup_hash')
      .in('dedup_hash', hashes);
    existingSet = new Set((existingRows ?? []).map(r => r.dedup_hash));
  }

  // 5. Build new-job rows for insert
  const newRows = [];
  for (const [hash, job] of bestByHash.entries()) {
    if (existingSet.has(hash)) {
      const s = summaries.find(x => x.source === job.source);
      if (s) s.duplicates += 1;
      continue;
    }
    newRows.push({
      source: job.source,
      source_id: job.source_id ?? null,
      url: job.url,
      title: job.title,
      company: job.company,
      location: job.location ?? null,
      remote_type: deriveRemoteType(job.remote, job.location),
      comp_min: job.salary_min != null ? Math.round(job.salary_min) : null,
      comp_max: job.salary_max != null ? Math.round(job.salary_max) : null,
      comp_currency: job.salary_currency ?? 'USD',
      description: job.description ?? null,
      posted_at: job.posted_at ?? null,
      dedup_hash: hash,
      raw: job.raw ?? null,
    });
  }

  console.log(`[career/ingest] ${allFetched.length} fetched → ${postFilter.length} post-filter → ${bestByHash.size} unique → ${newRows.length} new`);

  // 6. Upsert
  if (newRows.length) {
    const { error } = await sb.from('career_jobs').upsert(newRows, {
      onConflict: 'dedup_hash',
      ignoreDuplicates: true,
    });
    if (error) {
      console.error('[career/ingest] insert failed:', error);
      return NextResponse.json({ ok: false, error: error.message, summaries }, { status: 500 });
    }
    for (const row of newRows) {
      const s = summaries.find(x => x.source === row.source);
      if (s) s.inserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    summaries,
    totals: {
      fetched: allFetched.length,
      post_filter: postFilter.length,
      unique: bestByHash.size,
      new: newRows.length,
    },
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Start dev server and hit the route**

```bash
npm run dev
```

In another terminal (load CRON_SECRET first):
```bash
set -a; source .env.local; set +a

curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/career/ingest | jq .
```

Expected: returns `{ ok: true, summaries: [...], totals: { fetched: <large>, post_filter: <smaller>, unique: <smaller>, new: <X> }, timestamp }`. First run may take 30-90s depending on source response times.

- [ ] **Step 3: Verify rows landed in `career_jobs`**

In Supabase Table Editor → `career_jobs` — should now have ~hundreds of rows from the first run. Run this query in SQL editor for a sanity check:

```sql
select source, count(*) from career_jobs group by source order by count desc;
```

Expected: at least `greenhouse`, `lever`, `adzuna`, `jsearch` represented.

- [ ] **Step 4: Hit the route a second time and verify dedup works**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/career/ingest | jq .totals
```

Expected: `totals.new` is much smaller than the first run (most jobs are duplicates of what we just inserted).

- [ ] **Step 5: Stop dev server and commit**

```bash
git add app/api/cron/career/ingest/route.js
git commit -m "career: cron ingest orchestrator — fanout + dedup + upsert"
```

---

## Task 14: Wire the cron into vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the cron entry**

Open `vercel.json` and add a new entry to the `crons` array. The full file should look like:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" }
  ],
  "crons": [
    { "path": "/api/cron/welcome-emails", "schedule": "0 17 * * *" },
    { "path": "/api/cron/reorder-reminders", "schedule": "0 12 * * *" },
    { "path": "/api/cron/news-scrape", "schedule": "0 11 * * *" },
    { "path": "/api/cron/news-curate", "schedule": "0 4 * * 1" },
    { "path": "/api/cron/career/ingest", "schedule": "0 14 * * *" }
  ]
}
```

- [ ] **Step 2: Verify by visual inspection**

The new entry must be at the end of `crons` and the JSON must still be valid:

```bash
cat vercel.json | jq .crons
```

Expected: 5 entries, last one is `/api/cron/career/ingest` at `0 14 * * *`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "vercel: add career/ingest cron — 0 14 UTC daily (6am PT)"
```

---

## Task 15: Standalone smoke test script

**Files:**
- Create: `scripts/smoke-career-ingest.js`

- [ ] **Step 1: Write the smoke runner**

```js
#!/usr/bin/env node
// scripts/smoke-career-ingest.js
//
// End-to-end smoke test for the career ingest cron.
// Calls the local dev server (must be running on :3000) with the CRON_SECRET,
// asserts the response shape, and prints a summary.
//
// Requires:
//   CRON_SECRET in env (or /tmp/adonis.env)
//
// Run: node scripts/smoke-career-ingest.js

const fs = require('fs');

if (fs.existsSync('/tmp/adonis.env')) {
  for (const line of fs.readFileSync('/tmp/adonis.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2];
  }
}
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SECRET = process.env.CRON_SECRET;
const URL = process.env.SMOKE_URL || 'http://localhost:3000/api/cron/career/ingest';

if (!SECRET) {
  console.error('Missing CRON_SECRET');
  process.exit(1);
}

(async () => {
  console.log(`POST-ish (GET) ${URL} ...`);
  const t0 = Date.now();
  const res = await fetch(URL, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`HTTP ${res.status} in ${elapsed}s`);

  const body = await res.json();
  if (!res.ok || !body.ok) {
    console.error('FAIL', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log('\nTotals:', body.totals);
  console.log('\nPer-source summary:');
  for (const s of body.summaries) {
    const errors = s.errors.length ? ` errors=${s.errors.length}` : '';
    console.log(`  ${s.source.padEnd(11)} fetched=${String(s.fetched).padStart(4)}  pre_filtered=${String(s.pre_filtered).padStart(3)}  duplicates=${String(s.duplicates).padStart(3)}  inserted=${String(s.inserted).padStart(3)}${errors}`);
  }

  if (body.totals.fetched === 0) {
    console.error('\nFAIL: zero jobs fetched across all sources. Check env vars + target seed rows.');
    process.exit(1);
  }

  console.log('\nOK');
})().catch(err => {
  console.error('THREW:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the smoke test**

In one terminal:
```bash
npm run dev
```

In another:
```bash
node scripts/smoke-career-ingest.js
```

Expected output (numbers will vary):
```
POST-ish (GET) http://localhost:3000/api/cron/career/ingest ...
HTTP 200 in 35.4s

Totals: { fetched: 824, post_filter: 412, unique: 387, new: 0 }   # (or new: N>0 on first run)

Per-source summary:
  greenhouse  fetched= 312  pre_filtered=180  duplicates= 130  inserted=  2
  lever       fetched=  44  pre_filtered= 18  duplicates=  26  inserted=  0
  ashby       fetched=   0  pre_filtered=  0  duplicates=   0  inserted=  0
  workable    fetched=   0  pre_filtered=  0  duplicates=   0  inserted=  0
  adzuna      fetched= 320  pre_filtered=  6  duplicates= 314  inserted=  0
  jsearch     fetched= 148  pre_filtered=  0  duplicates= 148  inserted=  0

OK
```

If "FAIL: zero jobs fetched" — check that env vars are loaded and `career_target_companies` has seeded rows.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-career-ingest.js
git commit -m "career: smoke test script for ingest cron"
```

---

## Final Verification

Once all tasks are complete, run:

```bash
# 1. Type/import check via Next.js build
npm run build

# 2. Lint
npm run lint

# 3. Smoke test the cron end-to-end
npm run dev &
sleep 5
node scripts/smoke-career-ingest.js
kill %1
```

All three should pass. The cron is now wired and will run daily on Vercel at 14:00 UTC.

After this plan is complete and merged, Plan B (onboarding pipeline) and Plan C (per-user scoring + tailoring + v2 protocol shim) are the follow-ups.

---

## Notes / Gotchas

- **Decimal salaries break int columns** (jorrel-os doc — Adzuna/JSearch occasionally return floats). The orchestrator `Math.round`s `comp_min` / `comp_max` before insert; don't remove that.
- **Empty env vars + `??`** (jorrel-os doc): an empty `ADZUNA_APP_ID=""` will NOT trigger the `??` fallback. The ingestors check truthiness, not nullishness, so empty strings are caught — but be careful if you refactor those guards.
- **JSON imports with `assert { type: 'json' }`** require Node ≥ 17.5 and `--experimental-json-modules` on older versions. Adonis-next runs Node 20 in production (per LAPTOP_MIGRATION.md), so this is fine.
- **First run on Vercel may approach the 600s `maxDuration` cap** if all sources return heavy responses. If you see timeouts in Vercel logs, drop `max_pages` in `career-search-params.json` to `1` or temporarily deactivate slow boards via `update career_target_companies set active = false where slug = '...'`.
- **The hard filter is NOT in this plan.** Per-user filtering (geo, hours, comp floor) lives in Plan C, since it requires a user profile to filter against. For now, every job in `career_jobs` is visible to every user.
- **Pre-filter is global**, not per-user. The `exclude_title_keywords` apply to all users in v1.
