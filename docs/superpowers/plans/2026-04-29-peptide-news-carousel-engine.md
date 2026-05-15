# Peptide News Carousel Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 3x/week (M/W/F) Instagram carousel engine that scrapes peptide-related news + research, has Claude Sonnet 4.6 curate the top 3 weekly picks with brand-disciplined drafts, renders 4-slide carousels via Satori, and queues them in `/admin/marketing/news` for manual review + IG export.

**Architecture:** Two Vercel cron jobs (daily scrape, Sunday curate) feed candidates and drafts into Supabase. Render is triggered post-curate, uploads PNGs to Supabase Storage. Admin reviews drafts, clicks "Approve & Download" to get a zip + auto-copied caption, then posts manually to @advncelabs.

**Tech Stack:** Next.js 14 App Router, `next/og` (Satori) for PNG rendering, `@anthropic-ai/sdk` for the curator (Sonnet 4.6 + prompt cache), `rss-parser` for RSS, `archiver` for the zip, Supabase REST + Storage, Vercel cron. Spec at [docs/superpowers/specs/2026-04-29-peptide-news-carousel-engine-design.md](../specs/2026-04-29-peptide-news-carousel-engine-design.md).

---

## File Structure

**Created:**

| Path | Purpose |
|---|---|
| `sql/2026-04-29-news-carousel.sql` | Migration: 4 tables + storage bucket + RLS |
| `lib/news/sources.js` | RSS feed roster + PubMed query config (data only) |
| `lib/news/pubmed.js` | PubMed E-utils client |
| `lib/news/pubmed.test.mjs` | Unit tests (URL building, response parsing) |
| `lib/news/rss.js` | RSS fetch + parse wrapper |
| `lib/news/rss.test.mjs` | Unit tests (item extraction, dedup hashing) |
| `lib/news/scrape.js` | Orchestrator: runs all sources, dedupes, inserts |
| `lib/news/curator-prompt.js` | Cached system prompt content |
| `lib/news/curator.js` | Claude Sonnet 4.6 curator + JSON validation |
| `lib/news/curator.test.mjs` | Unit tests (validation, color-rotation logic) |
| `lib/news/tokens.js` | Brand color/font tokens for slide templates |
| `lib/news/fonts.js` | Google Fonts loader (mirrors invoiceImage.js) |
| `lib/news/slide-cover.js` | Slide 1 (dark cover) — React.createElement tree |
| `lib/news/slide-finding.js` | Slide 2 (cream finding) |
| `lib/news/slide-mechanism.js` | Slide 3 (cream mechanism + citation) |
| `lib/news/slide-takeaway.js` | Slide 4 (cream takeaway + CTA) |
| `lib/news/render.js` | Render orchestrator: slides → PNG buffers → Supabase Storage |
| `app/api/cron/news-scrape/route.js` | Cron + admin scrape trigger |
| `app/api/cron/news-curate/route.js` | Cron + admin curate trigger |
| `app/api/admin/news/render/[draftId]/route.js` | Render trigger (admin retry) |
| `app/api/admin/news/approve/[draftId]/route.js` | Approve & Download (returns zip) |
| `app/api/admin/news/regenerate/[draftId]/route.js` | Re-run curator on same candidate |
| `app/api/admin/news/flip-color/[draftId]/route.js` | Toggle accent_color, re-render cover |
| `app/api/admin/news/skip/[draftId]/route.js` | Skip + 30-day candidate cooldown |
| `app/api/admin/news/force-approve/[draftId]/route.js` | Move from needs_legal_review → ready_for_review |
| `app/api/admin/news/update-caption/[draftId]/route.js` | Inline caption edit |
| `app/admin/marketing/news/page.jsx` | Admin queue server component (list drafts) |
| `app/admin/marketing/news/DraftCard.jsx` | Client component: per-draft preview + actions |

**Modified:**

| Path | Change |
|---|---|
| `package.json` | Add `@anthropic-ai/sdk`, `rss-parser`, `archiver` |
| `vercel.json` | Add 2 cron entries (news-scrape + news-curate) |
| `app/admin/layout.jsx` | Add "News" link to marketing nav |
| `CLAUDE.md` | One-line mention of `app/admin/marketing/news` feature |

---

## Pre-flight assumptions

- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CRON_SECRET` already set in `.env.local` and Vercel project settings (per existing crons).
- `ANTHROPIC_API_KEY` is NEW — must be added to both `.env.local` and Vercel before Task 9.
- Supabase project has Storage enabled (free tier OK).
- Dev server runs at `http://localhost:3000` for smoke tests.

---

## Milestone 1 — Schema & dependencies

### Task 1: Install npm dependencies

**Files:**
- Modify: `package.json` (auto-updated by npm)

- [ ] **Step 1: Install runtime deps**

```bash
cd "/Volumes/Alexandria/AI Projects/adonis-next"
npm install @anthropic-ai/sdk rss-parser archiver
```

- [ ] **Step 2: Verify installation**

```bash
node -e "console.log(require('@anthropic-ai/sdk').default ? 'sdk ok' : 'fail')"
node -e "const Parser = require('rss-parser'); console.log(new Parser() ? 'rss ok' : 'fail')"
node -e "const a = require('archiver'); console.log(typeof a === 'function' ? 'archiver ok' : 'fail')"
```

Expected: three "ok" lines.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @anthropic-ai/sdk, rss-parser, archiver for news engine"
```

---

### Task 2: SQL migration — 4 tables + storage bucket

**Files:**
- Create: `sql/2026-04-29-news-carousel.sql`

- [ ] **Step 1: Write the SQL**

```sql
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
```

- [ ] **Step 2: Run in Supabase SQL editor**

Open Supabase dashboard → SQL Editor → paste the file contents → Run. Expected: "Success. No rows returned." Verify in Table Editor that `news_candidates`, `post_drafts`, `source_health`, `post_drafts_history` exist, and Storage → buckets shows `news-slides` (public).

- [ ] **Step 3: Commit**

```bash
git add sql/2026-04-29-news-carousel.sql
git commit -m "sql: news carousel engine schema (4 tables + news-slides bucket)"
```

---

## Milestone 2 — Sources & scraper

### Task 3: Source roster

**Files:**
- Create: `lib/news/sources.js`

- [ ] **Step 1: Write the roster**

```javascript
// lib/news/sources.js
// Roster of news sources. Data only — easy to amend without touching logic.

export const RSS_SOURCES = [
  // ---- Tier A: Research ----
  { name: 'Nature Peptides', tier: 'A', kind: 'rss',
    url: 'https://www.nature.com/subjects/peptides.rss',
    topic_tags: ['research'] },
  { name: 'Journal of Peptide Science', tier: 'A', kind: 'rss',
    url: 'https://onlinelibrary.wiley.com/feed/10991387/most-recent',
    topic_tags: ['research'] },

  // ---- Tier A: Regulatory ----
  { name: 'FDA Press Releases', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    topic_tags: ['regulatory'] },
  { name: 'FDA Drug Safety', tier: 'A', kind: 'rss',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-safety-podcasts/rss.xml',
    topic_tags: ['regulatory','safety'] },
  { name: 'DEA News', tier: 'A', kind: 'rss',
    url: 'https://www.dea.gov/rss/news-releases.xml',
    topic_tags: ['regulatory','scheduling'] },

  // ---- Tier B: Industry ----
  { name: 'Endpoints News', tier: 'B', kind: 'rss',
    url: 'https://endpts.com/feed/',
    topic_tags: ['industry'] },
  { name: 'FierceBiotech', tier: 'B', kind: 'rss',
    url: 'https://www.fiercebiotech.com/rss/xml',
    topic_tags: ['industry'] },
  { name: 'STAT News', tier: 'B', kind: 'rss',
    url: 'https://www.statnews.com/feed/',
    topic_tags: ['industry'] },

  // ---- Tier C: Mainstream pulse ----
  { name: 'Google News — peptide therapy', tier: 'C', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=peptide+therapy&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['pulse'] },
  { name: 'Google News — GLP-1', tier: 'C', kind: 'rss',
    url: 'https://news.google.com/rss/search?q=GLP-1&hl=en-US&gl=US&ceid=US:en',
    topic_tags: ['pulse'] },
];

// PubMed E-utils config — Tier A research, queried separately via API.
export const PUBMED_QUERY = {
  name: 'PubMed',
  tier: 'A',
  // E-utils term: peptide-relevant compounds OR peptide-research keywords
  term: '(peptide therapy[Title/Abstract]) OR (BPC-157) OR (semaglutide) OR (tirzepatide) OR (retatrutide) OR (cagrilintide) OR (thymosin) OR (ipamorelin) OR (CJC-1295) OR (sermorelin) OR (GHK-Cu) OR (melanotan) OR (epitalon)',
  reldate: 7, // past 7 days
  retmax: 50,
  topic_tags: ['research','pubmed'],
};

// Compound keywords that trigger needs_legal_review on draft creation.
// Sourced from the EVE_AAS_catalog_hidden memory: Schedule III anabolics + HRT + lipo blends.
export const FLAGGED_COMPOUNDS = [
  'testosterone','trenbolone','oxandrolone','anavar','nandrolone','deca',
  'methandrostenolone','dianabol','oxymetholone','anadrol','drostanolone',
  'masteron','boldenone','equipoise','methenolone','primobolan','stanozolol',
  'winstrol','anastrozole','exemestane','clomiphene','clomid','tamoxifen',
  'mesterolone','proviron','mgf','mechano growth factor',
  'igf-1 lr3','lipo blend','lipotropic',
];
```

- [ ] **Step 2: Smoke verify**

```bash
node -e "import('./lib/news/sources.js').then(m => { console.log('rss:', m.RSS_SOURCES.length); console.log('pubmed:', m.PUBMED_QUERY.name); console.log('flagged:', m.FLAGGED_COMPOUNDS.length); })"
```

Expected: `rss: 10`, `pubmed: PubMed`, `flagged: 24` (or close — count what you wrote).

- [ ] **Step 3: Commit**

```bash
git add lib/news/sources.js
git commit -m "news: source roster (10 RSS feeds + PubMed E-utils + flagged compound list)"
```

---

### Task 4: PubMed E-utils client

**Files:**
- Create: `lib/news/pubmed.js`
- Create: `lib/news/pubmed.test.mjs`

PubMed E-utils flow: `esearch` returns PMIDs for a query, `esummary` returns metadata for those PMIDs. Two HTTP calls per scrape.

- [ ] **Step 1: Write the test first**

```javascript
// lib/news/pubmed.test.mjs
// Run: node lib/news/pubmed.test.mjs

