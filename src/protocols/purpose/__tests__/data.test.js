import { describe, it, expect } from 'vitest';
import { LIFE_AREAS, CORE_VALUES } from '../data';

describe('LIFE_AREAS', () => {
  it('has 7 areas', () => {
    expect(LIFE_AREAS.length).toBe(7);
  });

  it('each area has id/emoji/label', () => {
    for (const a of LIFE_AREAS) {
      expect(a).toHaveProperty('id');
      expect(a).toHaveProperty('emoji');
      expect(a).toHaveProperty('label');
    }
  });

  it('ids match the onboarding lifeAreas options in purpose protocol copy', () => {
    expect(LIFE_AREAS.map((a) => a.id)).toEqual([
      'health', 'wealth', 'mind', 'relationships', 'adventure', 'environment', 'inner_peace',
    ]);
  });
});

describe('CORE_VALUES', () => {
  it('has 20 values', () => {
    expect(CORE_VALUES.length).toBe(20);
  });

  it('is a list of unique strings', () => {
    for (const v of CORE_VALUES) {
      expect(typeof v).toBe('string');
    }
    expect(new Set(CORE_VALUES).size).toBe(CORE_VALUES.length);
  });

  // purpose protocol copy (src/protocols/purpose/index.js getOnboardingSummary)
  // claims "20 core values" — data must match the copy, not the other way around.
  it('count matches the "20 core values" claim in purpose protocol copy', () => {
    expect(CORE_VALUES.length).toBe(20);
  });
});
