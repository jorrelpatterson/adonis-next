import { describe, it, expect } from 'vitest';
import { BUCKET_CATEGORIES, CORE_VALUES, LIFE_AREAS } from '../data.js';

describe('BUCKET_CATEGORIES', () => {
  it('has 8 categories', () => {
    expect(BUCKET_CATEGORIES).toHaveLength(8);
  });

  it('each category has id, name, icon, color', () => {
    BUCKET_CATEGORIES.forEach((c, i) => {
      expect(c, `category ${i}`).toHaveProperty('id');
      expect(c, `category ${i}`).toHaveProperty('name');
      expect(c, `category ${i}`).toHaveProperty('icon');
      expect(c, `category ${i}`).toHaveProperty('color');
    });
  });

  it('contains Travel, Adventure, Skills, Experiences, Financial, Creative, Giving Back, Personal', () => {
    const names = BUCKET_CATEGORIES.map(c => c.name);
    expect(names).toContain('Travel');
    expect(names).toContain('Adventure');
    expect(names).toContain('Skills');
    expect(names).toContain('Experiences');
    expect(names).toContain('Financial');
    expect(names).toContain('Creative');
    expect(names).toContain('Giving Back');
    expect(names).toContain('Personal');
  });
});

describe('CORE_VALUES', () => {
  it('has 20 values', () => {
    expect(CORE_VALUES).toHaveLength(20);
  });

  it('all values are strings', () => {
    CORE_VALUES.forEach((v, i) => {
      expect(typeof v, `value ${i}`).toBe('string');
    });
  });

  it('contains Freedom, Growth, Family, Health, Wealth', () => {
    expect(CORE_VALUES).toContain('Freedom');
    expect(CORE_VALUES).toContain('Growth');
    expect(CORE_VALUES).toContain('Family');
    expect(CORE_VALUES).toContain('Health');
    expect(CORE_VALUES).toContain('Wealth');
  });
});

describe('LIFE_AREAS', () => {
  it('has 7 areas', () => {
    expect(LIFE_AREAS).toHaveLength(7);
  });

  it('each area has a question property', () => {
    LIFE_AREAS.forEach((a, i) => {
      expect(a, `area ${i}`).toHaveProperty('question');
      expect(typeof a.question, `area ${i} question`).toBe('string');
      expect(a.question.length, `area ${i} question`).toBeGreaterThan(0);
    });
  });

  it('each area has id, name, icon', () => {
    LIFE_AREAS.forEach((a, i) => {
      expect(a, `area ${i}`).toHaveProperty('id');
      expect(a, `area ${i}`).toHaveProperty('name');
      expect(a, `area ${i}`).toHaveProperty('icon');
    });
  });

  it('includes Health & Body, Inner Peace areas', () => {
    const names = LIFE_AREAS.map(a => a.name);
    expect(names).toContain('Health & Body');
    expect(names).toContain('Inner Peace');
  });
});
