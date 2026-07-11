# Adonis v2 Phase 3 — Daily Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The daily loop works end-to-end: HomeDashboard (protocol score, stat tiles, check-in dots, mood strip) as the landing tab, CheckinModal on main's check-in model, routine intelligence (recap/alerts/trends/streaks/milestones/weekly recap), time-block calendar RoutineView, Workout PR celebration, Food/Weight loggers, and the adaptive-calorie layer ("Off Pace — Pushing Harder").

**Architecture:** Port the archive's daily-loop surface per the spec's duplicate-pair rulings: main's engines WIN (calorie-engine.js, state/checkin.js CHECKIN_FIELDS, WorkoutView/SetGrid/RestTimer, exercises.js); the archive's UI + adaptive layer port ON TOP with imports repointed at main's modules. v1's cycle engine ports verbatim from the frozen golden reference (must reproduce fixtures). Two known archive bugs are fixed on port (WeeklyRecap `targetCal` ghost field, `m.cals` vs `m.cal`).

**Tech Stack:** React 18 + Vite (`src/`), vitest + @testing-library/react (happy-dom). Extraction command pattern: `git show v2-revival-archive:<path> > <path>` then documented adaptations only.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-adonis-v2-mvp-completion-design.md` — Phase 3 paragraph + duplicate-pair rulings table + Verification addendum 2026-07-09. Parity ledger: `docs/v1-feature-parity-ledger.md` (Home/Routine/Food/Train Phase 3 rows close at phase end).
- **Duplicate-pair rulings are binding:** keep main's `calorie-engine.js` (its rounding + `||1.2` TDEE fallback are intentional divergences from v1 — document, don't revert), main's `src/state/checkin.js` CHECKIN_FIELDS (single source — ported code must import from it, never a second copy), main's WorkoutView/SetGrid/RestTimer architecture (archive WorkoutLogger is a PARTS SOURCE for PR algo/celebration/session-log, not a wholesale port), main's `exercises.js` (archive `exercise-db.js` imports adapt to it).
- **Single-source-of-truth rule:** views never own domain data. FoodLogger's embedded 14-item COMMON_FOODS must NOT ride in — main's `src/protocols/body/nutrition/food-db.js` (51 foods) is the source.
- **Golden gates (🧪):** cycle engine must reproduce `tests/golden/fixtures/getCycleInfo.json` exactly; `calcMacros` must match its fixtures; `calcBMR`/`calcTDEE` divergences (rounding, fallback) get a documented-exception test, not silence.
- **Store contracts:** `log(key, data, merge=false)` REPLACES `logs[key]` (callers spread). Live shapes: `logs.routine = {'YYYY-MM-DD': taskId[]}` (date-keyed object — the upsell-engine's array assumption is a bug to fix, not a shape to adopt), `logs.checkins = {'YYYY-MM-DD': {fieldId: 1-5}}`, `logs.weight = [{date, weight}]`, `logs.food = {'YYYY-MM-DD': [{name, cal, p, c, f, time}]}`, `logs.exercise = [{date, exercise, sets:[{weight,reps,complete}], isPR}]` (canonical, append-only).
- **Canonical protocol/task shapes:** `getState(profile, logs, goal)`, `getTasks(state, profile, day)` where `day` is a Date (protocols use `day.getUTCDay()`); tasks carry `{id, title, subtitle, type, category, time, duration?, priority, skippable, data?}`; scheduler adds `scheduledBlock`.
- Design contract per new screen: `H`/`GradText`, theme tokens (`P`, `s`), `animations.css` classes, Skeleton/EmptyState/Toast, sound+haptics on celebrations.
- No Stripe/`/v2/`/auth coupling rides in (archive daily-loop files are clean — verify per port).
- Tests co-located `__tests__/`; suite green (538 at plan time); commit per task ending `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- localStorage keys introduced: `adonis_streak_milestone_shown`, `adonis_recap_dismissed_<date>` — no collisions with `adonis_v2`.

---

### Task 1: Check-in protocol foundation

**Files:**
- Create: `src/protocols/_system/checkin/selectors.js`, `src/protocols/_system/checkin/index.js`
- Modify: `src/protocols/register-all.js` (register checkinProtocol)
- Test: `src/protocols/_system/checkin/__tests__/selectors.test.js`, `__tests__/checkin.test.js` (both ride from archive)

