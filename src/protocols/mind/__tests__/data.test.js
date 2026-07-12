import { describe, it, expect } from 'vitest';
import { BREATHWORK_PATTERNS, NOOTROPICS, FOCUS_LABELS } from '../data';

describe('BREATHWORK_PATTERNS', () => {
  it('has 5 patterns (box/478/wimhof/calm/energizing)', () => {
    expect(BREATHWORK_PATTERNS.length).toBe(5);
    expect(BREATHWORK_PATTERNS.map((p) => p.id)).toEqual([
      'box', '478', 'wimhof', 'calm', 'energizing',
    ]);
  });

  it('each pattern has the required breath-cycle fields', () => {
    for (const pat of BREATHWORK_PATTERNS) {
      expect(pat).toHaveProperty('id');
      expect(pat).toHaveProperty('name');
      expect(pat).toHaveProperty('inhale');
      expect(pat).toHaveProperty('hold1');
      expect(pat).toHaveProperty('exhale');
      expect(pat).toHaveProperty('hold2');
      expect(pat).toHaveProperty('cycles');
      expect(typeof pat.cycles).toBe('number');
    }
  });

  // mind protocol copy (src/protocols/mind/index.js getOnboardingSummary) claims
  // "5 breathwork patterns" — data must match the copy, not the other way around.
  it('count matches the "5 breathwork patterns" claim in mind protocol copy', () => {
    expect(BREATHWORK_PATTERNS.length).toBe(5);
  });
});

describe('NOOTROPICS', () => {
  it('has 8 compounds', () => {
    expect(NOOTROPICS.length).toBe(8);
  });

  it('each compound has id/name/dose/timing/benefit', () => {
    for (const n of NOOTROPICS) {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('name');
      expect(n).toHaveProperty('dose');
      expect(n).toHaveProperty('timing');
      expect(n).toHaveProperty('benefit');
    }
  });

  // mind protocol copy claims an "8-compound nootropic stack" — data must match.
  it('count matches the "8-compound nootropic stack" claim in mind protocol copy', () => {
    expect(NOOTROPICS.length).toBe(8);
  });
});

describe('FOCUS_LABELS', () => {
  it('has an entry for each of the 4 onboarding focus areas', () => {
    expect(Object.keys(FOCUS_LABELS).sort()).toEqual(
      ['calm', 'clarity', 'performance', 'resilience'].sort()
    );
  });

  it('each entry has icon and label', () => {
    for (const meta of Object.values(FOCUS_LABELS)) {
      expect(meta).toHaveProperty('icon');
      expect(meta).toHaveProperty('label');
    }
  });
});
