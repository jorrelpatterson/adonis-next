# Adonis v2 MVP Completion — Design

**Date:** 2026-07-05
**Scope:** The consumer Adonis app (adonis.pro "Life Protocol OS") — reconcile the two v2 efforts and ship a functional MVP. The advnce labs back office (adonis.pro/admin) and advnce-site storefront are out of scope (see Appendix).

## Context

The repo contains two products. The back office is live and operating. The consumer app exists in three pieces that were never joined:

- **v1 (live today):** `public/index.html` (marketing funnel) → `public/app.html` (7,674-line self-contained PWA). No users. Becomes reference material.
- **v2 foundation on `main`:** `src/` Vite React app — protocol engine, 11 registered protocols, state store, 735 green vitest tests. Bare shell (Routine + Profile + placeholder domain tabs). Newest work (through 2026-05-14), includes root-cause fixes (assembler state passing) and recovered Plan-4 data (exercise DB, calorie engine, credit cards, peptide reference data, check-in fields).
- **v2 experience on `origin/v2-revival`:** 52 commits (tip 2026-05-01) — onboarding funnel, Supabase Auth, Stripe checkout, 9 deep domain views, loggers, insights, check-in modal, streaks, and the full premium design system (motion/sound/haptics/icons/illustrations).

**Git archaeology:** main was reset/rewritten around 2026-04-29, stranding the original v2 merge. `v2-revival` preserved that orphaned line; May sessions independently re-recovered parts of the same plans onto the new main. Result: **81 shared `src/` files are sibling implementations** (a text merge is meaningless), **86 `src/` files exist only on v2-revival** (portable additions), **16 only on main** (newer engine/data work).

## Decisions (locked with Jorrel, 2026-07-05)

1. **Scope:** consumer app only. Back-office threads tracked, not re-planned.
2. **Users:** none yet — clean slate, hard cutover allowed, no v1 data migration.
3. **Launch bar:** functional MVP — the app works end-to-end, free. Payments deferred.
4. **Signup required:** onboarding ends in Supabase Auth email signup before protocol delivery. Every user is a captured lead.
5. **Tier model:** Free by default (1 Body goal). Pro/Elite features render locked. **Access codes are the only unlock** (hardcoded list: FOUNDER → elite, ADONIS2026 → pro; expand list as needed). Invite-to-upgrade beta. Stripe paths stay dark.
6. **Reconciliation approach:** port forward — `main` is canonical; v2-revival is harvested feature-by-feature, never merged.
7. **Bucket List is the orchestrator, not a 9th content domain** (Jorrel, 2026-07-05): open-ended statements ("go to Egypt") decompose into a cross-domain strategy — Money/credit-card points funding flights, Career/income cash-flow, Travel docs/visas, Body/Image prep — each piece a child goal served by that domain's protocols. Hardest, most dynamic module. MVP ships a **decomposition-ready goal model** + a **locked Elite teaser surface**; the full build (AI decomposition + archetype templates) is post-MVP milestone #1, paired with Stripe — it is the reason someone pays for Elite.

## Definition of Done

A stranger on their phone at adonis.pro can, unassisted:

1. Land on the marketing page → tap CTA into the app
2. Complete onboarding (multi-domain questions → calculating screen → game plan)
3. Sign up with email (required; Supabase Auth)
4. Receive initial goals auto-created from onboarding answers
5. Run the daily routine loop: time-blocked tasks across active domains, daily check-in, completion, streaks
6. Explore all 8 domain tabs at current content depth (Body deep; Money/Travel/Image real; Mind/Purpose/Environment/Community light)
7. Hit Free-tier limits, see polished locked states, redeem an access code to unlock
8. See the locked **Bucket List (Elite) teaser** — the orchestrator is visible in the tier ladder, gated, not built
9. Install as a PWA (manifest, icons, mobile-first)
10. v1 retired: `app.html` redirects into the app; marketing CTA repointed

Plus: **signups upsert into the `subscribers` table** so the existing welcome-email cron picks them up.

**Not in MVP:** the Bucket List build itself (teaser only), Stripe/payments (ported code stays dark), dynamic/ambassador-issued access codes, deep content for thin domains, career-protocol UI, v1 data migration, cross-device state sync.

## Architecture

### Canonical base
`main`'s `src/` foundation. v2-revival is tagged `v2-revival-archive` before harvesting begins, then the branch is deleted once strip-mined.