**Interfaces:**
- Consumes: main's `CHECKIN_FIELDS` from `src/state/checkin.js` (single source).
- Produces: `getTodayCheckin(logs, today)`, `getCheckinCount(logs)`, `getCheckinAverages(logs, days=7, minSamples=5)` (named exports from selectors); `checkinProtocol` (default/named export per archive, `id:'checkin'`, `domain:'_system'`) whose `getTasks` emits one `type:'check-in'` task (`id: 'checkin-'+date`, category `morning`, priority 1, skippable) until submitted today. Tasks 4, 7, 12 consume the selectors.

- [ ] **Step 1:** Extract archive files: `git show v2-revival-archive:src/protocols/_system/checkin/selectors.js > src/protocols/_system/checkin/selectors.js` (mkdir first), same for `index.js` and both test files. Also fetch `git show v2-revival-archive:src/protocols/_system/checkin/fields.js` to a scratch location and diff its CHECKIN_FIELDS against main's `src/state/checkin.js` — they should be identical (both v1-verbatim); if ANY field/emoji/color differs, STOP and report (main is the keep, but a real diff means the ruling needs eyes).
- [ ] **Step 2 (adaptation):** point every `./fields.js` / `../checkin/fields` import in the extracted files at `src/state/checkin.js` (`CHECKIN_FIELDS`). Do NOT create `_system/checkin/fields.js`.
- [ ] **Step 3:** Register in `src/protocols/register-all.js` following its existing import/register pattern.
- [ ] **Step 4:** Run `npx vitest run src/protocols/_system` then the protocols suite (`npx vitest run src/protocols/`) — Task 6-from-Phase-2's onboarding test loops ALL registered protocols and requires `getOnboardingQuestions` on each: if it fails on `checkin`, check whether the archive's checkin protocol has the onboarding methods; if the archive's `protocol-interface.js` collectors skip `_system` protocols lacking the methods, fix the TEST expectation only if it hard-requires the methods on every protocol (adjust to skip `_system`), and note it.
- [ ] **Step 5:** Full suite, commit `feat(phase3): check-in protocol (selectors + task emission) on main's CHECKIN_FIELDS`.

---

### Task 2: Cycle engine (v1 golden port 🧪)

**Files:**
- Create: `src/protocols/body/nutrition/cycle.js`
- Test: `src/protocols/body/nutrition/__tests__/cycle.test.js`

**Interfaces:**
- Produces: `getCycleInfo(cycleData, today)` and `CYCLE_PHASES` — copied VERBATIM from `tests/golden/v1/metabolics.js` (lines noted in its provenance header; it is itself a verbatim v1 extraction). Return shape `{dayInCycle, cycleLen, phase, daysUntilPeriod, nextPeriod, isLateLuteal, waterRetention, daysSincePeriod, scale}`; `phase.calMod` (0/0/50/150) feeds Task 4; `phase.intensityMod` available for intensity.

- [ ] **Step 1:** Copy the `CYCLE_PHASES` + `getCycleInfo` blocks byte-for-byte from `tests/golden/v1/metabolics.js` into `cycle.js` with a provenance header (`// source: v1 public/app.html:533-610 via tests/golden/v1/metabolics.js — VERBATIM, golden-gated`). Export both.
- [ ] **Step 2:** Write the golden-parity test: import `getCycleInfo` from `../cycle.js`, read `tests/golden/fixtures/getCycleInfo.json`, replay every fixture case (same harness pattern as `tests/golden/metabolics.golden.test.js` — pin TZ/UTC + `vi.setSystemTime(new Date('2026-07-09T12:00:00'))` exactly as that file does, since one case exercises the internal `new Date()` fallback), assert byte-equal outputs. THE PRODUCTION MODULE MUST REPRODUCE THE FROZEN v1 FIXTURES.
- [ ] **Step 3:** Run it (must pass with zero fixture edits), full suite, commit `feat(phase3): cycle engine ported verbatim from v1 (golden-gated)`.

---

### Task 3: Nutrition math completion + golden divergence record

**Files:**
- Modify: `src/protocols/body/nutrition/calorie-engine.js` (append `calcCalorieTarget`, `sumDayMeals` from archive `math.js`)
- Test: `src/protocols/body/nutrition/__tests__/calorie-engine.test.js` (extend), `tests/golden/main-engine-parity.test.js` (new)

