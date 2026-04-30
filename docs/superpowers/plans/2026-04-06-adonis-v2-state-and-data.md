# Adonis v2 State Expansion + Data Extractions (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the state model to hold all protocol data identified in the audit, extract all remaining data constants from app.html into modular JS files, and update the migration to map v1 state correctly.

**Architecture:** State defaults expanded in src/state/defaults.js, reducer actions added in src/state/store.jsx, and all data constants extracted from public/app.html into their respective protocol data files. Each extraction is a standalone file that exports constants — no logic, just data.

**Tech Stack:** React 18, Vitest (happy-dom), existing state store from Plan 1.

**Spec:** `docs/superpowers/specs/2026-04-06-adonis-v2-protocol-rebuild.md` — Sections 1-2.

---

## File Structure

```
src/state/
  defaults.js               — MODIFY: expand protocolState with all domains
  store.jsx                 — MODIFY: add reducer actions for new state slices
  migration.js              — MODIFY: map v1 keys (wkLogs, activeCycles, etc.)

src/protocols/body/workout/
  exercises.js              — CREATE: EXERCISE_DB (78), EXERCISE_ALTS (27), getVideoUrl

src/protocols/body/peptides/
  injection.js              — CREATE: INJECTION_SITES (12), SYRINGE_TYPES, SYRINGES
  compatibility.js          — CREATE: PEP_COMPAT (~75 pairs), checkCompat()
  research.js               — CREATE: PEP_RESEARCH (~45), RISK_GAUGE (~45), getResearch(), getRisk()

src/protocols/body/nutrition/
  food-db.js                — CREATE: COMMON_FOODS (51 items)
  calorie-engine.js         — CREATE: calcBMR, calcTDEE, calcMacros

src/protocols/money/credit/
  cards-db.js               — CREATE: CC_DB (13 cards), CC_CATEGORIES, CC_ISSUERS
  cards-logic.js            — CREATE: calcFiveTwentyFour, getBestCard, calcBonusProgress

src/protocols/image/
  wardrobe/data.js          — CREATE: WARDROBE_CATS, STYLE_ARCHETYPES
  skincare/data.js          — MODIFY: add SKIN_CONCERNS, FRAGRANCE_OCCASIONS

src/protocols/mind/
  data.js                   — CREATE: MIND_TECHNIQUES, BREATHING_PATTERNS, NOOTROPICS, MIND_CATEGORIES

src/protocols/purpose/
  data.js                   — CREATE: BUCKET_CATEGORIES, CORE_VALUES, LIFE_AREAS

src/protocols/environment/
  data.js                   — CREATE: ENV_AREAS (6 areas x 6 items)

src/state/
  checkin.js                — CREATE: CHECKIN_FIELDS

src/goals/
  goal-map.js               — CREATE: GOAL_MAP (goal -> peptide categories)
```

---

## Task 1: Expand State Defaults

**Files:**
- Modify: `src/state/defaults.js`
- Test: `src/state/__tests__/defaults.test.js` (create)

- [ ] **Step 1: Write the failing test**

