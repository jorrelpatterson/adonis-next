# v1 → v2 Feature-Parity Ledger

> Created 2026-07-09. Companion to `docs/v1-app-feature-inventory.md` (the map) — this is the
> **accounting**. Every v1 feature gets an explicit ruling so nothing drops silently.
> Phase-close gate (per spec Verification addendum): all rows owned by that phase are resolved —
> checked off, or their ruling consciously changed. Line refs → `public/app.html` at commit 3cf8214.
>
> **Rulings:** `port` (bring behavior over, golden-tested where pure logic) · `adapt` (concept
> survives, implementation changes per v2 architecture) · `defer` (post-MVP backlog, code stays
> harvestable in app.html) · `drop` (deliberate cut, reason recorded).
>
> Rows marked ⚠ were flagged as judgment calls; **all rulings approved by Jorrel 2026-07-09
> ("full authorization")**. ⚠ markers kept as review history. Changing a ruling now requires a
> dated note in this file.

## Golden-test procedure (applies to every row tagged 🧪)

1. Copy the v1 function **verbatim** into `tests/golden/v1/<name>.js` with a provenance header
   (`// source: public/app.html:NNNN, commit 3cf8214`).
2. Run a representative input matrix through it; snapshot outputs to `tests/golden/fixtures/<name>.json`.
3. The v2 module's test asserts it reproduces the fixtures. Intentional divergence = a documented
   exception in the test, never a deleted fixture.

Priority engines: `calcBMR`/`calcTDEE`/`calcMacros` (incl. deadline pacing, overshoot carryover,
cycle bump), `getCycleInfo`, `buildStacks`+`GOAL_MAP`, `calcFiveTwentyFour`, `getBestCard`,
`scoreCitizenshipPaths`, `generateInsights`, PR detection.

**Status 2026-07-09: fixtures LANDED for all priority engines** — 7 modules under `tests/golden/v1/`
(metabolics, stacks, insights, cards, dispute, citizenship, routine incl. `buildRoutine` end-to-end
with all 14 task categories), 13 golden tests green in the main suite. Remaining 🧪 work is the
*port* side (v2 must reproduce the fixtures), plus PR detection (extract with Phase 3 WorkoutLogger).

Findings recorded during extraction (parity decisions for the port):
- `buildRoutine` renders a **double-escaped emoji bug**: training headers contain the literal text
  `\u{1F525}` (source `"\\u{1F525} "`, app.html:2171; same for `\xB7`). v2 should render the real
  🔥 — document as an intentional divergence in the port test.
- `buildRoutine`'s `isPremium` param is dead (never read); its `wkWeek`/`wkLogs` set-completion
  suffix is unreachable in v1. Don't cargo-cult either into v2.
- v1's actual peptide recommendations flow through a STAPLES table (app.html ~3900-3993), **not**
  `GOAL_MAP` — both are characterized; the Phase 4 stack port must check which one it's replacing.
- Passport-power scoring (thresholds 185/170/150/130) lives inline in the Citizenship component
  (app.html:7196-7198), not in `scoreCitizenshipPaths` — extract it when porting the Travel view.

---

## Home / Check-in (`CheckinV` 5350) — Phase 3 ✅ (closed 2026-07-11, branch phase3-daily-loop)

- [x] Daily check-in, 8 sliders (`CHECKIN_FIELDS` 195) — **adapt** DONE: CheckinModal on main's CHECKIN_FIELDS (all 8 fields, save-gated), writes `logs.checkins[today]` (real-today key, view-day misfile bug fixed a5d7782).
- [x] Domain-aware stat cards (5375-5407) — **adapt** DONE: HomeDashboard stat tiles (calories-left w/ adaptedTarget>0 sentinel gate, routine %, weight) + protocol score ring.
- [x] Weight logging + sparkline — **port** DONE: WeightLogger w/ 14-day chart, regression trend, goal-cross → GoalCompleteScreen.
- [x] 7-day mood strip — **port** DONE (HomeDashboard, colors from CHECKIN_FIELDS.mood).
- [ ] Daily notes — ruling changed **port → defer** (2026-07-11): archive HomeDashboard never had notes; low-value vs check-in sliders. Revisit with Phase 4 Insights if journaling matters.
- [x] Menstrual-cycle phase banner, `getCycleInfo` water-retention + BMR adjustments — **port** DONE 🧪: cycle.js verbatim, golden 9/9; calMod bump in adaptive layer; banner on Home when cycleData present.
- [x] Bonus-deadline + low-supply alert banners — **adapt** DONE: intelligence.js alert stack (check-in alerts, weight-trend, deload); v1's cards-bonus deadline alert itself follows the Money view in Phase 4.
- [x] Quick-action deep-link tiles — **adapt** DONE as Next-Up card + check-in card tap (tile grid superseded by tab nav).

