# Adonis v2 — Domain Build-Out Roadmap

> Written 2026-07-14, immediately after Phase 5a (v2 live at adonis.pro/app; cutover staged).
> This is the pre-spec ROADMAP for taking each domain from "ported" to "built out correctly."
> Each wave, when picked up, gets its own brainstorm → spec → SDD-plan cycle (the machinery
> that shipped Phases 2-5). Decisions marked ⚖️ need Jorrel before that item's spec is written.
> Honest current-state assessments come from the Phase 4 build + review record
> (`.superpowers/sdd/progress.md`) and the parity ledger.

## What "built out correctly" means (the bar, applied to every domain)

1. **Protocol-first.** A domain is done when its *protocol* emits real daily tasks from real
   state (`getState`/`getTasks`), not when its view looks rich. The view renders what the
   protocol knows. (Counter-example today: Environment's 36-item checklist lives in the view's
   protocolState loop; its protocol emits almost nothing into the routine.)
2. **Single-source.** Domain data lives in `src/protocols/<domain>/data.js` — already enforced;
   keep it that way for every addition.
3. **Golden-tested where v1 IP exists.** Dispute letters, income plans, insights heuristics —
   fixtures are already frozen in `tests/golden/`; ports must reproduce them.
4. **Tier-mapped.** Every new feature declares free/pro/elite placement before build
   (access codes are still the only unlock until Stripe relights).
5. **Bucket-List-ready.** Decision 7 makes domains *servants of cross-domain strategies*:
   each domain protocol must be able to serve a child goal (`goal.parentId`) with tasks paced
   to the parent's deadline. Wave 1 makes this real; every later wave inherits the contract.
6. **Placeholder honesty.** Nothing fake ships unlabeled (the Community rule). If a number
   isn't derived from real state, it's either removed or visibly "Preview."

---

## Domain-by-domain: current state → target → build items

### 1. Body — deep, the reference domain
**Today:** Train (programs, set logging, PR celebration), Food (51-food db, adaptive targets,
cycle-aware), Weight (trend, goal-complete), Peptides (14 stacks, finder, adjustments, live
Supabase pricing, advncelabs order links), PhotoJournal. The strongest protocol: real state,
real tasks.
**Gaps:** peptides ACTIVE MODE is dead code (nothing writes `activePeptides` — no dose tasks
in the routine); supply tracking deferred (needs order/usage data); dosing calculators deferred
(no archive successor); food 7-day intake chart deferred; PhotoJournal capped at 30 base64
photos in localStorage ("swap to Supabase Storage for production" per its own header).
**Build items (M):**
- **Commit-a-stack** — "Start this stack" converts the selected stack into `activePeptides` +
  per-compound dose/timing state → daily dose tasks emit (the dead ACTIVE MODE comes alive).
  ⚖️ UX: does starting a stack create a goal, attach to the body goal, or stand alone?
- Supply tracking rides commit-a-stack ("10-vial kit, 2x/week → 35 days left" → reorder task
  + advncelabs deep link). Pairs with post-MVP #7 (ref-attribution links).
- PhotoJournal → Supabase Storage (bucket + RLS; cap lifts; photos survive reinstall).
- Dosing calculator pane (v1 parity ledger row open) — small, data already in catalog.js.

