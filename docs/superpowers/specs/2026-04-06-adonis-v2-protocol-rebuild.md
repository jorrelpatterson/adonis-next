# Adonis v2 — Full Protocol Rebuild Spec

**Date:** 2026-04-06
**Status:** Final
**Context:** Complete audit of app.html completed. Engine architecture (Plans 1-2) built and working. This spec defines how to rebuild every protocol implementation to match or exceed the original app's functionality.

**What stays:** Engine (goal engine, routine pipeline, assembler, prioritizer, scheduler, upsell engine, retention protocol), state store, design system, protocol interface + registry, all extracted data files (programs.js, catalog.js, meals.js, supplements.js, credit data, income data, citizenship data, skincare data).

**What gets rebuilt:** Every protocol's index.js (the implementation), every protocol's View component (the interactive UI), onboarding flow, and the state model expansion.

**What's preserved verbatim:** All workout programs, exercise guides, peptide catalog, meal plans, CC database, dispute letters, citizenship countries, skincare rotations, grooming items, mind techniques, core values — every content/strategy decision from the original.

---

## 1. State Model Expansion

The current state model (src/state/defaults.js) needs to hold all state variables identified in the audit.

```js
{
  // Profile (expand from current)
  profile: {
    name, age, gender, weight, goalW, hFt, hIn,
    activity, trainPref, equipment,
    targetDate,           // NEW: when user wants to reach goalW
    domains: ['body'],
    tier: 'free',
    cycleData: null,      // NEW: { cycleLen, lastPeriod } for female users
  },

  // Goals (already exists, no changes)
  goals: [],

  // Protocol State (expand significantly)
  protocolState: {
    // Workout
    workout: {
      wkWeek: 1,            // current week 1-16
      wkViewDay: null,       // day being viewed in Train tab
      wkLogs: {},            // key: "goal|week|dayIdx|exName|setIdx" -> {wt, r, c}
      wkPRs: {},             // key: "goal|exName" -> highest weight number
    },
    // Peptides
    peptides: {
      activeCycles: [],      // active peptide cycles
      supplyInv: [],         // supply inventory
      injectionLog: [],      // injection history
      pepCart: [],            // shopping cart
      orderHistory: [],      // past orders
      shippingInfo: {},      // saved shipping address
    },
    // Credit
    credit: {
      creditScores: [],      // {score, bureau, date}
      disputes: [],          // dispute records
      disputeQueue: [],      // queued disputes
      repairAuto: true,      // auto-repair mode
      creditFactors: { payment: 90, utilization: 25, ageYears: 3, accounts: 5, inquiries: 2 },
      ccWallet: [],          // owned cards {cardId, openDate, creditLimit, spent, countsFor524}
    },
    // Income
    income: {
      incomeTarget: 2000,
      incomePartnerType: 'referrer',
      incomeVerticals: ['solar', 'roofing', 'telecom'],
      incomeLeads: [],       // lead pipeline
      incomeEarnings: [],    // earning records
      incomeSetupDone: false,
    },
    // Citizenship
    citizenship: {
      czApps: [],            // active applications
      czPassports: [{ country: 'us', visaFree: 186 }],
      czSetupDone: false,
      czAnswers: {},         // quiz responses
      czResults: null,       // scored results
    },
    // Image
    image: {
      skinType: null,
      skinConcerns: [],
      groomingLog: {},       // {itemId: lastDoneDate}
      fragranceCollection: [],
      wardrobeItems: {},
      styleArchetype: null,
    },
    // Mind
    mind: {
      mindSessions: [],
      mindStreak: 0,
      mindStack: [],         // active nootropic compound ids
      gratitudeEntries: [],
    },
    // Purpose
    purpose: {
      bucketList: [],
      coreValues: [],        // selected values (3-5)
      lifeScores: {},        // area -> score 1-10
      yearlyGoals: [],
    },
    // Environment
    environment: {
      envScores: { sleep: 0, workspace: 0, air: 0, light: 0, digital: 0, cleanliness: 0 },
      envChecklist: {},      // "areaId:item" -> dateKey (resets daily)
    },
    // Community
    community: {
      socialProfile: { optedIn: false, displayName: '', shareGoals: true, shareStreak: true },
      partners: [],
    },
  },

  // Logs (expand)
  logs: {
    checkins: {},       // "YYYY-MM-DD" -> {mood, energy, sleep, stress, soreness, focus}
    weight: [],         // [{date, weight}]
    food: {},           // "YYYY-MM-DD" -> [{name, cal, p, c, f}]
    exercise: [],       // [{date, exercise, sets: [{weight, reps}]}]
    routine: {},        // "YYYY-MM-DD" -> [completedTaskIds]
    bodyMeasurements: [], // [{date, waist, chest, arms, thighs, bodyFat}]
  },

  // Revenue, automations, settings (no changes from current)
  revenue: { ... },
  automations: { ... },
  settings: {
    workSchedule: { enabled: false, mode: 'employee', schedule: {} },
    notifications: true,
    routineCapacity: 'normal',
  },
}
```

