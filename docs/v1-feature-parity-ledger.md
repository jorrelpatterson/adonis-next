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

## Home / Check-in (`CheckinV` 5350) — Phase 3

- [ ] Daily check-in, 8 sliders (`CHECKIN_FIELDS` 195) — **adapt**: revival CheckinModal on main's check-in data model (spec duplicate-pair ruling). Parity bar: all 8 fields survive.
- [ ] Domain-aware stat cards (5375-5407) — **adapt** into HomeDashboard stat tiles.
- [ ] Weight logging + sparkline — **port** (WeightLogger, Phase 3).
- [ ] 7-day mood strip — **port** (explicitly in Phase 3).
- [ ] Daily notes — **port**.
- [ ] Menstrual-cycle phase banner, `getCycleInfo` water-retention + BMR adjustments — **port** 🧪. Easy to lose; it's buried in Home, not Food.
- [ ] Bonus-deadline + low-supply alert banners — **adapt** into routine-intelligence alerts (Phase 3).
- [ ] Quick-action deep-link tiles — **adapt** to v2 nav.

## Routine (`RoutineV` 6608) — Phase 3

- [ ] `buildRoutine` daily merged timeline (peptides/workouts/meals/skincare/supplements/mind/work) — **adapt**: v2's protocol pipeline (collect→prioritize→schedule) is the successor. Parity bar: every v1 category emits tasks through some protocol; time-block calendar view.
- [ ] Checkbox completion → routine % — **port** (drives protocol score on HomeDashboard).
- [x] RoutineView time-block calendar + intelligence surfaces — **ported** (Task 14, 2026-07-11): pace banner, yesterday recap, check-in/weight-trend alert stack, goal-progress cards, `groupTasksByTimeBlock` calendar (training collapses via `CollapsibleGroup`, peptides stay top-level), long-press `TaskContextMenu`, Sunday `WeeklyRecap` gated by the caller-owned `adonis_recap_dismissed_<date>` key, `StreakMilestone` tier-crossing takeover. TaskContextMenu pulled forward from Phase 4 (RoutineView dependency) — 2026-07-11. Also: `pipeline.js` additively gained the archive's `_system`-domain sweep (goals.length > 0 → walk `protocolMap` for `domain === '_system'` protocols and call `getTasks` directly) so the already-registered `checkinProtocol` (registered via `register-all.js`, previously dead code — its `getTasks` was never invoked because `collectTasks` only walks `goal.activeProtocols`) actually surfaces the "Daily Check-in" task in the routine. The archive's embedded `<HomeDashboard>` render inside RoutineView was intentionally NOT ported — Task 13 already promoted HomeDashboard to its own first-class Home tab in `App.jsx`; keeping the inline embed would have double-rendered it. See `.superpowers/sdd/task-14-report.md`.

## Food (`FoodV` 5409) — Phase 3

- [ ] Food logging, `FOOD_DB` (204) + custom foods, per-day macro totals — **port**. FOOD_DB moves to protocol data file (single-source rule).
- [ ] Adaptive engine: `calcBMR`/`calcTDEE`/`calcMacros`, deadline-pace, yesterday-overshoot carryover, cycle-phase bump, burn gap — **port** 🧪. This is the core Body IP.
- [ ] 7-day intake chart + protein compliance — **port**.
- [ ] Auto-scaled suggested meal plan — **port**.

## Peptides (`StackV` 5851) — Phase 4

