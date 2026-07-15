# Repo-Split Worklog — Phase 0 findings (2026-07-15)

Execution log for `2026-07-15-advnce-adonis-repo-split.md`. Records verdicts, env mapping, and plan corrections discovered during Phase 0.

## State at start (deviations from plan assumptions)

- **Parallel iOS session** had worked this repo same-day (closed by Jorrel before Phase 1). Its `jorrel-os.json` status update was committed as `75a697e` by this session so the record survives surgery. Its commits were already on origin; our push was a clean fast-forward (`90555e7..75a697e`).
- **advnce-site main was already fully pushed** — ref-capture `a551277` is LIVE in prod (the jorrel-os blocker saying otherwise was stale; clear it in Task 22).
- **Canonical host is `www.adonis.pro`** — apex 307s to www. Use `curl -L` in verification steps; Task 17 redirect sources are host-agnostic so no config change needed.
- Local repo is **not `vercel link`ed** (no `.vercel/project.json`) — env inventory below is derived from `.env.local` names + code usage; confirm against the Vercel dashboard when creating `advnce-admin` (Task 10).

## Task 1–2: snapshots + pushes ✅

- adonis-next pushed through `75a697e` (spec, plan, AGENTS.md, jorrel-os update). Prod verified: /, /admin/login, /app all 200 (via www).
- Swag store parked: branch `origin/swag-store` (`5ccae79`, 23 files). main clean, up to date, site 200.
- Zips at `Ai Projects/` root: `adonis-next-pre-split-2026-07-15.zip` (118M, excludes node_modules/.next/Pods), `advnce-site-pre-split-2026-07-15.zip` (6.9M) — advnce-site zipped BEFORE branch surgery (raw untracked files captured).

## Task 4 verdicts (caller-checks)

| Item | Evidence | Verdict |
|---|---|---|
| `/api/me` | called only by `app/admin/page.jsx`, `app/admin/layout.jsx`, `app/admin/marketing/ambassadors/page.jsx`; allowlisted in `lib/admin-roles.js` | **MOVES** (admin whoami) → route lists become **56** |
| `/api/env-check` | zero callers | **COPY TO BOTH** — diagnostics; useful to verify env on advnce-admin during Phase 2 |
| `lib/constants/peptides.js` | imported by `lib/reorderDuration.js`(+test) only; zero `src/` imports | **MOVES** (copy in T8, strip from adonis in T16) |
| `lib/constants/theme.js` | zero importers anywhere | **dead v1 code — do NOT copy**; leave in adonis (cleanup someday, not this project) |

## Task 4 sweep: business assets beyond the spec inventory

**scripts/ — MOVE (8):** import-recruitment-csv.js, migrate-content-calendar-2026-05-29.js, render-social-posts.js, send-recruitment-drip.js, smoke-ambassador-flow.js, smoke-compound-email.js, smoke-recruitment-drip.js, sync-compound-marketing.js
**scripts/ — STAY (5):** appstore-screenshots.sh, ios-archive-upload.sh, ios-icons.mjs, screenshot-baseline.sh, smoke-career-ingest.js

**sql/ — MOVE (9, DDL records only — DB itself untouched):** 2026-04-23-invoice-columns, 2026-04-23-support-tickets, 2026-04-27-invoice-paid-amount, 2026-04-27-reorder-reminders, 2026-04-29-news-candidate-flag, 2026-04-29-news-carousel, 2026-05-06-inventory-adjustments, 2026-05-28-ambassador-recruitment-blast, 2026-05-28-compound-email-campaigns (.sql)
**sql/ — STAY (2):** 2026-05-13-career-protocol.sql, 2026-07-14-push-tokens.sql

**templates/ — MOVE both subdirs:** `templates/email/` AND `templates/social/` (social-post rendering is ADVNCE content).
**lib/__tests__/ — STAY:** only appSignup.test.js (adonis).

## PLAN CORRECTION: there is no BASE_URL env var