### Migration

Update `src/state/defaults.js` with the expanded defaults. Update `src/state/store.jsx` reducer to handle new action types for each protocol's state. Update `src/state/migration.js` to map `adonis_v1` keys to new locations (wkLogs, wkPRs, activeCycles, ccWallet, disputes, etc.).

---

## 2. Data Extractions Needed

These data structures exist in app.html but haven't been extracted yet:

| Data | Source Lines | Target File | Status |
|------|-------------|-------------|--------|
| EXERCISE_DB (78 exercises) | 956-1033 | src/protocols/body/workout/exercises.js | NOT EXTRACTED |
| EXERCISE_ALTS (27 swaps) | 1034-1062 | src/protocols/body/workout/exercises.js | NOT EXTRACTED |
| getVideoUrl function | 1063 | src/protocols/body/workout/exercises.js | NOT EXTRACTED |
| INJECTION_SITES (12 sites) | 295-307 | src/protocols/body/peptides/injection.js | NOT EXTRACTED |
| PEP_COMPAT (~75 pairs) | 184-280 | src/protocols/body/peptides/compatibility.js | NOT EXTRACTED |
| PEP_RESEARCH (~45 entries) | 381-449 | src/protocols/body/peptides/research.js | NOT EXTRACTED |
| RISK_GAUGE (~45 entries) | 310-371 | src/protocols/body/peptides/research.js | NOT EXTRACTED |
| SYRINGE_TYPES + SYRINGES | 458-532 | src/protocols/body/peptides/injection.js | NOT EXTRACTED |
| COMMON_FOODS (51 items) | 1064-1114 | src/protocols/body/nutrition/food-db.js | NOT EXTRACTED |
| CC_DB (13 cards) | ~1203 | src/protocols/money/credit/cards-db.js | NOT EXTRACTED |
| SKIN_CONCERNS (6) | 1150 | src/protocols/image/skincare/data.js | PARTIAL |
| FRAGRANCE_OCCASIONS (5) | 1166 | src/protocols/image/skincare/data.js | NOT EXTRACTED |
| WARDROBE_CATS (6) | 1173 | src/protocols/image/wardrobe/data.js | NOT EXTRACTED |
| STYLE_ARCHETYPES (5) | 1181 | src/protocols/image/wardrobe/data.js | NOT EXTRACTED |
| MIND_TECHNIQUES (10) | 1882 | src/protocols/mind/data.js | NOT EXTRACTED |
| BREATHING_PATTERNS (5) | ~1882 | src/protocols/mind/data.js | NOT EXTRACTED |
| NOOTROPICS (8) | 1895 | src/protocols/mind/data.js | NOT EXTRACTED |
| BUCKET_CATEGORIES (8) | 1905 | src/protocols/purpose/data.js | NOT EXTRACTED |
| CORE_VALUES (20) | 1915 | src/protocols/purpose/data.js | NOT EXTRACTED |
| LIFE_AREAS (7) | ~1920 | src/protocols/purpose/data.js | NOT EXTRACTED |
| ENV_AREAS (6x6 checklist) | inline | src/protocols/environment/data.js | NOT EXTRACTED |
| CHECKIN_FIELDS | 194 | src/state/checkin.js | NOT EXTRACTED |
| GOAL_MAP | 173 | src/goals/goal-map.js | NOT EXTRACTED |
| PROMO_CODES | 676 | src/state/access-codes.js | NOT EXTRACTED |
| STRIPE_LINKS | 672 | src/services/stripe.js | NOT EXTRACTED |

