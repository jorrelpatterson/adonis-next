# Peptide News Carousel Engine — design

**Date:** 2026-04-29
**Status:** approved (brainstorm)
**Owner:** Jorrel
**Successor doc:** implementation plan (to be written next)

## Problem

advnce labs needs a sustainable, branded Instagram presence that establishes
the company as the **information authority** in the peptide research space.
Reference competitor: @mybiostack — proven format (high-contrast carousels
with shouty headlines), but their interior slides lack rigor (no PMIDs, no
RUO framing, mixed/visually-chaotic stock imagery, no funnel back to a
storefront).

The opportunity is to compete on the same battlefield (high-contrast carousel
hooks) while winning on the interior with research-grade evidence and a
disciplined brand system that ladders into the rest of the advncelabs.com
funnel.

## Goal

Ship a system that, every Mon/Wed/Fri, produces a 4-slide Instagram carousel
about a real peptide-related news/research item, drafted and rendered
automatically and approved by Jorrel in a ~3-min admin review before he posts
it manually to @advncelabs.

## Non-goals (v1)

- Direct Instagram Graph API publishing (deferred — manual export only)
- AI-generated hero images per post (deferred — typography-driven layouts only)
- Engagement / post-performance analytics (separate feature)
- Multi-account split (single account: @advncelabs)
- Auto-approval / fully autonomous publishing (explicit anti-goal due to
  Schedule III / regulatory risk)

## Locked product decisions

| # | Decision | Choice |
|---|---|---|
| Q1 | News sources | Mix: research + regulatory + mainstream, weighted toward research/regulatory |
| Q2 | Visual identity | Brand-faithful — adapt competitor's structural recipe, never their colors |
| Q3 | Background mode | Cream-default; dark only for cover (slide 1) |
| Q4 | Cadence + review | 3x/week (M/W/F), human review queue (no auto-publish) |
| Q5 | IG posting | Manual export from admin (zip + clipboard caption) |
| Q6 | Carousel structure | 4-slide: cover → finding → mechanism+citation → takeaway+CTA |
| A | Architecture | RSS + PubMed + Claude curator + Satori render |

## System architecture

```
[Daily 3am PT cron]                [Sun 8pm PT cron]
       ↓                                    ↓
   Scrape sources                    Curate (Claude Sonnet 4.6)
       ↓                                    ↓
   news_candidates ──────────────→  Pick 3 for next M/W/F
   (dedupe by URL hash)             Draft hook + 4 slides + caption
                                    Insert into post_drafts
                                            ↓
                                    Render (Satori)
                                            ↓
                                    4 PNGs → Supabase Storage
                                    Update post_drafts.image_urls
                                    Status → ready_for_review
                                            ↓
                                    Admin /admin/marketing/news
                                    Approve+Download / Edit / Regen / Skip
                                            ↓
                                    Jorrel posts manually to @advncelabs
                                    Status → posted
```

## Components

### 1. Source scraper (`/api/admin/news/scrape`)

Vercel cron, daily 3am PT. Pulls RSS + PubMed E-utils. Dedupes by URL hash.
Inserts new items into `news_candidates`. Updates `source_health` per source.

**Source roster** (`lib/news-sources.js`):

| Tier | Source | Type |
|---|---|---|
| A | PubMed E-utils API | Research (peptide MeSH terms, past 7d) |
| A | Nature `peptides` topic | Research |
| A | Journal of Peptide Science | Research |
| A | FDA Press Releases | Regulatory |
| A | FDA Drug Safety Communications | Regulatory |
| A | FDA 503A/503B compounding actions | Regulatory |
| A | DEA News | Regulatory (scheduling actions) |
| B | Endpoints News | Industry/biotech |
| B | FierceBiotech | Industry/biotech |
| B | STAT News (health) | Industry/mainstream |
| C | Google News RSS: `peptide therapy` | Pulse |
| C | Google News RSS: `GLP-1` | Pulse |

The roster is data, not code — easy to amend without redeploying logic.

### 2. Curator (`/api/admin/news/curate`)

Vercel cron, Sundays 8pm PT (+ manual trigger button). Calls Claude
Sonnet 4.6 with prompt-cached system prompt and the past 7d of unpicked
candidates.

**System prompt content (cached, ~3K tokens):**
- advnce labs brand voice (RUO/research-grade, never therapeutic claim,
  never dosing recommendation, always cite source)
- Editorial standards (specificity > drama; PMID > press release; mechanism > marketing)
- 4-slide template contract (what each slide must contain)
- Compound priority list (compounds advnce sells get a slight relevance bump;
  Schedule III / anabolic compounds from `eve_aas_catalog_hidden` are
  routed to `needs_legal_review: true` and never auto-rendered)
