# Adonis v2 Phase 4 — Domain Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All 8 domain tabs render real views (Body deep with peptide stacks; Money/Travel/Image real; Mind/Purpose/Environment/Community light), an Insights tab exists, the profile is rebuilt (header/pillars/settings/soft-reset/sign-out), free-tier locked states gate non-body domains (DoD item 7), and the Bucket List Elite teaser is live (promise stated, nothing built).

**Architecture:** Port the archive's `src/views/*.jsx` under the single-source-of-truth rule — every embedded catalog moves into its protocol's `data.js` first, then views import from protocols. Engines already on main (cards-logic, citizenship scorer, dispute letters) get golden PARITY VERIFICATION, not re-ports; `buildStacks` and `generateInsights` port from the golden reference. Placeholder/fake data in archive views is either wired to real engines (Community streak), persisted (Travel docs), replaced by the Elite teaser (Purpose bucket counts), or visibly labeled.

**Tech Stack:** React 18 + Vite (`src/`), vitest + happy-dom, Supabase JS SDK (products table, net-new read).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md` (Phase 4 paragraph + porting rule + DoD items 6-8 + Verification addendum). Ledger: `docs/v1-feature-parity-ledger.md` (Peptides/Tools/Money/Mind/Passport/Purpose-Image-Space-Community/Insights/Profile rows close at phase end).
- **Single-source rule (binding):** views NEVER own domain data. Extractions land BEFORE their views. Archive-embedded data blocks and their target protocol modules are enumerated per task.
- **Golden gates (🧪):** `buildStacks`+`GOAL_MAP` and `generateInsights` port verbatim from `tests/golden/v1/{stacks,insights}.js` and must reproduce their fixtures. Main's existing `cards-logic.js` (calcFiveTwentyFour/getBestCard), `citizenship/data.js` (scoreCitizenshipPaths), and `credit/letters.js` (dispute fns) get main-engine parity tests vs their fixtures — divergences documented, never silent.
- **Stripe stays dark; access codes only** (decision 5). The profile subscription card ports WITHOUT `redirectToCheckout` wiring — upgrade buttons become access-code pointers. Order CTAs for peptides = plain links to advncelabs.com (spec-sanctioned). Dead `href="#"` CTAs from archive views are removed or made real — none ship.
- **Placeholder data policy:** fake constants must not masquerade as real (Community `streakDays=12` → `computeRoutineStreak`; Travel doc tracker → persisted via `setProtocolState('citizenship',...)`; Purpose fake bucket counts → the Elite teaser; Community sample matches/feed stay but visibly labeled "Preview"). Hardcoded copy-count claims must match data (`PROTO_STACKS.length`).
- **Known store/protocol wiring gaps** (from recon — views reconcile, don't trust `getState` blindly): peptides `getState` reads `profile.activePeptides`/`supplyDaysLeft` which nothing writes — the stack view computes/wires them via `protocolState.peptides`; credit `getState` expects array logs — MoneyView reads `protocolStates` directly like the archive does.
- Design contract per new screen; imports of CHECKIN_FIELDS ONLY from `src/state/checkin.js`; archive extraction pattern `git show v2-revival-archive:<path>`; adaptations documented in-file.
- Suite green (794 at plan time); tests co-located; commit per task ending `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Existing tests that WILL need sanctioned updates: `TabNav.test.jsx` (tier gating + Insights tab), `BodyView.test.jsx` (new sub-tabs — keep Train/Food/Weight seams + pinned clock), `App.test.jsx` (profile rebuild).

---

### Task 1: Protocol data extractions A (mind, purpose, environment)

**Files:** Create `src/protocols/mind/data.js`, `src/protocols/purpose/data.js`, `src/protocols/environment/data.js`; Test: co-located `__tests__/data.test.js` per module.
**Interfaces:** `BREATHWORK_PATTERNS` (5: box/478/wimhof/calm/energizing, `{id,name,inhale,hold,exhale,cycles,...}`) + `NOOTROPICS` (8) + `FOCUS_LABELS` from archive MindView; `LIFE_AREAS` (7) + `CORE_VALUES` (20) from archive PurposeView; `CHECKLIST` (36 = 6 areas × 6, with priorityKey) + `LIVING_LABELS` + `PRIORITY_LABELS` from archive EnvironmentView. Copy the data blocks VERBATIM out of the archive view files (`git show v2-revival-archive:src/views/{Mind,Purpose,Environment}View.jsx`), provenance comments. Tasks 8-9 consume.