---

## 3. Protocol Rebuild — Body/Workout

### index.js (Protocol Implementation)

**getState(profile, logs, goal):**
- Read profile.primary to determine goal/program
- Read protocolState.workout for wkWeek, wkLogs, wkPRs
- Calculate session completion for current day (done/total sets)
- Detect deload need (consecutive weeks threshold)
- Return: { goal, program, wkWeek, wkLogs, wkPRs, dayCompletion, needsDeload }

**getTasks(state, profile, day):**
- Look up WORKOUTS[goal][dayIdx]
- If rest day, return empty
- Generate main workout header task with session completion status
- Generate warmup task if workout.warmup exists
- Generate individual exercise tasks with:
  - smartNote: progression suggestion based on previous week's logged data
  - PR indicator if current weight is a PR
  - Exercise data embedded (for the View to render set grid)
- Generate cooldown task
- Generate HIIT finisher task if intensity is high/extreme
- Generate post-workout shake nutrition task
- All tasks: category='training', type='guided', priority=2, skippable=false

**getRecommendations:** Suggest equipment (gym affiliate) if equipment=bodyweight/home.

**getUpsells:** None (workout is a gateway, not a monetization point).

### WorkoutView.jsx (Train Tab UI)

**Day selector strip:** S M T W T F S with completion dots (green = all sets done, yellow = partial, empty = not started). Tapping changes wkViewDay.

**Week selector:** "Week X" with left/right arrows, 1-16 range. Shows phase label (Foundation 1-4, Hypertrophy 5-8, Strength 9-12, Deload/Peak 13-16).

**Workout header:** Day title, duration, intensity badge if applicable.

**Exercise cards (expandable):**
- Exercise name + sets x reps target
- **Set logging grid:** Columns: Set#, Weight input (pre-filled from last week as ghost text), Reps input, Complete checkbox. Rows: one per set count.
- When weight entered exceeds wkPRs[goal|exName], show PR badge.
- **Progression suggestion** above inputs: if all sets from prev week completed at target reps, show "Last: Xlbs -> Today: X+5lbs (+5)" for compounds, "+2.5" for isolation. If not all completed: "Hit all reps at Xlbs to unlock +5."
- **Rest timer button:** "Start Xs Rest" → floating countdown bar at bottom with exercise name, seconds remaining, skip button. Vibrates on completion.
- **How-To section (expandable):**
  - Muscles targeted
  - Form instructions (from EXERCISE_DB)
  - Pro tips
  - Difficulty badge (beginner/intermediate/advanced)
  - "Watch Form Video" button → opens YouTube search URL
- **Exercise swap button:** Shows EXERCISE_ALTS alternatives. Tapping an alternative swaps the exercise for this session (stored in protocolState, not permanent).

**Deload alert:** When needsDeload=true, show banner: "Cut volume 40-50% this week. Reduce all sets by half or drop weight 40%."

---

## 4. Protocol Rebuild — Body/Peptides

### index.js (Protocol Implementation)

