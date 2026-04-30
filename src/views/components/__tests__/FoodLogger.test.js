import { describe, it, expect } from 'vitest';
import {
  calcBMR,
  calcTDEE,
  calcMacros,
  calcCalorieTarget,
  sumDayMeals,
  getYesterdayDelta,
} from '../FoodLogger';

describe('calcBMR', () => {
  it('computes male BMR via Mifflin-St Jeor', () => {
    // 180 lbs, 5'10", 30y, male
    // kg = 180 * 0.453592 = 81.6466
    // cm = 70 * 2.54 = 177.8
    // base = 10*81.6466 + 6.25*177.8 - 5*30 = 816.466 + 1111.25 - 150 = 1777.716
    // male = +5 -> 1782.716 -> rounded 1783
    expect(calcBMR(180, 5, 10, 30, 'male')).toBe(1783);
  });

  it('computes female BMR (uses -161 instead of +5)', () => {
    // 140 lbs, 5'5", 28y, female
    // kg = 140*0.453592 = 63.503
    // cm = 65*2.54 = 165.1
    // base = 635.029 + 1031.875 - 140 = 1526.904
    // female = -161 -> 1365.904 -> rounded 1366
    expect(calcBMR(140, 5, 5, 28, 'female')).toBe(1366);
  });

  it('returns 0 for missing/invalid profile fields', () => {
    expect(calcBMR('', 5, 10, 30, 'male')).toBe(0);
    expect(calcBMR(180, '', '', 30, 'male')).toBe(0);
    expect(calcBMR(180, 5, 10, '', 'male')).toBe(0);
    expect(calcBMR(0, 0, 0, 0, 'male')).toBe(0);
  });
});

describe('calcTDEE', () => {
  it('multiplies BMR by activity factor', () => {
    expect(calcTDEE(2000, 'sedentary')).toBe(2400);   // 1.2
    expect(calcTDEE(2000, 'light')).toBe(2750);       // 1.375
    expect(calcTDEE(2000, 'moderate')).toBe(2800);    // 1.4
    expect(calcTDEE(2000, 'active')).toBe(3200);      // 1.6
    expect(calcTDEE(2000, 'very_active')).toBe(3800); // 1.9
  });

  it('defaults to moderate when activity is unknown/missing', () => {
    expect(calcTDEE(2000, '')).toBe(2800);
    expect(calcTDEE(2000, 'gibberish')).toBe(2800);
  });

  it('returns 0 for invalid BMR', () => {
    expect(calcTDEE(0, 'moderate')).toBe(0);
    expect(calcTDEE(NaN, 'moderate')).toBe(0);
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

  it('returns zeros for invalid calories', () => {
    expect(calcMacros(0, 'Fat Loss')).toEqual({ protein: 0, carbs: 0, fat: 0 });
    expect(calcMacros(NaN, 'Fat Loss')).toEqual({ protein: 0, carbs: 0, fat: 0 });
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
