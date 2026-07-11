// The archive shipped WeeklyRecap with zero tests — that's how both ported
// bugs (profile.targetCal doesn't exist; meals summed via m.cals instead of
// FoodLogger's m.cal) survived undetected. These tests seed a week where the
// expected calsOnTarget is nonzero, which only happens if both fixes hold.

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import WeeklyRecap, { isRecapDay, buildWeekStats } from '../WeeklyRecap.jsx';

// Week under test: Mon 2026-01-05 .. Sun 2026-01-11 (today = 2026-01-11).
const TODAY = '2026-01-11';

function baseProfile(overrides = {}) {
  return {
    weight: 200, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'sedentary',
    ...overrides,
  };
}

describe('buildWeekStats — calorie target derivation (archive bug fixes a+b)', () => {
  it('computes a nonzero calsOnTarget by deriving the target from computeAdaptive/calcCalorieTarget (not the nonexistent profile.targetCal) and summing m.cal (not m.cals)', () => {
    // profile.targetCal is intentionally present and bogus — proves it is ignored.
    const profile = baseProfile({ targetCal: 999999 });
    // With this profile + no goal, computeAdaptive's no-goal path resolves
    // adaptedTarget to baseTDEE = 2248 (verified against the live engine).
    // 10% band is [2023.2, 2472.8].
    const logs = {
      routine: {},
      exercise: [],
      weight: [],
      food: {
        // Sum via `cal` (the real FoodLogger field) lands at 2200 — inside
        // the on-target band. If the port still read `m.cals`, every day's
        // total would be 0 and this day would never count.
        '2026-01-08': [{ name: 'Chicken bowl', cal: 1200, p: 90, c: 120, f: 20, time: '12:00' },
                        { name: 'Shake', cal: 1000, p: 40, c: 80, f: 10, time: '18:00' }],
        // Deliberately under target — should NOT count.
        '2026-01-09': [{ name: 'Snack', cal: 500, p: 10, c: 60, f: 10, time: '09:00' }],
      },
    };

    const result = buildWeekStats({ logs, profile, today: TODAY });

    expect(typeof result.calsOnTarget).toBe('number');
    expect(Number.isNaN(result.calsOnTarget)).toBe(false);
    expect(result.calsOnTarget).toBe(1);
    expect(result.calsOnTarget).not.toBe(0);
  });

  it('NaN gate: tolerates a sparse profile with missing weight — calsOnTarget stays a finite number, never NaN', () => {
    const profile = { hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'sedentary' }; // no weight
    const logs = { routine: {}, exercise: [], weight: [], food: {} };

    const result = buildWeekStats({ logs, profile, today: TODAY });

    expect(typeof result.calsOnTarget).toBe('number');
    expect(Number.isNaN(result.calsOnTarget)).toBe(false);
  });
});

describe('buildWeekStats — prCount', () => {
  it('counts isPR entries from logs.exercise that fall within the 7-day window, and excludes entries outside it', () => {
    const profile = baseProfile();
    const logs = {
      routine: {}, weight: [], food: {},
      exercise: [
        { date: '2026-01-06', exercise: 'Bench', sets: [], isPR: true },
        { date: '2026-01-07', exercise: 'Squat', sets: [], isPR: false },
        { date: '2026-01-09', exercise: 'Deadlift', sets: [], isPR: true },
        { date: '2025-12-20', exercise: 'Old PR outside window', sets: [], isPR: true },
      ],
    };

    const result = buildWeekStats({ logs, profile, today: TODAY });

    expect(result.prCount).toBe(2);
    expect(result.workoutCount).toBe(3);
  });
});

describe('buildWeekStats — weightDelta', () => {
  it('computes the delta between the first and last weight entries within the week', () => {
    const profile = baseProfile();
    const logs = {
      routine: {}, exercise: [], food: {},
      weight: [
        { date: '2025-12-01', weight: 210 }, // outside window — ignored
        { date: '2026-01-05', weight: 200 }, // first day of window
        { date: '2026-01-08', weight: 198 },
        { date: '2026-01-11', weight: 196 }, // last day of window
      ],
    };

    const result = buildWeekStats({ logs, profile, today: TODAY });

    expect(result.weightDelta).toBe(-4);
  });

  it('returns null when there is no weight data in the window', () => {
    const profile = baseProfile();
    const logs = { routine: {}, exercise: [], food: {}, weight: [] };
    const result = buildWeekStats({ logs, profile, today: TODAY });
    expect(result.weightDelta).toBeNull();
  });
});

describe('isRecapDay', () => {
  it('returns true on Sunday (UTC)', () => {
    expect(isRecapDay(new Date('2026-01-11T12:00:00Z'))).toBe(true);
  });

  it('returns false on a non-Sunday (UTC)', () => {
    expect(isRecapDay(new Date('2026-01-12T12:00:00Z'))).toBe(false);
  });
});

describe('WeeklyRecap component', () => {
  const stats = {
    tasksLogged: 12, daysWithTasks: 5,
    workoutCount: 3, prCount: 2,
    calsOnTarget: 4, weightDelta: -2.5,
    streakDays: 9,
    weekRange: { start: '2026-01-05', end: '2026-01-11' },
  };

  it('renders the aggregated stats', () => {
    render(<WeeklyRecap stats={stats} onClose={() => {}} />);
    screen.getByText('Sunday Recap');
    // Routine adherence ratio: round(5/7*100) = 71
    screen.getByText('71');
    screen.getByText('5 of 7 days · 12 tasks');
    screen.getByText('3'); // workouts
    screen.getByText('2'); // PRs
    screen.getByText('4'); // cals on target
  });

  it('calls onClose when the Continue button is clicked', () => {
    const onClose = vi.fn();
    render(<WeeklyRecap stats={stats} onClose={onClose} />);
    screen.getByRole('button', { name: 'Continue the Week' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