### 2. Money — real but half its v1 depth
**Today:** credit score card, wallet, spend optimizer, top-3 recommendations (all on main's
CC_DB, golden-verified engines), income *stub* (fixed targets, spec-sanctioned for MVP).
**Gaps:** v1's **credit-repair dispute engine** deferred (golden fixtures frozen and waiting:
`generateDisputeLetter`/`generateLetterByType`/`getScoreAnalysis` — 20 fixture cases);
**income protocol is a stub** (post-MVP #6); wallet stores bare card ids so real 5/24 math
(which needs `openDate`) can't run against *your* wallet; CC_DB is 13 static cards
(bonuses/AFs drift); v1's bonus/min-spend deadline tasks don't emit.
**Build items (L):**
- **Wallet v2**: cards carry `openDate`/bonus progress → real `calcFiveTwentyFour` on the
  user's wallet, "slot opens in N days" tasks, min-spend deadline tasks in the routine.
  This is also a named Bucket List input (points fund flights).
- **Dispute engine port** 🧪 — the engines are golden-ready; needs letter UI + dispute queue
  state (v1 had `disputeQueue`). ⚖️ Ship in-app (Pro feature, strong differentiator) or keep
  deferred? ⚖️ Letters print/copy only, or mail-api later (v1 had Lob stubbed)?
- **Income protocol, real state — RESOLVED 2026-07-14 (Jorrel): it's the CAREER ENGINE.**
  Port the jobs.jorrel.io engine (lives in the `jorrel-os` repo, powers jobs.jorrel.io +
  chris.jorrel.io in daily production) into the Money module as the income model.
  **Half is already here and LIVE:** `lib/career/{dedup,pre-filter,types,supabase}.js` +
  6 source adapters + `app/api/cron/career/ingest` (registered in vercel.json @ 14:00 UTC).
  **Verified 2026-07-14: `career_jobs` = 254 rows and filling. But `career_user_jobs`,
  `career_profiles`, `career_applications` = 0 rows — nothing is being scored or surfaced.
  We're ingesting blind.** Adonis's schema (per-user + RLS) is BETTER than jorrel-os's
  (flat `user_key`) — keep it; the ports remap fields onto it.
  What's missing (the valuable half), in build order:
  1. **`scoreJob`/`scoreBatch`** ← `jorrel-os/lib/matcher.ts` (129 lines, Claude Haiku
     ~$0.001/job, free title pre-filter short-circuit, returns
     `{score 0-100, fit_reasoning, red_flags[], recommended_action}`). Port TS→JS, read the
     profile from `career_profiles.profile_summary_md`, write `career_user_jobs`. ~2h. **Do first.**
  2. **Profile onboarding — the only genuinely NEW work.** jorrel-os reads
     `config/<tenant>/profile-master.md` off DISK (fine for 3 hardcoded people, impossible for
     N users). Needs: resume upload → parse → wizard → (optional Claude interview) → finalize
     into `career_profiles`. Nothing to port; build from scratch. **This is the real gap.**
  3. **Operator-stack hard filter** — geo/comp/training-schedule/sleep-protocol gate BEFORE
     scoring. No jorrel-os analog; it's the Adonis differentiator (jobs that fit your protocol,
     not just your resume).
  4. `tailorForJob` + `prepJob` + templates ← `jorrel-os/lib/{tailor,prep,cover-letter}.ts`
     (Claude Sonnet, forced-tool JSON schema, 10 no-fabrication rules — the schema + system
     prompt ARE the IP; ~$1.50/tailor). Re-skin templates in Adonis dark/serif.
  5. `decideFollowUp` ← `jorrel-os/lib/follow-up.ts` — PURE function, ~40 lines, the only
     unit-tested code in that repo. Trivial lift; do last.
  New env var needed: `ANTHROPIC_API_KEY` (+ optional `SCORING_MODEL`/`TAILOR_MODEL`).
  Gotcha to carry: use `process.env.X?.trim() || 'default'` — never `??` (empty-string env
  vars silently produce `model: ''`).
  NOTE: adonis's career spec lists "merging with `money/income/`" as a NON-GOAL — that ruling
  is now superseded: career IS the income protocol. Re-rule in the Wave 2 spec.
  **TIER — RESOLVED 2026-07-14 (Jorrel): ELITE.** The career engine is an Elite feature
  (justifies the tier alongside Bucket List; the tier gate + access-code unlock from Phase 4
  already enforce this — Money tab stays free, the career surface within it renders locked for
  free/pro). Cost math supports it: Haiku scoring is ~$0.05/day/user, Sonnet tailoring ~$1.50
  per click — Elite pricing must cover the per-user LLM spend. ⚖️ For Wave 2: rate-limit or
  credit tailoring (unbounded $1.50 clicks) — decide caps at spec time.
  **REFERRAL TRACKER — RESOLVED 2026-07-14 (Jorrel): SURVIVES alongside.** The v1 referral/MLM
  income tracker stays as its own surface in Money (a "Referrals" card — ambassador-program
  synergy). Career is the primary income surface; referrals is secondary. Both live under Money;
  `money/income/` protocol is NOT deleted — it becomes the referrals home while career becomes
  the new main income protocol.
- CC_DB freshness: move to Supabase table (admin-editable like products) so card offers update
  without deploys. ⚖️ Worth it now, or annual manual refresh acceptable?

