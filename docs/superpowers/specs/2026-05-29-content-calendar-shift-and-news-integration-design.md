# Content Calendar — Shift + News Queue Integration

**Date:** 2026-05-29
**Goal:** Resume the Instagram content calendar (paused since the last post on May 11) starting today, and unify the separate "news queue" into the one Content Calendar the VA works from — so she has a single near-daily schedule.

## Background / current state

Two separate systems exist today:

- **Content Calendar** — `app/admin/marketing/content/page.jsx`, backed by the `social_posts` table. 8 posts are `posted` (through ~May 11); **63 are still `scheduled`** on a Mon/Wed/Fri cadence, but the first 7 (May 13–27) are now overdue and never went out. The VA posts from this calendar: copy caption → download slides → post to IG → mark posted.
- **News Queue** — `app/admin/marketing/news/page.jsx`, backed by the `post_drafts` table. Auto-populated by scraper/curator cron. Drafts render 4 slide PNGs to a public Supabase Storage URL (`…/news-slides/{id}/slide-{1..4}.png`). The only approval action today is **"Approve & Download"** (`/api/admin/news/approve/[draftId]`), which zips the 4 slides and marks the draft `posted`. There is **no** "approved but not yet posted" state.

The news queue is **not** shown in the Content Calendar — the VA would have to work two screens. This is the friction we are removing.

## Decisions (locked with user)

1. **Cadence = near-daily (option B).** Compound posts stay on Mon/Wed/Fri; news posts fill the in-between days (Tue/Thu/Sat). ~6 posts/week.
2. **News ordering = newest first.**
3. **Editorial gate stays with the admin (user), not the VA.** Only *approved* news drafts reach the calendar — never every rendered draft.
4. **Repurpose the news "Approve & Download" button → "Approve → Calendar."** Approving a draft drops it on the next open Tue/Thu/Sat calendar slot; the VA downloads + posts from the calendar (not from the news queue).

## Work

### A. One-time data migration (prod `social_posts` + `post_drafts`)

1. **Re-slot the 63 `scheduled` compound posts** onto consecutive Mon/Wed/Fri dates starting **Fri 2026-05-29**, preserving current order (`ORDER BY scheduled_date ASC`). Nothing is dropped; the campaign slides forward ~2.5 weeks (new tail ≈ late October). Only `scheduled_date` changes.
2. **Insert 4 `news_card` rows** for the currently-approved drafts, newest first, on Tue/Thu/Sat:
   | Date | Draft (hook) |
   |---|---|
   | Sat 2026-05-30 | AI is now picking biohackers' peptide stacks |
   | Tue 2026-06-02 | A peptide you inhale: Phase 1 trial |
   | Thu 2026-06-04 | Kennedy may reshape FDA rules on peptides |
   | Sat 2026-06-06 | GLP-1 changed how depressed patients pursue reward |

   Each `social_posts` row: `post_type='news_card'`, `image_path = slide-1 URL`, `caption = draft caption + hashtags`, `status='scheduled'`, `source_compound=null`.
3. **Mark those 4 drafts `approved`** in `post_drafts` so they drop out of the "Ready for review" list (no double-handling). If a CHECK constraint rejects `'approved'`, fall back to leaving status and note it.

### B. Calendar renders news posts — `content/page.jsx`

1. Add `news_card` to `POST_TYPE_BADGE` (label "News").
2. `getSlides`: for `news_card` with an `…/slide-1.png` `image_path`, return slides 1–4 (string replace `-1`→`-n`). Remote URLs render fine in `<img>`.
3. Slide download: cross-origin `<a download>` won't force-download the Supabase URLs, so route `http(s)` image paths through a same-origin proxy (below); local `/social-images/...` paths unchanged.

### C. Same-origin image proxy — `app/api/social-image-proxy/route.js`

`GET ?url=<remote>` → fetch and stream back with `Content-Disposition: attachment`. **Locked to the project's Supabase Storage host** (validate `URL(url).host`) to avoid an open proxy / SSRF. Admin/VA role required.

### D. News approval → calendar — `app/api/admin/news/approve-to-calendar/[draftId]/route.js` + `DraftCard.jsx`

1. New route: set draft `status='approved'`, compute the **next open Tue/Thu/Sat slot** (first such date `>= today` with no existing `news_card` row), and create the `social_posts` news_card row there.
2. `DraftCard.jsx` (`mode==='ready'`): replace `approveAndDownload` with an "Approve → Calendar" action calling the new route; on success, reload. Remove the immediate zip download (downloading now happens on the calendar).

## Out of scope (noted, not built)

- **Auto-fill cron** that pushes newly-curated approved drafts onto the calendar without a click. Approval stays a manual admin click for now.

## Verification

- Calendar shows the 63 compounds re-slotted from 5/29, plus 4 News entries on 5/30, 6/2, 6/4, 6/6.
- Opening a News entry shows 4 slides; "Download all slides" downloads 4 files via the proxy; "Copy caption" works.
- News queue "Ready for review" no longer lists the 4 approved drafts.
- Clicking "Approve → Calendar" on a future draft creates a calendar entry on the next open Tue/Thu/Sat.