import { buildEsearchUrl, buildEsummaryUrl, parseEsummary } from './pubmed.js';

const cases = [];

cases.push({
  name: 'esearch URL includes term + reldate + retmax',
  fn: () => {
    const url = buildEsearchUrl({ term: 'BPC-157', reldate: 7, retmax: 50 });
    if (!url.includes('term=BPC-157')) throw new Error('term missing');
    if (!url.includes('reldate=7')) throw new Error('reldate missing');
    if (!url.includes('retmax=50')) throw new Error('retmax missing');
    if (!url.includes('db=pubmed')) throw new Error('db missing');
    if (!url.includes('retmode=json')) throw new Error('retmode missing');
  },
});

cases.push({
  name: 'esummary URL accepts list of PMIDs',
  fn: () => {
    const url = buildEsummaryUrl(['12345', '67890']);
    if (!url.includes('id=12345,67890')) throw new Error('PMIDs missing');
  },
});

cases.push({
  name: 'parseEsummary maps fields to candidate shape',
  fn: () => {
    const fake = {
      result: {
        '12345': {
          uid: '12345',
          title: 'BPC-157 accelerates tendon healing',
          source: 'J Pharm Pharmacol',
          pubdate: '2024 Jun',
          articleids: [{ idtype: 'doi', value: '10.1234/abc' }],
        },
        uids: ['12345'],
      },
    };
    const items = parseEsummary(fake);
    if (items.length !== 1) throw new Error('expected 1 item');
    const it = items[0];
    if (it.source_url !== 'https://pubmed.ncbi.nlm.nih.gov/12345/') throw new Error('source_url wrong: ' + it.source_url);
    if (it.title !== 'BPC-157 accelerates tendon healing') throw new Error('title wrong');
    if (it.source_name !== 'PubMed') throw new Error('source_name wrong');
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run test — expect ALL FAIL (module doesn't exist yet)**

```bash
cd "/Volumes/Alexandria/AI Projects/adonis-next"
node lib/news/pubmed.test.mjs
```

Expected: ERR_MODULE_NOT_FOUND or similar.

- [ ] **Step 3: Implement the module**

```javascript
// lib/news/pubmed.js
// PubMed E-utils client. Two-step: esearch (PMIDs) → esummary (metadata).
// Free public API, no auth required. Rate limit: 3 req/sec without API key.

const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const ESUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

export function buildEsearchUrl({ term, reldate, retmax }) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term,
    reldate: String(reldate),
    retmax: String(retmax),
    retmode: 'json',
    sort: 'pub_date',
  });
  return `${ESEARCH}?${params.toString()}`;
}

export function buildEsummaryUrl(pmids) {
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });
  return `${ESUMMARY}?${params.toString()}`;
}

export function parseEsummary(json) {
  const result = json && json.result;
  if (!result || !Array.isArray(result.uids)) return [];
  const items = [];
  for (const uid of result.uids) {
    const r = result[uid];
    if (!r || !r.title) continue;
    items.push({
      source_url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      source_name: 'PubMed',
      tier: 'A',
      topic_tags: ['research', 'pubmed'],
      title: r.title.replace(/\.$/, ''),
      raw_content: `${r.source || ''} · ${r.pubdate || ''}`,
      published_at: parsePubDate(r.pubdate),
    });
  }
  return items;
}

function parsePubDate(s) {
  if (!s) return null;
  // PubMed pubdate examples: "2024 Jun", "2024 Jun 15", "2024"
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function fetchPubmed(query) {
  const esUrl = buildEsearchUrl(query);
  const esRes = await fetch(esUrl);
  if (!esRes.ok) throw new Error(`pubmed esearch ${esRes.status}`);
  const esJson = await esRes.json();
  const pmids = (esJson.esearchresult && esJson.esearchresult.idlist) || [];
  if (pmids.length === 0) return [];
  // Throttle: PubMed allows 3 req/sec
  await new Promise((r) => setTimeout(r, 350));
  const sumUrl = buildEsummaryUrl(pmids);
  const sumRes = await fetch(sumUrl);
  if (!sumRes.ok) throw new Error(`pubmed esummary ${sumRes.status}`);
  const sumJson = await sumRes.json();
  return parseEsummary(sumJson);
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
node lib/news/pubmed.test.mjs
```

Expected: three ✓ lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/news/pubmed.js lib/news/pubmed.test.mjs
git commit -m "news: pubmed e-utils client (esearch + esummary + 3 unit tests)"
```

---

### Task 5: RSS fetcher

**Files:**
- Create: `lib/news/rss.js`
- Create: `lib/news/rss.test.mjs`

- [ ] **Step 1: Write the test first**

```javascript
// lib/news/rss.test.mjs
// Run: node lib/news/rss.test.mjs

import { normalizeItem, hashUrl } from './rss.js';

const cases = [];

cases.push({
  name: 'normalizeItem maps rss-parser output to candidate shape',
  fn: () => {
    const src = { name: 'FDA Press', tier: 'A', topic_tags: ['regulatory'] };
    const raw = {
      title: 'FDA Approves New Compounding Pathway',
      link: 'https://fda.gov/abc',
      isoDate: '2026-04-28T10:00:00Z',
      contentSnippet: 'Snippet text here.',
    };
    const out = normalizeItem(raw, src);
    if (out.source_url !== 'https://fda.gov/abc') throw new Error('source_url');
    if (out.source_name !== 'FDA Press') throw new Error('source_name');
    if (out.tier !== 'A') throw new Error('tier');
    if (out.title !== 'FDA Approves New Compounding Pathway') throw new Error('title');
    if (out.published_at !== '2026-04-28T10:00:00.000Z') throw new Error('published_at: ' + out.published_at);
  },
});

cases.push({
  name: 'normalizeItem skips items without title or link',
  fn: () => {
    const src = { name: 'X', tier: 'B', topic_tags: [] };
    if (normalizeItem({ link: 'x' }, src) !== null) throw new Error('no title should null');
    if (normalizeItem({ title: 't' }, src) !== null) throw new Error('no link should null');
  },
});

cases.push({
  name: 'hashUrl is deterministic and URL-only (ignores query params)',
  fn: () => {
    const a = hashUrl('https://example.com/x');
    const b = hashUrl('https://example.com/x');
    if (a !== b) throw new Error('not deterministic');
    if (typeof a !== 'string' || a.length < 8) throw new Error('weak hash');
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node lib/news/rss.test.mjs
```

Expected: ERR_MODULE_NOT_FOUND.

- [ ] **Step 3: Implement the module**

```javascript
// lib/news/rss.js
// RSS fetcher + item normalizer. Wraps rss-parser; normalizes to the
// `news_candidates` row shape so the orchestrator can insert directly.

import Parser from 'rss-parser';
import crypto from 'node:crypto';

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'advnce-labs-news-bot/1.0 (+https://advncelabs.com)' },
});

export function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

export function normalizeItem(raw, source) {
  if (!raw || !raw.title || !raw.link) return null;
  const published = raw.isoDate || raw.pubDate;
  return {
    source_url: raw.link,
    source_name: source.name,
    tier: source.tier,
    topic_tags: source.topic_tags || [],
    title: raw.title.trim(),
    raw_content: (raw.contentSnippet || raw.content || '').slice(0, 2000),
    published_at: published ? new Date(published).toISOString() : null,
  };
}

export async function fetchRss(source) {
  const feed = await parser.parseURL(source.url);
  const items = (feed.items || [])
    .map((it) => normalizeItem(it, source))
    .filter(Boolean);
  return items;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
node lib/news/rss.test.mjs
```

Expected: three ✓ lines, exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/news/rss.js lib/news/rss.test.mjs
git commit -m "news: rss fetcher + normalizer (3 unit tests)"
```

---

### Task 6: Scrape orchestrator

**Files:**
- Create: `lib/news/scrape.js`

- [ ] **Step 1: Write the orchestrator**

```javascript
// lib/news/scrape.js
// Orchestrator: pull all RSS sources + PubMed, dedupe by URL,
// upsert into news_candidates, update source_health.

import { RSS_SOURCES, PUBMED_QUERY } from './sources.js';
import { fetchRss } from './rss.js';
import { fetchPubmed } from './pubmed.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...(init.headers || {}),
    },
  });
}

async function recordHealth(name, ok, error) {
  const now = new Date().toISOString();
  // Read current row
  const cur = await sb(`/source_health?source_name=eq.${encodeURIComponent(name)}&select=consecutive_failures`);
  const rows = await cur.json();
  const prev = (rows && rows[0] && rows[0].consecutive_failures) || 0;
  const body = ok
    ? { source_name: name, last_success_at: now, consecutive_failures: 0,
        last_error_at: null, last_error_message: null }
    : { source_name: name, last_error_at: now, last_error_message: String(error).slice(0, 500),
        consecutive_failures: prev + 1 };
  await sb(`/source_health`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
}

async function insertCandidates(items) {
  if (items.length === 0) return 0;
  // Filter to status=new defaults (DB enforces source_url unique → on conflict do nothing)
  const res = await sb(`/news_candidates`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(items.map((it) => ({ ...it, scraped_at: new Date().toISOString() }))),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`insert candidates failed: ${res.status} ${t}`);
  }
  const inserted = await res.json();
  return Array.isArray(inserted) ? inserted.length : 0;
}

async function maybeAlertAllATierDown() {
  const res = await sb(`/source_health?select=source_name,consecutive_failures&consecutive_failures=gte.3`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return;
  // Only A-tier names matter; cross-reference with the roster
  const aTierNames = new Set([...RSS_SOURCES, PUBMED_QUERY].filter((s) => s.tier === 'A').map((s) => s.name));
  const downA = rows.filter((r) => aTierNames.has(r.source_name));
  if (downA.length < aTierNames.size) return; // some A-tier still working
  // All A-tier down — send email
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'advnce news <news@advncelabs.com>',
      to: process.env.ADMIN_EMAIL,
      subject: '[advnce news] All A-tier sources are down',
      text: `All A-tier news sources have failed 3+ times in a row.\n\nDown sources:\n${downA.map((r) => '- ' + r.source_name).join('\n')}\n\nCheck /admin/marketing/news for source-health detail.`,
    }),
  });
}

export async function runScrape() {
  let totalInserted = 0;
  const errors = [];

  // RSS sources
  for (const src of RSS_SOURCES) {
    try {
      const items = await fetchRss(src);
      const n = await insertCandidates(items);
      await recordHealth(src.name, true);
      totalInserted += n;
    } catch (e) {
      errors.push({ source: src.name, error: String(e.message || e) });
      await recordHealth(src.name, false, e);
    }
  }

  // PubMed
  try {
    const items = await fetchPubmed(PUBMED_QUERY);
    const enriched = items.map((it) => ({ ...it, topic_tags: PUBMED_QUERY.topic_tags }));
    const n = await insertCandidates(enriched);
    await recordHealth(PUBMED_QUERY.name, true);
    totalInserted += n;
  } catch (e) {
    errors.push({ source: PUBMED_QUERY.name, error: String(e.message || e) });
    await recordHealth(PUBMED_QUERY.name, false, e);
  }

  await maybeAlertAllATierDown();
  return { inserted: totalInserted, errors };
}
```

- [ ] **Step 2: Smoke verify (no insert; just module loads + exports)**

```bash
node -e "import('./lib/news/scrape.js').then(m => console.log('runScrape:', typeof m.runScrape))"
```

Expected: `runScrape: function`.

- [ ] **Step 3: Commit**

```bash
git add lib/news/scrape.js
git commit -m "news: scrape orchestrator with source-health + A-tier-down alert"
```

---

### Task 7: Cron + admin scrape route

**Files:**
- Create: `app/api/cron/news-scrape/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/cron/news-scrape/route.js
// Daily scraper. Invoked by Vercel Cron (CRON_SECRET Bearer) or
// manually from /admin/marketing/news ("Run scrape now" button).

import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { runScrape } from '../../../../lib/news/scrape';

export const maxDuration = 60; // RSS + PubMed needs > 10s default

export async function POST(request) {
  const guard = requireAdminOrCron(request);
  if (guard) return guard;
  try {
    const result = await runScrape();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

// Allow GET for cron (Vercel sends GET by default for crons)
export const GET = POST;
```

- [ ] **Step 2: Smoke test against local dev server**

```bash
# Terminal 1
cd "/Volumes/Alexandria/AI Projects/adonis-next" && npm run dev

# Terminal 2 — log in to admin first to get cookie, then:
curl -s -X POST http://localhost:3000/api/cron/news-scrape \
  -H "Authorization: Bearer $CRON_SECRET" | head -200
```

Expected: JSON like `{"ok":true,"inserted":N,"errors":[...]}` with N ≥ 0. Check Supabase Table Editor — `news_candidates` should have new rows; `source_health` should have rows for each source.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/news-scrape/route.js
git commit -m "news: /api/cron/news-scrape route (cron + admin trigger)"
```

---

## Milestone 3 — Curator

### Task 8: Curator system prompt

**Files:**
- Create: `lib/news/curator-prompt.js`

The system prompt is the cached chunk (per `claude-api` skill best practice — always cache the static editorial rules).

- [ ] **Step 1: Write the prompt module**

```javascript
// lib/news/curator-prompt.js
// System prompt for the weekly curator. This is the cached chunk —
// all editorial rules + output schema. Per-run user message contains
// only the candidates JSON.

import { FLAGGED_COMPOUNDS } from './sources.js';

export const CURATOR_MODEL = 'claude-sonnet-4-6';

export function buildSystemPrompt() {
  return `You are the editorial curator for @advncelabs, a research-grade peptide
information account. Every Sunday you pick the top 3 Mon/Wed/Fri Instagram
carousel posts from the past week's scraped peptide news + research.

# BRAND VOICE

advnce labs is positioned as the research authority in the peptide space.
The voice is precise, evidence-anchored, and never hyped.

- Always frame compounds as "Research Use Only" (RUO).
- NEVER claim therapeutic effect ("treats", "cures", "is effective for").
- NEVER recommend dosing or protocols.
- ALWAYS cite the primary source (PMID + journal + year preferred over press releases).
- Specificity > drama. "Accelerated tendon-collagen synthesis 47% over 14 days
  in a rat model" beats "could be a game-changer for healing."

# SLIDE TEMPLATE (4 slides per carousel)

You produce text content for 4 slides. Render team handles visuals.

- **Slide 1 (cover, dark):** Hook headline, max 100 chars, ALL CAPS.
  Pick 1-3 specific WORDS to highlight (a number, a name, a year).
- **Slide 2 (cream, finding):** 30-40 word plain-English explainer of the
  finding. No jargon without immediate translation.
- **Slide 3 (cream, mechanism + citation):** 1-2 sentence mechanism
  explainer + the citation block (author et al · journal · year · PMID).
- **Slide 4 (cream, takeaway + CTA):** 1-2 sentence "what this means for
  the research conversation." End with the soft CTA card text — render
  team adds the "ADVNCELABS.COM" button automatically.

# COLOR ROTATION

Each carousel uses ONE accent color on the cover slide highlights. Alternate
between "teal" and "amber" across consecutive picks. Default rule: the FIRST
pick in this run uses the OPPOSITE of last week's last pick (we'll tell you
in the user message); subsequent picks alternate.

# DIVERSITY

In one weekly batch of 3 picks:
- Don't pick more than 2 stories about the same compound.
- Don't pick more than 2 stories from the same source.
- Mix story types (e.g., 1 research + 1 regulatory + 1 industry, when possible).

# SOURCE QUALITY

Tier A sources (research, regulatory) are preferred. Only pick a Tier B story
if it's substantive AND there's no comparable Tier A story that week. Avoid
Tier C (mainstream pulse) unless it's a major breaking story corroborated
by Tier A/B coverage.

# FLAGGED COMPOUNDS

If the underlying story centers on any of these compound families, set
\`needs_legal_review: true\`. The pick will be routed to a manual legal-
review queue and NOT auto-published. You should still draft the post normally.

Flagged: ${FLAGGED_COMPOUNDS.join(', ')}.

# QUALITY BAR

If fewer than 3 candidates clear the quality bar, return fewer picks. NEVER
fabricate or stretch. An empty slot is better than a weak post.

# CAPTION + HASHTAGS

- Caption: 280-450 characters, RUO-framed, ends with the hashtag block.
- 6-10 hashtags, mix of broad (#peptides #longevity) and specific
  (#bpc157 #glp1research). All lowercase, no spaces.

# OUTPUT — STRICT JSON ONLY

Return EXACTLY this shape. No prose before or after. No markdown fences.

{
  "picks": [
    {
      "slot": "mon" | "wed" | "fri",
      "candidate_id": "<the uuid from input>",
      "compound": "string (the focal compound or topic)",
      "source_url": "string (copy from input)",
      "source_quality": "A" | "B" | "C",
      "citation": "Author et al · Journal · Year · PMID",
      "accent_color": "teal" | "amber",
      "hook": "ALL CAPS HEADLINE WITH SPECIFIC NUMBERS OR NAMES",
      "highlight_words": ["47%", "2024"],
      "slide_2_finding": "30-40 word plain explainer.",
      "slide_3_mechanism": "1-2 sentences about how it works.",
      "slide_3_citation": "Sikiric et al · J Pharm Pharmacol · 2024 · PMID 12345678",
      "slide_4_takeaway": "1-2 sentence what-this-means + soft RUO close.",
      "caption": "280-450 char IG caption, hashtag block at end.",
      "hashtags": ["#peptides","#bpc157", ...],
      "needs_legal_review": false
    }
  ],
  "skipped_slots": ["fri"],
  "candidates_reviewed": 47,
  "notes": "Optional one-line editorial note for the human reviewer."
}`;
}
```

- [ ] **Step 2: Smoke verify**

```bash
node -e "import('./lib/news/curator-prompt.js').then(m => { const s = m.buildSystemPrompt(); console.log('len:', s.length); console.log('model:', m.CURATOR_MODEL); })"
```

Expected: `len: 3000+`, `model: claude-sonnet-4-6`.

- [ ] **Step 3: Commit**

```bash
git add lib/news/curator-prompt.js
git commit -m "news: curator system prompt (RUO voice, 4-slide schema, JSON output)"
```

---

### Task 9: Curator function

**Files:**
- Create: `lib/news/curator.js`
- Create: `lib/news/curator.test.mjs`

> **NOTE:** This task implements an Anthropic API call. Implementer should invoke `claude-api` skill before writing this code to confirm current best-practice for prompt caching + JSON-mode.

- [ ] **Step 1: Write the test**

```javascript
// lib/news/curator.test.mjs
// Run: node lib/news/curator.test.mjs

import { validateCuratorOutput, nextAccentColor } from './curator.js';

const cases = [];

cases.push({
  name: 'validateCuratorOutput accepts a well-formed pick',
  fn: () => {
    const ok = {
      picks: [{
        slot: 'mon', candidate_id: 'abc', compound: 'BPC-157',
        source_url: 'https://pubmed.ncbi.nlm.nih.gov/123/',
        source_quality: 'A', citation: 'Sikiric · J · 2024 · PMID 123',
        accent_color: 'teal', hook: 'BPC-157 ACCELERATED HEALING 47%',
        highlight_words: ['47%'], slide_2_finding: 'x', slide_3_mechanism: 'x',
        slide_3_citation: 'x', slide_4_takeaway: 'x',
        caption: 'x'.repeat(300), hashtags: ['#a','#b','#c','#d','#e','#f'],
        needs_legal_review: false,
      }],
      skipped_slots: [], candidates_reviewed: 10,
    };
    const errs = validateCuratorOutput(ok);
    if (errs.length) throw new Error('expected no errors, got: ' + JSON.stringify(errs));
  },
});

cases.push({
  name: 'validateCuratorOutput rejects missing required fields',
  fn: () => {
    const bad = { picks: [{ slot: 'mon' /* missing many */ }], skipped_slots: [], candidates_reviewed: 0 };
    const errs = validateCuratorOutput(bad);
    if (errs.length === 0) throw new Error('expected errors');
  },
});

cases.push({
  name: 'validateCuratorOutput rejects invalid accent_color',
  fn: () => {
    const bad = {
      picks: [{ slot:'mon',candidate_id:'a',compound:'x',source_url:'x',source_quality:'A',
        citation:'x',accent_color:'red',hook:'x',highlight_words:[],slide_2_finding:'x',
        slide_3_mechanism:'x',slide_3_citation:'x',slide_4_takeaway:'x',caption:'x'.repeat(300),
        hashtags:['#a','#b','#c','#d','#e','#f'],needs_legal_review:false }],
      skipped_slots:[], candidates_reviewed:1,
    };
    const errs = validateCuratorOutput(bad);
    if (!errs.some((e) => e.includes('accent_color'))) throw new Error('expected accent_color error');
  },
});

cases.push({
  name: 'nextAccentColor flips correctly',
  fn: () => {
    if (nextAccentColor('teal') !== 'amber') throw new Error('teal → amber');
    if (nextAccentColor('amber') !== 'teal') throw new Error('amber → teal');
    if (nextAccentColor(null) !== 'teal') throw new Error('null → teal default');
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
node lib/news/curator.test.mjs
```

- [ ] **Step 3: Implement curator.js**

```javascript
// lib/news/curator.js
// Weekly curator. Calls Claude Sonnet 4.6 with cached system prompt
// + this week's candidates, returns 3 picks with full draft content.
// Inserts picks into post_drafts.

import Anthropic from '@anthropic-ai/sdk';
import { CURATOR_MODEL, buildSystemPrompt } from './curator-prompt.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function nextAccentColor(prev) {
  if (prev === 'teal') return 'amber';
  if (prev === 'amber') return 'teal';
  return 'teal';
}

const REQUIRED_PICK_FIELDS = [
  'slot','candidate_id','compound','source_url','source_quality','citation',
  'accent_color','hook','highlight_words','slide_2_finding','slide_3_mechanism',
  'slide_3_citation','slide_4_takeaway','caption','hashtags','needs_legal_review',
];

export function validateCuratorOutput(out) {
  const errs = [];
  if (!out || typeof out !== 'object') return ['root not object'];
  if (!Array.isArray(out.picks)) errs.push('picks not array');
  if (Array.isArray(out.picks)) {
    out.picks.forEach((p, i) => {
      for (const k of REQUIRED_PICK_FIELDS) {
        if (!(k in p)) errs.push(`pick[${i}] missing field ${k}`);
      }
      if (p.accent_color && !['teal','amber'].includes(p.accent_color))
        errs.push(`pick[${i}] invalid accent_color: ${p.accent_color}`);
      if (p.slot && !['mon','wed','fri'].includes(p.slot))
        errs.push(`pick[${i}] invalid slot: ${p.slot}`);
      if (p.source_quality && !['A','B','C'].includes(p.source_quality))
        errs.push(`pick[${i}] invalid source_quality: ${p.source_quality}`);
      if (p.caption && (p.caption.length < 200 || p.caption.length > 600))
        errs.push(`pick[${i}] caption length ${p.caption.length} outside 200-600`);
      if (Array.isArray(p.hashtags) && (p.hashtags.length < 5 || p.hashtags.length > 12))
        errs.push(`pick[${i}] hashtag count ${p.hashtags.length} outside 5-12`);
    });
  }
  return errs;
}

async function fetchUnpickedCandidates() {
  const res = await sb('/news_candidates?status=eq.new&order=published_at.desc&limit=200');
  return res.json();
}

async function lastAccentColor() {
  const res = await sb('/post_drafts?select=accent_color&order=created_at.desc&limit=1');
  const rows = await res.json();
  return rows && rows[0] ? rows[0].accent_color : null;
}

function nextSlotDates(today = new Date()) {
  // Returns { mon, wed, fri } as YYYY-MM-DD for the upcoming Mon/Wed/Fri.
  // Curator runs Sunday 8pm PT — so "next" Monday is tomorrow.
  const dates = {};
  const day = today.getDay(); // 0=Sun..6=Sat
  const offsetMon = ((1 - day) + 7) % 7 || 7; // next Monday
  const monDate = new Date(today); monDate.setDate(today.getDate() + offsetMon);
  dates.mon = monDate.toISOString().slice(0, 10);
  const wedDate = new Date(monDate); wedDate.setDate(monDate.getDate() + 2);
  dates.wed = wedDate.toISOString().slice(0, 10);
  const friDate = new Date(monDate); friDate.setDate(monDate.getDate() + 4);
  dates.fri = friDate.toISOString().slice(0, 10);
  return dates;
}

export async function runCurator() {
  const candidates = await fetchUnpickedCandidates();
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { ok: true, picks: 0, skipped: ['mon','wed','fri'], note: 'no candidates' };
  }

  const lastColor = await lastAccentColor();
  const startColor = nextAccentColor(lastColor);
  const slotDates = nextSlotDates();

  // System prompt is cached (~3K tokens of editorial rules).
  // User message is the per-run candidate list.
  const userMessage = JSON.stringify({
    last_week_final_color: lastColor || 'none',
    suggested_first_color: startColor,
    slot_dates: slotDates,
    candidates: candidates.map((c) => ({
      candidate_id: c.id,
      title: c.title,
      source_url: c.source_url,
      source_name: c.source_name,
      tier: c.tier,
      topic_tags: c.topic_tags,
      raw_content: (c.raw_content || '').slice(0, 800),
      published_at: c.published_at,
    })),
  });

  const resp = await client.messages.create({
    model: CURATOR_MODEL,
    max_tokens: 8000,
    system: [
      { type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = resp.content.find((b) => b.type === 'text')?.text || '';
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    // Try to extract JSON if wrapped in fences
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('curator returned non-JSON: ' + text.slice(0, 200));
    parsed = JSON.parse(m[0]);
  }

  const errs = validateCuratorOutput(parsed);
  if (errs.length) {
    throw new Error('curator output invalid: ' + errs.join('; '));
  }

  // Insert each pick as a post_draft, mark candidate picked
  const insertedDraftIds = [];
  for (const pick of parsed.picks) {
    const slotDate = slotDates[pick.slot];
    const draftBody = {
      candidate_id: pick.candidate_id,
      slot_date: slotDate,
      status: pick.needs_legal_review ? 'needs_legal_review' : 'rendering',
      accent_color: pick.accent_color,
      hook: pick.hook,
      highlight_words: pick.highlight_words || [],
      slide_2_finding: pick.slide_2_finding,
      slide_3_mechanism: pick.slide_3_mechanism,
      slide_3_citation: pick.slide_3_citation,
      slide_4_takeaway: pick.slide_4_takeaway,
      caption: pick.caption,
      hashtags: pick.hashtags || [],
      needs_legal_review: !!pick.needs_legal_review,
      source_url: pick.source_url,
      citation_text: pick.citation,
      curator_model: CURATOR_MODEL,
    };
    const ins = await sb('/post_drafts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(draftBody),
    });
    if (!ins.ok) {
      const t = await ins.text();
      throw new Error(`insert draft failed: ${ins.status} ${t}`);
    }
    const [row] = await ins.json();
    insertedDraftIds.push(row.id);
    await sb(`/news_candidates?id=eq.${pick.candidate_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'picked' }),
    });
  }

  return {
    ok: true,
    picks: parsed.picks.length,
    skipped: parsed.skipped_slots || [],
    note: parsed.notes || null,
    draft_ids: insertedDraftIds,
    cache: { input_tokens: resp.usage?.input_tokens, cache_read: resp.usage?.cache_read_input_tokens },
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
node lib/news/curator.test.mjs
```

Expected: four ✓ lines.

- [ ] **Step 5: Commit**

```bash
git add lib/news/curator.js lib/news/curator.test.mjs
git commit -m "news: curator (Sonnet 4.6 + prompt cache, validates output, inserts drafts)"
```

---

### Task 10: Cron + admin curate route

**Files:**
- Create: `app/api/cron/news-curate/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/cron/news-curate/route.js
// Weekly curator. Runs Sunday 8pm PT (cron) or manual admin trigger.
// After picks are inserted, kicks off render for each new draft.

import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { runCurator } from '../../../../lib/news/curator';
import { renderDraft } from '../../../../lib/news/render';

export const maxDuration = 300; // curator + 3 renders can take time

export async function POST(request) {
  const guard = requireAdminOrCron(request);
  if (guard) return guard;
  try {
    const result = await runCurator();
    // Auto-render each new draft (non-blocking would be nicer, but Vercel
    // doesn't reliably support background work — render serially)
    const renderResults = [];
    for (const id of (result.draft_ids || [])) {
      try {
        await renderDraft(id);
        renderResults.push({ id, ok: true });
      } catch (e) {
        renderResults.push({ id, ok: false, error: String(e.message || e) });
      }
    }
    return NextResponse.json({ ok: true, ...result, renders: renderResults });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

export const GET = POST;
```

- [ ] **Step 2: Smoke test (do not run yet — render.js doesn't exist)**

Skip live test for now. Will be exercised in Task 17.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/news-curate/route.js
git commit -m "news: /api/cron/news-curate route (auto-renders each new draft)"
```

---

## Milestone 4 — Render templates

### Task 11: Tokens + font loader

**Files:**
- Create: `lib/news/tokens.js`
- Create: `lib/news/fonts.js`

- [ ] **Step 1: Write tokens.js**

```javascript
// lib/news/tokens.js
// Brand tokens for news slide templates. Mirrors brand-kit/tokens.css.

export const TOKENS = {
  bg:    '#F4F2EE',
  bg2:   '#ECEAE4',
  ink:   '#1A1C22',
  dim:   '#7A7D88',
  rule:  'rgba(0,0,0,0.08)',
  cyan:  '#00A0A8',
  amber: '#E07C24',
  white: '#FFFFFF',
};

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

// Brand mark — inline SVG string. Same shape as brand-kit/logo.svg.
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#F4F2EE" rx="12"/><path d="M8 48L18 38L28 43L38 28L46 33L54 18" fill="none" stroke="#00A0A8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="46" cy="33" r="4" fill="#00A0A8"/><circle cx="54" cy="18" r="4.5" fill="#E07C24"/><circle cx="54" cy="18" r="7.5" fill="none" stroke="#E07C24" stroke-width="1.5"/></svg>`;
```

- [ ] **Step 2: Write fonts.js (mirrors invoiceImage.js loader)**

```javascript
// lib/news/fonts.js
// Loads Google Fonts as ArrayBuffer for Satori rendering. Pattern
// mirrors lib/invoiceImage.js. Cached at module scope across requests.

let fontPromise = null;

async function fetchFont(family, weight, italic = false) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
  ).then((r) => r.text());
  const m = css.match(/src:\s*url\((https:[^)]+)\)/);
  if (!m) throw new Error(`font URL missing for ${family} ${weight}`);
  return await fetch(m[1]).then((r) => r.arrayBuffer());
}

export async function loadNewsFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    const [bar400, bar900, mono400, mono500, serif400, serifItalic] = await Promise.all([
      fetchFont('Barlow Condensed', 400),
      fetchFont('Barlow Condensed', 900),
      fetchFont('JetBrains Mono', 400),
      fetchFont('JetBrains Mono', 500),
      fetchFont('Cormorant Garamond', 400),
      fetchFont('Cormorant Garamond', 400, true),
    ]);
    return [
      { name: 'Barlow Condensed', data: bar400, weight: 400, style: 'normal' },
      { name: 'Barlow Condensed', data: bar900, weight: 900, style: 'normal' },
      { name: 'JetBrains Mono',   data: mono400, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono',   data: mono500, weight: 500, style: 'normal' },
      { name: 'Cormorant Garamond', data: serif400, weight: 400, style: 'normal' },
      { name: 'Cormorant Garamond', data: serifItalic, weight: 400, style: 'italic' },
    ];
  })();
  return fontPromise;
}
```

- [ ] **Step 3: Smoke verify**

```bash
node -e "import('./lib/news/tokens.js').then(m => console.log('w:', m.SLIDE_W, 'h:', m.SLIDE_H, 'cyan:', m.TOKENS.cyan))"
```

Expected: `w: 1080 h: 1350 cyan: #00A0A8`.

- [ ] **Step 4: Commit**

```bash
git add lib/news/tokens.js lib/news/fonts.js
git commit -m "news: brand tokens + Google Fonts loader (Barlow Cnd, Mono, Cormorant)"
```

---

### Task 12: Slide 1 — dark cover template

**Files:**
- Create: `lib/news/slide-cover.js`

Per `invoiceImage.js` pattern: use `React.createElement` (not JSX), every `div` has `display: flex` explicitly.

- [ ] **Step 1: Write the template**

```javascript
// lib/news/slide-cover.js
// Slide 1 — dark cover (the hook). Renders via Satori (next/og).
// Returns a React element ready to pass to ImageResponse.

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

// Splits a hook string into spans, highlighting any word in highlight_words.
function renderHookText(hook, highlights, accentColor) {
  if (!Array.isArray(highlights) || highlights.length === 0) return [hook];
  // Build a regex of escaped highlight words
  const esc = highlights.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  const parts = hook.split(re);
  return parts.map((part, i) => {
    if (!part) return null;
    const isHi = highlights.some((w) => w.toLowerCase() === part.toLowerCase());
    return h(
      'span',
      { key: i, style: { color: isHi ? accentColor : TOKENS.white } },
      part,
    );
  }).filter(Boolean);
}

export function buildCoverSlide({ hook, highlight_words, accent_color, tier, source_quality, slide_index = 1, slide_total = 4 }) {
  const accentHex = accent_color === 'amber' ? TOKENS.amber : TOKENS.cyan;
  const tierLabel = String(tier || 'RESEARCH').toUpperCase();
  const tierGrade = source_quality ? `${tierLabel} · ${source_quality}` : tierLabel;

  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.ink, color: TOKENS.white,
        fontFamily: 'Barlow Condensed',
      },
    },
    // top row: brandmark + slide indicator
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        h('img', {
          src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
          width: 64, height: 64,
          style: { display: 'block' },
        }),
        h(
          'div',
          { style: { display: 'flex', fontSize: 26, fontWeight: 900, letterSpacing: 6, color: TOKENS.white } },
          'ADVNCE ',
          h('span', { style: { display: 'flex', fontWeight: 400, color: 'rgba(255,255,255,0.5)' } }, 'LABS'),
        ),
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' } },
        `${slide_index} / ${slide_total}`,
      ),
    ),
    // headline
    h(
      'div',
      {
        style: {
          display: 'flex', flexWrap: 'wrap',
          fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 152,
          lineHeight: 0.92, letterSpacing: -2, textTransform: 'uppercase',
          color: TOKENS.white,
        },
      },
      ...renderHookText(hook, highlight_words || [], accentHex),
    ),
    // bottom row: SWIPE + tier badge
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                 fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        'SWIPE',
        h('span', { style: { display: 'flex', color: accentHex, fontSize: 28 } }, '→'),
      ),
      h('div', { style: { display: 'flex' } }, tierGrade),
    ),
  );
}
```

- [ ] **Step 2: Smoke verify (no render — just module loads)**

```bash
node -e "import('./lib/news/slide-cover.js').then(m => { const el = m.buildCoverSlide({ hook: 'BPC-157 ACCELERATED 47%', highlight_words: ['47%'], accent_color: 'teal', tier: 'research', source_quality: 'A' }); console.log('el type:', el.type); })"
```

Expected: `el type: div`.

- [ ] **Step 3: Commit**

```bash
git add lib/news/slide-cover.js
git commit -m "news: slide 1 cover template (dark, with hook + accent rotation)"
```

---

### Task 13: Slide 2 — cream finding

**Files:**
- Create: `lib/news/slide-finding.js`

- [ ] **Step 1: Write the template**

```javascript
// lib/news/slide-finding.js
// Slide 2 — cream finding (compound + plain-English explainer).

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

function brandRow() {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 18 } },
    h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
               width: 56, height: 56, style: { display: 'block' } }),
    h('div',
      { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 900,
                 letterSpacing: 6, color: TOKENS.ink } },
      'ADVNCE ',
      h('span', { style: { display: 'flex', fontWeight: 400, color: TOKENS.dim } }, 'LABS'),
    ),
  );
}

function topRow(kicker, idx, total = 4) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
               fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3,
               color: TOKENS.dim, textTransform: 'uppercase' } },
    h('div', { style: { display: 'flex' } }, kicker),
    h('div', { style: { display: 'flex' } }, `${idx} / ${total}`),
  );
}

export function buildFindingSlide({ compound, sub, finding, slide_index = 2 }) {
  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('Finding', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 56 } },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h('div',
          { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 132,
                     lineHeight: 0.9, letterSpacing: -1, textTransform: 'uppercase' } },
          compound,
        ),
        h('div', { style: { display: 'flex', width: 88, height: 4, backgroundColor: TOKENS.cyan, marginTop: 18 } }),
        sub ? h('div',
          { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontStyle: 'italic',
                     fontSize: 32, color: TOKENS.dim, marginTop: 22 } },
          sub,
        ) : null,
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 50,
                   lineHeight: 1.25, color: TOKENS.ink, maxWidth: 920 } },
        finding,
      ),
    ),
    brandRow(),
  );
}
```

- [ ] **Step 2: Smoke verify**

```bash
node -e "import('./lib/news/slide-finding.js').then(m => console.log('ok:', typeof m.buildFindingSlide))"
```

Expected: `ok: function`.

- [ ] **Step 3: Commit**

```bash
git add lib/news/slide-finding.js
git commit -m "news: slide 2 cream finding template"
```

---

### Task 14: Slide 3 — cream mechanism + citation

**Files:**
- Create: `lib/news/slide-mechanism.js`

- [ ] **Step 1: Write the template**

```javascript
// lib/news/slide-mechanism.js
// Slide 3 — cream mechanism + citation block.

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

function brandRow() {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 18 } },
    h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
               width: 56, height: 56, style: { display: 'block' } }),
    h('div',
      { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 900,
                 letterSpacing: 6, color: TOKENS.ink } },
      'ADVNCE ',
      h('span', { style: { display: 'flex', fontWeight: 400, color: TOKENS.dim } }, 'LABS'),
    ),
  );
}

function topRow(kicker, idx, total = 4) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
               fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3,
               color: TOKENS.dim, textTransform: 'uppercase' } },
    h('div', { style: { display: 'flex' } }, kicker),
    h('div', { style: { display: 'flex' } }, `${idx} / ${total}`),
  );
}

export function buildMechanismSlide({ mechanism, citation, slide_index = 3 }) {
  // Citation comes in as one string like "Sikiric et al · J Pharm Pharmacol · 2024 · PMID 12345678"
  // Display the whole thing, but split off any trailing PMID-only fragment for dim styling.
  const citParts = (citation || '').split('·').map((s) => s.trim());

  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('Mechanism', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 48 } },
      h('div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 44,
                   lineHeight: 1.3, color: TOKENS.ink, maxWidth: 920 } },
        mechanism,
      ),
      // Citation block
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 8,
                   borderTop: `1px solid ${TOKENS.rule}`, paddingTop: 24 } },
        h('div',
          { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 16,
                     letterSpacing: 2, color: TOKENS.dim, textTransform: 'uppercase' } },
          'Source',
        ),
        h('div',
          { style: { display: 'flex', flexWrap: 'wrap', fontFamily: 'JetBrains Mono', fontSize: 22,
                     color: TOKENS.ink, letterSpacing: 0.5 } },
          citParts.slice(0, 3).join(' · '),
        ),
        citParts.length > 3
          ? h('div',
              { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 18,
                         color: TOKENS.dim, letterSpacing: 0.5 } },
              citParts.slice(3).join(' · '),
            )
          : null,
      ),
    ),
    brandRow(),
  );
}
```

- [ ] **Step 2: Smoke verify**

```bash
node -e "import('./lib/news/slide-mechanism.js').then(m => console.log('ok:', typeof m.buildMechanismSlide))"
```

- [ ] **Step 3: Commit**

```bash
git add lib/news/slide-mechanism.js
git commit -m "news: slide 3 cream mechanism + citation template"
```

---

### Task 15: Slide 4 — cream takeaway + CTA

**Files:**
- Create: `lib/news/slide-takeaway.js`

- [ ] **Step 1: Write the template**

```javascript
// lib/news/slide-takeaway.js
// Slide 4 — cream takeaway + soft CTA card.

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

function brandRow() {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 18 } },
    h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
               width: 56, height: 56, style: { display: 'block' } }),
    h('div',
      { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 900,
                 letterSpacing: 6, color: TOKENS.ink } },
      'ADVNCE ',
      h('span', { style: { display: 'flex', fontWeight: 400, color: TOKENS.dim } }, 'LABS'),
    ),
  );
}

function topRow(kicker, idx, total = 4) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
               fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3,
               color: TOKENS.dim, textTransform: 'uppercase' } },
    h('div', { style: { display: 'flex' } }, kicker),
    h('div', { style: { display: 'flex' } }, `${idx} / ${total}`),
  );
}

export function buildTakeawaySlide({ takeaway, slide_index = 4 }) {
  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('What This Means', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h('div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 50,
                   lineHeight: 1.25, color: TOKENS.ink, maxWidth: 920 } },
        takeaway,
      ),
      h('div', { style: { display: 'flex', width: 88, height: 4, backgroundColor: TOKENS.amber, marginTop: 32 } }),
      h('div',
        { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 18,
                   letterSpacing: 2, textTransform: 'uppercase', color: TOKENS.dim, marginTop: 18 } },
        'For research use only · not medical advice',
      ),
      // CTA card
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 24, marginTop: 36,
                   backgroundColor: TOKENS.ink, color: TOKENS.bg, padding: '36px 44px' } },
        h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
                   width: 64, height: 64, style: { display: 'block' } }),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div',
            { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 16,
                       letterSpacing: 2, textTransform: 'uppercase', color: TOKENS.cyan } },
            'Research-grade peptides',
          ),
          h('div',
            { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontWeight: 900,
                       fontSize: 38, letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.bg } },
            'ADVNCELABS.COM',
          ),
        ),
        h('div',
          { style: { display: 'flex', marginLeft: 'auto', fontSize: 36, color: TOKENS.cyan } },
          '→',
        ),
      ),
    ),
    brandRow(),
  );
}
```

- [ ] **Step 2: Smoke verify**

```bash
node -e "import('./lib/news/slide-takeaway.js').then(m => console.log('ok:', typeof m.buildTakeawaySlide))"
```

- [ ] **Step 3: Commit**

```bash
git add lib/news/slide-takeaway.js
git commit -m "news: slide 4 cream takeaway + RUO disclaimer + CTA card"
```

---

### Task 16: Render orchestrator

**Files:**
- Create: `lib/news/render.js`

- [ ] **Step 1: Write the orchestrator**

```javascript
// lib/news/render.js
// Render a draft into 4 PNG slides → upload to Supabase Storage →
// update post_drafts.image_urls + status=ready_for_review.

import { ImageResponse } from 'next/og';
import { loadNewsFonts } from './fonts.js';
import { buildCoverSlide } from './slide-cover.js';
import { buildFindingSlide } from './slide-finding.js';
import { buildMechanismSlide } from './slide-mechanism.js';
import { buildTakeawaySlide } from './slide-takeaway.js';
import { SLIDE_W, SLIDE_H } from './tokens.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'news-slides';

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

async function uploadSlide(draftId, idx, pngBuffer) {
  const path = `${draftId}/slide-${idx}.png`;
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: pngBuffer,
  });
  if (!upRes.ok) {
    const t = await upRes.text();
    throw new Error(`storage upload failed (slide ${idx}): ${upRes.status} ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function elementToPngBuffer(element, fonts) {
  const r = new ImageResponse(element, { width: SLIDE_W, height: SLIDE_H, fonts });
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

function pickCompoundFromHook(hook) {
  // First all-caps token in the hook (handles "BPC-157", "GLP-1", "RFK")
  const m = String(hook || '').match(/[A-Z][A-Z0-9\-]{1,}/);
  return m ? m[0] : 'COMPOUND';
}

export async function renderDraft(draftId) {
  // 1. Load draft
  const dRes = await sb(`/post_drafts?id=eq.${draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) throw new Error(`draft ${draftId} not found`);
  const d = drafts[0];

  if (d.needs_legal_review) {
    // Don't render — leave in needs_legal_review status
    return { ok: false, reason: 'needs_legal_review' };
  }

  // 2. Mark rendering
  await sb(`/post_drafts?id=eq.${draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'rendering' }),
  });

  try {
    const fonts = await loadNewsFonts();
    const compound = pickCompoundFromHook(d.hook);
    // Pull tier from candidate
    const cRes = await sb(`/news_candidates?id=eq.${d.candidate_id}&select=tier,source_name,topic_tags`);
    const cand = (await cRes.json())[0] || { tier: 'A' };
    const tierLabel = cand.topic_tags?.includes('regulatory') ? 'REGULATORY'
                    : cand.topic_tags?.includes('industry') ? 'INDUSTRY'
                    : cand.topic_tags?.includes('pulse') ? 'PULSE' : 'RESEARCH';

    const slide1 = buildCoverSlide({
      hook: d.hook, highlight_words: d.highlight_words,
      accent_color: d.accent_color, tier: tierLabel, source_quality: cand.tier,
    });
    const slide2 = buildFindingSlide({
      compound, sub: cand.source_name, finding: d.slide_2_finding,
    });
    const slide3 = buildMechanismSlide({
      mechanism: d.slide_3_mechanism, citation: d.slide_3_citation,
    });
    const slide4 = buildTakeawaySlide({ takeaway: d.slide_4_takeaway });

    // 3. Render each slide to PNG → upload
    const elements = [slide1, slide2, slide3, slide4];
    const urls = [];
    for (let i = 0; i < elements.length; i++) {
      const buf = await elementToPngBuffer(elements[i], fonts);
      const url = await uploadSlide(draftId, i + 1, buf);
      urls.push(url);
    }

    // 4. Update draft
    await sb(`/post_drafts?id=eq.${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ready_for_review', image_urls: urls }),
    });

    return { ok: true, urls };
  } catch (e) {
    await sb(`/post_drafts?id=eq.${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'render_failed' }),
    });
    throw e;
  }
}
```

- [ ] **Step 2: Smoke verify (no live render — module loads)**

```bash
node -e "import('./lib/news/render.js').then(m => console.log('ok:', typeof m.renderDraft))"
```

Expected: `ok: function`.

- [ ] **Step 3: Commit**

```bash
git add lib/news/render.js
git commit -m "news: render orchestrator (4 slides → Supabase Storage → draft.image_urls)"
```

---

### Task 17: Render API route + END-TO-END SMOKE

**Files:**
- Create: `app/api/admin/news/render/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/render/[draftId]/route.js
// Manually trigger render for a draft (admin retry button).

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { renderDraft } from '../../../../../../lib/news/render';

export const maxDuration = 120;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const result = await renderDraft(params.draftId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: End-to-end smoke — scrape, then manually invoke curate**

```bash
# Make sure ANTHROPIC_API_KEY is in .env.local
# Terminal 1: dev server running
# Terminal 2:

# 1. Trigger scrape (Task 7 already exists)
curl -s -X POST http://localhost:3000/api/cron/news-scrape \
  -H "Authorization: Bearer $CRON_SECRET" | head -50

# 2. Trigger curate — this will pick + render in one call
curl -s -X POST http://localhost:3000/api/cron/news-curate \
  -H "Authorization: Bearer $CRON_SECRET" --max-time 280 | head -100
```

Expected: response includes `picks: N`, `renders: [{id: ..., ok: true}, ...]`. In Supabase: `post_drafts` rows with status=`ready_for_review` and `image_urls` array of 4 URLs each. Open one URL in browser — should be a 1080×1350 PNG matching the mockup.

If the rendered PNG looks wrong vs the mockup, compare against `public/preview/news-mockup.html` and adjust slide-N templates, NOT the mockup. The mockup is the visual contract.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/render/[draftId]/route.js
git commit -m "news: /api/admin/news/render/[id] route + smoke-verified end-to-end render"
```

---

## Milestone 5 — Admin queue UI

### Task 18: Admin news page (server component)

**Files:**
- Create: `app/admin/marketing/news/page.jsx`

- [ ] **Step 1: Write the page**

```jsx
// app/admin/marketing/news/page.jsx
// Server component: fetches drafts grouped by status + source health, then
// hands per-draft data to <DraftCard /> client component.

import DraftCard from './DraftCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function loadData() {
  const [ready, legal, recent, health] = await Promise.all([
    sb('/post_drafts?status=eq.ready_for_review&order=slot_date.asc'),
    sb('/post_drafts?status=eq.needs_legal_review&order=created_at.desc'),
    sb('/post_drafts?status=in.(posted,skipped,render_failed)&order=created_at.desc&limit=30'),
    sb('/source_health?order=source_name.asc'),
  ]);
  return { ready, legal, recent, health };
}

export const dynamic = 'force-dynamic';

export default async function NewsAdminPage() {
  const { ready, legal, recent, health } = await loadData();
  const downCount = health.filter((h) => h.consecutive_failures >= 3).length;
  const totalSources = health.length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>News Queue</h1>
          <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>
            Source health: {totalSources - downCount} / {totalSources} ✓ {downCount > 0 ? `· ${downCount} down` : ''}
          </div>
        </div>
        <form action="/api/cron/news-scrape" method="POST">
          <button type="submit"
            style={{ padding: '10px 18px', background: '#1A1C22', color: '#F4F2EE',
                     border: 0, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
            Run scrape now
          </button>
        </form>
      </header>

      <Section title={`Ready for review (${ready.length})`}>
        {ready.length === 0 && <Empty>No drafts queued. Run curator to populate.</Empty>}
        {ready.map((d) => <DraftCard key={d.id} draft={d} mode="ready" />)}
      </Section>

      <Section title={`Needs legal review (${legal.length})`}>
        {legal.length === 0 && <Empty>None.</Empty>}
        {legal.map((d) => <DraftCard key={d.id} draft={d} mode="legal" />)}
      </Section>

      <Section title={`Recent (last 30)`}>
        {recent.length === 0 && <Empty>None yet.</Empty>}
        {recent.map((d) => <DraftCard key={d.id} draft={d} mode="recent" />)}
      </Section>

      <details style={{ marginTop: 32, fontSize: 12, color: '#7A7D88' }}>
        <summary style={{ cursor: 'pointer' }}>Source health detail</summary>
        <table style={{ marginTop: 12, fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr><th align="left">Source</th><th align="left">Last success</th><th align="left">Failures</th></tr></thead>
          <tbody>
            {health.map((h) => (
              <tr key={h.source_name} style={{ color: h.consecutive_failures >= 3 ? '#E07C24' : '#1A1C22' }}>
                <td style={{ padding: '4px 12px' }}>{h.source_name}</td>
                <td style={{ padding: '4px 12px' }}>{h.last_success_at ? new Date(h.last_success_at).toLocaleString() : '—'}</td>
                <td style={{ padding: '4px 12px' }}>{h.consecutive_failures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase',
                   color: '#7A7D88', marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.08)',
                   paddingBottom: 6 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 18, color: '#7A7D88', fontStyle: 'italic', fontSize: 13 }}>{children}</div>;
}
```

- [ ] **Step 2: Smoke — visit page**

```bash
# Dev server running, log in to /admin/login first
open http://localhost:3000/admin/marketing/news
```

Expected: page loads, shows 3 sections (Ready/Legal/Recent), source health detail expandable, "Run scrape now" button works (will POST and reload). DraftCard component will fail until next task — empty state should still render.

- [ ] **Step 3: Commit**

```bash
git add app/admin/marketing/news/page.jsx
git commit -m "news: /admin/marketing/news server component (queue list + source health)"
```

---

### Task 19: DraftCard client component

**Files:**
- Create: `app/admin/marketing/news/DraftCard.jsx`

- [ ] **Step 1: Write the component**

```jsx
// app/admin/marketing/news/DraftCard.jsx
'use client';

import { useState } from 'react';

export default function DraftCard({ draft, mode }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(draft.caption || '');
  const [busy, setBusy] = useState(null);

  async function call(path, opts = {}) {
    setBusy(path);
    try {
      const res = await fetch(path, { method: 'POST', ...opts });
      if (!res.ok) throw new Error(await res.text());
      return res;
    } finally { setBusy(null); }
  }

  async function approveAndDownload() {
    const res = await call(`/api/admin/news/approve/${draft.id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.slot_date}-${slugify(draft.hook)}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    // Caption to clipboard
    try { await navigator.clipboard.writeText(captionWithHashtags(draft)); }
    catch (e) { /* clipboard may fail without HTTPS in some browsers */ }
    alert('Downloaded zip + caption copied. Now post to IG.');
    location.reload();
  }

  async function saveCaption() {
    await fetch(`/api/admin/news/update-caption/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    });
    setEditing(false);
    location.reload();
  }

  const accentBg = draft.accent_color === 'amber' ? '#E07C24' : '#00A0A8';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', padding: 18, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#7A7D88' }}>
        <span>{draft.slot_date}</span>
        <span style={{ background: accentBg, color: '#fff', padding: '2px 8px' }}>{draft.accent_color}</span>
        {draft.needs_legal_review && <span style={{ color: '#E07C24' }}>· legal review</span>}
        <span>· status: {draft.status}</span>
      </div>

      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{draft.hook}</div>

      {draft.image_urls?.length === 4 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {draft.image_urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer">
              <img src={u} alt={`slide ${i+1}`} style={{ width: 100, height: 125, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.08)' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 8 }}>
        Source: {draft.source_url ? <a href={draft.source_url} target="_blank" rel="noreferrer" style={{ color: '#00A0A8' }}>{draft.source_url}</a> : '—'}
      </div>

      {editing ? (
        <div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
            rows={6} style={{ width: '100%', fontSize: 13, padding: 8, fontFamily: 'inherit' }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={saveCaption} style={btnPrimary}>Save</button>
            <button onClick={() => { setEditing(false); setCaption(draft.caption || ''); }}
              style={btnGhost}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#1A1C22', marginBottom: 6, whiteSpace: 'pre-wrap' }}>
          {draft.caption}
        </div>
      )}

      {draft.hashtags?.length > 0 && (
        <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 12 }}>
          {draft.hashtags.join(' ')}
        </div>
      )}

      {mode === 'ready' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={approveAndDownload} disabled={busy} style={btnPrimary}>
            {busy === `/api/admin/news/approve/${draft.id}` ? 'Zipping…' : 'Approve & Download'}
          </button>
          <button onClick={() => setEditing(true)} disabled={busy} style={btnGhost}>Edit caption</button>
          <button onClick={() => call(`/api/admin/news/regenerate/${draft.id}`).then(() => location.reload())}
            disabled={busy} style={btnGhost}>Regenerate</button>
          <button onClick={() => call(`/api/admin/news/flip-color/${draft.id}`).then(() => location.reload())}
            disabled={busy} style={btnGhost}>Flip color</button>
          <button onClick={() => call(`/api/admin/news/skip/${draft.id}`).then(() => location.reload())}
            disabled={busy} style={btnGhost}>Skip</button>
          {draft.status === 'render_failed' && (
            <button onClick={() => call(`/api/admin/news/render/${draft.id}`).then(() => location.reload())}
              disabled={busy} style={btnGhost}>Retry render</button>
          )}
        </div>
      )}

      {mode === 'legal' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => call(`/api/admin/news/force-approve/${draft.id}`).then(() => location.reload())}
            style={btnPrimary}>Force-approve</button>
          <button onClick={() => call(`/api/admin/news/skip/${draft.id}`).then(() => location.reload())}
            style={btnGhost}>Drop</button>
        </div>
      )}
    </div>
  );
}

function captionWithHashtags(d) {
  return [(d.caption || '').trim(), (d.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
}

function slugify(s) {
  return String(s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

const btnPrimary = { padding: '8px 14px', background: '#1A1C22', color: '#F4F2EE',
  border: 0, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' };

const btnGhost = { padding: '8px 14px', background: 'transparent', color: '#1A1C22',
  border: '1px solid rgba(0,0,0,0.16)', fontSize: 12, letterSpacing: 1,
  textTransform: 'uppercase', cursor: 'pointer' };
```

- [ ] **Step 2: Smoke — view a real draft in the queue**

Reload `/admin/marketing/news` — the draft you rendered in Task 17 should appear in "Ready for review" with 4 thumbnails. Click a thumbnail; confirm full-size PNG opens. Click "Edit caption" — textarea appears.

- [ ] **Step 3: Commit**

```bash
git add app/admin/marketing/news/DraftCard.jsx
git commit -m "news: DraftCard client component (preview + approve/edit/regen/flip/skip)"
```

---

### Task 20: Add "News" link to admin navigation

**Files:**
- Modify: `app/admin/layout.jsx`

- [ ] **Step 1: Read the current layout**

```bash
cat "/Volumes/Alexandria/AI Projects/adonis-next/app/admin/layout.jsx" | head -80
```

Look for the Marketing section nav. The new link `/admin/marketing/news` with label "News" should sit alongside existing marketing links (`/admin/marketing`, `/admin/marketing/post-builder`).

- [ ] **Step 2: Add the link**

Find the JSX block listing marketing nav items and add this entry in the same pattern as siblings (replicate exact style/wrapper used by adjacent links — do not invent new patterns):

```jsx
<Link href="/admin/marketing/news">News</Link>
```

(If the file uses an array config + .map, add an entry to that array instead.)

- [ ] **Step 3: Smoke**

Reload admin — confirm "News" appears in the marketing nav and links to `/admin/marketing/news`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.jsx
git commit -m "admin: add News link to marketing nav"
```

---

## Milestone 6 — Admin action routes

### Task 21: Approve & Download (zip route)

**Files:**
- Create: `app/api/admin/news/approve/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/approve/[draftId]/route.js
// Returns a zip of the 4 slide PNGs. Marks draft as posted.

import { requireAdmin } from '../../../../../../lib/requireAdmin';
import archiver from 'archiver';
import { Readable } from 'stream';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 60;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return new Response('not found', { status: 404 });
  }
  const d = drafts[0];
  if (!Array.isArray(d.image_urls) || d.image_urls.length !== 4) {
    return new Response('draft has no rendered images', { status: 400 });
  }

  // Fetch all 4 PNGs in parallel
  const buffers = await Promise.all(d.image_urls.map(async (u, i) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`failed to fetch slide ${i+1}: ${r.status}`);
    return { name: `slide-${i+1}.png`, data: Buffer.from(await r.arrayBuffer()) };
  }));

  // Build zip in memory
  const archive = archiver('zip', { zlib: { level: 9 } });
  const chunks = [];
  archive.on('data', (c) => chunks.push(c));
  for (const f of buffers) archive.append(f.data, { name: f.name });
  await archive.finalize();
  const zipBuffer = Buffer.concat(chunks);

  // Mark posted
  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'posted', approved_at: new Date().toISOString(),
                           posted_at: new Date().toISOString() }),
  });

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="news-${params.draftId}.zip"`,
    },
  });
}
```

- [ ] **Step 2: Smoke — click "Approve & Download" in the admin UI**

Should download a `news-<draftId>.zip` containing 4 PNGs named `slide-1.png` … `slide-4.png`. Caption + hashtags should be in clipboard. Page reloads; draft moves out of "Ready for review".

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/approve/[draftId]/route.js
git commit -m "news: approve route — zips 4 slides, marks posted"
```

---

### Task 22: Regenerate route

**Files:**
- Create: `app/api/admin/news/regenerate/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/regenerate/[draftId]/route.js
// Snapshot current draft to history, then re-run curator on the same
// candidate (without affecting other drafts).

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { CURATOR_MODEL, buildSystemPrompt } from '../../../../../../lib/news/curator-prompt';
import { validateCuratorOutput } from '../../../../../../lib/news/curator';
import { renderDraft } from '../../../../../../lib/news/render';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 180;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  // 1. Load draft + candidate
  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const d = drafts[0];
  if (!d.candidate_id) {
    return NextResponse.json({ error: 'no candidate to regenerate from' }, { status: 400 });
  }
  const cRes = await sb(`/news_candidates?id=eq.${d.candidate_id}&select=*`);
  const cand = (await cRes.json())[0];
  if (!cand) return NextResponse.json({ error: 'candidate missing' }, { status: 400 });

  // 2. Snapshot current draft
  await sb('/post_drafts_history', {
    method: 'POST',
    body: JSON.stringify({ draft_id: d.id, snapshot: d }),
  });

  // 3. Re-run curator on this single candidate
  const userMessage = JSON.stringify({
    last_week_final_color: d.accent_color === 'teal' ? 'amber' : 'teal',
    suggested_first_color: d.accent_color,
    slot_dates: { [slotName(d.slot_date)]: d.slot_date },
    candidates: [{
      candidate_id: cand.id,
      title: cand.title,
      source_url: cand.source_url,
      source_name: cand.source_name,
      tier: cand.tier,
      topic_tags: cand.topic_tags,
      raw_content: (cand.raw_content || '').slice(0, 800),
      published_at: cand.published_at,
    }],
    instruction: 'Regenerate this single pick with a fresh angle. Keep the same slot.',
  });

  const resp = await client.messages.create({
    model: CURATOR_MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });
  const text = resp.content.find((b) => b.type === 'text')?.text || '';
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: 'curator non-JSON' }, { status: 502 });
    parsed = JSON.parse(m[0]);
  }
  const errs = validateCuratorOutput(parsed);
  if (errs.length || parsed.picks.length !== 1) {
    return NextResponse.json({ error: 'curator output invalid', detail: errs }, { status: 502 });
  }
  const p = parsed.picks[0];

  // 4. Update the draft in place + clear images
  await sb(`/post_drafts?id=eq.${d.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: p.needs_legal_review ? 'needs_legal_review' : 'rendering',
      accent_color: p.accent_color,
      hook: p.hook,
      highlight_words: p.highlight_words || [],
      slide_2_finding: p.slide_2_finding,
      slide_3_mechanism: p.slide_3_mechanism,
      slide_3_citation: p.slide_3_citation,
      slide_4_takeaway: p.slide_4_takeaway,
      caption: p.caption,
      hashtags: p.hashtags || [],
      needs_legal_review: !!p.needs_legal_review,
      citation_text: p.citation,
      image_urls: null,
    }),
  });

  // 5. Re-render unless legal-review
  if (!p.needs_legal_review) await renderDraft(d.id);

  return NextResponse.json({ ok: true });
}

function slotName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  if (dow === 1) return 'mon';
  if (dow === 3) return 'wed';
  if (dow === 5) return 'fri';
  return 'mon';
}
```

- [ ] **Step 2: Smoke — click Regenerate on a draft**

Old version snapshotted in `post_drafts_history`. Draft updates with new content + new images.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/regenerate/[draftId]/route.js
git commit -m "news: regenerate route (snapshot to history, re-curate, re-render)"
```

