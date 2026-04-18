# Social Media Engine + Ambassador Activation — Design Spec

**Date:** 2026-04-18
**Status:** Approved (user said "spec, write, and implement all of this — don't stop until complete")
**Goal window:** 90 days (target: 10 active ambassadors generating consistent referral traffic)

## 1. Goals

1. **Ambassador-led growth** — recruit 10+ active ambassadors from Jorrel's personal network within 30 days; sustain through nurture.
2. **Zero-friction social publishing** — Jorrel can publish 5 IG posts/week with <60 seconds of work per post.
3. **Email funnel from Day 1** — every IG-driven visitor who hits `advnce-welcome.html` gets a 3-email warm-up over their first week.
4. **Brand consistency** — every customer-facing surface (IG, emails, ambassador kit) conforms to the [brand identity doc](../../brand/advncelabs-brand-identity.md).

## 2. Non-Goals (v1)

- No paid advertising spend
- No multi-tenant scheduling tool (single user — Jorrel)
- No auto-posting to IG (Meta Graph API requires business approval, manual upload is fine)
- No AI image generation per post (templates render PNGs deterministically)
- No newsletter automation tool (simple HTML email blasts via Resend)

## 3. Architecture overview

Three new pieces in adonis-next + small additions to advnce-site:

```
┌──────────────────────────────────────────────────────────────┐
│  adonis-next (admin)                                         │
│                                                              │
│  /admin/content                                              │
│  ├─ Calendar grid (month view)                               │
│  ├─ Post tile: thumbnail, type badge, scheduled date         │
│  └─ Post detail modal                                        │
│       ├─ Full image preview                                  │
│       ├─ "Copy caption" → clipboard                          │
│       ├─ "Download image" → PNG file                         │
│       └─ "Mark as posted" → updates status                   │
│                                                              │
│  /api/social-post-write — admin-only mutations               │
│  /api/social-post-render — re-render image for one post      │
│                                                              │
│  /api/subscribe-welcome-1, -2, -3 — email sequence routes    │
│                                                              │
│  scripts/render-social-posts.js — bulk image generation      │
│  templates/social/*.html — 5 brand-aligned post templates    │
│  public/social-images/ — generated PNG output                │
└──────────────────────────────────────────────────────────────┘
                               ↑
                               │
┌──────────────────────────────┴───────────────────────────────┐
│  Supabase                                                    │
│                                                              │
│  social_posts                                                │
│   ├─ id, scheduled_date, post_type                           │
│   ├─ image_path, caption                                     │
│   ├─ status (draft / scheduled / posted / archived)          │
│   ├─ source_compound (sku reference, optional)               │
│   └─ created_at, updated_at                                  │
│                                                              │
│  subscribers (existing, used by email sequence)              │
└──────────────────────────────────────────────────────────────┘
                               ↑
                               │
┌──────────────────────────────┴───────────────────────────────┐
│  advnce-site (storefront)                                    │
│                                                              │
│  api/subscribe.js — modified to also schedule welcome 1/2/3  │
│  /a/[code]?ambassador-asset-kit  (downloadable HTML page)    │
└──────────────────────────────────────────────────────────────┘
```

## 4. Schema

### 4.1 New table

```sql
CREATE TABLE social_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_date  date NOT NULL,
  post_type       text NOT NULL CHECK (post_type IN ('compound_card','mechanism_diagram','stack_carousel','research_quote','standards_statement')),
  image_path      text NOT NULL,        -- e.g. /social-images/2026-05-04-bpc157.png
  caption         text NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','posted','archived')),
  source_compound text,                  -- product SKU if relevant
  posted_at       timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon read social_posts" ON social_posts FOR SELECT TO anon USING (true);
CREATE INDEX idx_social_posts_date ON social_posts(scheduled_date);
CREATE INDEX idx_social_posts_status ON social_posts(status);
```

## 5. The 5 post templates

All 1080×1080 PNG, cream background, brand-system fonts loaded from Google Fonts.

### Template 1 — `compound_card.html`
- **Use:** weekly "Compound of the Week" Monday
- **Layout:** Compound name (Barlow Condensed UPPERCASE, large), eyebrow ("MECHANISM MONDAY"), 3 bullets with mechanism summary, citation footer (JetBrains Mono), small advnce labs logo bottom-right
- **Inputs:** name, mechanism_bullets[], citation_short