```js
// src/state/__tests__/defaults.test.js
import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../defaults';

describe('expanded state defaults', () => {
  it('has protocolState with all domains', () => {
    expect(DEFAULT_STATE.protocolState).toHaveProperty('workout');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('peptides');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('credit');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('income');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('citizenship');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('image');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('mind');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('purpose');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('environment');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('community');
  });

  it('workout state has wkLogs and wkPRs', () => {
    expect(DEFAULT_STATE.protocolState.workout.wkWeek).toBe(1);
    expect(DEFAULT_STATE.protocolState.workout.wkLogs).toEqual({});
    expect(DEFAULT_STATE.protocolState.workout.wkPRs).toEqual({});
  });

  it('peptides state has activeCycles and supplyInv', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.peptides.activeCycles)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.peptides.supplyInv)).toBe(true);
  });

  it('credit state has ccWallet and disputes', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.credit.ccWallet)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.credit.disputes)).toBe(true);
    expect(DEFAULT_STATE.protocolState.credit.repairAuto).toBe(true);
  });

  it('profile has targetDate and cycleData', () => {
    expect(DEFAULT_STATE.profile).toHaveProperty('targetDate');
    expect(DEFAULT_STATE.profile).toHaveProperty('cycleData');
  });

  it('logs has bodyMeasurements', () => {
    expect(Array.isArray(DEFAULT_STATE.logs.bodyMeasurements)).toBe(true);
  });

  it('mind state has mindSessions and mindStreak', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.mind.mindSessions)).toBe(true);
    expect(DEFAULT_STATE.protocolState.mind.mindStreak).toBe(0);
  });

  it('purpose state has bucketList and coreValues', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.purpose.bucketList)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.purpose.coreValues)).toBe(true);
  });

  it('environment state has envScores with 6 areas', () => {
    const env = DEFAULT_STATE.protocolState.environment;
    expect(env.envScores).toHaveProperty('sleep');
    expect(env.envScores).toHaveProperty('workspace');
    expect(env.envScores).toHaveProperty('air');
    expect(env.envScores).toHaveProperty('light');
    expect(env.envScores).toHaveProperty('digital');
    expect(env.envScores).toHaveProperty('cleanliness');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/__tests__/defaults.test.js`
Expected: FAIL — protocolState missing workout/peptides/etc.

- [ ] **Step 3: Rewrite defaults.js with full expanded state**

Read the current `src/state/defaults.js`, then replace it with the full expanded version from spec Section 1. The complete state structure is defined there — copy it exactly. Include all protocolState domains (workout, peptides, credit, income, citizenship, image, mind, purpose, environment, community), expanded profile (targetDate, cycleData), and expanded logs (bodyMeasurements).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/__tests__/defaults.test.js`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/defaults.js src/state/__tests__/defaults.test.js
git commit -m "feat: expand state model with all protocol domains from audit"
```

---

## Task 2: Extract EXERCISE_DB + EXERCISE_ALTS + getVideoUrl

**Files:**
- Create: `src/protocols/body/workout/exercises.js`
- Test: `src/protocols/body/workout/__tests__/exercises.test.js` (create)

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/body/workout/__tests__/exercises.test.js
import { describe, it, expect } from 'vitest';
import { EXERCISE_DB, EXERCISE_ALTS, getVideoUrl } from '../exercises';

describe('exercise database', () => {
  it('EXERCISE_DB has 78+ exercises', () => {
    expect(Object.keys(EXERCISE_DB).length).toBeGreaterThanOrEqual(78);
  });

  it('each exercise has muscles, form, tips, level', () => {
    for (const [name, ex] of Object.entries(EXERCISE_DB)) {
      expect(ex).toHaveProperty('muscles');
      expect(ex).toHaveProperty('form');
      expect(ex).toHaveProperty('tips');
      expect(ex).toHaveProperty('level');
      expect(['beginner', 'intermediate', 'advanced']).toContain(ex.level);
    }
  });

  it('has key exercises from all programs', () => {
    expect(EXERCISE_DB['Flat Barbell Bench Press']).toBeDefined();
    expect(EXERCISE_DB['Back Squats']).toBeDefined();
    expect(EXERCISE_DB['Conventional Deadlifts']).toBeDefined();
    expect(EXERCISE_DB['Standing OHP']).toBeDefined();
  });
});