**getState(profile, logs, goal):**
- Read protocolState.peptides for activeCycles, supplyInv, injectionLog
- Filter PEPTIDES by user's goals using GOAL_MAP for recommendations
- Build suggestedPeps (recommended minus already active)
- Calculate supplyDaysLeft for each active cycle
- Return: { activeCycles, supplyInv, suggestedPeps, supplyAlerts }

**getTasks(state, profile, day):**
- For each active peptide cycle where pepShowsToday(freq, dayIdx):
  - Calculate dose info via pepDoseInfo (concentration, volume, syringe units)
  - Generate dose task with full injection instructions:
    - Title: peptide name
    - Subtitle: "dose · freq · Draw Xu (30u/100u syringe)" for reconstituted
    - Or: "dose · route · notes" for premixed
  - Category: 'peptide', priority: 1, skippable: false
- For suggested peptides (not yet active):
  - Same dose calculation but category: 'peptide_rec'
  - Lower priority, skippable: true

**getRecommendations(state, profile, goal):**
- Based on goal template, recommend peptides from catalog
- Build 3 tiers using buildStacks logic (Essentials 80%, Optimized 72%, Full Protocol 65%)
- Each rec has price, margin, CTA
- Check-in driven: if yesterday's sleep <=2 suggest DSIP, energy <=2.5 suggest CJC/Ipa, focus <=2.5 suggest Selank

**getUpsells:** Supply running low (<=5 days) → reorder alert with product + price.

### PeptideView.jsx (Stack Tab UI)

**Sub-tabs:** Protocol, Shop, Library, Tools

**Protocol tab:**
- Active cycles with injection schedule display
- Cycle progress (days in / total days)
- Next dose indicator
- Add/remove cycle buttons

**Shop tab:**
- All PEPTIDES filterable by category
- Each shows: name, size, price, description, goals
- Add to cart → cart summary → checkout flow (shipping info → Stripe)
- Category filter pills

**Library tab:**
- PEP_RESEARCH entries: mechanism of action, study citations, safety profile
- RISK_GAUGE level for each peptide (Established/Researched/Emerging/Experimental)
- Expandable cards

**Tools tab:**
- **Dose calculator:** Select peptide from PEP_DB or enter custom (mg, bac water mL, desired dose mcg). Shows concentration, required volume, syringe units, recommended syringe. Warns on >1mL overflow.
- **Supply inventory:** Track vials with remaining amounts
- **Injection log:** Log each injection (peptide, site, date, dose). Site rotation recommendations from INJECTION_SITES.
- **Compatibility checker:** Select two peptides, shows synergy/caution/avoid from PEP_COMPAT.

---

## 5. Protocol Rebuild — Body/Nutrition

### index.js (Protocol Implementation)

**getState(profile, logs, goal):**
- Calculate BMR → TDEE → base macros using profile data
- Run adaptive calorie system:
  - Compare progress pace (weight change % vs time elapsed %)
  - Adjust calories based on pace (ahead/on_track/behind/critical)
  - Clamp to safe ranges (min 1200F/1500M, max adjustments)
  - Set workout intensity modifier
- Calculate 7-day rolling averages from food logs
- Calculate compliance (1 - |calDiff|/tCal * 100)
- Yesterday adjustment: if overshoot, reduce today by 50% of excess
- Return: { tCal, macros, adaptive, compliance, nutPlan, intensity }

**getTasks(state, profile, day):**
- Morning supplements task (goal-specific stack)
- Hydration protocol task (oz target based on body weight * 0.6)
- Scaled meal plan tasks: template meals multiplied by tCal/templateTotal
  - Each meal: time, name, food description, calories, running total, macros
  - Flagged "prep ahead" if during work hours
