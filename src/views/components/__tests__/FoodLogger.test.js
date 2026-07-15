// source: v2-revival-archive:src/views/components/__tests__/FoodLogger.test.js
//
// Adapted (per task-11 brief):
// - calcBMR/calcTDEE/calcMacros/calcCalorieTarget/sumDayMeals are no longer
//   re-exported from FoodLogger (main's calorie-engine.js owns them, and
//   WeeklyRecap.test.jsx already exercises calcCalorieTarget from there) —
//   these math-only tests now import straight from calorie-engine.js.
//   getYesterdayDelta is the one export the brief requires FoodLogger to
//   keep (Task 12(c) consumes it), so it's still imported from '../FoodLogger'.
// - Added (proves single-sourcing + component behavior, per brief step 2):
//   1. searching "Edamame" — present only in main's 51-food catalog, absent
//      from the archive's embedded 14-item list — returns a hit.
//   2. clicking a quick-add food button appends to today's meals via `log`
//      with the correct macro fields.
//   3. the adaptive target renders (not the "add profile" empty state) when
//      profile has goal weight + target date set.
//
// This file keeps the archive's `.test.js` (not `.test.jsx`) extension per
// the brief. The project's oxc/vite transform only enables JSX parsing for
// `.jsx`/`.tsx` files, so the new render-based tests below use
// `React.createElement` directly instead of JSX syntax.

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  calcBMR,
  calcTDEE,
  calcMacros,
  calcCalorieTarget,
  sumDayMeals,
} from '../../../protocols/body/nutrition/calorie-engine';
import { COMMON_FOODS } from '../../../protocols/body/nutrition/food-db';

vi.mock('../../../design/haptics', () => ({
  haptics: { light: vi.fn(), medium: vi.fn() },
}));

import FoodLogger, { getYesterdayDelta } from '../FoodLogger';
import { haptics } from '../../../design/haptics';

afterEach(() => {
  vi.clearAllMocks();
});

describe('calcBMR', () => {
  it('computes male BMR via Mifflin-St Jeor', () => {
    // 180 lbs, 5'10", 30y, male
    // kg = 180 * 0.453592 = 81.6466
    // cm = 70 * 2.54 = 177.8
    // base = 10*81.6466 + 6.25*177.8 - 5*30 = 816.466 + 1111.25 - 150 = 1777.716
    // male = +5 -> 1782.716 -> rounded 1783
    expect(calcBMR(180, 70, 30, 'male')).toBe(1783);
  });

  it('computes female BMR (uses -161 instead of +5)', () => {
    // 140 lbs, 5'5", 28y, female
    // kg = 140*0.453592 = 63.503
    // cm = 65*2.54 = 165.1
    // base = 635.029 + 1031.875 - 140 = 1526.904
    // female = -161 -> 1365.904 -> rounded 1366
    expect(calcBMR(140, 65, 28, 'female')).toBe(1366);
  });
});

describe('calcTDEE', () => {
  it('multiplies BMR by activity factor', () => {
    expect(calcTDEE(2000, 'sedentary')).toBe(2400);   // 1.2
    expect(calcTDEE(2000, 'light')).toBe(2750);       // 1.375
    expect(calcTDEE(2000, 'moderate')).toBe(2800);    // 1.4
    expect(calcTDEE(2000, 'active')).toBe(3450);      // 1.725 (main's value differs from archive's 'active')
    expect(calcTDEE(2000, 'very_active')).toBe(3800); // 1.9
  });

  it('defaults to sedentary-equivalent when activity is unknown/missing', () => {
    expect(calcTDEE(2000, '')).toBe(2400);
    expect(calcTDEE(2000, 'gibberish')).toBe(2400);
  });
});

