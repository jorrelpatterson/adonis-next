import { describe, it, expect } from 'vitest';
import { computeRoutineStreak } from '../streak.js';

describe('computeRoutineStreak', () => {
  it('returns 0 for empty/null/non-object logs', () => {
    expect(computeRoutineStreak({}, '2026-07-10')).toBe(0);
    expect(computeRoutineStreak(null, '2026-07-10')).toBe(0);
    expect(computeRoutineStreak(undefined, '2026-07-10')).toBe(0);
    expect(computeRoutineStreak('not-an-object', '2026-07-10')).toBe(0);
  });

  it('counts today when today has logged tasks', () => {
    const logs = { '2026-07-10': ['t1'] };
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    const logs = {
      '2026-07-08': ['t1'],
      '2026-07-09': ['t2'],
      '2026-07-10': ['t3'],
    };
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(3);
  });

  it('tolerates today being empty (does not break streak, does not count today)', () => {
    const logs = {
      '2026-07-08': ['t1'],
      '2026-07-09': ['t2'],
      // today empty/missing entirely
    };
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(2);
  });

  it('treats today with an empty array the same as today missing', () => {
    const logs = {
      '2026-07-08': ['t1'],
      '2026-07-09': ['t2'],
      '2026-07-10': [],
    };
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(2);
  });

  it('breaks the streak on a gap day', () => {
    const logs = {
      '2026-07-05': ['t1'],
      '2026-07-06': ['t2'],
      // gap on 07-07
      '2026-07-08': ['t3'],
      '2026-07-09': ['t4'],
      '2026-07-10': ['t5'],
    };
    // walking back from today: 07-10, 07-09, 07-08 count; 07-07 missing -> stop
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(3);
  });

  it('yesterday empty breaks the streak even if today has activity', () => {
    const logs = {
      '2026-07-08': ['t1'],
      '2026-07-09': [], // yesterday empty
      '2026-07-10': ['t2'],
    };
    // today counts (1), but yesterday empty stops further counting
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(1);
  });

  it('yesterday empty and today empty yields 0', () => {
    const logs = {
      '2026-07-08': ['t1'],
      '2026-07-09': [],
    };
    expect(computeRoutineStreak(logs, '2026-07-10')).toBe(0);
  });

  it('defaults todayISO to current date when omitted', () => {
    // Just verify it doesn't throw and returns a number when arg omitted.
    const result = computeRoutineStreak({}, undefined);
    expect(typeof result).toBe('number');
  });
});
