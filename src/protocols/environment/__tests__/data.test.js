import { describe, it, expect } from 'vitest';
import { CHECKLIST, LIVING_LABELS, PRIORITY_LABELS } from '../data';

describe('CHECKLIST', () => {
  it('has 6 areas', () => {
    expect(CHECKLIST.length).toBe(6);
  });

  it('each area has exactly 6 items (36 total)', () => {
    for (const area of CHECKLIST) {
      expect(area.items.length).toBe(6);
    }
    const total = CHECKLIST.reduce((acc, a) => acc + a.items.length, 0);
    expect(total).toBe(36);
  });

  it('each area has key/title/priorityKey/items', () => {
    for (const area of CHECKLIST) {
      expect(area).toHaveProperty('key');
      expect(area).toHaveProperty('title');
      expect(area).toHaveProperty('priorityKey');
      expect(Array.isArray(area.items)).toBe(true);
      for (const item of area.items) {
        expect(typeof item).toBe('string');
      }
    }
  });

  it('area keys match the archive order', () => {
    expect(CHECKLIST.map((a) => a.key)).toEqual([
      'sleep', 'workspace', 'air', 'light', 'digital', 'cleanliness',
    ]);
  });

  // environment protocol copy (src/protocols/environment/index.js) claims a
  // "36-item daily checklist" — data must match the copy, not the other way around.
  it('total item count matches the "36-item daily checklist" claim in environment protocol copy', () => {
    const total = CHECKLIST.reduce((acc, a) => acc + a.items.length, 0);
    expect(total).toBe(36);
  });
});

describe('LIVING_LABELS', () => {
  it('has an entry for each onboarding livingSituation option', () => {
    expect(Object.keys(LIVING_LABELS).sort()).toEqual(
      ['apartment', 'house', 'condo', 'shared', 'other'].sort()
    );
  });
});

describe('PRIORITY_LABELS', () => {
  it('has an entry for each onboarding priorityArea option plus "all"', () => {
    expect(Object.keys(PRIORITY_LABELS).sort()).toEqual(
      ['sleep', 'workspace', 'air', 'digital', 'all'].sort()
    );
  });

  it('non-null priorityKeys in CHECKLIST resolve to a PRIORITY_LABELS entry', () => {
    for (const area of CHECKLIST) {
      if (area.priorityKey) {
        expect(PRIORITY_LABELS).toHaveProperty(area.priorityKey);
      }
    }
  });
});