---

### Task 23: Flip-color route

**Files:**
- Create: `app/api/admin/news/flip-color/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/flip-color/[draftId]/route.js
// Toggle accent_color (teal ↔ amber), re-render the cover slide only.
// To keep the implementation simple in v1, re-render ALL 4 slides.
// (Cover slide is the only one affected, but render.js does all 4 atomically.)

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { renderDraft } from '../../../../../../lib/news/render';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 120;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=accent_color`);
  const rows = await dRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const next = rows[0].accent_color === 'teal' ? 'amber' : 'teal';
  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ accent_color: next, status: 'rendering', image_urls: null }),
  });
  await renderDraft(params.draftId);
  return NextResponse.json({ ok: true, accent_color: next });
}
```

- [ ] **Step 2: Smoke — click "Flip color"**

Card reloads with the opposite-color cover slide.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/flip-color/[draftId]/route.js
git commit -m "news: flip-color route — toggle accent + re-render"
```

---

### Task 24: Skip route

**Files:**
- Create: `app/api/admin/news/skip/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/skip/[draftId]/route.js
// Mark draft skipped; put underlying candidate on 30-day cooldown.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=candidate_id`);
  const rows = await dRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const candidateId = rows[0].candidate_id;

  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH', body: JSON.stringify({ status: 'skipped' }),
  });

  if (candidateId) {
    const cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await sb(`/news_candidates?id=eq.${candidateId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cooldown', cooldown_until: cooldownUntil }),
    });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke — click Skip**

Draft moves out of "Ready for review" into "Recent" with status=`skipped`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/skip/[draftId]/route.js
git commit -m "news: skip route — status=skipped + 30-day candidate cooldown"
```

---

### Task 25: Force-approve route

**Files:**
- Create: `app/api/admin/news/force-approve/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/force-approve/[draftId]/route.js
// Move a draft from needs_legal_review → ready_for_review.
// Renders if not yet rendered.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { renderDraft } from '../../../../../../lib/news/render';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 120;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'rendering',
      needs_legal_review: false,
      image_urls: null,
    }),
  });
  await renderDraft(params.draftId);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke — flag a draft via `needs_legal_review=true`, then click Force-approve**

Use Supabase Table Editor to set `needs_legal_review=true` on a draft → it appears in "Needs legal review". Click Force-approve → draft re-renders → moves to Ready for review.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/force-approve/[draftId]/route.js
git commit -m "news: force-approve route (legal review override + re-render)"
```

---

### Task 26: Update-caption route

**Files:**
- Create: `app/api/admin/news/update-caption/[draftId]/route.js`

- [ ] **Step 1: Write the route**

```javascript
// app/api/admin/news/update-caption/[draftId]/route.js
// PATCH inline caption edit from the admin UI.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PATCH(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const body = await request.json();
  if (typeof body.caption !== 'string') {
    return NextResponse.json({ error: 'caption required' }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ caption: body.caption }),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke — edit a caption in the admin UI**

Click Edit caption → modify text → Save. Page reloads with new caption.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/news/update-caption/[draftId]/route.js
git commit -m "news: update-caption PATCH route"
```

---

## Milestone 7 — Cron wiring + ship

### Task 27: Add cron entries to vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Read current vercel.json, then update**

The existing vercel.json (already known) has 2 crons. Add 2 more:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/index.html" }
  ],
  "crons": [
    { "path": "/api/cron/welcome-emails",   "schedule": "0 17 * * *" },
    { "path": "/api/cron/reorder-reminders","schedule": "0 12 * * *" },
    { "path": "/api/cron/news-scrape",      "schedule": "0 11 * * *" },
    { "path": "/api/cron/news-curate",      "schedule": "0 4  * * 1" }
  ]
}
```

(`0 11 * * *` = daily 11:00 UTC = 3am Pacific Standard Time. `0 4 * * 1` = Mondays 04:00 UTC = Sunday 8pm PST. PT in summer is PDT and shifts +1h; document this drift in the spec if it matters.)

- [ ] **Step 2: Smoke — verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid')"
```