### 3. Travel — citizenship-only today, Bucket List's logistics leg tomorrow
**Today:** pathway scoring (golden-verified), 11-country data, budget tiers, persisted doc
tracker, passport-power hero.
**Gaps:** "Travel" is really "second citizenship"; no trip primitives at all — but decision 7's
flagship example ("Go to Egypt") decomposes into *Travel* children (docs, visas, flights).
**Build items (M, mostly Wave 1):**
- **Trip primitives for Bucket List**: destination child-goal type (visa check from passport
  data, doc checklist reuse, flight-budget link to Money points). Build ONLY what decomposition
  needs — no standalone trip-planner app. ⚖️ Confirm scope restraint.
- Citizenship progress: pathway selection → milestone tasks in routine (doc gathering as
  scheduled tasks, not just a static checklist).
- Passport-power: real per-country dataset replacing the single 186 constant (small data lift).

### 4. Mind — good bones, shallow loop
**Today:** 5 breathwork patterns (modal timer), meditation timer (now logs `lastMeditation`),
gratitude journal (persisted), focus areas, Pro-gated nootropics (8 compounds).
**Gaps:** meditation/breathwork sessions aren't in `logs` (one timestamp, no history — Insights
can't correlate them); protocol emits only light tasks; nootropics don't connect to the peptide
supply/ordering world; mental-performance scoring is post-MVP #8.
**Build items (S/M):**
- **Session log**: `logs.mind` entries (type, duration, pattern) → streaks/insights get real
  mind data; check-in correlations ("meditated days: +0.8 mood") become computable.
- Protocol task depth: breathwork/meditation as scheduled routine tasks driven by focus areas
  + check-in state (stress high → box breathing task tomorrow morning).
- ⚖️ Nootropics: catalog-only forever, or wire to advncelabs SKUs like peptides?

