import { describe, it, expect } from 'vitest';
import {
  getTodaysWeight,
  getStartingWeight,
  computeWeeklyTrend,
  getLast14Days,
  isMovingTowardGoal,
} from '../WeightLogger';

describe('getTodaysWeight', () => {
  it('returns todays entry when present', () => {
    const log = [
      { date: '2026-04-27', weight: 181 },
      { date: '2026-04-28', weight: 180.5 },
    ];
    expect(getTodaysWeight(log, '2026-04-28')).toEqual({ date: '2026-04-28', weight: 180.5 });
  });

  it('returns null when today is not logged', () => {
    const log = [{ date: '2026-04-27', weight: 181 }];
    expect(getTodaysWeight(log, '2026-04-28')).toBeNull();
  });

  it('returns null for empty/missing logs', () => {
    expect(getTodaysWeight([], '2026-04-28')).toBeNull();
    expect(getTodaysWeight(null, '2026-04-28')).toBeNull();
    expect(getTodaysWeight(undefined, '2026-04-28')).toBeNull();
  });
});

describe('getStartingWeight', () => {
  it('returns the first chronological entry weight', () => {
    const log = [
      { date: '2026-04-15', weight: 184 },
      { date: '2026-04-01', weight: 188 },
      { date: '2026-04-10', weight: 186 },
    ];
    expect(getStartingWeight(log)).toBe(188);
  });

  it('returns null when log is empty', () => {
    expect(getStartingWeight([])).toBeNull();
    expect(getStartingWeight(null)).toBeNull();
  });

  it('skips entries missing date or weight', () => {
    const log = [
      { date: '', weight: 200 },
      { date: '2026-04-05', weight: 195 },
    ];
    expect(getStartingWeight(log)).toBe(195);
  });
});

describe('computeWeeklyTrend', () => {
  it('returns null when fewer than 5 readings', () => {
    expect(computeWeeklyTrend([])).toBeNull();
    expect(computeWeeklyTrend([
      { date: '2026-04-01', weight: 180 },
      { date: '2026-04-02', weight: 179.5 },
      { date: '2026-04-03', weight: 179 },
      { date: '2026-04-04', weight: 178.5 },
    ])).toBeNull();
  });

  it('returns negative slope (lbs/week) for decreasing weight', () => {
    // 7 daily readings, dropping 0.5 lbs/day → -3.5 lbs/wk
    const log = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-0${i + 1}`,
      weight: 180 - i * 0.5,
    }));
    const slope = computeWeeklyTrend(log);
    expect(slope).toBeCloseTo(-3.5, 1);
  });

  it('returns positive slope for increasing weight', () => {
    const log = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-0${i + 1}`,
      weight: 170 + i * 0.3,
    }));
    const slope = computeWeeklyTrend(log);
    expect(slope).toBeCloseTo(2.1, 1);
  });

  it('returns ~0 for flat weight', () => {
    const log = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-0${i + 1}`,
      weight: 175,
    }));
    expect(computeWeeklyTrend(log)).toBe(0);
  });
});

describe('getLast14Days', () => {
  it('returns 14 entries with nulls for missing days', () => {
    const log = [
      { date: '2026-04-25', weight: 180 },
      { date: '2026-04-28', weight: 179 },
    ];
    const out = getLast14Days(log, '2026-04-28');
    expect(out).toHaveLength(14);
    expect(out[out.length - 1]).toEqual({ date: '2026-04-28', weight: 179 });
    expect(out[out.length - 4]).toEqual({ date: '2026-04-25', weight: 180 });
    // Day in between with no reading is null.
    expect(out[out.length - 2].weight).toBeNull();
  });

  it('returns 14 nulls for empty log', () => {
    const out = getLast14Days([], '2026-04-28');
    expect(out).toHaveLength(14);
    expect(out.every(d => d.weight === null)).toBe(true);
  });

  it('starts 13 days before the reference date', () => {
    const out = getLast14Days([], '2026-04-28');
    expect(out[0].date).toBe('2026-04-15');
    expect(out[13].date).toBe('2026-04-28');
  });
});

describe('isMovingTowardGoal', () => {
  it('returns true when losing weight toward a lower goal', () => {
    expect(isMovingTowardGoal(180, 190, 175)).toBe(true);
  });

  it('returns false when gaining weight when goal is lower', () => {
    expect(isMovingTowardGoal(195, 190, 175)).toBe(false);
  });

  it('returns true when gaining weight toward a higher goal', () => {
    expect(isMovingTowardGoal(165, 160, 175)).toBe(true);
  });

  it('returns false when losing weight when goal is higher', () => {
    expect(isMovingTowardGoal(155, 160, 175)).toBe(false);
  });

  it('returns null when any input is missing or invalid', () => {
    expect(isMovingTowardGoal(null, 180, 175)).toBeNull();
    expect(isMovingTowardGoal(180, null, 175)).toBeNull();
    expect(isMovingTowardGoal(180, 190, null)).toBeNull();
    expect(isMovingTowardGoal('', 190, 175)).toBeNull();
  });

  it('returns null when start equals goal (no direction)', () => {
    expect(isMovingTowardGoal(180, 175, 175)).toBeNull();
  });
});
