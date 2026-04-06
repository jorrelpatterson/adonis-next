import { describe, it, expect } from 'vitest';
import nutritionProtocol from '../index';
import { MEALS } from '../meals';
import { MORNING_SUPPS, EVENING_SUPPS } from '../supplements';
import { validateProtocol } from '../../../protocol-interface';

describe('MEALS data', () => {
  it('has entries for Fat Loss', () => {
    expect(MEALS['Fat Loss']).toBeDefined();
    expect(Array.isArray(MEALS['Fat Loss'])).toBe(true);
    expect(MEALS['Fat Loss'].length).toBe(7);
    const firstDay = MEALS['Fat Loss'][0];
    expect(Array.isArray(firstDay)).toBe(true);
    expect(firstDay.length).toBeGreaterThan(0);
    const meal = firstDay[0];
    expect(meal).toHaveProperty('t');
    expect(meal).toHaveProperty('n');
    expect(meal).toHaveProperty('f');
    expect(meal).toHaveProperty('cal');
    expect(meal).toHaveProperty('p');
    expect(meal).toHaveProperty('c');
    expect(meal).toHaveProperty('fat');
  });

  it('has entries for Muscle Gain', () => {
    expect(MEALS['Muscle Gain']).toBeDefined();
    expect(Array.isArray(MEALS['Muscle Gain'])).toBe(true);
    expect(MEALS['Muscle Gain'].length).toBe(7);
    const firstDay = MEALS['Muscle Gain'][0];
    expect(Array.isArray(firstDay)).toBe(true);
    expect(firstDay.length).toBeGreaterThanOrEqual(5);
  });

  it('has derived plans for all 8 goals', () => {
    const goals = ['Fat Loss', 'Muscle Gain', 'Recomposition', 'Aesthetics', 'Anti-Aging', 'Cognitive', 'Hormonal', 'Wellness'];
    goals.forEach((goal) => {
      expect(MEALS[goal]).toBeDefined();
      expect(Array.isArray(MEALS[goal])).toBe(true);
    });
  });
});

describe('MORNING_SUPPS and EVENING_SUPPS data', () => {
  const goals = ['Fat Loss', 'Muscle Gain', 'Recomposition', 'Aesthetics', 'Anti-Aging', 'Cognitive', 'Hormonal', 'Wellness'];

  it('MORNING_SUPPS has string entries for all goals', () => {
    goals.forEach((goal) => {
      expect(typeof MORNING_SUPPS[goal]).toBe('string');
      expect(MORNING_SUPPS[goal].length).toBeGreaterThan(0);
    });
  });

  it('EVENING_SUPPS has string entries for all goals', () => {
    goals.forEach((goal) => {
      expect(typeof EVENING_SUPPS[goal]).toBe('string');
      expect(EVENING_SUPPS[goal].length).toBeGreaterThan(0);
    });
  });
});

describe('nutrition protocol', () => {
  it('passes protocol interface validation', () => {
    expect(validateProtocol(nutritionProtocol)).toBe(true);
  });

  it('has correct identity (id=nutrition, domain=body)', () => {
    expect(nutritionProtocol.id).toBe('nutrition');
    expect(nutritionProtocol.domain).toBe('body');
    expect(nutritionProtocol.name).toBe('Nutrition & Supplements');
    expect(nutritionProtocol.icon).toBeTruthy();
  });

  it('canServe returns true for body domain, false for others', () => {
    expect(nutritionProtocol.canServe({ domain: 'body' })).toBe(true);
    expect(nutritionProtocol.canServe({ domain: 'mind' })).toBe(false);
    expect(nutritionProtocol.canServe({ domain: 'money' })).toBe(false);
    expect(nutritionProtocol.canServe(null)).toBe(false);
    expect(nutritionProtocol.canServe(undefined)).toBe(false);
  });

  it('getState returns goal from profile.primary', () => {
    const state = nutritionProtocol.getState({ primary: 'Fat Loss' });
    expect(state.goal).toBe('Fat Loss');
  });

  it('getState defaults to Wellness when no primary', () => {
    const state = nutritionProtocol.getState({});
    expect(state.goal).toBe('Wellness');
  });

  it('getTasks returns supplement tasks (at least morning + evening)', () => {
    const state = nutritionProtocol.getState({ primary: 'Fat Loss' });
    const tasks = nutritionProtocol.getTasks(state);
    const suppTasks = tasks.filter((t) => t.category === 'supplement');
    expect(suppTasks.length).toBeGreaterThanOrEqual(2);
  });

  it('getTasks includes morning supplement task', () => {
    const state = nutritionProtocol.getState({ primary: 'Muscle Gain' });
    const tasks = nutritionProtocol.getTasks(state);
    const morning = tasks.find((t) => t.id === 'nutrition-morning-supps');
    expect(morning).toBeDefined();
    expect(morning.category).toBe('supplement');
    expect(morning.type).toBe('guided');
    expect(morning.priority).toBe(2);
    expect(morning.skippable).toBe(true);
    expect(morning.data.supplements).toBeTruthy();
  });

  it('getTasks includes evening supplement task', () => {
    const state = nutritionProtocol.getState({ primary: 'Muscle Gain' });
    const tasks = nutritionProtocol.getTasks(state);
    const evening = tasks.find((t) => t.id === 'nutrition-evening-supps');
    expect(evening).toBeDefined();
    expect(evening.category).toBe('supplement');
    expect(evening.type).toBe('guided');
    expect(evening.skippable).toBe(true);
    expect(evening.data.supplements).toBeTruthy();
  });

  it('getTasks returns nutrition/meal tasks', () => {
    const state = nutritionProtocol.getState({ primary: 'Fat Loss' });
    const tasks = nutritionProtocol.getTasks(state);
    const mealTasks = tasks.filter((t) => t.category === 'nutrition');
    expect(mealTasks.length).toBeGreaterThan(0);
    const meal = mealTasks[0];
    expect(meal.data).toHaveProperty('food');
    expect(meal.data).toHaveProperty('calories');
    expect(meal.data).toHaveProperty('protein');
    expect(meal.data).toHaveProperty('carbs');
    expect(meal.data).toHaveProperty('fat');
    expect(meal.time).toBeTruthy();
  });

  it('getAutomations returns empty array', () => {
    expect(nutritionProtocol.getAutomations()).toEqual([]);
  });

  it('getRecommendations returns empty array', () => {
    expect(nutritionProtocol.getRecommendations()).toEqual([]);
  });

  it('getUpsells returns empty array', () => {
    expect(nutritionProtocol.getUpsells()).toEqual([]);
  });
});