### Module model (how the app works)
- **Protocol contract** (`src/protocols/protocol-interface.js`): every protocol = `{id, domain, name, icon}` + `canServe(goal)`, `getState(profile, logs, goal)`, `getTasks(state, profile, day)`, `getAutomations()`, `getRecommendations()`, `getUpsells()`. Registered via `register-all.js` into `registry.js`.
- **Routine pipeline** (`src/routine/pipeline.js`): collect (protocols serving active goals) → prioritize (goal priority + capacity) → schedule (time blocks) → upsells → retention. Output `{scheduled, deferred, upsells, retention}` renders as the daily timeline. The Routine tab is all domains interleaved; each protocol answers "what should this person do today."
- **Domain views** (from v2-revival, `src/views/*.jsx`): interactive per-domain experiences (e.g. MindView's live breathwork timer, BodyView's Peptides/Train/Food/Tools sub-tabs). Views consume protocol state and render domain UIs.
- **System protocols** (`src/protocols/_system/`): retention (main) + check-in (ported from revival) — machinery, not user-facing domains.
- **Bucket List (orchestrator, above the 8 domains):** open-ended statement → strategy with a target date → **parent goal + child goals across domains** → children served by ordinary domain protocols → strategy dashboard (milestone timeline, per-domain progress, on/off-pace vs date). Decomposition = Claude on the backend (Elite) with deterministic archetype templates (trip/marathon/house) as fallback. The cards DB (5/24, `getBestCard`, bonus progress) and career cron are its Money/Career inputs. **MVP requirement:** the goal model must make parent→child decomposition with a shared deadline first-class (`goal.parentId` or equivalent) — cheap now, painful to retrofit.

**Porting rule — single source of truth:** revival's views hardcode their own catalogs (MindView: "parallel to mind protocol catalog"). When porting a view, its embedded domain data moves into the protocol module's data file (e.g. `src/protocols/mind/data.js`); views import from protocols, never own data. Known stub: income `getState` returns fixed targets — acceptable for MVP, real state is post-MVP.

### Duplicate-pair rulings (both branches built it)

| Concept | Keep (base) | Port on top |
|---|---|---|
| State store | main `store.jsx` + `migration.js` | revival's extra action types as features need them |
| Check-in | main `state/checkin.js` + CHECKIN_FIELDS | revival `CheckinModal` UI; diff field definitions |
| Exercise DB | main `exercises.js` (76, tested) | revival `ExerciseDetail` UI adapted to it |
| Calorie engine | main `calorie-engine.js` (BMR/TDEE/macros) | revival adaptive layer (Off Pace / Pushing Harder) — additive |
| Peptide data | main injection/compatibility/research | revival proto-stacks/recommend-stack/stack-adjustments — complementary |
| Design system | **revival's premium system replaces main's bare one** | main's newer constants (SUB_TIERS etc.) survive |
| Body workout UI | `workout-view` merge (WorkoutView/SetGrid/RestTimer — main architecture, 2026-05-27) | revival WorkoutLogger/PRCelebration/ExerciseDetail, adapted in Phase 3 |