- [ ] Protocol viewer (dosing/timing/cycle/mechanism, `PEP_RESEARCH` 381) — **port** via revival's proto-stacks + Supabase catalog w/ static fallback (spec'd).
- [ ] Goal-matched stack recommendations (`buildStacks`, `GOAL_MAP` 173) — **port** 🧪 (goal→stack sync is spec'd).
- [ ] In-app shop/cart/checkout (`pepCart` 3151, checkout 4200-4244) — **drop**: spec ruling — order CTAs become plain links to advncelabs.com. Ref-attribution deep link = post-MVP #7. Kills the hardcoded payment handle/phone in the bundle too.
- [ ] `SOURCE_ROUTES` affiliate/vendor routing (165) — **drop** with the cart (revisit with post-MVP #7).
- [ ] Live pricing/stock from Supabase `products` (3042) — **port** (revival `peptide-catalog.js`).

## Train (`WorkoutV` 6369) — Phases 0✅/3

- [x] Workout player, set logging, rest timer — **ported** (WorkoutView merged in Phase 0).
- [ ] PR detection + celebration (`wkPRs` 3263) — **adapt**: revival WorkoutLogger/PRCelebration on main's architecture (spec pair ruling) 🧪 (PR detection).
- [ ] `exercises.js` (112 exercises) + `programs.js` (Adonis PPL 16-week) — **port** into `src/` protocol data; delete `public/lib` at Phase 5 cutover (spec'd).
- [ ] Goal→program map (3243) — **port**.
- [x] GoalCompleteScreen pulled forward from Phase 4 (WeightLogger dependency) — 2026-07-11. Ported verbatim alongside `WeightLogger` (Phase 3, Task 12): sister screen to `PRCelebration`, same design-system deps only (`theme`, `GradText`, `sound`, `haptics`), no substitution needed.

## Tools (`ToolsV` 6324) — Phase 4

- [ ] Dosing calculators — **port** (BodyView Tools sub-tab).
- [ ] Supply/inventory tracking + reorder alerts — **port**; alerts wire into Phase 3 routine intelligence.

## Money (`CreditCardV` 5584, `IncomeV` 6869) — Phase 4 / deferred

- [ ] 5/24 tracking (`calcFiveTwentyFour`), `getBestCard`, bonus/min-spend deadlines, wallet — **port** 🧪. DoD says Money is "real"; also a named Bucket List input.
- [ ] ⚠ Credit-repair dispute engine (`generateDisputeLetter`/`generateLetterByType` 1238-1274, `getScoreAnalysis`, `disputeQueue`) — **defer**: substantial standalone product, in no MVP DoD item or phase. Golden-fixture it anyway at defer time (cheap insurance while v1 source is fresh).
- [ ] ⚠ MLM/referral income tracker (`INCOME_REWARDS` 1506, lead pipeline, `REFERRAL_VERTICALS`, `buildIncomePlan`) — **defer**: spec accepts stub income `getState` for MVP; real income protocol is post-MVP #6. The 5-level comp plan + solar vertical data should be preserved as protocol data when that lands.

## Mind (`MindV` 7043) — Phase 4

- [ ] Breathing timers, 5 patterns (4246-4252), animated guide — **adapt**: revival MindView's live breathwork timer is the successor. Parity bar: all 5 v1 patterns present.
- [ ] Nootropic stacks, focus blocks — **port** at "light" depth (DoD tier for Mind).

## Passport / Citizenship (`CitizenshipV` 7195) — Phase 4 (Travel view)

- [ ] `scoreCitizenshipPaths`, country options (1767), budget/timeline filters, document checklists, passport-power score — **port** 🧪. DoD says Travel is "real".

## Purpose / Image / Space / Community — Phase 4 ("light")

- [ ] Purpose: values — **port** light. ⚠ v1 bucket-list — **adapt**: absorbed by the Bucket List orchestrator (Elite teaser in MVP); don't ship a competing flat list.
- [ ] Image: skincare/wardrobe/grooming — **port** ("real" per DoD); skincare tasks feed routine.
- [ ] Space/Environment: workspace/sleep — **port** light.
- [ ] Community: accountability matching — **port** light (matching logic can stay scaffold).

## Insights (`InsightV` 5452) — Phase 4

- [ ] `generateInsights` cross-domain correlations — **port** 🧪 (it's deterministic heuristics — cheap to golden-test).
- [ ] "AI insights" Elite flag — **defer** (post-MVP, with Bucket List/Claude backend).

## Profile (`ProfV` 7478) — Phases 2/4

- [ ] Profile/goals/domains editor — **port** (Phase 4 profile rebuild: ProfileHeader, pillars, settings).
- [ ] Tier management + promo redemption (`PROMO_CODES` 676, `redeemPromo` 7576) — **adapt** to access-code model (decision 5). FOUNDER→elite and ADONIS2026→pro carry over 1:1.
- [ ] Order history — **drop** with in-app commerce.
- [ ] Data reset — **port** (soft reset, Phase 4).

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

- [ ] Manifest, apple-web-app meta, install prompt (240-263), splash — **port**.
- [ ] ⚠ SW-killer (unregister + cache-wipe on load, app.html:2) — **adapt**: keep the no-service-worker stance for MVP (fresh deploys > offline), but v2's killer must also clean up v1's registrations at cutover.
- [ ] Versioned localStorage with wipe-on-bump (`adonis_version` 3097) — **adapt**: keep versioned storage under a new v2 key; no v1 migration (locked decision 2).
- [ ] Marketing landing `index.html` — **port** as-is; CTA repoints to `/app` (Phase 5); `app.html` → redirect.

---

## Phase-close checklist (the gate)

At each phase close, alongside the archive diff:
1. Every ledger row owned by the phase is checked, or its ruling was changed **in this file** with a dated note.
2. Every 🧪 row landed with golden fixtures per the procedure above.
3. Screenshot baseline re-shot (`scripts/screenshot-baseline.sh`) and compared against the prior phase's set.