**Interfaces:**
- Produces: `calcCalorieTarget(profile, goal)` and `sumDayMeals(meals)` with the archive's exact signatures (read `git show v2-revival-archive:src/protocols/body/nutrition/math.js` and copy those two functions, adapting their internal calls to main's `calcBMR`/`calcTDEE` names if they differ). Tasks 4, 8, 11, 12 consume these.

- [ ] **Step 1:** Append the two functions (adapted imports only, bodies otherwise verbatim from archive math.js). calorie-engine.js keeps its existing three functions UNTOUCHED.
- [ ] **Step 2:** Golden divergence test in `tests/golden/main-engine-parity.test.js`: import main's engine + the fixtures. Assert (a) `calcMacros` reproduces `tests/golden/fixtures/calcMacros.json` EXACTLY (v1-identical, must hold); (b) for `calcBMR`/`calcTDEE` fixtures, `Math.round(v1Output)` differences and the `||1.2`-vs-`||1.3` fallback case are the ONLY divergences — i.e. assert `main === Math.round(fixtureValue)` per case, with the desk/moderate/physical/sedentary/light/active/very_active cases exact-after-round and the unknown-activity fallback case asserted against main's 1.2 behavior with a `// DOCUMENTED DIVERGENCE from v1 (||1.3): spec duplicate-pair ruling keeps main's engine` comment.
- [ ] **Step 3:** Unit tests for the two new functions (target for each goal type incl. fallback; sumDayMeals with empty/missing cal fields). Run, full suite, commit `feat(phase3): calorie target + meal summing; golden divergence recorded`.

---

### Task 4: Adaptive-calorie layer

**Files:**
- Create: `src/protocols/body/nutrition/adaptive-calories.js`
- Test: `src/protocols/body/nutrition/__tests__/adaptive-calories.test.js` (new — archive shipped none)

**Interfaces:**
- Consumes: main's calorie-engine (Task 3), `getCycleInfo` (Task 2).
- Produces: `computeAdaptive(profile, weightLog, today, goal)` → `{baseTDEE, baseTarget, requiredWeeklyRate, actualRate, pace, adaptedTarget, adaptedDeficit, workoutMode, paceLabel, weeksRemaining, daysRemaining, lbsToGo, direction}` and `actualWeeklyRate(weightLog, days=14)`. Pace values: `no_goal|off_pace|behind|ahead|on_track|unrealistic`; workoutMode `recovery|normal|high|extreme`. Tasks 7, 11, 12(a), 13 consume.

- [ ] **Step 1:** Extract `git show v2-revival-archive:src/protocols/body/nutrition/adaptive-calories.js > ...`; adapt its `./math` imports to main's calorie-engine names. Everything else verbatim.
- [ ] **Step 2 (additive, documented):** integrate the cycle bump: when `profile.cycleData` is present and `getCycleInfo(profile.cycleData, today)` yields a phase, add `phase.calMod` to `adaptedTarget` (after floors) and expose `cycle` in the return object. Mark the block `// v2 addition beyond archive: v1 cycle calMod (parity ledger Food row)`.
- [ ] **Step 3:** Write the test suite: pace classification matrix (wrong-direction→off_pace; ratio 0.3/0.6/1.0/1.5; unrealistic when required>safe max), safety floors (male 1800/female 1500), each paceLabel string EXACTLY (`'Off Pace — Pushing Harder'`, `'Off Pace — Goal Aggressive'`, `'Slightly Behind — Tightening Up'`, `'Ahead — Recovery Mode'`, `'On Track'`, `'Maintenance'`), no-goal path, cycle bump (+150 luteal, +0 follicular), `actualWeeklyRate` regression slope with <5 entries → null. Pin time.
- [ ] **Step 4:** Run, full suite, commit `feat(phase3): adaptive-calorie layer (pace + cycle bump)`.

---

### Task 5: Streaks (module + badge + milestone)

**Files:**
- Create: `src/routine/streak.js`, `src/views/components/StreakBadge.jsx`, `src/views/components/StreakMilestone.jsx` (mkdir `src/views/components`)
- Test: `src/routine/__tests__/streak.test.js`, `src/views/components/__tests__/streak-ui.test.jsx` (both new)

