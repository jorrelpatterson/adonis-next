import { describe, it, expect } from 'vitest';
import { EXERCISE_DB, EXERCISE_ALTS, getVideoUrl } from '../exercises';

describe('exercise database', () => {
  it('EXERCISE_DB has 76+ exercises', () => {
    expect(Object.keys(EXERCISE_DB).length).toBeGreaterThanOrEqual(76);
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
  it('has key exercises', () => {
    expect(EXERCISE_DB['Flat Barbell Bench Press']).toBeDefined();
    expect(EXERCISE_DB['Back Squats']).toBeDefined();
    expect(EXERCISE_DB['Conventional Deadlifts']).toBeDefined();
  });
});

describe('exercise alternatives', () => {
  it('EXERCISE_ALTS has 27+ exercises', () => {
    expect(Object.keys(EXERCISE_ALTS).length).toBeGreaterThanOrEqual(27);
  });
  it('each entry is array of 3+ alternatives', () => {
    for (const alts of Object.values(EXERCISE_ALTS)) {
      expect(Array.isArray(alts)).toBe(true);
      expect(alts.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('Back Squats has Goblet Squats alternative', () => {
    expect(EXERCISE_ALTS['Back Squats']).toContain('Goblet Squats');
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
