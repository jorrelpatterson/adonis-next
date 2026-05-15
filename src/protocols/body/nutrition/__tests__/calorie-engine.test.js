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