- Diversity rule (don't pick 3 GLP-1 stories in one week)
- Output JSON schema

**Output schema (per pick):**
```json
{
  "picks": [{
    "slot": "mon" | "wed" | "fri",
    "compound": "BPC-157",
    "source_url": "...",
    "source_quality": "A" | "B" | "C",
    "citation": "Sikiric et al, J Pharm Pharmacol 2024 (PMID: 12345678)",
    "hook": "BPC-157 ACCELERATED TENDON HEALING BY 47% IN A 2024 RAT MODEL",
    "highlight_words": ["47%", "2024"],
    "slide_2_finding": "30-40 word plain-English explainer",
    "slide_3_mechanism": "How the compound is hypothesized to work",
    "slide_4_takeaway": "What this means for the research conversation",
    "caption": "300-400 char IG caption ending in hashtag block",
    "hashtags": ["#bpc157", "#peptiderearch", ...],
    "needs_legal_review": false
  }],
  "skipped_slots": [],
  "candidates_reviewed": 47
}
```

Explicit skip is acceptable: if quality is low for a given slot, the
curator returns fewer than 3 picks and that slot stays empty (no fake
content; quality bar is hard).

**Cost:** ~$0.05/wk = ~$2.60/yr.

### 3. Renderer (`/api/admin/news/render/[draftId]`)

Triggered after curator inserts drafts (or manually re-runnable). For each
draft, renders 4 PNG slides via Satori using JSX templates in
`lib/news/templates/`. Uploads each to Supabase Storage at
`news-slides/{draft_id}/slide-{1..4}.png`. Updates `post_drafts.image_urls`,
status → `ready_for_review`. On render failure: status → `render_failed`,
admin shows retry button.

### 4. Slide templates

**Format:** 1080×1350 portrait (IG max-real-estate carousel ratio).

**Brand tokens (from `advnce-site/brand-kit/tokens.css`):**
- Cream `#F4F2EE`, ink `#1A1C22`, dim `#7A7D88`, teal `#00A0A8`, amber `#E07C24`
- Display: Barlow Condensed 900 (huge headlines)
- Technical: JetBrains Mono (kickers, citations, slide indicators)
- Body: Cormorant Garamond (interior body copy)

**Brand mark:** inline SVG from `brand-kit/logo.svg` (the abstract peptide-
trace mark — cyan line with amber endpoint). Used on all 4 slides. Dark
cover gives it a small cream rounded plate for legibility.

**Cover-color rotation:** the highlight color on slide-1 hook keywords
alternates between teal and amber per post. Stored in
`post_drafts.accent_color`. Curator alternates by `created_at` parity;
admin "Flip color" button overrides per draft.

**Slide structure:**

| # | Background | Purpose | Content |
|---|---|---|---|
| 1 | Dark `#1A1C22` | Hook | Brand mark + tier badge top, huge Barlow Condensed all-caps headline center, rotating teal/amber highlight on 1-3 keywords, "SWIPE →" + tier+grade bottom |
| 2 | Cream | Finding | Kicker "FINDING", giant compound name + teal rule + serif sub-name, then 30-40 word Cormorant body explaining the finding in plain English |
| 3 | Cream | Mechanism + citation | Kicker "MECHANISM", Cormorant body, simple text-flow mechanism diagram in mono, then citation block (source + journal + year + PMID) |
| 4 | Cream | Takeaway + CTA | Kicker "WHAT THIS MEANS", Cormorant takeaway body, amber rule, "For research use only · Not medical advice" mono disclaimer, ink-bg CTA card with logo + "RESEARCH-GRADE PEPTIDES · ADVNCELABS.COM →" |

A static HTML preview of all four slides lives at
`public/preview/news-mockup.html` for fast template iteration.

### 5. Admin queue (`/admin/marketing/news`)

Sits next to existing `marketing/post-builder`, same cookie auth
(`adonis_admin` via middleware). Three sections: ready-for-review,
needs-legal-review, recent (last 30 posted). Source-health badge in header.

**Per-draft card shows:** slot date, accent color, tier+source name,
hook text, source URL + citation, 4 thumbnail slide previews (clickable
to fullscreen), caption preview, hashtag chip row.

**Per-draft actions:**
- **Approve & Download** → server zips the 4 PNGs into
  `{slot_date}-{compound-slug}.zip`, browser downloads, caption +
  hashtags auto-copy to clipboard via `navigator.clipboard.writeText()`.
  Status → `posted` (trust-based; Jorrel pastes into IG himself).
- **Edit caption** → inline textarea, persists to `post_drafts.caption`.
- **Regenerate** → re-runs curator on the same candidate; old version
  snapshot saved to `post_drafts_history`.
- **Flip color** → toggles `accent_color`, re-renders cover slide only.
- **Skip** → status `skipped`; candidate URL goes on a 30-day cooldown.
- **Force-approve** (legal-review section) → moves draft from
  `needs_legal_review` to `ready_for_review`. Logged with timestamp.

## Database schema

Four new Supabase tables.

```sql
create table news_candidates (
  id uuid primary key default gen_random_uuid(),
  source_url text unique not null,
  source_name text not null,
  tier text not null,                       -- 'A' | 'B' | 'C'
  topic_tags text[] default '{}',
  title text not null,
  raw_content text,
  published_at timestamptz,
  scraped_at timestamptz default now(),
  status text default 'new',                -- new | picked | skipped | cooldown
  cooldown_until timestamptz
);
create index on news_candidates (status, published_at desc);

create table post_drafts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references news_candidates(id),
  slot_date date not null,
  status text default 'drafting',           -- drafting | rendering | ready_for_review
                                            --  | needs_legal_review | render_failed
                                            --  | approved | posted | skipped
  accent_color text default 'teal',         -- teal | amber
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
create index on post_drafts (status, slot_date);

create table source_health (
  source_name text primary key,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  consecutive_failures int default 0
);

create table post_drafts_history (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid references post_drafts(id),
  snapshot jsonb not null,
  created_at timestamptz default now()
);
```

**Storage:** Supabase Storage bucket `news-slides`, public-read. Path:
`news-slides/{draft_id}/slide-{1..4}.png`.

## API routes

| Route | Caller | Purpose |
|---|---|---|
| `POST /api/admin/news/scrape` | Cron + admin button | Pull RSS + PubMed, insert candidates, update source_health |
| `POST /api/admin/news/curate` | Cron + admin button | Claude Sonnet curator → insert drafts |
| `POST /api/admin/news/render/[draftId]` | Auto post-curate + admin retry | Satori render 4 slides → upload → update draft |
| `POST /api/admin/news/approve/[draftId]` | Admin "Approve & Download" | Zip 4 PNGs, return blob |
| `POST /api/admin/news/regenerate/[draftId]` | Admin "Regenerate" | Re-run curator on same candidate, snapshot old |
| `POST /api/admin/news/flip-color/[draftId]` | Admin "Flip color" | Toggle accent_color, re-render cover slide |
| `POST /api/admin/news/skip/[draftId]` | Admin "Skip" | Status → skipped, candidate cooldown 30d |
| `POST /api/admin/news/force-approve/[draftId]` | Admin (legal-review) | Move from needs_legal_review → ready_for_review |

All routes protected by `requireAdmin` cookie helper (already in use by
the ambassador routes per the 2026-04-23 hardening).

## Cron config

```json
// vercel.json (additions)
"crons": [
  { "path": "/api/admin/news/scrape",  "schedule": "0 11 * * *" },
  { "path": "/api/admin/news/curate",  "schedule": "0 4  * * 1" }
]
```

(3am PT daily for scrape; Sunday 8pm PT for curate. Cron uses UTC.)

## Failure modes

| Failure | Detection | Handling |
|---|---|---|
| RSS feed dies | `source_health.consecutive_failures >= 3` | Red badge in admin header; scraper continues with remaining feeds. If ALL A-tier feeds fail in one run, scraper sends a Resend email to `ADMIN_EMAIL` (same channel used by support-tickets escalation). |
| PubMed E-utils rate-limited | HTTP 429 from API | Exponential backoff; partial result still useful |
| Claude curator returns garbage / invalid JSON | JSON parse fail or schema mismatch | Draft marked `needs_review`, raw response stored for inspection, Jorrel can manually rewrite or skip |
| Satori render fails on a slide | Exception in render route | Draft status `render_failed`, retry button in UI |
| Curator picks Schedule III compound | Curator's own `needs_legal_review: true` flag | Draft routed to legal-review section; never auto-rendered to ready_for_review |
| Empty week (no good candidates) | Curator returns < 3 picks | Affected slots stay empty; no fake content; admin shows "no draft for this slot" |
| Storage upload fails | Supabase client error | Retry once; on second failure, status `render_failed` |

## Testing

Project has no test framework (per CLAUDE.md). Verification will be
manual + smoke:

- **Source scrape smoke:** trigger scrape manually with a known RSS feed,
  confirm row appears in `news_candidates`.
- **Curator smoke:** seed `news_candidates` with 5-10 known peptide articles,
  trigger curate manually, inspect the 3 picks for editorial quality.
- **Render smoke:** trigger render on a hand-crafted draft, open the 4
  resulting PNGs, compare against the HTML mockup at
  `public/preview/news-mockup.html`.
- **End-to-end smoke:** wait for one full Sunday-curate → Monday-review
  cycle, post the result manually, confirm IG accepts the carousel.

## Out of scope (deferred to v2+)

- IG Graph API publish button (per Q5 — revisit after format proven, ~30+ posts in)
- AI hero image generation per post (Flux/DALL-E in slide 1 + circular accent)
- Mechanism diagrams as actual SVG art (currently text-flow in mono)
- Multi-CTA A/B testing
- Engagement-based post-performance feedback into curator scoring
- Auto-detect when a story we covered gets a follow-up paper / regulatory action

## Open items

None at design close. Implementation plan to be drafted next via
writing-plans skill.