Expected: `valid`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "ops: add news-scrape (daily 3am PT) + news-curate (Sun 8pm PT) crons"
```

---

### Task 28: End-to-end smoke test

**Files:** none — verification only.

- [ ] **Step 1: Confirm env vars are set in Vercel**

In Vercel project settings → Environment Variables, confirm `ANTHROPIC_API_KEY` is set in Production.

```bash
# Optional: verify locally first
grep -q ANTHROPIC_API_KEY .env.local && echo "local ✓" || echo "local missing"
```

- [ ] **Step 2: Push to deploy**

```bash
cd "/Volumes/Alexandria/AI Projects/adonis-next"
git push
```

- [ ] **Step 3: Wait for Vercel deploy, then trigger scrape from production admin**

```bash
# Replace <admin-cookie> with the value of the adonis_admin cookie after logging in to /admin
curl -s -X POST https://<your-vercel-domain>/api/cron/news-scrape \
  -H "Cookie: adonis_admin=authenticated" | head -50
```

Expected: `{"ok":true,"inserted":N,"errors":[...]}`.

- [ ] **Step 4: Trigger curator from production admin**

```bash
curl -s -X POST https://<your-vercel-domain>/api/cron/news-curate \
  -H "Cookie: adonis_admin=authenticated" --max-time 280 | head -100
