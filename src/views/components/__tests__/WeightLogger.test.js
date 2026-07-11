// source: v2-revival-archive:src/views/components/__tests__/WeightLogger.test.js
//
// Ported verbatim (helper-function suites below are unchanged from the
// archive — computeWeeklyTrend there is a genuine last-14-day linear
// regression slope, not a first/last-window average like Task 4's
// actualWeeklyRate turned out to be, so no adaptation was needed).
//
// Added (per task-12 brief step 2):
// - "crossing the goal weight (losing direction) mounts GoalCompleteScreen"
//   — exercises the WeightLogger -> GoalCompleteScreen wiring end to end.
// - "same-date re-log replaces the existing entry rather than duplicating it"
//   — exact array-length assertion on the `log('weight', [...])` call.
//
// This file keeps the archive's `.test.js` (not `.test.jsx`) extension.
// The project's vite/esbuild transform only enables JSX parsing for
// `.jsx`/`.tsx` files (see FoodLogger.test.js), so the new render-based
// tests below use `React.createElement` directly instead of JSX syntax.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../design/sound', () => ({
  sound: { success: vi.fn(), pr: vi.fn() },
}));
vi.mock('../../../design/haptics', () => ({
  haptics: { success: vi.fn() },
}));

import WeightLogger, {
  getTodaysWeight,
  getStartingWeight,
  computeWeeklyTrend,
  getLast14Days,
  isMovingTowardGoal,
} from '../WeightLogger';
import { sound } from '../../../design/sound';
import { haptics } from '../../../design/haptics';

afterEach(() => {
  vi.clearAllMocks();
});

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

// ─── Component behavior (new, per task-12 brief step 2) ───────────────────

describe('WeightLogger — goal-cross ceremony', () => {
  it('logging a weight at/past goalW in the losing direction mounts GoalCompleteScreen', () => {
    const profile = { goalW: 170 };
    // startW = 190 (first chronological), currentW = 172 (latest, no
    // today's entry yet) — goalDir = 'lose' since goalW(170) < startW(190),
    // and currentW(172) is still short of goalW(170).
    const logs = {
      weight: [
        { date: '2026-06-01', weight: 190 },
        { date: '2026-06-15', weight: 180 },
        { date: '2026-07-01', weight: 172 },
      ],
    };
    const logFn = vi.fn();

    render(React.createElement(WeightLogger, { profile, logs, log: logFn }));

    // No entry logged today yet, so the input placeholder shows the latest
    // (most recent) weight — 172 — and the button reads "Log".
    const input = screen.getByPlaceholderText('172');
    fireEvent.change(input, { target: { value: '169' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));

    // The log call happened...
    expect(logFn).toHaveBeenCalledTimes(1);
    expect(logFn.mock.calls[0][0]).toBe('weight');
    // ...and crossing goalW (169 <= 170, coming from 172 > 170) fires the
    // celebration screen (local state, independent of the `logs` prop).
    screen.getByText(/Hit your goal weight: 170 lbs/);
    expect(sound.pr).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalled();
  });

  it('does not mount GoalCompleteScreen when the logged weight does not cross the goal', () => {
    const profile = { goalW: 170 };
    const logs = {
      weight: [
        { date: '2026-06-01', weight: 190 },
        { date: '2026-06-15', weight: 180 },
        { date: '2026-07-01', weight: 178 },
      ],
    };
    const logFn = vi.fn();

    render(React.createElement(WeightLogger, { profile, logs, log: logFn }));

    const input = screen.getByPlaceholderText('178');
    fireEvent.change(input, { target: { value: '176' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));

    expect(logFn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Goal Complete/)).toBeNull();
  });
});

describe('WeightLogger — same-date re-log', () => {
  it('replaces todays entry instead of duplicating it (exact array-length assertion)', () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const profile = {};
    const logs = { weight: [{ date: todayKey, weight: 180 }] };
    const logFn = vi.fn();

    render(React.createElement(WeightLogger, { profile, logs, log: logFn }));

    const input = screen.getByPlaceholderText('180');
    fireEvent.change(input, { target: { value: '178' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [key, next] = logFn.mock.calls[0];
    expect(key).toBe('weight');
    // Same-date re-log REPLACES — still exactly one entry, not two.
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ date: todayKey, weight: 178 });
  });
});
