import { describe, it, expect } from 'vitest';
import { MIND_TECHNIQUES, BREATHING_PATTERNS, NOOTROPICS, MIND_CATEGORIES } from '../data.js';

describe('MIND_TECHNIQUES', () => {
  it('has 10 techniques', () => {
    expect(MIND_TECHNIQUES).toHaveLength(10);
  });

  it('each technique has required fields', () => {
    MIND_TECHNIQUES.forEach((t, i) => {
      expect(t, `technique ${i}`).toHaveProperty('id');
      expect(t, `technique ${i}`).toHaveProperty('name');
      expect(t, `technique ${i}`).toHaveProperty('cat');
      expect(t, `technique ${i}`).toHaveProperty('desc');
      expect(t, `technique ${i}`).toHaveProperty('durations');
    });
  });

  it('spans 4 categories: calm, clarity, performance, resilience', () => {
    const cats = new Set(MIND_TECHNIQUES.map(t => t.cat));
    expect(cats.has('calm')).toBe(true);
    expect(cats.has('clarity')).toBe(true);
    expect(cats.has('performance')).toBe(true);
    expect(cats.has('resilience')).toBe(true);
  });
});

describe('BREATHING_PATTERNS', () => {
  it('has 5 patterns', () => {
    expect(Object.keys(BREATHING_PATTERNS)).toHaveLength(5);
  });

  it('contains box, 478, wim, calm, energize keys', () => {
    expect(BREATHING_PATTERNS).toHaveProperty('box');
    expect(BREATHING_PATTERNS).toHaveProperty('478');
    expect(BREATHING_PATTERNS).toHaveProperty('wim');
    expect(BREATHING_PATTERNS).toHaveProperty('calm');
    expect(BREATHING_PATTERNS).toHaveProperty('energize');
  });

  it('each pattern has name, desc, phases, rounds', () => {
    Object.entries(BREATHING_PATTERNS).forEach(([key, p]) => {
      expect(p, `pattern ${key}`).toHaveProperty('name');
      expect(p, `pattern ${key}`).toHaveProperty('desc');
      expect(p, `pattern ${key}`).toHaveProperty('phases');
      expect(p, `pattern ${key}`).toHaveProperty('rounds');
    });
  });

  it('box breathing has 4-4-4-4 pattern', () => {
    expect(BREATHING_PATTERNS.box.phases).toHaveLength(4);
    expect(BREATHING_PATTERNS.box.rounds).toBe(4);
  });
});

describe('NOOTROPICS', () => {
  it('has 8 compounds', () => {
    expect(NOOTROPICS).toHaveLength(8);
  });

  it('each nootropic has id, name, dose, timing, effect, cat', () => {
    NOOTROPICS.forEach((n, i) => {
      expect(n, `nootropic ${i}`).toHaveProperty('id');
      expect(n, `nootropic ${i}`).toHaveProperty('name');
      expect(n, `nootropic ${i}`).toHaveProperty('dose');
      expect(n, `nootropic ${i}`).toHaveProperty('timing');
      expect(n, `nootropic ${i}`).toHaveProperty('effect');
      expect(n, `nootropic ${i}`).toHaveProperty('cat');
    });
  });

  it('includes Caffeine+L-Theanine as first entry', () => {
    expect(NOOTROPICS[0].id).toBe('caffeine_lt');
  });

  it('includes Ashwagandha as last entry', () => {
    expect(NOOTROPICS[7].id).toBe('ashwagandha');
  });
});

describe('MIND_CATEGORIES', () => {
  it('has 4 categories', () => {
    expect(Object.keys(MIND_CATEGORIES)).toHaveLength(4);
  });

  it('contains calm, clarity, performance, resilience keys', () => {
    expect(MIND_CATEGORIES).toHaveProperty('calm');
    expect(MIND_CATEGORIES).toHaveProperty('clarity');
    expect(MIND_CATEGORIES).toHaveProperty('performance');
    expect(MIND_CATEGORIES).toHaveProperty('resilience');
  });

  it('each category has name, color, desc', () => {
    Object.entries(MIND_CATEGORIES).forEach(([key, c]) => {
      expect(c, `category ${key}`).toHaveProperty('name');
      expect(c, `category ${key}`).toHaveProperty('color');
      expect(c, `category ${key}`).toHaveProperty('desc');
    });
  });
});