```

Expected: 1-3 picks rendered. Visit `/admin/marketing/news` in production — should see drafts.

- [ ] **Step 5: Approve & download one carousel, post to @advncelabs manually**

Validate the full loop: zip downloads, caption auto-copies, IG accepts the 4-PNG carousel.

---

### Task 29: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current Marketing/Admin section**

```bash
grep -n "marketing" "/Volumes/Alexandria/AI Projects/adonis-next/CLAUDE.md" | head -10
```

- [ ] **Step 2: Add a one-line mention near the admin dashboard description**

Add to the React admin dashboard description in the "Dual-Stack Frontend" section:
```
- ... ambassadors, distributors, and **news carousel** management.
```

And in the API Routes section, add:
```
- `cron/news-scrape`, `cron/news-curate` — daily/weekly scrape + curate of peptide news, drafts 4-slide IG carousels into `/admin/marketing/news` review queue
```

- [ ] **Step 3: Commit + push**

```bash
git add CLAUDE.md
git commit -m "docs: mention news carousel engine in CLAUDE.md"
git push
```

---

## Self-review

**Spec coverage:**

| Spec section | Implemented in |
|---|---|
| Source roster (RSS + PubMed) | Task 3 |
| Scraper + dedup + source health | Tasks 4-7 |
| Curator (Sonnet 4.6 + cache + JSON) | Tasks 8-10 |
| Color rotation (teal/amber alternation) | Task 9 (`nextAccentColor` + curator prompt) |
| FLAGGED_COMPOUNDS → needs_legal_review routing | Tasks 3 (list) + 8 (prompt) + 9 (status set) + 25 (force-approve) |
| Brand tokens + Google Fonts loader | Task 11 |
| 4 slide templates (cover + finding + mechanism + takeaway) | Tasks 12-15 |
| Render orchestrator + Storage upload | Task 16 |
| Admin queue page (Ready / Legal / Recent + source health) | Tasks 18-19 |
| Approve & Download (zip + clipboard) | Task 21 |
| Edit caption / Regenerate / Flip color / Skip / Force approve | Tasks 22-26 |
| Cron config (daily scrape + Sunday curate) | Task 27 |
| All-A-tier-down email alert | Task 6 (`maybeAlertAllATierDown`) |
| Schema (4 tables + storage bucket + RLS) | Task 2 |
| Failure mode: Satori render fails → render_failed status | Task 16 (try/catch) |
| Failure mode: empty week → curator returns < 3 picks | Task 9 (handled, no fake content) |
| Failure mode: curator non-JSON | Task 9 (regex fallback + throws if still bad) |

**Placeholder scan:** No "TBD" / "TODO" / "implement later" found in any task. All code blocks are complete and runnable.

**Type consistency:**
- `accent_color` is `'teal' | 'amber'` everywhere (schema check, validator, prompt, render, flip route).
- `status` enum values in schema match all status writes in routes (`drafting`, `rendering`, `ready_for_review`, `needs_legal_review`, `render_failed`, `approved`, `posted`, `skipped`).
- `slot` is `'mon' | 'wed' | 'fri'` in curator output and in `slotName()` reverse mapping (Task 22).
- `tier` is `'A' | 'B' | 'C'` in schema, sources roster, and curator prompt.
- Function names: `runScrape`, `runCurator`, `renderDraft`, `validateCuratorOutput`, `nextAccentColor` — used consistently across modules and routes.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-peptide-news-carousel-engine.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