- Sunday: Weekly Meal Prep task with batch cook list (proteins + carbs from week's meals)
- Post-workout shake task (after training block)
- Evening supplements task (goal-specific stack)
- Hydration check at 2PM (60%+ of daily target)

**getRecommendations:** Suggest protein powder, creatine, supplements as affiliate products.

### NutritionView.jsx (Food Tab UI)

- **Daily plan:** Scaled meals with running calorie/macro totals. Remaining macros display.
- **Quick food log:** Search COMMON_FOODS (51 items), tap to log. Custom food entry (name, cal, p, c, f).
- **Quick weight log:** Inline weight input + Log button (from routine or check-in).
- **7-day history:** Calorie/macro chart, compliance percentage.
- **Nutrition alerts:** Overeating warning, protein insufficiency, adaptive adjustments explained.
- **Body measurements form:** Waist, chest, arms, thighs, body fat.

---

## 6. Protocol Rebuild — Money/Credit

### index.js

**getState:** Read creditScores, disputes, ccWallet, creditFactors from protocolState.credit. Compute walletData (enriched cards, 5/24 count, spend optimizer, bonus progress, next recommended card). Run getScoreAnalysis.

**getTasks:**
- Pending disputes → "Mail Dispute Letter" tasks with creditor name and bureau
- Sent disputes near 30-day deadline → follow-up tasks with urgency
- Overdue disputes → escalation tasks
- Monday: credit score check task
- Active card bonuses behind schedule → "Increase daily spend" task
- 5/24 slot opening soon → "Apply for [next recommended card]" task

**getRecommendations:** Credit monitoring service (affiliate). Next recommended card (affiliate via referral URL with payout).

### CreditView.jsx (Cards/Score/Disputes Tabs)

**Cards sub-tab:**
- 5/24 status bar (X/5 slots used)
- Wallet card list (expandable: bonus progress bar, AF countdown, credit limit)
- Spend optimizer: 12 categories, shows best card for each
- "+" button to add from CC_DB (searchable)
- Next recommended card with reasoning

**Score sub-tab:**
- Large score display with range badge (Excellent/Good/Fair/Poor) and delta
- Score logging form (bureau select + score input)
- Score trend bar chart (last 12 entries)
- Credit factor display (payment 35%, utilization 30%, age 15%, mix 10%, inquiries 10%)
- Contextual tips from getScoreAnalysis

**Disputes sub-tab:**
- Active/resolved dispute list with status badges
- New dispute form: type, creditor, bureau (or "all" for 3x), amount, reason, account number
- When bureau="all", creates 3 separate dispute records
- Impact level shown per dispute type
- Letter generation: 7 template types, full preview, copy to clipboard
- Auto-repair toggle

---

## 7. Protocol Rebuild — Money/Income

### index.js

**getState:** Read incomeTarget, partnerType, verticals, leads, earnings from protocolState.income. Run buildIncomePlan to calculate required refs/deals/leads.

**getTasks:** Call getIncomeActions(dayIdx, partnerType, weeklyRefs, weeklyConvos) — generates day-specific tasks (MWF for referrers, M-F for sales pros).

### IncomeView.jsx

- **Setup wizard** (pre-incomeSetupDone): Target selector, partner type picker, vertical selection, "Activate" button
- **Dashboard:** Target vs actual, pipeline summary by stage, earning history, vertical breakdown
- **Pipeline:** Kanban-style lead tracker, advance leads through 10 stages, auto-create earning on "paying"
- **Add Lead form:** Name, phone, vertical, notes, est. payout
- **Programs:** INCOME_REWARDS level structure + REFERRAL_VERTICALS with qualifying questions and tips

---

## 8. Protocol Rebuild — Travel/Citizenship

### index.js

**getState:** Read czApps, czPassports, czAnswers, czResults from protocolState.citizenship.

**getTasks:**
- Active applications in 'gathering_docs': daily document task
- Applications with 30+ day items: follow-up tasks
- Monday: "Review citizenship timeline" task
- Document expiration alerts

**getRecommendations:** Immigration attorney service referral ($200 commission).

### CitizenshipView.jsx

- **Pre-setup:** "Find Your Best Path" intro → 6-step quiz wizard
- **Quiz:** Ancestry, budget, timeline, relocation, purpose, languages — each step with options
- **Results:** Ranked countries by compatibility score with reasons array
- **Dashboard:** Passport Power (total visa-free), passport portfolio with flags, active applications with 10-status pipeline, document checklists per application
- **Browse:** All 11 countries with full profiles (eligibility, timeline, cost, docs, tips, benefits)

---

## 9. Protocol Rebuild — Image/Skincare

### index.js

**getState:** Read skinType, skinConcerns, groomingLog from protocolState.image.

**getTasks:**
- AM skincare: SKIN_AM_BASE steps + day-specific active from SKIN_AM[dayIdx]
- PM skincare: SKIN_PM_BASE steps + day-specific active from SKIN_PM[dayIdx]
- Overdue grooming: check each GROOMING_ITEMS against groomingLog, generate task if days >= freqDays
- Workday: posture check at midday

**getRecommendations:** SPF, retinol, cleanser as affiliate products. Concern-specific product recommendations from SKIN_CONCERNS.

### ImageView.jsx

- **Setup** (no skinType): Skin type selector, concerns multi-select, style archetype picker
- **Dashboard:** Today's AM/PM rotation, concern-based product recs, grooming schedule, style summary, wardrobe progress
- **Skin sub-tab:** Skin profile, concern details with recommended + avoid products
- **Groom sub-tab:** 6 items as cards, last-done date, frequency, tip, "Mark Done" button
- **Wardrobe sub-tab:** 6 categories with 33 essential items, owned tracking, archetype palette
- **Fragrance sub-tab:** Collection manager, 5 occasion guide with spray counts

---

## 10. Protocol Rebuild — Mind

### index.js

**getState:** Read mindSessions, mindStreak, mindStack, gratitudeEntries from protocolState.mind.

**getTasks:**
- Daily: Gratitude task (3 things)
- Even days: Breathwork task (box breathing)
- Odd days: Meditation task (10 min)

### MindView.jsx

- **Dashboard:** Streak display, technique quick-start grid (10 techniques across 4 categories), session stats
- **Meditate:** SVG circular progress ring timer, presets (5/10/15/20/30 min), auto-logs completion, vibration
- **Breathwork:** 5 pattern selector (Box, 4-7-8, Wim Hof, Calm, Energizing), animated phase timer with rounds
- **Gratitude:** 3 input fields per day, save auto-logs session, recent history
- **Log:** Manual session form (technique, duration, notes, mood before/after 1-5)
- **History:** Reverse-chronological session list
- **Stack:** 8 nootropic compounds (toggle active, shows dose/timing/effect), Pro-gated

---

## 11. Protocol Rebuild — Purpose

### index.js

**getTasks:**
- Daily: Morning Intention
- Sunday: Weekly Life Audit

### PurposeView.jsx

- **Dashboard:** Bucket list progress, life wheel score, yearly goals average, core values display
- **Bucket List:** Items by 8 categories, done toggle, category counts
- **Add:** Form with title, category, priority, notes, target date
- **Values:** 20 core values tag grid, select 3-5
- **Wheel:** 7 life areas with 1-10 sliders, score visualization, focus areas (bottom 3)
- **Vision:** Yearly goals with progress 0-100%, year elapsed bar, reflections

---

## 12. Protocol Rebuild — Environment

### index.js

**getTasks:**
- Morning: Make Bed
- Workdays: Workspace Prep
- Evening: 10-Min Reset
- Sunday: Weekly Deep Clean

### EnvironmentView.jsx

- Conic gradient progress ring (overall % optimized)
- 6 collapsible area cards (Sleep, Workspace, Air, Light, Digital, Cleanliness)
- 6 checkbox items per area (36 total), resets daily
- Tips text per area

---

## 13. Protocol Rebuild — Community

### index.js

**getTasks:**
- Sunday: Weekly Check-In (if has partners)
- Wednesday: Midweek Pulse (if has partners)

### CommunityView.jsx

- **Dashboard:** Your profile card, partner activity display
- **Find:** Matching profile, "Find Matches" button queries Supabase, compatibility-ranked results (calcCompat: +20/shared goal, +10/shared domain, +15 if credit scores close)
- **Partners:** Partner detail cards

---

## 14. Onboarding Flow

React component: `src/app/Onboarding.jsx`

6 steps, matching the original:

**Step 0 — Profile:** Name, Age (select 18-85), Gender. Continue requires name.

**Step 1 — Domains:** All 8 domain cards. Body always included. Free tier max 2, Pro/Elite all. Visual lock icon on gated domains.

**Step 2 — Body Config** (if body selected): Height (ft + in), Current Weight (select 100-380), Goal Weight, Daily Activity (desk/moderate/physical), Target Date with calculated weekly rate. Female: cycle tracking opt-in (cycle length, last period).

**Step 3 — Peptide Finder** (if body selected): 5-question wizard → recommended peptides → add to cart or skip.

**Step 4 — Money Config** (if money selected): Credit score entry (bureau + score).

**Step 5 — Schedule:** 7-day work week grid (toggle + start/end time per day), mode (employee/entrepreneur), training preference (morning/evening).

**"Calculating" Animation:** After step 5, show animated loading screen (the "calculating your protocol" experience). 3-5 seconds of animation that feels like the system is processing, then transition to the main app.

---

## 15. Landing Page

`public/index.html` — **UNCHANGED.** Stays as separate static HTML with parallax, animations, and CTA. Links to the Vite app for signup/login. This is the sales funnel, not part of the app.

---

## 16. Routine Builder Enhancements

The routine pipeline (assembler → prioritizer → scheduler) stays as-is. But each protocol's getTasks now generates MUCH richer tasks:

- Workout tasks include exercise data (for rendering set grids)
- Peptide tasks include dose calculations (syringe units, volume)
- Nutrition tasks include running calorie totals and adaptive adjustments
- Credit tasks include dispute urgency and deadline tracking
- All tasks have proper subtitles with contextual information

The routine view (RoutineView.jsx) needs to render these richer tasks appropriately — not just title/subtitle text, but interactive elements where the protocol requires them.

### Intelligence Features (from buildRoutine audit)

These feed into the routine as special tasks/alerts:

- **Yesterday Recap:** exercise count, calories tracked, mood, recent PR, weight delta
- **Check-in alerts:** Low sleep (<=2): lighter training suggestion. High stress (>=4): skip HIIT. Peak day (energy>=5 + sleep>=4): push hard. Recovery check (soreness<=2): foam roll + drop weight.
- **Weight trend alerts:** Gaining when losing, losing too fast, gaining too fast, almost at goal, GOAL REACHED
- **Deload recommendation** after consecutive training weeks
- **Adaptive intensity** labels on workout tasks (recovery/normal/high/extreme)

---

## 17. Implementation Order

This spec should be implemented in this order:

1. **State model expansion** — update defaults.js, store.jsx reducer, migration.js
2. **Data extractions** — all NOT EXTRACTED items from Section 2
3. **Onboarding** — the entry point, sets up profile + activates domains
4. **Body/Workout** — most complex protocol, highest user value
5. **Body/Peptides** — second most complex, primary revenue driver
6. **Body/Nutrition** — adaptive calorie system, meal plans
7. **Money/Credit** — CC wallet, disputes, letters
8. **Money/Income** — pipeline, partner models
9. **Travel/Citizenship** — quiz, scoring, doc tracking
10. **Image** — skincare, grooming, wardrobe, fragrance
11. **Mind** — timers, gratitude, nootropics
12. **Purpose** — bucket list, wheel, goals
13. **Environment** — checklist
14. **Community** — matching
15. **Routine view enhancements** — render rich tasks, intelligence features
16. **Check-in tab** — mood/energy/sleep/stress logging that feeds intelligence

Each step produces a working, testable app. No step depends on a later step.
