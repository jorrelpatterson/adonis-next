import { describe, it, expect } from 'vitest';
import { GOAL_MAP } from '../goal-map';

describe('GOAL_MAP', () => {
  it('has entries for major goals', () => {
    expect(GOAL_MAP['Fat Loss']).toBeDefined();
    expect(GOAL_MAP['Muscle Gain']).toBeDefined();
    expect(GOAL_MAP['Anti-Aging']).toBeDefined();
  });
  it('each entry is array of category strings', () => {
    for (const cats of Object.values(GOAL_MAP)) {
      expect(Array.isArray(cats)).toBe(true);
      expect(cats.length).toBeGreaterThan(0);
    }
  });
  it('Fat Loss includes Weight Management', () => {
    expect(GOAL_MAP['Fat Loss']).toContain('Weight Management');
  });
});