- [ ] Extract each data block verbatim into its module with named exports; shape tests (counts: 5/8/7/20/36; required fields per item; mind protocol copy claims "5 breathwork patterns"/"8-compound" — assert data matches copy).
- [ ] Full suite; commit `feat(phase4): mind/purpose/environment protocol data modules (single-source extractions)`.

### Task 2: Protocol data extractions B (image, money, travel)

**Files:** Modify `src/protocols/image/skincare/data.js` (append WARDROBE; reconcile grooming), `src/protocols/money/credit/data.js` (append SCORE_MAP), `src/protocols/travel/citizenship/data.js` (append DEFAULT_TRAVEL_DOCS + PASSPORT_POWER); Tests extend co-located.
**Interfaces:** `WARDROBE` (6 categories — strip the fake `have` counts to 0 with a comment) and grooming: main already exports `GROOMING_ITEMS` — diff vs archive ImageView's `GROOMING_SEED`; if same items keep main's, if archive's has cadence fields main's lacks, merge additively (document). `SCORE_MAP` (range→number) from archive MoneyView. `DEFAULT_TRAVEL_DOCS` (5) + `PASSPORT_POWER = { us: 186 }`-style constant (un-hardcodes TravelView's 186) from archive TravelView.

- [ ] Extract + reconcile per above; shape tests; full suite; commit `feat(phase4): image/money/travel data extractions`.

### Task 3: Golden engines — ports + main-parity verification 🧪

**Files:** Create `src/protocols/body/peptides/stack-builder.js` (buildStacks+GOAL_MAP verbatim from `tests/golden/v1/stacks.js`), `src/routine/insights-engine.js` (generateInsights verbatim from `tests/golden/v1/insights.js`); Extend `tests/golden/main-engine-parity.test.js` (or sibling file `tests/golden/main-engine-parity-p4.test.js`).
**Interfaces:** `buildStacks(recPeps)` → `{ess, opt, full}` tiers at 0.8/0.72/0.65 pricing; `GOAL_MAP`; `generateInsights(logs, checkins)`. Parity tests replay the golden CASES from `stacks.golden.test.js`/`insights.golden.test.js` through the NEW modules against fixtures (same pattern as Phase 3's cycle.test.js — copy cases with provenance, zero fixture edits). ALSO: parity-verify main's EXISTING engines vs fixtures — `cards-logic.js` calcFiveTwentyFour/getBestCard vs `calcFiveTwentyFour.json`/`getBestCard.json` (pin time like `dispute.golden.test.js` does), `citizenship/data.js` scoreCitizenshipPaths vs `citizenship.json`, `credit/letters.js` three dispute fns vs their fixtures. Any divergence = documented-exception assertion, never silent.

- [ ] Port both modules verbatim (provenance headers); write parity tests; ALL must pass with zero fixture edits (or documented divergences for main's pre-existing engines).
- [ ] Full suite; commit `feat(phase4): stack-builder + insights-engine golden ports; main-engine parity verified (cards/citizenship/dispute)`.

### Task 4: Peptide stack suite

**Files:** Create `src/protocols/body/peptides/proto-stacks.js`, `recommend-stack.js`, `stack-adjustments.js` + their riding `__tests__/*` (all via `git show v2-revival-archive:src/protocols/body/peptides/<f>`).
**Interfaces:** `PROTO_STACKS` (14 — fix any copy claiming 15 when encountered later), `GOAL_TO_STACK`, `WORKOUT_GOAL_TO_OPTIMIZE`, `getStackForFinder(finderAnswers)`, `findCatalogPeptide`; `recommendStack(finderAnswers, catalog)`; `getStackAdjustments(averages, stackNames, peptides)` (consumes checkin `getCheckinAverages`). All import main's existing `catalog.js` (byte-compatible per recon).

- [ ] Extract verbatim (byte-verify); riding tests pass as-is (adapt imports only if paths differ); full suite; commit `feat(phase4): peptide stack suite (proto-stacks, recommender, adjustments)`.

### Task 5: Live peptide catalog service

**Files:** Create `src/services/peptide-catalog.js` + `src/services/__tests__/peptide-catalog.test.js` (both from archive).
**Interfaces:** `enrichCatalog(staticPeps, liveRows)` (pure overlay: price/stock/inStock/vendor by `vendorSku↔products.sku`, hides `active===false`), `fetchSupabaseProducts()` (`[]` on error), `loadLiveCatalog()` (graceful → static PEPTIDES `_live:false`). Spec: "Peptide catalog reads live from Supabase `products` with static fallback."

- [ ] Extract verbatim; verify main's supabase client import path; riding test rides; full suite; commit `feat(phase4): live peptide catalog with static fallback`.

### Task 6: PeptideFinderModal + PhotoJournal

**Files:** Create `src/views/components/PeptideFinderModal.jsx`, `src/views/components/PhotoJournal.jsx` + new smoke tests.
**Interfaces:** `PeptideFinderModal({initial,onSave,onClose})` (re-runs the 5 peptide onboarding questions via main's peptides `getOnboardingQuestions` + Phase-2 QuestionField/question-types); `PhotoJournal({logs, log})` → `logs.progressPhotos[]` `{date,iso,data}` capped 30 (canvas watermark; note the base64-localStorage cap comment stays).

- [ ] Extract verbatim (imports repoint to main paths); smoke tests (finder renders q1 + save fires with answers; PhotoJournal renders empty state; cap logic unit-testable if factored — test what's testable without canvas, note happy-dom canvas limits); full suite; commit `feat(phase4): peptide finder + photo journal components`.

### Task 7: Full BodyView (Peptides + Tools panes)

**Files:** Modify `src/app/views/BodyView.jsx` (Train/Food/Weight seams KEPT; add Peptides pane + Tools pane per archive `src/views/BodyView.jsx` content), Test: extend `BodyView.test.jsx` (pinned clock + role queries preserved).
**Interfaces:** Peptides pane = archive's stack browser/ProtocolPane (PROTO_STACKS cards, selected stack persistence via `protocolState.peptides.selectedStackId`, stack-adjustments banner from check-in averages, PeptideFinderModal launch, live catalog via `loadLiveCatalog`, order CTAs as plain `https://advncelabs.com/?q=...` links — spec-sanctioned); Tools pane = WeightLogger + PhotoJournal (Weight tab may fold INTO Tools per archive layout — follow the archive's sub-tab set `[Peptides, Train, Food, Tools]`, keeping test seams working: update BodyView.test to the new tab set, sanctioned). Fix any "15 stacks" copy → derive from `PROTO_STACKS.length`.
**Wiring gap to solve here:** compute `activePeptides`/`supplyDaysLeft` from the selected stack + `protocolState.peptides` and stamp them where peptides `getTasks` can see them (adapt the archive's approach — read its BodyView/App for how selection flowed into task emission; keep the change inside protocolState, not profile, unless the archive genuinely used profile — document what you find).

- [ ] Port pane content; wire; tests (stack select persists + emits peptide tasks next routine build; order link href asserts advncelabs.com; no `buy.stripe.com`); full suite; commit `feat(phase4): full BodyView — peptide stacks + tools`.

### Task 8: Money + Travel + Image views

**Files:** Create `src/views/MoneyView.jsx`, `TravelView.jsx`, `ImageView.jsx` (from archive) + smoke tests each.
**Adaptations (each documented):** MoneyView — DELETE embedded CC_DB/SCORE_MAP, import from `money/credit/cards-db.js`/`data.js`; dead `Apply →` links removed (render card name/bonus, no anchor). TravelView — doc tracker persists via `setProtocolState('citizenship', {travelDocs})` (init from DEFAULT_TRAVEL_DOCS); 186 from PASSPORT_POWER; dead links removed. ImageView — grooming/wardrobe from protocol data; wardrobe `have` starts 0/editable via setProtocolState.

- [ ] Extract + adapt + smoke tests (each renders its hero + persists one interaction round-trip through a store-backed harness); full suite; commit `feat(phase4): money/travel/image domain views (single-sourced)`.

### Task 9: Mind + Environment views

**Files:** Create `src/views/MindView.jsx`, `EnvironmentView.jsx` + smoke tests.
**Adaptations:** both import Task 1 data modules (delete embedded blocks). MindView: meditation completion now ALSO logs (`log('mind', ...)` or protocolState timestamp — pick the lighter: `setProtocolState('mind', {lastMeditation: iso})`, documented) so "Session logged" isn't a lie; breathwork modal + nootropics (Pro-gated card stays, gate on `profile.tier`). EnvironmentView: checklist persists per existing archive logic (verify the 7-day trim).

- [ ] Extract + adapt + tests (breathwork pattern count from data; checklist round-trip; nootropics locked for free tier); full suite; commit `feat(phase4): mind/environment domain views`.

### Task 10: Purpose view + Bucket List Elite teaser

**Files:** Create `src/views/PurposeView.jsx` + `src/views/components/BucketListTeaser.jsx` + tests.
**Interfaces:** PurposeView: Life Wheel + Core Values from Task 1 data (persisted via protocolState); DELETE fake YEARLY_GOALS + fake bucket counts. `BucketListTeaser` replaces the archive's bucket preview: Elite-gated locked surface — states the promise (spec decision 7 language: open-ended goals decompose into cross-domain strategies), lock chrome from the archive's Pro-badge pattern, CTA = "Unlock with Elite access code" pointing at Profile (NO Stripe, NO href="#", nothing functional behind it). Elite users see the same teaser with "Coming first to Elite" copy (post-MVP #1 builds it).

- [ ] Extract + build teaser + tests (teaser renders locked for free/pro, promise copy present, zero navigation/Stripe; life wheel persists); full suite; commit `feat(phase4): purpose view + bucket-list elite teaser`.

### Task 11: Community + Insights views (+ Insights tab)

**Files:** Create `src/views/CommunityView.jsx`, `src/views/InsightsView.jsx`; Modify `src/app/TabNav.jsx` (Insights fixed tab before Profile) + `src/app/App.jsx` insights branch; tests.
**Adaptations:** CommunityView — `streakDays` from `computeRoutineStreak(logs.routine, today)` (real); sample matches/feed KEPT but under a visible "Preview — matching ships later" label (archive's own header comment made this intent explicit). InsightsView — CHECKIN_FIELDS import → `src/state/checkin.js`; ADD a "Correlations" card section rendering `generateInsights(logs, checkins)` output from Task 3's engine (single source; keep the archive's heatmap/7-day grid/analysis as-is). App passes `{profile, logs}` (+ today).

- [ ] Extract + adapt + wire tab (TabNav.test updated — sanctioned); tests (streak real not 12; correlations section renders engine output for seeded logs; heatmap renders); full suite; commit `feat(phase4): community + insights views, insights tab`.

### Task 12: Tier gating — locked domain states (DoD item 7)

**Files:** Create `src/app/LockedDomain.jsx`; Modify `src/app/App.jsx` domain dispatch + `src/app/TabNav.jsx` (lock glyph on gated tabs); tests incl. TabNav.test updates (sanctioned).
**Interfaces:** Free tier: non-body domain tabs stay VISIBLE but content renders `LockedDomain` — polished locked state (domain icon, SUB_TIERS pro copy, 🔒 chrome per onboarding badge pattern, "Redeem an access code in Profile" CTA that switches to the profile tab). Pro/elite: unlocked. Body always free. Gating helper `isDomainLocked(domainId, tier)` exported for tests.

- [ ] TDD: free profile + money tab → LockedDomain renders (no MoneyView); redeem ADONIS2026 (drive the real profile-tab input) → MoneyView renders. Elite/pro seeds unlocked. Full suite; commit `feat(phase4): free-tier locked domain states (access-code unlock path)`.

### Task 13: Profile rebuild + sign-out

**Files:** Create `src/app/components/ProfileHeader.jsx`, `FitnessPillarsModal.jsx`, `AppSettings.jsx`, `ResetConfirmModal.jsx` (all from archive `src/app/components/`); Modify `src/app/App.jsx` profile branch (replace inline block); tests.
**Adaptations:** subscription card ports WITHOUT Stripe (`redirectToCheckout` never imported; upgrade buttons → access-code pointer copy); ADD "Log Out" button wired to `useAuth().signOut` beside a synced badge w/ `user.email` (archive pattern; carry-over from Phase 2 backlog); ResetConfirmModal's soft reset triggers the Phase-2 funnel (`forceOnboarding`-equivalent — reconcile with main's funnel state machine: re-enter OnboardingFlow WITHOUT wiping logs, skip `buildInitialGoals` re-seed per archive). Keep access-code input + tier card + active-goals list (move into the new layout). PillarsModal save syncs `workout.primary` + peptides `optimizeFor` via `WORKOUT_GOAL_TO_OPTIMIZE` (Task 4 export).

- [ ] Port + wire + tests (sign-out button calls signOut; RESET-typed gate re-enters onboarding with logs intact; pillar save syncs both protocol states; no Stripe import anywhere: grep gate). Existing App tests updated minimally (sanctioned). Full suite; commit `feat(phase4): profile rebuild (header/pillars/settings/soft-reset/sign-out)`.

### Task 14: DOMAIN_VIEWS wiring

**Files:** Modify `src/app/App.jsx` — replace the generic domain fallback (L523-587 region) with the archive's `DOMAIN_VIEWS` map dispatch `{money, travel, mind, image, purpose, environment, community}` (body keeps its branch), computing `domainGoals`/`domainTasks` and passing the archive's 9-prop contract; LockedDomain check wraps the dispatch (Task 12). Tests: one dispatch test per domain (seeded pro tier → view's hero renders; goals/tasks rails receive filtered props).

- [ ] Wire + tests; full suite; `npm run build:app` clean; commit `feat(phase4): domain view dispatch (all 8 domains live)`.

### Task 15: Phase close — the gates

- [ ] `npm test` green; `npm run build:app` + `npm run build` clean; `npx vitest run tests/golden` green.
- [ ] Archive-diff gate agent over `src/views src/app/components src/protocols` vs the sanctioned-adaptation list.
- [ ] E2E seed profile gains all 8 domains + elite (`App.jsx` bypass) so the shooter reaches every tab; add ROUTES for money/travel/mind/image/purpose/environment/community/insights; shoot `phase-4` baseline; eyeball every screen (design contract).
- [ ] Parity ledger: close Peptides (viewer/stacks 🧪/live pricing), Tools (calculators note: dosing calculators = PEP_DB pane if ported in BodyView Tools, else dated defer note), Money cards 🧪, Mind (5 patterns parity), Passport 🧪, Purpose/Image/Space/Community light rows, Insights 🧪, Profile rows (editor/tier-adapt/data-reset; order history stays dropped) — dated notes for any ruling change.
- [ ] Commit `docs(phase4): phase-close gates`; final whole-branch review (most capable model) → fix wave → re-review → merge to main + push per standing authorization.
- [ ] Report to Jorrel: real-device walkthrough still Phase 5; note any deferred rows.

## Self-review notes
- Spec Phase 4 sentence coverage: 9 views (T7-T11, T14), single-source rule (T1-T2 before views), peptide stacks + finder + Supabase catalog + goal→stack sync (T3-T7), ExerciseDetail/WeeklyRecap/GoalCompleteScreen/TaskContextMenu (already landed Phase 3 — ledger notes exist), PhotoJournal (T6), profile rebuild (T13), Bucket List teaser (T10), DoD item 7 locked states (T12), DoD item 6 all-domains-explorable (T14).
- Type consistency: `WORKOUT_GOAL_TO_OPTIMIZE` produced T4 consumed T13; `computeRoutineStreak` reused from Phase 3; LockedDomain gate produced T12 consumed T14; 9-prop view contract stated once (T14) and referenced by T8-T11 smoke-test harnesses.
- Deliberate scope cuts: dosing-calculator pane rides only if the archive BodyView Tools has it (else ledger defer note at T15); meditation logging = lightweight protocolState timestamp; Community matching stays preview-labeled.