## Routine (`RoutineV` 6608) — Phase 3

- [x] `buildRoutine` daily merged timeline — **adapt** DONE (2026-07-11): pipeline + `groupTasksByTimeBlock` calendar renders scheduledBlock; body categories (training/nutrition/supplement/peptide) + _system check-in emit today; skincare/mind/work protocol tasks arrive with their Phase 4 views. buildRoutine golden fixtures remain the v1 behavior reference.
- [x] Checkbox completion → routine % — **port** DONE (drives HomeDashboard protocol score).
- [x] RoutineView time-block calendar + intelligence surfaces — **ported** (Task 14, 2026-07-11): pace banner, yesterday recap, check-in/weight-trend alert stack, goal-progress cards, `groupTasksByTimeBlock` calendar (training collapses via `CollapsibleGroup`, peptides stay top-level), long-press `TaskContextMenu`, Sunday `WeeklyRecap` gated by the caller-owned `adonis_recap_dismissed_<date>` key, `StreakMilestone` tier-crossing takeover. TaskContextMenu pulled forward from Phase 4 (RoutineView dependency) — 2026-07-11. Also: `pipeline.js` additively gained the archive's `_system`-domain sweep (goals.length > 0 → walk `protocolMap` for `domain === '_system'` protocols and call `getTasks` directly) so the already-registered `checkinProtocol` (registered via `register-all.js`, previously dead code — its `getTasks` was never invoked because `collectTasks` only walks `goal.activeProtocols`) actually surfaces the "Daily Check-in" task in the routine. The archive's embedded `<HomeDashboard>` render inside RoutineView was intentionally NOT ported — Task 13 already promoted HomeDashboard to its own first-class Home tab in `App.jsx`; keeping the inline embed would have double-rendered it. See `.superpowers/sdd/task-14-report.md`.

## Food (`FoodV` 5409) — Phase 3

- [x] Food logging, `FOOD_DB` (204) + custom foods, per-day macro totals — **port** DONE: FoodLogger on single-source food-db.js (51 foods), custom entry, macro grid.
- [x] Adaptive engine — **port** DONE 🧪 (2026-07-11): calorie-engine (calcMacros golden-exact; BMR/TDEE rounding + ||1.2 fallback = documented divergences), adaptive-calories pace engine (deadline-pace, yesterday nudge via getYesterdayDelta, burn-gap card, cycle calMod bump), validProfile guard (no fabricated targets).
- [ ] 7-day intake chart + protein compliance — ruling changed **port → defer** (2026-07-11): archive FoodLogger never had the chart; fold into Phase 4 Insights view where weekly trends live.
- [x] Auto-scaled suggested meal plan — **port** DONE via nutrition protocol MEALS task emission in the daily routine.

## Peptides (`StackV` 5851) — Phase 4

- [x] Protocol viewer — **port** DONE 2026-07-12: BodyView Peptides pane (PROTO_STACKS browser, research/compat modules already on main, live Supabase catalog w/ static fallback via peptide-catalog.js).
- [x] Goal-matched stack recommendations — **port** DONE 2026-07-12 🧪: stack-builder.js golden parity (buildStacks/GOAL_MAP) + recommend-stack/getStackForFinder + pillar→optimizeFor sync.
- [x] In-app shop/cart/checkout — **drop** CONFIRMED 2026-07-12: order CTAs are plain advncelabs.com links in BodyView; no payment handle/phone in v2 bundle.
- [x] `SOURCE_ROUTES` affiliate routing — **drop** CONFIRMED 2026-07-12.
- [x] Live pricing/stock from Supabase `products` — **port** DONE 2026-07-12 (enrichCatalog/loadLiveCatalog, graceful static fallback).

## Train (`WorkoutV` 6369) — Phases 0✅/3