### Serving model
Vite app builds during the Vercel build and is served statically by Next ("ride-along" — reuse revival commit `6e016c3`'s mechanism). App at **`adonis.pro/app`**; `/` remains the marketing funnel with CTA repointed; `app.html` → redirect to `/app`. Build output gitignored.

### Auth & state
- Supabase Auth = identity + lead capture. Manual setup: Supabase dashboard email-confirm + redirect URLs (Jorrel).
- App state stays **local-first** (localStorage). Tier + redeemed code also stamped into Supabase user metadata so unlocks survive reinstall.
- Peptide catalog reads live from Supabase `products` (revival `peptide-catalog.js`) with static fallback. Order CTAs = plain links to advncelabs.com.

## Phases

Each phase is one working session (plan → build → review), ends with tests green and the app runnable.

**Phase 0 — Baseline & housekeeping.** Fix vitest config (exclude `.claude/worktrees/**` and node:test `.mjs` files — 8 red files today, so "green" means something). Commit `docs/clients/nathan-roberts-protocol.html`. Inspect `claude/workout-view` branch/worktree — fold in or discard. Tag `v2-revival-archive`. Commit this spec.

**Phase 1 — Design system & primitives.** Port revival's premium layer (motion, sound, haptics, icons, illustrations, ActionSheet, Toast, Skeleton, ProgressBar, StatNumber, EmptyState, Select, PullToRefresh, useLongPress, AmbientBackdrop, animations.css). Reconcile shared design core — revival's versions win; main's newer constants survive. Shell gets boot splash + backdrop. Visual QA on `dev:app`.

**Phase 2 — Onboarding, auth, tiers.** Port OnboardingFlow → CalculatingScreen → GamePlanScreen + initial-goals. Port auth (AuthScreen, ProfileSetup, services/auth, useAuth) — signup required before protocol delivery; tier/code → user metadata; subscribers upsert. Tier model per decision 5 (adapt revival `upgrade.js`; Stripe dark). **Goal model becomes decomposition-ready** (parent→child goals, shared deadline) as part of the goal-engine port. Manual: Supabase dashboard config.

**Phase 3 — Daily loop.** HomeDashboard (protocol score, stat tiles, check-in dots, mood strip). Revival CheckinModal on main's check-in data model. Routine intelligence (recap, alerts, trends), time-block calendar view, streaks + milestones. Body loggers: WorkoutLogger (PR detection + celebration), FoodLogger, WeightLogger. Adaptive-calorie layer.

**Phase 4 — Domain depth.** Port 9 views (BodyView sub-tabs, Money, Travel, Image, Mind, Purpose, Environment, Community, Insights) under the single-source-of-truth rule. Peptide stacks (proto-stacks, recommend-stack, PeptideFinderModal, Supabase catalog, goal→stack sync). ExerciseDetail, WeeklyRecap, GoalCompleteScreen, PhotoJournal, TaskContextMenu. Profile rebuild (ProfileHeader, fitness pillars, settings, soft reset). **Bucket List locked teaser surface** (Elite-gated, states the promise, no build).

**Phase 5 — PWA, deploy, cutover.** Manifest/icons/installability. Vite-rides-Next build pipeline; app at `/app`. Repoint marketing CTA; `app.html` redirect; delete dead v1 copies (`public/lib`). Full Definition-of-Done walkthrough on a real phone against production. Tag release.

## Verification

- **Per phase:** vitest green under fixed config; revival's tests ride with their features; new tests where gaps exist (code redemption, subscribers upsert); visual QA on dev server.
- **Phase close:** targeted diff of that phase's shared files against `v2-revival-archive` to catch polish buried in the 81 shared files.
- **Pre-cutover:** end-to-end run of the full Definition of Done (all 10 items + subscriber wiring) on production, real device — sound/haptics don't reproduce on desktop.

## Risks

| Risk | Mitigation |
|---|---|
| Polish buried in 81 shared files | per-phase archive diff (above) |
| April-era assumptions riding in with ports (Stripe, /v2/ paths, old tier logic) | DoD checklist is the contract; everything else → post-MVP backlog |
| Supabase Auth misconfig | flagged manual step, verified in Phase 2 QA |
| Sound/haptics/PWA quirks | real-device testing in Phases 1 and 5 |
| Two sources of truth (views vs protocols) | single-source-of-truth porting rule, enforced per view in Phase 4 |
| Goal model painted into a single-domain corner, blocking Bucket List | decomposition-ready requirement in Phase 2 (parent→child goals, shared deadline) |

## Post-MVP backlog (ordered)

1. **Bucket List orchestrator + Stripe, together** — the launch of paid tiers headlined by the feature that justifies Elite: open-ended goal → AI strategy decomposition (Claude backend) + archetype templates (trip/marathon/house) → child goals across domains → strategy dashboard. Revival's checkout resurfaces here.
2. Dynamic access codes — ambassador-issued, admin-managed (ties to /admin/cards codes)
3. State sync to Supabase (cross-device)
4. Deep content for thin domains (Mind/Purpose/Environment/Community to Body-level)
5. Career protocol UI (backend cron exists: `api/cron/career/ingest`) — also a Bucket List input
6. Real income-protocol state (replace stub `getState`)
7. Peptide ordering deep-link with ref attribution
8. Insights expansion; community matching; mental-performance scoring

## Appendix — back-office punch list (tracked, not this plan)

Carried in `jorrel-os.json`; listed so nothing is lost. Recommend the two security items as a standalone mini-session soon:

- **Security:** unsigned/forgeable admin cookies (`adonis_admin_role/email`); VA-role allowlist hole (`ROLE_ALLOWED_PATHS.va` includes `/admin`, prefix-matches everything — `lib/admin-roles.js`)
- Deploy advnce-site `a551277` (ambassador QR ref-capture live), then print-test one card
- Send ADVNCE Rewards announcement (dry-run → test → send)
- Verify rebuilt order flow / confirm Sydney Barill payment
- Recruitment drip launch (823 leads, set `next_send_at`)
- Visitor-recovery `RECOVERY_LIVE` flip after dry-run review
- Swag store (advnce-site): Printful products + Stripe setup, then commit/deploy
- Legal reviews (Botox, 12 steroid tablets); placeholder retail prices (~97 products + 81 tablets); vendor JSON `our_sku` backfill; email template cream-palette migration; info@advncelabs.com forwarding
