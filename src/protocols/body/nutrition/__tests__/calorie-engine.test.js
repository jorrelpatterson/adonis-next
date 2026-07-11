import { describe, it, expect } from 'vitest';
import { COMMON_FOODS } from '../food-db';
import { calcBMR, calcTDEE, calcMacros, calcCalorieTarget, sumDayMeals } from '../calorie-engine';

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
    const bmr = calcBMR(210, 70, 38, 'male');
    expect(bmr).toBeGreaterThan(1700);
    expect(bmr).toBeLessThan(2100);
  });
  it('female BMR is lower', () => {
    expect(calcBMR(150, 65, 30, 'female')).toBeLessThan(calcBMR(150, 65, 30, 'male'));
  });
});

describe('calcTDEE', () => {
  it('desk multiplier is 1.2', () => { expect(calcTDEE(1800, 'desk')).toBe(Math.round(1800 * 1.2)); });
  it('physical multiplier is 1.6', () => { expect(calcTDEE(1800, 'physical')).toBe(Math.round(1800 * 1.6)); });
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

describe('calcCalorieTarget', () => {
  const profile = { weight: 180, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'moderate' };
  const bmr = calcBMR(180, 70, 30, 'male'); // hFt*12 + hIn = 70in
  const tdee = calcTDEE(bmr, 'moderate');

  it('returns 0 for a missing profile', () => {
    expect(calcCalorieTarget(null, 'Fat Loss')).toBe(0);
    expect(calcCalorieTarget(undefined, 'Fat Loss')).toBe(0);
  });

  it('Fat Loss subtracts 500 from TDEE', () => {
    expect(calcCalorieTarget(profile, 'Fat Loss')).toBe(tdee - 500);
  });

  it('Muscle Gain adds 350 to TDEE', () => {
    expect(calcCalorieTarget(profile, 'Muscle Gain')).toBe(tdee + 350);
  });

  it('Recomposition subtracts 200 from TDEE', () => {
    expect(calcCalorieTarget(profile, 'Recomposition')).toBe(tdee - 200);
  });

  it('unknown/unlisted goal (fallback, incl. Aesthetics) returns TDEE unchanged', () => {
    expect(calcCalorieTarget(profile, 'Aesthetics')).toBe(tdee);
    expect(calcCalorieTarget(profile, 'Longevity')).toBe(tdee);
    expect(calcCalorieTarget(profile, undefined)).toBe(tdee);
  });

  it('combines hFt/hIn into total height inches for calcBMR', () => {
    const shortProfile = { weight: 180, hFt: 5, hIn: 0, age: 30, gender: 'male', activity: 'moderate' };
    const tallProfile = { weight: 180, hFt: 6, hIn: 2, age: 30, gender: 'male', activity: 'moderate' };
    expect(calcCalorieTarget(shortProfile, 'Fat Loss')).not.toBe(calcCalorieTarget(tallProfile, 'Fat Loss'));
  });
});

describe('sumDayMeals', () => {
  it('sums cal/p/c/f across meals', () => {
    const meals = [
      { cal: 500, p: 40, c: 50, f: 15 },
      { cal: 300, p: 20, c: 30, f: 10 },
    ];
    expect(sumDayMeals(meals)).toEqual({ cal: 800, p: 60, c: 80, f: 25 });
  });

  it('treats missing cal/p/c/f fields as 0', () => {
    const meals = [{ cal: 400 }, { p: 30 }, {}];
    expect(sumDayMeals(meals)).toEqual({ cal: 400, p: 30, c: 0, f: 0 });
  });

  it('returns all-zero totals for an empty array', () => {
    expect(sumDayMeals([])).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
  });

  it('returns all-zero totals for non-array input', () => {
    expect(sumDayMeals(null)).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
    expect(sumDayMeals(undefined)).toEqual({ cal: 0, p: 0, c: 0, f: 0 });
  });
});