The spec/plan's "BASE_URL flip" was based on a bad grep (`BASE_URL` substring-matched `SUPABASE_URL`). Reality:
- Business email links are hardcoded to **advncelabs.com** (storefront — unaffected by this split) — ambassador-welcome, subscribe-welcome-2/3, invoice-transition, reorder-reminders, rewards templates, etc.
- Recruitment links derive from **`ADVNCE_ORIGIN`** (= https://join.advncelabs.com) — that domain moves WITH the advnce-admin project, so links keep working with no change.
- `renderCompoundEmail` takes a `baseUrl` param from its caller.
- Exactly **one** adonis.pro literal exists (`admin/orders` link) → T8 Step 5 replaces it with `https://admin.advncelabs.com/admin/orders`.
- Task 10: no BASE_URL env var to set. Task 17's permanent redirects remain the universal safety net for any straggler links.

## Env-var mapping (code-derived; confirm names against dashboard in Task 10)

| Var | Copy to advnce-admin? | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | YES | shared DB |
| SUPABASE_SERVICE_KEY **and** SUPABASE_SERVICE_ROLE_KEY **and** SUPABASE_URL | YES (all three names) | code uses all variants |
| RESEND_API_KEY | YES (keep in adonis too) | |
| CRON_SECRET | YES (keep in adonis too — routine-reminders/career stay) | |
| ANTHROPIC_API_KEY | YES (keep in adonis too — career scoring may need it) | compound emails + news curator |
| ADMIN_EMAIL, ADMIN_PASSWORD, VA_PASSWORD | YES | admin auth |
| SHIPPING_ADDRESS, EMAIL_UNSUB_SECRET, ADVNCE_ORIGIN | YES | PO emails / unsub tokens / join.advncelabs.com |
| STRIPE_SECRET_KEY | YES | revenue/orders code |
| APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID | NO — adonis only | push |
| ADZUNA_APP_ID, ADZUNA_APP_KEY, RAPIDAPI_KEY | NO — adonis only | career ingest |
| (VERCEL_*, TURBO_*, NX_*, NODE_ENV, TZ, SMOKE_URL) | n/a | runtime/dev noise |

## Amended canonical lists (supersede plan Tasks 7/8/16/17 lists)

**MOVED_API_ROUTES (56)** = plan's 55 **+ `me`**.
**STAYING routes:** app-signup, push, env-check (env-check also copied to admin), cron/{routine-reminders,career}.
**Copy additions (T8):** `lib/constants/peptides.js`, `app/api/env-check`, `app/api/me`, `templates/social`, the 8 business scripts, the 9 business sql files (to `advncelabs/sql/`).
**Copy removals (T8):** ~~lib/constants/theme.js~~ (dead).
**Strip additions (T16):** `app/api/me`, `lib/constants/peptides.js`, `templates/social`, the 8 business scripts, the 9 business sql files. (env-check NOT stripped.)
**Redirect additions (T17):** `me` in MOVED_API_ROUTES array.

## Phase 1 execution log (2026-07-15)

- Rename done: GitHub `advnce-site`→`advncelabs` (auto-redirect verified via fetch), local folder moved, remote URL updated. No advnce-site Claude memory dir existed (nothing to migrate). Site 200 throughout.
- Admin scaffold + full copy done. Verified counts: 58 api entries, 5 crons, lib 23, sql merged.
- **Copy-list addition found by build:** `lib/constants/peptide-explanations.js` (imported by admin/purchases pages). Copied; added to T16 strip list. Constants sweep confirms admin imports exactly 2 constants (peptides, peptide-explanations).
- Fixed in the copy: hardcoded `adonis.pro/admin/orders` → `admin.advncelabs.com/admin/orders` (notify email); drip fallback origin → `join.advncelabs.com` (was adonis.pro; prod always sets ADVNCE_ORIGIN).
- Tests: `businessCard` is real vitest (7/7 ✓); reorderDuration + 3 news tests are plain `node` assertion scripts — test script runs both kinds, all green.
- `npm run build` green: 58 routes + 16 pages + middleware (26.8 kB).
- **Local authenticated smoke: 16/16 surfaces 200** (login POST → cookies → every admin section + /ambassadors/apply + /ambassador/invoices/new). `/api/env-check` correctly 401s unauthenticated. Note: `/ambassador/invoices` has no index page — `/new` is the real path (matches storefront link).
- **NEW STEP — repo-root `.vercelignore`** (admin/, docs/, sql/) so the static storefront project never serves admin source or business docs. Verified motive: Vercel static serves arbitrary tracked files (track.js 200) with only convention-based exclusions (package.json 404). advnce-admin project is unaffected (its root is admin/).
- Storefront CORS note for later: advnce vercel.json allows origin `https://adonis.pro` on /api/* — v1-era; revisit after split (not in scope).