describe('calcMacros', () => {
  it('Fat Loss split is 40/30/30', () => {
    const m = calcMacros(2000, 'Fat Loss');
    // 800/600/600 cal -> 200P / 150C / 67F (rounded 66.67 → 67)
    expect(m.protein).toBe(200);
    expect(m.carbs).toBe(150);
    expect(m.fat).toBe(67);
  });

  it('Muscle Gain split is 30/45/25', () => {
    const m = calcMacros(3000, 'Muscle Gain');
    // 900/1350/750 cal -> 225P / 338C / 83F
    expect(m.protein).toBe(225);
    expect(m.carbs).toBe(338);
    expect(m.fat).toBe(83);
  });

  it('falls back to default 30/40/30 for unknown goal', () => {
    const m = calcMacros(2000, 'Wellness');
    // 600/800/600 -> 150P / 200C / 67F
    expect(m.protein).toBe(150);
    expect(m.carbs).toBe(200);
    expect(m.fat).toBe(67);
  });

  it('returns zeros for zero calories', () => {
    // Note: unlike the archive's math.js (which special-cased
    // !Number.isFinite(cal)), main's calorie-engine.js calcMacros has no
    // NaN guard — not something this task's brief authorizes changing.
    // In practice FoodLogger only ever calls calcMacros with
    // adaptive.adaptedTarget, which computeAdaptive guarantees is a finite
    // rounded number, so the NaN path is unreachable through this component.
    expect(calcMacros(0, 'Fat Loss')).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('calcCalorieTarget', () => {
  const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };

  it('Fat Loss subtracts 500 from TDEE', () => {
    // BMR 1783 * 1.4 = 2496.2 → 2496; -500 = 1996
    expect(calcCalorieTarget(profile, 'Fat Loss')).toBe(1996);
  });

  it('Muscle Gain adds 350 to TDEE', () => {
    expect(calcCalorieTarget(profile, 'Muscle Gain')).toBe(2496 + 350);
  });

  it('Recomposition subtracts 200', () => {
    expect(calcCalorieTarget(profile, 'Recomposition')).toBe(2496 - 200);
  });

  it('returns 0 when profile is missing required fields', () => {
    expect(calcCalorieTarget(null, 'Fat Loss')).toBe(0);
    expect(calcCalorieTarget({ weight: '', hFt: '', age: '' }, 'Fat Loss')).toBe(0);
  });
});

describe('sumDayMeals', () => {
  it('returns zeros for empty / missing meals', () => {
    expect(sumDayMeals([])).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
    expect(sumDayMeals(null)).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
    expect(sumDayMeals(undefined)).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
  });

  it('sums calories and macros across meals', () => {
    const meals = [
      { name: 'Eggs', cal: 140, p: 12, c: 1,  f: 10 },
      { name: 'Rice', cal: 205, p: 4,  c: 45, f: 0  },
      { name: 'Salmon', cal: 350, p: 36, c: 0, f: 22 },
    ];
    expect(sumDayMeals(meals)).toEqual({ cal: 695, p: 52, c: 46, f: 32 });
  });

  it('treats missing macro fields as 0', () => {
    const meals = [{ name: 'Mystery', cal: 100 }];
    expect(sumDayMeals(meals)).toEqual({ cal: 100, p: 0, c: 0, f: 0 });
  });
});

describe('getYesterdayDelta', () => {
  const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };

  it('returns zeros when no yesterday log exists', () => {
    expect(getYesterdayDelta({ food: {} }, profile, 'Fat Loss')).toEqual({ over: 0, under: 0 });
    expect(getYesterdayDelta(null, profile, 'Fat Loss')).toEqual({ over: 0, under: 0 });
  });

  it('returns zeros when target cannot be computed (no profile)', () => {
    expect(getYesterdayDelta({ food: {} }, null, 'Fat Loss')).toEqual({ over: 0, under: 0 });
  });

  it('flags overage when yesterday exceeded target', () => {
    const today = new Date();
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const yKey = y.toISOString().slice(0, 10);
    // Fat Loss target ~1996. Push to 2200 = +204 over.
    const logs = {
      food: {
        [yKey]: [
          { name: 'Big meal', cal: 2200, p: 100, c: 200, f: 80 },
        ],
      },
    };
    const delta = getYesterdayDelta(logs, profile, 'Fat Loss');
    expect(delta.over).toBeGreaterThan(0);
    expect(delta.under).toBe(0);
  });

  it('flags undershoot when yesterday came in low', () => {
    const today = new Date();
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const yKey = y.toISOString().slice(0, 10);
    const logs = {
      food: {
        [yKey]: [{ name: 'Tiny', cal: 800, p: 60, c: 50, f: 30 }],
      },
    };
    const delta = getYesterdayDelta(logs, profile, 'Fat Loss');
    expect(delta.over).toBe(0);
    expect(delta.under).toBeGreaterThan(0);
  });
});

// ─── Single-sourcing + component behavior (new, per task-11 brief) ────────

describe('FoodLogger — single-sourced food catalog', () => {
  it('sanity: "Edamame" is in main\'s 51-food catalog', () => {
    expect(COMMON_FOODS.some(f => f.n.includes('Edamame'))).toBe(true);
  });

  it('sanity: the archive\'s embedded 14-item list never had Edamame', () => {
    // Archive's COMMON_FOODS (deleted per sanctioned adaptation (a)) covered:
    // Chicken Breast, Eggs, White Rice, Salmon, Sweet Potato, Greek Yogurt,
    // Whey Shake, Avocado, Almonds, Oatmeal, Banana, Olive Oil, Broccoli,
    // Ground Beef 85% — no Edamame. This test documents that gap; the search
    // test below proves FoodLogger now resolves it via main's catalog.
    const archiveNames = [
      'Chicken Breast', 'Eggs', 'White Rice', 'Salmon', 'Sweet Potato',
      'Greek Yogurt', 'Whey Shake', 'Avocado', 'Almonds', 'Oatmeal',
      'Banana', 'Olive Oil', 'Broccoli', 'Ground Beef 85%',
    ];
    expect(archiveNames.some(n => n === 'Edamame')).toBe(false);
  });

  it('searching "edamame" returns a hit from main\'s catalog (proves single-sourcing)', () => {
    const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
    render(React.createElement(FoodLogger, { profile, protocolStates: {}, logs: {}, log: vi.fn() }));

    fireEvent.change(screen.getByPlaceholderText('Search foods…'), { target: { value: 'edamame' } });

    screen.getByText(/Edamame/i);
    expect(screen.queryByText('No matches — use custom entry below.')).toBeNull();
  });
});

describe('FoodLogger — logging a food', () => {
  it('clicking a quick-add food appends to today\'s meals with correct macro fields', () => {
    const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
    const logFn = vi.fn();
    const todayKey = new Date().toISOString().slice(0, 10);

    render(React.createElement(FoodLogger, { profile, protocolStates: {}, logs: {}, log: logFn }));

    fireEvent.change(screen.getByPlaceholderText('Search foods…'), { target: { value: 'edamame' } });
    const edamame = COMMON_FOODS.find(f => f.n.includes('Edamame'));
    fireEvent.click(screen.getByText(edamame.n));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [key, payload] = logFn.mock.calls[0];
    expect(key).toBe('food');
    expect(payload[todayKey]).toHaveLength(1);
    const logged = payload[todayKey][0];
    expect(logged).toMatchObject({
      name: edamame.n,
      cal: edamame.cal,
      p: edamame.p,
      c: edamame.c,
      f: edamame.f,
    });
    expect(typeof logged.time).toBe('string');
  });

  it('preserves existing meals for the day when appending a new one', () => {
    const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
    const logFn = vi.fn();
    const todayKey = new Date().toISOString().slice(0, 10);
    const logs = {
      food: {
        [todayKey]: [{ name: 'Existing Meal', cal: 300, p: 20, c: 30, f: 10, time: '8:00 AM' }],
      },
    };

    render(React.createElement(FoodLogger, { profile, protocolStates: {}, logs, log: logFn }));

    fireEvent.change(screen.getByPlaceholderText('Search foods…'), { target: { value: 'edamame' } });
    const edamame = COMMON_FOODS.find(f => f.n.includes('Edamame'));
    fireEvent.click(screen.getByText(edamame.n));

    const [, payload] = logFn.mock.calls[0];
    expect(payload[todayKey]).toHaveLength(2);
    expect(payload[todayKey][0].name).toBe('Existing Meal');
    expect(payload[todayKey][1].name).toBe(edamame.n);
  });

  // iOS P2 Task 2: save/confirm -> medium (was light — corrected).
  it('fires haptics.medium (not light) when a meal is successfully logged', () => {
    const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
    render(React.createElement(FoodLogger, { profile, protocolStates: {}, logs: {}, log: vi.fn() }));

    fireEvent.change(screen.getByPlaceholderText('Search foods…'), { target: { value: 'edamame' } });
    const edamame = COMMON_FOODS.find(f => f.n.includes('Edamame'));
    fireEvent.click(screen.getByText(edamame.n));

    expect(haptics.medium).toHaveBeenCalledTimes(1);
    expect(haptics.light).not.toHaveBeenCalled();
  });
});

describe('FoodLogger — adaptive target rendering', () => {
  it('shows the "add profile info" empty state when the profile is too sparse for a target', () => {
    render(React.createElement(FoodLogger, { profile: {}, protocolStates: {}, logs: {}, log: vi.fn() }));
    screen.getByText(/Add weight, height, age, and activity in your profile/i);
  });

  it('shows the empty state (not a fabricated target) for the reviewer\'s exact partial profile — weight missing (Task 11 guard)', () => {
    // Regression test for the review finding: weight missing (but height/
    // age/gender/activity present) used to coerce weight to 0 and still
    // compute a garbage-but-finite adaptedTarget (~1352 cal), so this empty
    // state never rendered and a fabricated target/macros showed instead.
    const profile = { hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
    const { container } = render(
      React.createElement(FoodLogger, { profile, protocolStates: {}, logs: {}, log: vi.fn() })
    );

    screen.getByText(/Add weight, height, age, and activity in your profile/i);
    // No fabricated calorie target ("/ NNNN cal") should render alongside the empty state.
    expect(container.textContent).not.toMatch(/\/\s*\d+\s*cal/);
  });

  it('renders an adaptive calorie target when profile has goal weight + target date set', () => {
    const profile = {
      weight: 200, hFt: 6, hIn: 0, age: 32, gender: 'male', activity: 'moderate',
      primary: 'Fat Loss', goalW: 180, targetDate: '2099-01-01',
    };
    const logs = {
      weight: [
        { date: '2026-06-20', weight: 202 },
        { date: '2026-06-27', weight: 200 },
        { date: '2026-07-04', weight: 199 },
      ],
      food: {},
    };

    const { container } = render(
      React.createElement(FoodLogger, { profile, protocolStates: {}, logs, log: vi.fn() })
    );

    // Empty-state copy for a missing profile must NOT show — a real target renders.
    expect(screen.queryByText(/Add weight, height, age, and activity in your profile/i)).toBeNull();
    expect(container.textContent).toMatch(/\/\s*\d+\s*cal/);
    expect(container.textContent).toContain('Protein ·');
    expect(container.textContent).toContain('Carbs ·');
    // "Fat" is a substring of both the macro cell label ("Fat · NN%") and
    // the header's "Fat Loss" goal text — assert on the more specific
    // macro-cell phrasing so this doesn't accidentally pass off the header.
    expect(container.textContent).toContain('Fat · ');
  });
});
