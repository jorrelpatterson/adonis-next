import { describe, it, expect } from 'vitest';
import {
  getTodayCheckin,
  getCheckinCount,
  getCheckinAverages,
} from '../selectors.js';

describe('getTodayCheckin', () => {
  it('returns null when logs is empty', () => {
    expect(getTodayCheckin({}, '2026-04-29')).toBeNull();
    expect(getTodayCheckin(null, '2026-04-29')).toBeNull();
    expect(getTodayCheckin({ checkins: {} }, '2026-04-29')).toBeNull();
  });

  it('returns the entry for today when present', () => {
    const logs = { checkins: { '2026-04-29': { mood: 4, energy: 3 } } };
    expect(getTodayCheckin(logs, '2026-04-29')).toEqual({ mood: 4, energy: 3 });
  });

  it('returns null for a date that has no entry', () => {
    const logs = { checkins: { '2026-04-28': { mood: 4 } } };
    expect(getTodayCheckin(logs, '2026-04-29')).toBeNull();
  });
});

describe('getCheckinCount', () => {
  it('returns 0 for empty logs', () => {
    expect(getCheckinCount({})).toBe(0);
    expect(getCheckinCount({ checkins: {} })).toBe(0);
  });

  it('counts the entries', () => {
    const logs = {
      checkins: {
        '2026-04-27': { mood: 3 },
        '2026-04-28': { mood: 4 },
        '2026-04-29': { mood: 5 },
      },
    };
    expect(getCheckinCount(logs)).toBe(3);
  });
});

describe('getCheckinAverages', () => {
  it('returns null when fewer than minSamples entries', () => {
    const logs = {
      checkins: {
        '2026-04-27': { mood: 3, energy: 3 },
        '2026-04-28': { mood: 4, energy: 4 },
      },
    };
    expect(getCheckinAverages(logs, 7, 5)).toBeNull();
  });

  it('computes averages across the most recent N entries', () => {
    const logs = {
      checkins: {
        '2026-04-23': { mood: 1, energy: 1 },
        '2026-04-24': { mood: 2, energy: 2 },
        '2026-04-25': { mood: 3, energy: 3 },
        '2026-04-26': { mood: 4, energy: 4 },
        '2026-04-27': { mood: 5, energy: 5 },
      },
    };
    const avg = getCheckinAverages(logs, 7, 5);
    expect(avg).not.toBeNull();
    expect(avg.mood).toBe(3);    // (1+2+3+4+5)/5
    expect(avg.energy).toBe(3);
    expect(avg._count).toBe(5);
  });

  it('only takes the most recent `days` entries when more exist', () => {
    const logs = {
      checkins: {
        '2026-04-20': { mood: 1 },
        '2026-04-21': { mood: 1 },
        '2026-04-22': { mood: 1 },
        '2026-04-23': { mood: 5 },
        '2026-04-24': { mood: 5 },
        '2026-04-25': { mood: 5 },
        '2026-04-26': { mood: 5 },
        '2026-04-27': { mood: 5 },
      },
    };
    // window of 5, starting from minSamples 5 — should grab last 5 entries (all 5s)
    const avg = getCheckinAverages(logs, 5, 5);
    expect(avg.mood).toBe(5);
    expect(avg._count).toBe(5);
  });

  it('handles missing field values gracefully', () => {
    const logs = {
      checkins: {
        '2026-04-25': { mood: 4 },                       // no energy
        '2026-04-26': { mood: 4, energy: 3 },
        '2026-04-27': { mood: 4, energy: 3 },
        '2026-04-28': { mood: 4, energy: 3 },
        '2026-04-29': { mood: 4, energy: 3 },
      },
    };
    const avg = getCheckinAverages(logs, 7, 5);
    expect(avg.mood).toBe(4);
    expect(avg.energy).toBe(3);  // averaged across 4 present values
  });
});