describe('exercise alternatives', () => {
  it('EXERCISE_ALTS has 27+ exercises', () => {
    expect(Object.keys(EXERCISE_ALTS).length).toBeGreaterThanOrEqual(27);
  });

  it('each entry is an array of 3-4 alternatives', () => {
    for (const [name, alts] of Object.entries(EXERCISE_ALTS)) {
      expect(Array.isArray(alts)).toBe(true);
      expect(alts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('Back Squats has known alternatives', () => {
    expect(EXERCISE_ALTS['Back Squats']).toContain('Goblet Squats');
    expect(EXERCISE_ALTS['Back Squats']).toContain('Leg Press');
  });
});

describe('getVideoUrl', () => {
  it('generates YouTube search URL', () => {
    const url = getVideoUrl('Bench Press');
    expect(url).toContain('youtube.com/results');
    expect(url).toContain('Bench%20Press');
    expect(url).toContain('proper%20form');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/protocols/body/workout/__tests__/exercises.test.js`
Expected: FAIL

- [ ] **Step 3: Extract from app.html**

Read `public/app.html` lines 956-1063. Copy the EXERCISE_DB object (78 exercises), EXERCISE_ALTS object (27 exercises with alternatives), and getVideoUrl function EXACTLY. Export all three.

```js
// src/protocols/body/workout/exercises.js
// Extracted from public/app.html lines 956-1063

export const EXERCISE_DB = {
  // ... exact copy from app.html ...
};

export const EXERCISE_ALTS = {
  // ... exact copy from app.html ...
};

export function getVideoUrl(exerciseName) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(exerciseName + " proper form tutorial");
}
```

IMPORTANT: Copy the EXACT data. Do not modify exercise names, form instructions, or any content.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/protocols/body/workout/__tests__/exercises.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/protocols/body/workout/exercises.js src/protocols/body/workout/__tests__/exercises.test.js
git commit -m "feat: extract EXERCISE_DB (78 exercises), EXERCISE_ALTS (27 swaps), getVideoUrl"
```

---

## Task 3: Extract Peptide Injection + Compatibility + Research Data

**Files:**
- Create: `src/protocols/body/peptides/injection.js`
- Create: `src/protocols/body/peptides/compatibility.js`
- Create: `src/protocols/body/peptides/research.js`
- Test: `src/protocols/body/peptides/__tests__/peptide-data.test.js` (create)

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/body/peptides/__tests__/peptide-data.test.js
import { describe, it, expect } from 'vitest';
import { INJECTION_SITES, SYRINGE_TYPES, SYRINGES } from '../injection';
import { PEP_COMPAT, checkCompat } from '../compatibility';
import { PEP_RESEARCH, RISK_GAUGE, getResearch, getRisk } from '../research';

describe('injection data', () => {
  it('INJECTION_SITES has 12 sites', () => { expect(INJECTION_SITES.length).toBe(12); });
  it('each site has id, name, region, icon', () => {
    for (const s of INJECTION_SITES) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('region');
    }
  });
  it('SYRINGES has 3 options', () => { expect(SYRINGES.length).toBe(3); });
});

describe('compatibility data', () => {
  it('PEP_COMPAT has 75+ entries', () => { expect(Object.keys(PEP_COMPAT).length).toBeGreaterThanOrEqual(75); });
  it('checkCompat returns synergy/caution/avoid or null', () => {
    const result = checkCompat('BPC-157', 'TB-500');
    // These are known synergistic peptides
    if (result) {
      expect(['synergy', 'caution', 'avoid']).toContain(result.type);
    }
  });
  it('checkCompat returns null for unknown pair', () => {
    expect(checkCompat('FakePeptideA', 'FakePeptideB')).toBeNull();
  });
});

describe('research data', () => {
  it('PEP_RESEARCH has 45+ entries', () => { expect(Object.keys(PEP_RESEARCH).length).toBeGreaterThanOrEqual(45); });
  it('each entry has mechanism and safety', () => {
    for (const [name, entry] of Object.entries(PEP_RESEARCH)) {
      expect(entry).toHaveProperty('mechanism');
      expect(entry).toHaveProperty('safety');
    }
  });
  it('RISK_GAUGE has entries with risk level', () => { expect(Object.keys(RISK_GAUGE).length).toBeGreaterThanOrEqual(45); });
  it('getResearch finds by name', () => {
    const r = getResearch('BPC-157');
    expect(r).toBeDefined();
    expect(r.mechanism).toBeTruthy();
  });
  it('getRisk returns risk level', () => {
    const r = getRisk('BPC-157');
    expect(r).toBeDefined();
    expect(r).toHaveProperty('l');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Extract from app.html**

Read `public/app.html` lines 295-530 for INJECTION_SITES, SYRINGE_TYPES, SYRINGES. Lines 184-280 for PEP_COMPAT and checkCompat. Lines 381-449 for PEP_RESEARCH, and 310-371 for RISK_GAUGE. Also extract getResearch and getRisk functions. Copy EXACTLY into three separate files.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/protocols/body/peptides/injection.js src/protocols/body/peptides/compatibility.js src/protocols/body/peptides/research.js src/protocols/body/peptides/__tests__/peptide-data.test.js
git commit -m "feat: extract peptide injection sites, compatibility, research data"
```

---

## Task 4: Extract COMMON_FOODS + Calorie Engine

**Files:**
- Create: `src/protocols/body/nutrition/food-db.js`
- Create: `src/protocols/body/nutrition/calorie-engine.js`
- Test: `src/protocols/body/nutrition/__tests__/calorie-engine.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/body/nutrition/__tests__/calorie-engine.test.js
import { describe, it, expect } from 'vitest';
import { COMMON_FOODS } from '../food-db';
import { calcBMR, calcTDEE, calcMacros } from '../calorie-engine';

describe('COMMON_FOODS', () => {
  it('has 51 foods', () => { expect(COMMON_FOODS.length).toBe(51); });
  it('each food has n, cal, p, c, f', () => {
    for (const food of COMMON_FOODS) {
      expect(food).toHaveProperty('n');
      expect(food).toHaveProperty('cal');
      expect(food).toHaveProperty('p');
    }
  });
});

describe('calcBMR', () => {
  it('calculates male BMR (Mifflin-St Jeor)', () => {
    // 210lbs, 70in, 38yo, male
    const bmr = calcBMR(210, 70, 38, 'male');
    expect(bmr).toBeGreaterThan(1700);
    expect(bmr).toBeLessThan(2100);
  });
  it('female BMR is lower than male at same stats', () => {
    const male = calcBMR(150, 65, 30, 'male');
    const female = calcBMR(150, 65, 30, 'female');
    expect(female).toBeLessThan(male);
  });
});

describe('calcTDEE', () => {
  it('desk multiplier is 1.2', () => {
    const bmr = 1800;
    expect(calcTDEE(bmr, 'desk')).toBe(Math.round(1800 * 1.2));
  });
  it('physical multiplier is 1.6', () => {
    expect(calcTDEE(1800, 'physical')).toBe(Math.round(1800 * 1.6));
  });
});

describe('calcMacros', () => {
  it('fat loss has 40% protein', () => {
    const m = calcMacros(2000, 'Fat Loss');
    expect(m.protein).toBe(Math.round(2000 * 0.4 / 4));
  });
  it('muscle gain has 45% carbs', () => {
    const m = calcMacros(3000, 'Muscle Gain');
    expect(m.carbs).toBe(Math.round(3000 * 0.45 / 4));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Extract from app.html**

Read lines 1064-1114 for COMMON_FOODS. Read lines 653-661 for calcBMR, calcTDEE, calcMacros. Copy exactly.

```js
// src/protocols/body/nutrition/calorie-engine.js
export function calcBMR(weightLbs, heightInches, age, gender) {
  const kg = weightLbs * 0.453592;
  const cm = heightInches * 2.54;
  return gender === 'male'
    ? Math.round(10 * kg + 6.25 * cm - 5 * age + 5)
    : Math.round(10 * kg + 6.25 * cm - 5 * age - 161);
}

export function calcTDEE(bmr, activity) {
  const mult = { desk: 1.2, moderate: 1.4, physical: 1.6, sedentary: 1.2, light: 1.375, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (mult[activity] || 1.2));
}

export function calcMacros(calories, goal) {
  const ratios = {
    'Fat Loss': [0.4, 0.3, 0.3],
    'Muscle Gain': [0.3, 0.45, 0.25],
    'Recomposition': [0.35, 0.35, 0.3],
    'Aesthetics': [0.35, 0.35, 0.3],
  };
  const r = ratios[goal] || [0.3, 0.4, 0.3];
  return {
    protein: Math.round(calories * r[0] / 4),
    carbs: Math.round(calories * r[1] / 4),
    fat: Math.round(calories * r[2] / 9),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/protocols/body/nutrition/food-db.js src/protocols/body/nutrition/calorie-engine.js src/protocols/body/nutrition/__tests__/calorie-engine.test.js
git commit -m "feat: extract COMMON_FOODS (51 items) + calorie engine (BMR/TDEE/macros)"
```

---

## Task 5: Extract CC_DB + Card Logic

**Files:**
- Create: `src/protocols/money/credit/cards-db.js`
- Create: `src/protocols/money/credit/cards-logic.js`
- Test: `src/protocols/money/credit/__tests__/cards.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/money/credit/__tests__/cards.test.js
import { describe, it, expect } from 'vitest';
import { CC_DB, CC_CATEGORIES, CC_ISSUERS } from '../cards-db';
import { calcFiveTwentyFour, getBestCard, calcBonusProgress } from '../cards-logic';

describe('CC_DB', () => {
  it('has 13 cards', () => { expect(CC_DB.length).toBe(13); });
  it('each card has id, name, issuer, af, bonus, cats', () => {
    for (const c of CC_DB) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('issuer');
      expect(c).toHaveProperty('af');
      expect(c).toHaveProperty('bonus');
      expect(c).toHaveProperty('cats');
    }
  });
  it('has Chase Sapphire Preferred', () => {
    expect(CC_DB.find(c => c.id === 'csp')).toBeDefined();
  });
});

describe('CC_CATEGORIES', () => {
  it('has 12 categories', () => { expect(CC_CATEGORIES.length).toBe(12); });
});

describe('calcFiveTwentyFour', () => {
  it('counts cards opened within 24 months', () => {
    const now = new Date();
    const recent = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months ago
    const old = new Date(now - 900 * 24 * 60 * 60 * 1000).toISOString(); // 30 months ago
    const wallet = [
      { cardId: 'csp', openDate: recent, countsFor524: true },
      { cardId: 'cfu', openDate: old, countsFor524: true },
    ];
    expect(calcFiveTwentyFour(wallet)).toBe(1);
  });
});

describe('getBestCard', () => {
  it('returns best card for a category', () => {
    const wallet = [{ cardId: 'csp' }, { cardId: 'amex_gold' }];
    const result = getBestCard(wallet, 'dining', CC_DB);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('card');
    expect(result).toHaveProperty('rate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Extract from app.html**

Read the CC_DB, CC_CATEGORIES, CC_ISSUERS data and the calcFiveTwentyFour, getBestCard, calcBonusProgress functions. Copy exactly.

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add src/protocols/money/credit/cards-db.js src/protocols/money/credit/cards-logic.js src/protocols/money/credit/__tests__/cards.test.js
git commit -m "feat: extract CC_DB (13 cards), 5/24 tracking, spend optimizer, bonus calculator"
```

---

## Task 6: Extract Mind, Purpose, Environment Data

**Files:**
- Create: `src/protocols/mind/data.js`
- Create: `src/protocols/purpose/data.js`
- Create: `src/protocols/environment/data.js`
- Test: `src/protocols/mind/__tests__/mind-data.test.js`
- Test: `src/protocols/purpose/__tests__/purpose-data.test.js`
- Test: `src/protocols/environment/__tests__/env-data.test.js`

- [ ] **Step 1: Write tests for all three**

Mind test: MIND_TECHNIQUES has 10, BREATHING_PATTERNS has 5, NOOTROPICS has 8, MIND_CATEGORIES has 4.
Purpose test: BUCKET_CATEGORIES has 8, CORE_VALUES has 20, LIFE_AREAS has 7 with reflective questions.
Environment test: ENV_AREAS has 6 areas, each with 6 items (name + checked array).

- [ ] **Step 2: Run tests to verify fail**

- [ ] **Step 3: Extract from app.html**

Read lines 1882-1946 for mind data. Lines 1905-1946 for purpose data. Environment data is inline in the UI — reconstruct from the audit (6 areas x 6 items each). Copy exactly.

- [ ] **Step 4: Run tests to verify pass**

- [ ] **Step 5: Commit**

```bash
git add src/protocols/mind/data.js src/protocols/purpose/data.js src/protocols/environment/data.js src/protocols/mind/__tests__/mind-data.test.js src/protocols/purpose/__tests__/purpose-data.test.js src/protocols/environment/__tests__/env-data.test.js
git commit -m "feat: extract mind (10 techniques, 5 breathing, 8 nootropics), purpose (bucket/values/wheel), environment (36 checklist items)"
```

---

## Task 7: Extract Image Data (Wardrobe, Fragrance, Concerns)

**Files:**
- Create: `src/protocols/image/wardrobe/data.js`
- Modify: `src/protocols/image/skincare/data.js` (add SKIN_CONCERNS, FRAGRANCE_OCCASIONS)
- Test: `src/protocols/image/__tests__/image-data.test.js`

- [ ] **Step 1: Write test**

WARDROBE_CATS has 6 categories, STYLE_ARCHETYPES has 5. SKIN_CONCERNS has 6. FRAGRANCE_OCCASIONS has 5.

- [ ] **Step 2-4: Extract, test, verify**

Read lines 1150-1200 from app.html for SKIN_CONCERNS, FRAGRANCE_OCCASIONS, WARDROBE_CATS, STYLE_ARCHETYPES. Copy exactly.

- [ ] **Step 5: Commit**

```bash
git add src/protocols/image/
git commit -m "feat: extract wardrobe (33 essentials, 5 archetypes), skin concerns, fragrance occasions"
```

---

## Task 8: Extract CHECKIN_FIELDS + GOAL_MAP

**Files:**
- Create: `src/state/checkin.js`
- Create: `src/goals/goal-map.js`
- Tests for both

- [ ] **Step 1: Write tests**

CHECKIN_FIELDS has fields like mood, energy, sleep, stress, soreness, focus. GOAL_MAP maps goal names to peptide category arrays.

- [ ] **Step 2-4: Extract, test, verify**

Read line 194 for CHECKIN_FIELDS. Read line 173 for GOAL_MAP. Copy exactly.

- [ ] **Step 5: Commit**

```bash
git add src/state/checkin.js src/goals/goal-map.js
git commit -m "feat: extract check-in fields and goal-to-peptide category map"
```

---

## Task 9: Update State Migration

**Files:**
- Modify: `src/state/migration.js`
- Test: update existing migration test

- [ ] **Step 1: Update migration test**

Test that v1 state keys map correctly:
- `wkLogs` -> `protocolState.workout.wkLogs`
- `wkPRs` -> `protocolState.workout.wkPRs`
- `activeCycles` -> `protocolState.peptides.activeCycles`
- `supplyInv` -> `protocolState.peptides.supplyInv`
- `ccWallet` -> `protocolState.credit.ccWallet`
- `disputes` -> `protocolState.credit.disputes`
- `creditScores` -> `protocolState.credit.creditScores`
- `mindSessions` -> `protocolState.mind.mindSessions`
- `bucketList` -> `protocolState.purpose.bucketList`
- `skinType` -> `protocolState.image.skinType`
- `groomingLog` -> `protocolState.image.groomingLog`
- `bodyMeasurements` -> `logs.bodyMeasurements`

- [ ] **Step 2-4: Implement migration, test, verify**

- [ ] **Step 5: Commit**

```bash
git add src/state/migration.js src/state/__tests__/migration.test.js
git commit -m "feat: expand v1->v2 migration to map all protocol state"
```

---

## Task 10: Run All Tests + Build Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit if fixes needed**