### 5. Image — real, needs its routine hookup verified deep
**Today:** AM/PM skincare with 7-day rotation, grooming cadence (main's item set), editable
wardrobe capsule.
**Gaps:** grooming item-set divergence unresolved (⚖️ archive had body-hair/teeth-whitening
items; main has dental/nose-ear — pick the canonical set, one-line data change); wardrobe is
a bare counter (no outfit/spend logic — fine? ⚖️ or connect to Money budgets?); progress
photos live in Body/Tools while Image is where appearance tracking conceptually lives
(⚖️ cross-link or move?).
**Build items (S):** grooming set decision + skincare tasks verified as routine emissions
(v1 parity: skincare AM/PM were daily timeline items — confirm protocol emits both) +
whatever ⚖️ decides. Smallest domain lift.

### 6. Purpose — the flagship's home
**Today:** Life Wheel (7 sliders), Core Values picker, **Bucket List Elite teaser** (inert).
**Gaps:** the teaser IS the product here. Everything else is supporting cast.
**Build items — WAVE 1, the headline (L):**
- **Bucket List orchestrator + Stripe relight together** (spec post-MVP #1, "the reason someone
  pays for Elite"): open statement → strategy with target date → parent goal + child goals
  across domains (`createChildGoal` groundwork landed in Phase 2) → strategy dashboard
  (milestone timeline, per-domain progress, on/off-pace).
  - Decomposition: Claude on the backend (Elite) with deterministic archetype templates
    (trip / marathon / house / physique) as fallback + first-class templates.
  - ⚖️ Stripe: relight = flip `PAYMENTS_ENABLED`, wire the dark links; needs price-point
    confirmation ($14.99/$29.99 stand?) and webhook→tier stamping design (the metadata
    machinery from Phase 2 is ready for it).
  - Life Wheel becomes an input: low-scored areas suggest bucket items/goals.

### 7. Environment — checklist needs to become protocol
**Today:** 36-item daily checklist (persisted, 7-day trim), priority areas, living situation.
**Gaps:** the checklist is view-local ritual; the protocol emits almost nothing → Environment
barely exists in the daily routine, and Home's score ignores it.
**Build items (S/M):** priority-area items emit as routine tasks (3/day from the priority
area, completion writes both checklist + routine logs — one source of truth ⚖️ which one);
weekly "environment reset" task (v1's deep-clean/life-audit had these in buildRoutine —
fixtures show the shapes).

### 8. Community — last, on purpose
**Today:** honest preview (labeled), real streak display, solo-mode notice.
**Gaps:** everything real — matching, partners, feed — needs a user base + Supabase backend
(profiles, matches, activity tables + RLS). Chicken-and-egg: build after there are users to
match (post-cutover growth, ambassador funnel).
**Build items (L, LAST):** ⚖️ scope the v1 promise ("your data is your dating profile" /
accountability partners) vs something lighter (share-your-streak links, invite-a-friend with
ambassador codes — synergy with the existing ambassador program). Lighter version could ride
much earlier if it's growth-driven rather than social-feature-driven.

### 9. Insights (cross-domain surface — not one of the 8, but rides every wave)
**Today:** 90-day consistency heatmap, 7-day trends, threshold analysis, golden `generateInsights`
correlations.
**Build items (per-wave riders):** each wave that adds a new log type (mind sessions, dispute
progress, dose adherence) adds its correlation card here; the **Elite AI insights** flag
(Claude-written weekly narrative) ships with the Bucket List's Claude backend (same
infrastructure, post-MVP #1.5).

---

## Waves (recommended order) — each wave = one brainstorm→spec→SDD cycle

| Wave | Scope | Size | Why this order |
|---|---|---|---|
| **0. Cutover + niggles** | Jorrel phone walkthrough → merge `phase5-cutover`; forgot-password flow; `subscribers.email` constraint check; backlog Minors sweep | S | Unblocks everything; v1 retires |
| **1. Bucket List + Stripe** (Purpose + goal engine + Claude backend, w/ Travel trip-primitives + Money wallet-v2 as its two strongest legs) | L | Spec's own post-MVP #1: the Elite reason-to-pay; forces the cross-domain contract every later wave builds against |
| **2. Money depth = CAREER ENGINE** (score → profile onboarding → operator-filter → tailor → follow-up; then dispute engine 🧪, CC_DB freshness) | L | Income model RESOLVED: port jobs.jorrel.io. Half already live in-repo (254 jobs ingesting, 0 scored). Biggest unshipped IP in the portfolio; Bucket List's funding leg gets real |
| **3. Body commerce loop** (commit-a-stack → dose tasks → supply tracking → ref-attributed ordering) | M | Revenue path: app recommends → advnce sells → app tracks usage → reorder |
| **4. Daily-loop depth across Mind/Image/Environment** (session logs, task emission, grooming decision) | M | Cheap wins that make the routine feel alive across all domains; Insights riders |
| **5. Community** (⚖️ growth-light vs social-full) | L | Needs users; possibly split: growth-light much earlier |

Sizing: S ≈ one session, M ≈ one phase-like cycle (10-15 tasks), L ≈ full phase with spec.

## The ⚖️ decision queue for Jorrel (blocking each item's spec, not today)

1. **Wave 1:** Stripe pricing stands ($14.99/$29.99)? Bucket List archetypes to launch with
   (trip/marathon/house/physique)? Claude decomposition = Elite-only confirmed?
2. **Money:** ~~income model~~ RESOLVED (career engine). ~~referral tracker survives?~~ RESOLVED
   (yes, as a Referrals card). ~~career tier?~~ RESOLVED (Elite). Still open: tailoring cost
   caps/credits (unbounded $1.50 clicks); dispute engine in-app now (Pro) or hold?; CC_DB →
   Supabase or manual refresh?
3. **Body:** commit-a-stack creates a goal vs standalone? PhotoJournal → Supabase Storage
   (needs a storage bucket) — green light?
4. **Image:** grooming canonical item set (main's vs archive's vs union)? Wardrobe stays a
   counter or connects to budgets/outfits? Photos cross-link vs move?
5. **Mind:** nootropics → advncelabs SKUs or catalog-only?
6. **Environment:** checklist completions = routine completions (one checkbox) or separate?
7. **Community:** growth-light early (streak shares + invite codes) vs full social later?

## Process guarantee (unchanged from Phases 2-5)

Per wave: brainstorm the ⚖️ items with Jorrel → locked spec in `docs/superpowers/specs/` →
SDD plan → per-task implement+review → archive/golden/visual gates → fable whole-branch
review → fix wave → merge. The parity ledger keeps its role: v1 rows still open (dispute
engine, income tracker, dosing calculators, supply tracking, 7-day intake chart) close in
their waves or get re-ruled with dated notes.