### Template 2 — `mechanism_diagram.html`
- **Use:** Saturday science-focused
- **Layout:** Top half: line-art SVG of pathway (cyan + amber strokes on cream). Bottom half: pathway label + 1-sentence explainer + citation
- **Inputs:** pathway_svg (or a list of nodes), label, explainer_text

### Template 3 — `stack_carousel.html` (5-slide template)
- **Use:** Sunday "Sunday Stack"
- **Layout:** 5 separate 1080×1080 frames — slide 1 (cover/title), slides 2-4 (one compound each with role in stack), slide 5 (CTA "see full catalog")
- **Inputs:** stack_name, compounds[] (each: name, role, dose-window-text NOT specific dose)

### Template 4 — `research_quote.html`
- **Use:** alternating Friday
- **Layout:** Large italic Cormorant Garamond pull-quote (centered, max 80 chars), citation in JetBrains Mono below, advnce labs lockup at top
- **Inputs:** quote, citation_full

### Template 5 — `standards_statement.html`
- **Use:** alternating Friday
- **Layout:** One of the three principles in giant Barlow Condensed 900 (e.g. "DOCUMENTATION FIRST.") with the supporting sentence in Cormorant Garamond italic underneath
- **Inputs:** principle_number (01/02/03), principle_title, principle_body

## 6. Initial 30-post calendar

Start date: 7 days from today (gives time for ambassador recruiting before content goes live).

| Week | Mon | Wed | Fri | Sun (carousel) |
|---|---|---|---|---|
| 1 | BPC-157 (Compound) | Recovery Stack (Stack) | Research Quote (Sikiric 2010) | — |
| 2 | Tirzepatide (Compound) | Weight Loss Stack (Stack) | Standards #1 Documentation | — |
| 3 | NAD+ (Compound) | Longevity Stack (Stack) | Mechanism Diagram (NAD pathway) | — |
| 4 | TB-500 (Compound) | Cognitive Stack (Stack) | Standards #2 Research Integrity | — |
| 5 | Semaglutide (Compound) | Sleep Stack (Stack) | Research Quote (STEP-1 trial) | — |
| 6 | MOTS-c (Compound) | Hormonal Stack (Stack) | Mechanism Diagram (mitochondrial) | — |
| 7 | Sermorelin (Compound) | Skin Stack (Stack) | Standards #3 Supplier Discipline | — |
| 8 | KPV (Compound) | Immune Stack (Stack) | Research Quote (Cathelicidin) | — |