**Interfaces:**
- Produces: `computeRoutineStreak(routineLogs, todayISO)` (reads the date-keyed `logs.routine` object; today-empty doesn't break streak); `StreakBadge({days, onTap, compact})` default; `StreakMilestone({tier, days, onClose})` default + `STREAK_TIERS`, `getLastShownMilestone()`, `setLastShownMilestone(days)`, `getPendingMilestone(currentStreak)` (localStorage `adonis_streak_milestone_shown`). Tasks 8, 12(c), 13 consume.

- [ ] **Step 1:** Extract all three verbatim via `git show` (verify byte-identical; the archive files are clean of forbidden coupling).
- [ ] **Step 2:** Tests: streak.js — 0 for empty, consecutive-day counting, gap breaks, today-empty tolerated, yesterday-empty breaks; StreakBadge renders tier label for 0/7/14/30/100; StreakMilestone: `getPendingMilestone` returns the right tier crossing and respects `setLastShownMilestone` (stub localStorage per repo pattern).
- [ ] **Step 3:** Run, full suite, commit `feat(phase3): routine streaks + milestone takeover`.

---

### Task 6: Time-block grouping

**Files:**
- Create: `src/routine/group-by-time.js`
- Test: `src/routine/__tests__/group-by-time.test.js` (rides from archive)

**Interfaces:**
- Produces: `TIME_BLOCKS` (Morning/Midday/Afternoon/Evening/Night), `blockForTask(task)` (`task.time` → `tod` → category → morning), `groupTasksByTimeBlock(tasks)` → `[{block, label, icon, items}]` with `items` mixing `{kind:'task'}` and `{kind:'group', category, summary, tasks}`; only `training` collapses, peptides never group. Task 12(b) consumes.

- [ ] **Step 1:** Extract module + test verbatim via `git show`; verify byte-identical; run the riding test.
- [ ] **Step 2:** Full suite, commit `feat(phase3): time-block task grouping`.

---

### Task 7: Routine intelligence + upsell shape fix

**Files:**
- Create: `src/routine/intelligence.js`
- Modify: `src/routine/upsell-engine.js` (`countSkippedTasks` reads the REAL date-keyed `logs.routine` shape)
- Test: `src/routine/__tests__/intelligence.test.js` (rides), `src/routine/__tests__/upsell-engine.test.js` (extend)

**Interfaces:**
- Consumes: Tasks 1 (checkin selectors), 4 (computeAdaptive).
- Produces: `buildYesterdayRecap(logs, today)`, `buildCheckinAlerts(logs)`, `buildWeightTrendAlert(logs, profile)`, `countConsecutiveTrainingWeeks(logs, today)`, `buildDeloadAlert(logs, today)`, `computeWorkoutIntensity(profile, logs, today)`, `getIntensityLabel(intensity)`, `INTENSITY_LABELS`. Task 12(b) consumes.

- [ ] **Step 1:** Extract intelligence.js + its test verbatim; adapt imports to main paths (checkin selectors from `src/protocols/_system/checkin/selectors.js`, adaptive from Task 4's module). Note: it reads `logs.exercise` entries only via `e.date`/`e.isPR` — compatible with the canonical shape.
- [ ] **Step 2 (bug fix, plan-sanctioned):** rewrite `countSkippedTasks(logs)` in `upsell-engine.js` to consume `logs.routine = {'YYYY-MM-DD': taskId[]}` — count scheduled-but-unchecked isn't derivable from completions alone, so preserve the archive's INTENT with the data we have: count days in the last 7 with zero completions (`Object.entries` filtered to the last-7 window where the array is empty or the date key is absent). Check `git show v2-revival-archive:src/routine/upsell-engine.js` first — if the archive already fixed it, take the archive's version instead. Extend the upsell test to pin the new behavior; update any existing assertion that encoded the dead array shape.
- [ ] **Step 3:** Run `npx vitest run src/routine`, full suite, commit `feat(phase3): routine intelligence (recap/alerts/trends/intensity); fix skipped-task counting shape`.

---

### Task 8: WeeklyRecap (with the two archive bug fixes)

**Files:**
- Create: `src/views/components/WeeklyRecap.jsx`
- Test: `src/views/components/__tests__/WeeklyRecap.test.jsx` (new)

**Interfaces:**
- Consumes: streak (Task 5), StreakBadge, calorie target (Tasks 3-4).
- Produces: default `WeeklyRecap({stats, onClose})`; named `isRecapDay(date)` (Sunday UTC), `buildWeekStats({logs, profile, today})` → `{tasksLogged, daysWithTasks, workoutCount, prCount, calsOnTarget, weightDelta, streakDays, weekRange}`. Task 12(b) consumes. Dismissal key `adonis_recap_dismissed_<date>` is applied by the CALLER (RoutineView), not here.

- [ ] **Step 1:** Extract verbatim, then apply TWO sanctioned bug fixes with `// archive bug fixed on port:` comments: (a) `profile.targetCal` does not exist — compute the day target via `computeAdaptive(profile, logs.weight, today, goal)?.adaptedTarget ?? calcCalorieTarget(profile, goal)`; (b) meals field is `m.cal` not `m.cals`.
- [ ] **Step 2:** Tests for `buildWeekStats` (the archive shipped none — and untested is HOW those two bugs survived): a seeded week of logs where the expected `calsOnTarget` is nonzero (proves fix a+b), prCount from `logs.exercise` isPR entries, weightDelta from first/last of week, `isRecapDay` Sunday/non-Sunday. Component smoke: renders stats + Continue calls onClose.
- [ ] **Step 3:** Run, full suite, commit `feat(phase3): weekly recap (archive calorie bugs fixed on port)`.

---

### Task 9: ExerciseDetail + PRCelebration

**Files:**
- Create: `src/views/components/ExerciseDetail.jsx`, `src/views/components/PRCelebration.jsx`
- Test: `src/views/components/__tests__/ExerciseDetail.test.jsx`, `__tests__/PRCelebration.test.jsx` (new)

**Interfaces:**
- Produces: `ExerciseDetail({exercise, children})` default — collapsible form-guide row, children slot for logging UI; `PRCelebration({exercise, weight, reps, onClose})` default — full-screen confetti takeover, sound/haptic on mount. Tasks 10, 12(b) consume.

- [ ] **Step 1:** Extract both via `git show`. Adaptation for ExerciseDetail ONLY: the archive imports `protocols/body/workout/exercise-db` — main renamed it `exercises.js`; repoint the import and verify the export names it uses (`EXERCISE_DB`, `getVideoUrl`) exist there under main's names (check `src/protocols/body/workout/exercises.js` exports; adapt names if main renamed them, keeping behavior). PRCelebration: verbatim (props-only, no data deps).
- [ ] **Step 2:** Tests: ExerciseDetail — collapsed summary renders sets×reps, expanding shows form tips for a known exercise, unknown exercise falls back to YouTube-search link; PRCelebration — renders exercise name + weight, Continue fires onClose, mount fires sound/haptics (spy on `design/sound`/`design/haptics` modules).
- [ ] **Step 3:** Run, full suite, commit `feat(phase3): exercise detail + PR celebration components`.

---

### Task 10: PR celebration + session log on main's WorkoutView (ADAPT, not port)

**Files:**
- Modify: `src/app/views/WorkoutView.jsx` (celebration trigger + session append), `src/app/views/workout/SetGrid.jsx` ONLY if the PR signal needs lifting (prefer reading the existing `setLog` path in WorkoutView)
- Test: `src/app/views/__tests__/WorkoutView.test.jsx` (extend)

**Interfaces:**
- Consumes: PRCelebration (Task 9); main's existing `setLog`/`wkPRs` PR detection (WorkoutView.jsx:31-42); store `log()`.
- Produces: when `setLog` detects a new PR (the existing `Number(entry.wt) > wkPRs[pk]` branch), (a) show `<PRCelebration exercise={exName} weight={entry.wt} reps={entry.r} onClose=.../>`, and (b) append `{date: todayISO, exercise: exName, sets: [entry], isPR: true}` to `logs.exercise` via `log('exercise', [...(logs.exercise||[]), entry])`. Non-PR completed sets do NOT append (recap counts workouts via isPR/prCount and `logs.exercise` stays celebration-grade — matches what intelligence/WeeklyRecap read).

- [ ] **Step 1:** Write failing test: render WorkoutView with a seeded program state, complete a set with weight above the seeded `wkPRs` value → PRCelebration appears (query "Personal Record"), `logs.exercise` gains one `isPR:true` entry; closing it returns to the grid. A second completion below PR → no celebration, no append.
- [ ] **Step 2:** Implement — minimal diff inside the existing `setLog`, one `useState` for the pending celebration. Main's architecture (SetGrid inline PR badge, keys, progression) unchanged.
- [ ] **Step 3:** Run `npx vitest run src/app/views`, full suite, commit `feat(phase3): PR celebration + session log on WorkoutView (main architecture kept)`.

---

### Task 11: FoodLogger (single-source foods)

**Files:**
- Create: `src/views/components/FoodLogger.jsx`
- Test: `src/views/components/__tests__/FoodLogger.test.js` (rides from archive; extend)

**Interfaces:**
- Consumes: main's `COMMON_FOODS` from `src/protocols/body/nutrition/food-db.js` (51 foods, shape `{n, cal, p, c, f}`), calorie-engine + `computeAdaptive`.
- Produces: default `FoodLogger({profile, protocolStates, logs, log})`; writes `log('food', {...logs.food, [todayKey]: meals})` with meal `{name, cal, p, c, f, time}`; named export `getYesterdayDelta(logs, profile, goal)`. Task 12(c) consumes.

- [ ] **Step 1:** Extract via `git show`. Sanctioned adaptations: (a) DELETE the embedded 14-item COMMON_FOODS; import main's and map field names at the use sites (archive items may use `{name, cal, ...}` vs main's `{n, cal, p, c, f}` — adapt the search/add code to main's shape, comment the mapping); (b) repoint math imports to main's calorie-engine / adaptive-calories.
- [ ] **Step 2:** Riding test adapts to the import changes; ADD: searching a food present only in main's 51 (absent from the archive's 14) returns a hit — proves single-sourcing; logging a food appends to today's meals with correct macro fields; adaptive target renders when profile has goal+date.
- [ ] **Step 3:** Run, full suite, commit `feat(phase3): food logger on single-source food-db`.

---

### Task 12: WeightLogger + GoalCompleteScreen (Phase 4 pull-forward, ledger-noted)

**Files:**
- Create: `src/views/components/WeightLogger.jsx`, `src/views/components/GoalCompleteScreen.jsx`
- Test: `src/views/components/__tests__/WeightLogger.test.js` (rides; extend for goal-cross)

**Interfaces:**
- Produces: default `WeightLogger({profile, logs, log})`; named `getTodaysWeight`, `getStartingWeight`, `computeWeeklyTrend`, `getLast14Days`, `isMovingTowardGoal`; writes `log('weight', [...])` dedup-by-date and `log('bodyMeasurements', [...])`; fires GoalCompleteScreen crossing `profile.goalW`. Task 13 consumes.

- [ ] **Step 1:** Extract WeightLogger + `git show v2-revival-archive:src/views/components/GoalCompleteScreen.jsx` (or wherever `grep GoalCompleteScreen` in `git ls-tree -r v2-revival-archive --name-only` finds it) verbatim. If GoalCompleteScreen exceeds a self-contained celebration screen (heavy deps beyond design system), STOP: replace the fire-site with a `useToast` success + `// GoalCompleteScreen deferred to Phase 4` and report the substitution.
- [ ] **Step 2:** Riding tests + add: logging a weight at/past `goalW` (losing direction) mounts the goal-complete UI (or toast if substituted); same-date re-log replaces rather than duplicates.
- [ ] **Step 3:** Ledger note (this task edits `docs/v1-feature-parity-ledger.md`): under Train/Purpose area add dated line "GoalCompleteScreen pulled forward from Phase 4 (WeightLogger dependency) — 2026-07-11".
- [ ] **Step 4:** Run, full suite, commit `feat(phase3): weight logger + goal-complete celebration`.

---

### Task 13: HomeDashboard + CheckinModal + home tab

**Files:**
- Create: `src/routine/HomeDashboard.jsx`, `src/protocols/_system/checkin/CheckinModal.jsx`
- Modify: `src/app/TabNav.jsx` (prepend `{id:'home', icon:'🏠', label:'Home'}` to FIXED_TABS), `src/app/App.jsx` (default tab `'home'`, home branch, `handleSaveCheckin`, CheckinModal mount)
- Test: `src/routine/__tests__/HomeDashboard.test.jsx`, `src/protocols/_system/checkin/__tests__/CheckinModal.test.jsx` (new), `src/app/__tests__/App.test.jsx` + `TabNav.test.jsx` + `e2e-bypass.test.jsx` (extend/update for the new default tab)

**Interfaces:**
- Consumes: Tasks 1, 2, 4, 5 modules; design system; `buildDailyRoutine` output already computed in App.
- Produces: `HomeDashboard({profile, logs, today, routine, completedTasks, adaptive, day, onCheckinTap})` default; `CheckinModal({onSave, onClose})` default (all 8 fields required, Save→`onSave(ratings)`, auto-close). App: `handleSaveCheckin(ratings)` → `log('checkins', {...logs.checkins, [todayKey]: ratings})`; check-in card tap opens the modal; **v2 addition:** when `profile.cycleData` exists render the cycle-phase banner on Home from `getCycleInfo` (v1 parity ledger Home row; the archive Home lacks it — small labeled block using phase name + waterRetention note).
- [ ] **Step 1:** Extract both components verbatim; adapt imports (CHECKIN_FIELDS ← `src/state/checkin.js`; math ← main's calorie-engine; `calcCalorieTarget`/`sumDayMeals` ← Task 3; streak ← Task 5; adaptive prop passed in). Add the cycle banner (documented v2 addition).
- [ ] **Step 2:** App wiring: compute `adaptive = computeAdaptive(profile, logs.weight, todayISO, primaryGoal)` memoized alongside the existing routine build; home branch renders HomeDashboard; default `activeTab` 'home' (update funnel/e2e tests asserting the routine-landing where needed — sanctioned); modal state + save handler; TabNav prepend.
- [ ] **Step 3:** Tests: CheckinModal — Save disabled until all 8 rated, onSave receives exact ratings map; HomeDashboard — protocol-score ring renders, stat tiles show calories-left from adaptive target minus `sumDayMeals(logs.food[today])`, check-in dots reflect seeded `logs.checkins`, mood strip colors from mood field, checkin tap fires `onCheckinTap`, cycle banner renders iff cycleData; App — home is default tab, saving a check-in writes `logs.checkins[today]`.
- [ ] **Step 4:** Update `scripts/screenshot-baseline.sh` ROUTES: add `"/?e2e=1&tab=home|home"` and keep existing.
- [ ] **Step 5:** Run `npx vitest run src/app src/routine src/protocols/_system`, full suite, commit `feat(phase3): home dashboard + daily check-in (home tab default)`.

---

### Task 14: RoutineView upgrade (time-block calendar + intelligence surfaces)

**Files:**
- Create: `src/views/components/TaskContextMenu.jsx` (dep of archive RoutineView; Phase 4 pull-forward, ledger-noted like Task 12)
- Modify: `src/routine/RoutineView.jsx` (REPLACE with archive version, adapted), `src/app/App.jsx` (pass new props `{logs, profile, today}`)
- Test: `src/routine/__tests__/RoutineView.test.jsx` (replace with archive's + keep any main-only assertions that still apply)

**Interfaces:**
- Consumes: Tasks 4-9 modules (group-by-time, intelligence, streak/StreakBadge, WeeklyRecap, ExerciseDetail, adaptive).
- Produces: `RoutineView({routine, onCheckTask, onTaskTap, completedTasks, day, goals, onDayChange, logs, profile, today})` rendering: adaptive pace banner, yesterday recap, alert stack, goal cards, time-block calendar via `groupTasksByTimeBlock(routine.scheduled)` with `TaskRow`/`CollapsibleGroup` (training collapses, peptides don't), long-press context menu, Sunday WeeklyRecap gated by `adonis_recap_dismissed_<date>`, deferred/upsell/retention sections. App's existing `handleCheckTask` contract unchanged.

- [ ] **Step 1:** Extract archive RoutineView + TaskContextMenu + archive's RoutineView.test.jsx; adapt imports to the modules landed in Tasks 4-9 (paths differ from archive where rulings moved things — checkin selectors, calorie-engine). Diff the replaced main RoutineView for any main-only feature the archive lacks (compare rendered sections; main's was a subset per recon — if anything main-only surfaces, keep it and note).
- [ ] **Step 2:** App.jsx passes the new props (logs/profile/today already in scope).
- [ ] **Step 3:** Tests: riding archive test adapted + assert: tasks render grouped under block headers (seed tasks with `time`/categories spanning blocks), training tasks collapse into a group row while a peptide task stays top-level, pace banner text appears when adaptive.pace='off_pace', recap card renders on a Sunday `today` and dismissal hides it.
- [ ] **Step 4:** Ledger dated note: "TaskContextMenu pulled forward from Phase 4 (RoutineView dependency) — 2026-07-11".
- [ ] **Step 5:** Run `npx vitest run src/routine src/app`, full suite, commit `feat(phase3): routine time-block calendar + intelligence surfaces`.

---

### Task 15: Body tab sub-navigation (slim BodyView)

**Files:**
- Create: `src/app/views/BodyView.jsx`
- Modify: `src/app/App.jsx` (body tab renders BodyView instead of bare WorkoutView)
- Test: `src/app/views/__tests__/BodyView.test.jsx` (new)

**Interfaces:**
- Produces: `BodyView({...pass-through})` with a sub-tab strip — **Train** (existing WorkoutView), **Food** (FoodLogger), **Weight** (WeightLogger) — Train default. Slim seam only: Phase 4's full BodyView port (Peptides sub-tab, PhotoJournal) replaces the strip's contents, not its seam. Check `git show v2-revival-archive:src/views/BodyView.jsx` for its sub-tab pattern and mirror the markup/styling (s.tag pills or its actual pattern) WITHOUT porting its Peptides/Tools content.

- [ ] **Step 1:** Failing test: body tab shows the three sub-tabs; default renders WorkoutView content; switching to Food renders FoodLogger; Weight renders WeightLogger.
- [ ] **Step 2:** Implement + wire in App.jsx body branch (pass profile/protocolStates/logs/log as each logger needs).
- [ ] **Step 3:** Run, full suite, commit `feat(phase3): body sub-tabs (train/food/weight)`.

---

### Task 16: Phase close — the gates

- [ ] **Step 1:** `npm test` green; `npm run build:app` + `npm run build` clean.
- [ ] **Step 2:** Archive diff gate: `git diff v2-revival-archive HEAD -- src/routine src/views/components src/protocols/_system/checkin src/protocols/body/nutrition` — every hunk maps to this plan's documented adaptations (import repoints, the two WeeklyRecap bug fixes, single-source foods, cycle additions, upsell shape fix) or is flagged.
- [ ] **Step 3:** Golden gate: `npx vitest run tests/golden` all green (cycle parity + macros exact + documented divergences).
- [ ] **Step 4:** Screenshot baseline `phase-3` (dev server 4321; routes now include home) — eyeball all shots against phase-2 set; design contract per new screen.
- [ ] **Step 5:** Parity ledger: check off Phase 3 rows (Home/Check-in section: sliders/stat cards/weight+sparkline/mood strip/notes?*/cycle banner/alerts/quick actions — *daily notes: if not ported, change ruling with dated note; Routine section both rows; Food section all four; Train PR-celebration row; Tools remains Phase 4) with dated notes where rulings shifted.
- [ ] **Step 6:** Commit `docs(phase3): phase-close gates`, then merge to main + push per standing authorization.
- [ ] **Step 7:** Flag to Jorrel: real-device visual pass still pending (Phase 5 formally); Insights "366 days" bug — verify the ported intelligence/empty states killed it, else fix here (it came from v1 InsightV; check what renders the string on fresh profiles and correct the guard) — **actually resolve this before closing: grep the string, fix the guard, test fresh-profile renders a sane empty state.**

---

## Self-review notes

- Spec Phase 3 sentence coverage: HomeDashboard (T13), CheckinModal on main's model (T1+T13), routine intelligence (T7), time-block calendar (T6+T14), streaks+milestones (T5), WorkoutLogger/PR celebration (T9+T10 — adapted onto main per ruling), FoodLogger (T11), WeightLogger (T12), adaptive layer (T2-T4). Duplicate-pair rulings each named in their task. Golden gates T2/T3. "366 days" bug resolved at T16.
- Phase 4 pull-forwards (ledger-noted): GoalCompleteScreen (T12), TaskContextMenu (T14). Deliberate; both are small celebration/menu components whose owners land now.
- Type consistency: `computeAdaptive` consumed by T7/T11/T12/T13 under one signature; canonical `logs.exercise` shape defined once in Global Constraints and referenced by T8/T10; CHECKIN_FIELDS single source enforced in T1/T13.