- [x] Workout player, set logging, rest timer — **ported** (WorkoutView merged in Phase 0).
- [x] PR detection + celebration (`wkPRs` 3263) — **adapt** DONE: PRCelebration fires transition-gated on main's setLog PR branch + celebration-grade `logs.exercise` session append; main's wkPRs record/badge unchanged. (v1 PR-detection golden fixture note: v1 stored max weight only — main's semantics match.)
- [x] `exercises.js` + `programs.js` — **port** DONE (main's src/protocols/body/workout owns both; `public/lib` deletion stays a Phase 5 cutover step).
- [x] Goal→program map (3243) — **port** DONE (getProgram/GOAL_ALIASES).
- [x] GoalCompleteScreen pulled forward from Phase 4 (WeightLogger dependency) — 2026-07-11. Ported verbatim alongside `WeightLogger` (Phase 3, Task 12): sister screen to `PRCelebration`, same design-system deps only (`theme`, `GradText`, `sound`, `haptics`), no substitution needed.

## Tools (`ToolsV` 6324) — Phase 4

- [ ] Dosing calculators — ruling changed **port → defer** (2026-07-12): archive BodyView Tools pane hosts WeightLogger+PhotoJournal only; v1's dosing calculators (PEP_DB pane) have no archive successor. Revisit post-MVP with the peptide deep-dive; PEP_DB data already lives in catalog.js.
- [ ] Supply/inventory tracking — ruling changed **port → defer** (2026-07-12): peptides getUpsells supply_low hook exists but nothing computes supplyDaysLeft yet (needs order/usage data that arrives with post-MVP commerce). Deferred with it.

## Money (`CreditCardV` 5584, `IncomeV` 6869) — Phase 4 / deferred

- [x] 5/24 tracking, `getBestCard`, wallet — **port** DONE 2026-07-12 🧪: cards-logic verified golden-parity (0 divergences); MoneyView wallet/score/optimizer/recommendations live on main's CC_DB.
- [ ] ⚠ Credit-repair dispute engine (`generateDisputeLetter`/`generateLetterByType` 1238-1274, `getScoreAnalysis`, `disputeQueue`) — **defer**: substantial standalone product, in no MVP DoD item or phase. Golden-fixture it anyway at defer time (cheap insurance while v1 source is fresh).
- [ ] ⚠ MLM/referral income tracker (`INCOME_REWARDS` 1506, lead pipeline, `REFERRAL_VERTICALS`, `buildIncomePlan`) — **defer**: spec accepts stub income `getState` for MVP; real income protocol is post-MVP #6. The 5-level comp plan + solar vertical data should be preserved as protocol data when that lands.

## Mind (`MindV` 7043) — Phase 4

- [x] Breathing timers, 5 patterns — **adapt** DONE 2026-07-12: MindView breathwork modal, all 5 patterns single-sourced in mind/data.js (count-asserted).
- [x] Nootropic stacks, focus blocks — **port** DONE 2026-07-12 (8-compound data module; Pro-gated card; focus areas persisted).

## Passport / Citizenship (`CitizenshipV` 7195) — Phase 4 (Travel view)

- [x] Citizenship pathways — **port** DONE 2026-07-12 🧪: scoreCitizenshipPaths golden-parity verified (0 divergences); TravelView pathways/countries/budget/doc-tracker (persisted)/passport-power live.

## Purpose / Image / Space / Community — Phase 4 ("light")

- [x] Purpose — **port** DONE 2026-07-12: Life Wheel + Core Values (data module); v1 bucket-list ABSORBED into BucketListTeaser (Elite-gated, zero-interactive, spec decision 7 promise copy) — no competing flat list ships.
- [x] Image — **port** DONE 2026-07-12: ImageView on main's skincare data (grooming: main's item set canonical — archive-only body/teeth items not ported, product decision open; wardrobe editable, counts start 0).
- [x] Space/Environment — **port** DONE 2026-07-12 (36-item checklist data module, persisted per-day, progress ring).
- [x] Community — **port** DONE 2026-07-12 (real streak via computeRoutineStreak; matching stays scaffold with visible Preview labels).

## Insights (`InsightV` 5452) — Phase 4

- [x] `generateInsights` correlations — **port** DONE 2026-07-12 🧪: insights-engine.js golden parity; rendered as InsightsView Correlations section (+ archive's heatmap/7-day grid/analysis).
- [ ] "AI insights" Elite flag — **defer** (post-MVP, with Bucket List/Claude backend).

## Profile (`ProfV` 7478) — Phases 2/4

- [x] Profile/goals/domains editor — **port** DONE 2026-07-12 (ProfileHeader/pillars modal/AppSettings/soft reset/sign-out; goals list w/ remove).
- [x] Tier management + promo redemption — **adapt** DONE 2026-07-12: access-code model live end-to-end (locked domains → redeem → unlock, DoD item 7 test-driven); Stripe upgrade buttons are info rows only.
- [x] Order history — **drop** CONFIRMED 2026-07-12.
- [x] Data reset — **port** DONE 2026-07-12 (type-RESET soft reset; logs+goals survive, no re-signup).

## Onboarding & Auth — Phase 2 ✅ (closed 2026-07-11, branch phase2-onboarding-auth-tiers)

- [x] v1 onboarding wizard (`view` landing/onboard 3119) — **adapt** DONE: revival OnboardingFlow→Calculating→GamePlan ported verbatim; per-protocol questions grafted into 11 main protocols; wizard driven end-to-end by test.
- [x] Optional/anonymous use — **drop** DONE: funnel gates the shell on a session (`!user → AuthScreen`); no anonymous path to protocol delivery.
- [x] Email+password auth (3043-3079) — **port** DONE: `src/services/auth.js` + `useAuth` + AuthScreen (email-only), signup gate opens in signup mode.
- [x] ⚠ Google OAuth (`authGoogle`) — **defer** CONFIRMED: removed from service + UI with ledger-ref comment. (Correction to the old note: the Google-locked gate seen earlier was a different app on a shared dev port — main's `src/` had NO auth gate before Phase 2.)
- [x] Cloud state sync (`user_data` cloudSave/cloudLoad 3083-3090) — **defer** CONFIRMED: local-first; only tier+code stamped to user metadata.

## Tiers & payments (Phase 2 rows closed 2026-07-11)

- [x] Free/Pro/Elite gating (`TIERS` 668, `FREE_DOMAINS` 7600, `isLockedTab` 7606) — **adapt** DONE: Free default, access-code-only unlock (`FOUNDER`→elite, `ADONIS2026`→pro), code stamped to Supabase user metadata + no-downgrade restore on login; 🔒 Pro badges in onboarding; GamePlan free-tier upsell card is informational only.
- [x] Stripe subscription links (`STRIPE_LINKS` 672) — **defer** CONFIRMED dark: `PAYMENTS_ENABLED=false`, `redirectToCheckout` throws, links preserved for post-MVP #1 relight; no UI path reaches it.

## PWA & shell — Phase 5

> **Phase 5 staged**: 5a (manifest, SW-killer, versioned storage, ride-along build) is additive and
> merges to main independently. The cutover flip (CTA repoint, `app.html` redirect, `public/lib`
> removal) is staged on branch `phase5-cutover` and does **not** merge until Jorrel signs off on the
> real-device DoD walkthrough.

- [x] Manifest, apple-web-app meta, install prompt (240-263), splash — **port**. DONE 5a (v2 manifest + icons + splash under `src/static/`, rides the `/app` build) — 2026-07-12 (phase5-cutover, HELD for Jorrel).
- [x] ⚠ SW-killer (unregister + cache-wipe on load, app.html:2) — **adapt**: keep the no-service-worker stance for MVP (fresh deploys > offline), but v2's killer must also clean up v1's registrations at cutover. DONE — v2 shell carries the killer (5a) and the cutover `app.html` redirect keeps the same killer snippet so installed v1 PWAs clean up their registrations/caches on next load — 2026-07-12 (phase5-cutover, HELD for Jorrel).
- [x] Versioned localStorage with wipe-on-bump (`adonis_version` 3097) — **adapt**: keep versioned storage under a new v2 key; no v1 migration (locked decision 2). DONE 5a (`STORAGE_VERSION = 1` stamped as `_v` in `src/state/store.jsx`; missing `_v` back-compat loads, future mismatch wipes) — 2026-07-12 (phase5-cutover, HELD for Jorrel).
- [x] Marketing landing `index.html` — **port** as-is; CTA repoints to `/app` (Phase 5); `app.html` → redirect. DONE at cutover: CTA `href` changed `./app.html` → `/app`; `public/app.html` replaced with a redirect document (meta refresh + `location.replace('/app')` + fallback link, SW-killer preserved); `public/lib` (exercises.js/programs.js) removed — 2026-07-12 (phase5-cutover, HELD for Jorrel).

---

## Phase-close checklist (the gate)

At each phase close, alongside the archive diff:
1. Every ledger row owned by the phase is checked, or its ruling was changed **in this file** with a dated note.
2. Every 🧪 row landed with golden fixtures per the procedure above.
3. Screenshot baseline re-shot (`scripts/screenshot-baseline.sh`) and compared against the prior phase's set.