= 32 posts (we'll generate 30 + ~5 reserve "swap-in" posts for breaking news).

## 7. Admin /content page

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Content                                       [+ New Post] [Refresh] │
│ April 2026 ◀ ▶                                                       │
│ ┌────┬────┬────┬────┬────┬────┬────┐                                 │
│ │Sun │Mon │Tue │Wed │Thu │Fri │Sat │                                 │
│ ├────┼────┼────┼────┼────┼────┼────┤                                 │
│ │    │ 18 │ 19 │ 20 │ 21 │ 22 │ 23 │                                 │
│ │    │[🔬]│    │[🔬]│    │[🔬]│    │   ← post tiles with thumbnails   │
│ ├────┼────┼────┼────┼────┼────┼────┤                                 │
│ │ 24 │ 25 │ 26 │ 27 │ 28 │ 29 │ 30 │                                 │
│ │[🔬]│[🔬]│    │[🔬]│    │[🔬]│    │                                 │
│ └────┴────┴────┴────┴────┴────┴────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Click a tile → modal:

```
┌─────────────────────────────────────────────────┐
│ × COMPOUND CARD · Mon Apr 25 · scheduled        │
│ ─────────────────────────────────────────────── │
│                                                 │
│   [1080×1080 image preview]                     │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Caption:                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ BPC-157 has gained serious attention in     │ │
│ │ recovery and longevity circles for one      │ │
│ │ reason: research consistently points to...  │ │
│ │ ...                                         │ │
│ │ [Research-grade compound for in-vitro       │ │
│ │ laboratory use only.]                       │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [📋 Copy caption]  [⬇ Download image]            │
│ [✓ Mark as posted] [🗑 Archive] [✏ Edit]         │
└─────────────────────────────────────────────────┘
```

### 7.2 Edit flow (light)
- Click "Edit" → caption becomes editable in textarea + scheduled_date editable
- "Save" → PATCH via /api/social-post-write
- Image regen requires re-running render script (separate flow, not in admin UI for v1)

### 7.3 Status badges
- `scheduled` — gray, default
- `posted` — green check
- `draft` — amber dot
- `archived` — dim/strikethrough

## 8. Image rendering pipeline

1. Each post template is an HTML file with `{{TEMPLATE_VARS}}` placeholders
2. Build script (`scripts/render-social-posts.js` or Python equivalent) reads a JSON manifest of posts
3. For each post: substitute vars → write temporary HTML → Chrome headless `--screenshot` at 1080×1080 → save as PNG to `public/social-images/`
4. Insert/update Supabase row with image_path + caption + scheduled_date

Run mode:
- `node scripts/render-social-posts.js` → renders all
- `node scripts/render-social-posts.js --post-id <uuid>` → re-renders one

## 9. Email welcome sequence (3 emails)

Triggered by signup at `advncelabs.com/advnce-welcome.html`:

| # | Sent | Subject | Content |
|---|---|---|---|
| 1 | Immediately (already exists) | "Your 10% off code is inside!" | WELCOME10 code, "shop now" CTA |
| 2 | T+2 days | "What advnce labs is — and isn't." | Three principles, the "we are not a supplement company" framing |
| 3 | T+6 days | "Three compounds, three protocols, one standard." | Showcase 3 well-researched compounds (BPC-157, Tirz, NAD+) with mini-summaries + storefront links |

Implementation:
- Modify `advnce-site/api/subscribe.js`: after sending welcome 1, schedule a Supabase `subscribers` row with `welcome_2_send_at` and `welcome_3_send_at` timestamps
- Add cron job (Vercel cron, daily) at `adonis-next/api/cron-send-scheduled-emails`: queries subscribers due for welcome_2 or welcome_3, sends via Resend, marks as sent
- v1 simplification: skip the cron, send all 3 emails immediately staggered using setTimeout in a bg fn (acceptable for low volume <100/day)

For v1 simplicity: **embed welcome 2 + welcome 3 send into a single Supabase trigger or scheduled function**. Will revisit if volume grows.

Actually simplest v1: **send welcome 1 immediately as today. Add welcome 2 + 3 as separate API routes that user (or a future cron) calls manually for now**. Not auto-scheduled, but the templates exist and can be sent on-demand via admin panel "Send welcome 2 to all signups from {date} to {date}" button.

## 10. Ambassador recruitment script + asset kit

### 10.1 Recruitment script

Plain text file at `docs/ambassadors/recruitment-script.md` — fill-in-the-blank WhatsApp message Jorrel can copy/paste.

### 10.2 Asset kit page

`advncelabs.com/a/{code}` (new dynamic page on advnce-site) — when an ambassador opens it, sees:
- Their referral link (advncelabs.com?ref=CODE) with one-click copy
- 4 downloadable share images (Story-format and Feed-format) branded for them
- 3 caption templates ready to copy
- FAQ ("how do I share this?", "how do I get paid?", "what's the commission again?")
- Direct link to their dashboard (`advncelabs.com/advnce-dashboard.html?code=CODE`)

For v1: static template, server-side substitutes `{code}` and `{name}` from Supabase ambassadors table.

## 11. Out of scope (future)

- Auto-posting to IG (Meta Graph API)
- Multi-platform (X, TikTok, LinkedIn)
- Per-ambassador analytics dashboard
- A/B testing posts
- Customer review / UGC capture
- Affiliate landing pages per ambassador
- Newsletter editor (will write monthly newsletter as ad-hoc HTML for now)
- Welcome 2/3 automation via cron (manual send acceptable for v1)

## 12. Success metrics (90 days)

- ✅ 10+ active ambassadors recruited and onboarded
- ✅ 5 IG posts/week sustained from week 4 onward
- ✅ 100+ welcome-list signups
- ✅ First $1K of attributable referral revenue
