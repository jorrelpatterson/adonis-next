# Social Media Engine + Ambassador Activation — Implementation Plan

> Spec: [docs/superpowers/specs/2026-04-18-social-media-engine-and-ambassador-activation-design.md](../specs/2026-04-18-social-media-engine-and-ambassador-activation-design.md)
>
> Execution mode: agent-driven, sprint to completion. User-actions deferred to end-of-run checklist.

## Phase 1 — Schema migration (me, 5 min)

**Files:** `supabase/migrations/2026-04-18_social_posts.sql`

Create `social_posts` table per spec section 4.1. Include anon SELECT policy. Generate SQL file; user runs at end.

## Phase 2 — Image templates + rendering pipeline (subagent, ~20 min)

**Files:**
- `templates/social/compound_card.html`
- `templates/social/mechanism_diagram.html`
- `templates/social/stack_carousel.html`
- `templates/social/research_quote.html`
- `templates/social/standards_statement.html`
- `scripts/render-social-posts.js` (Node script using puppeteer-core or Chrome headless)

Each template: 1080×1080, brand-system colors/fonts (light cream, cyan/amber accents, Barlow Condensed + Cormorant Garamond + JetBrains Mono via Google Fonts).

Render script reads `data/social-posts-manifest.json` (created in Phase 6), generates PNGs into `adonis-next/public/social-images/`.

## Phase 3 — Admin /content calendar page (subagent, ~25 min)

**Files:**
- `app/admin/content/page.jsx`
- `app/api/social-post-write/route.js`

Calendar grid (month view) with prev/next navigation. Click date tile → modal with image preview + copy caption + download image + status actions (mark posted, archive, edit).

Reads from Supabase `social_posts`, writes via `/api/social-post-write` (server-side service-key).

Add "Content" to admin sidebar nav (new icon: 📅 or 📝).

## Phase 4 — Email welcome sequence (subagent, ~15 min)

**Files:**
- `app/api/subscribe-welcome-2/route.js`
- `app/api/subscribe-welcome-3/route.js`
- (optionally a manual send page in admin)

Email 1 = existing (already in advnce-site/api/subscribe.js as the WELCOME10 confirmation). Add Email 2 + Email 3 as separate routes, each takes `{email, name?}` and sends via Resend.

For v1, emails are triggered manually (button in admin or curl). Auto-cron is future work.

Email content:
- **Welcome 2** ("What advnce labs is — and isn't") — three principles framing
- **Welcome 3** ("Three compounds, three protocols, one standard") — BPC-157 + Tirzepatide + NAD+ teaser cards

## Phase 5 — Ambassador recruitment script + asset kit (subagent, ~15 min)

**Files:**
- `docs/ambassadors/recruitment-script.md` — fill-in-the-blank WhatsApp/text template
- `../advnce-site/advnce-asset-kit.html` — static template page (loads ambassador data via URL param `?code=XXX`)

Asset kit page: shows referral link, 4 downloadable share images (cream + dark variants, Story + Feed format), 3 copy-paste caption templates, FAQ section, dashboard link.

For v1: static images shipped with the page (one set, branded; ambassadors share their personalized link with the same images). Per-ambassador image generation is future.

## Phase 6 — Caption authoring + image generation (me, ~30 min)

**Files:**
- `data/social-posts-manifest.json` — 32 entries with all post metadata
- `adonis-next/public/social-images/*.png` — generated PNGs

Author 32 captions following brand voice (8 per post type). Drop into manifest, run render script. Outputs ready-to-publish PNGs.

## Phase 7 — Bulk insert posts to Supabase (me, ~5 min)

**Files:** `supabase/migrations/2026-04-18_seed_social_posts.sql`

Generate INSERT statements from manifest, write to migration file. User runs at end.

## Phase 8 — Final report + user-action checklist (me)

Compile all manual steps (SQL to run, Vercel redeploy, env vars to add, IG bio update, etc.) into a single end-of-run summary.

