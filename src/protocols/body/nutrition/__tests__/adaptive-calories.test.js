import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeAdaptive, actualWeeklyRate } from '../adaptive-calories';

// Time is pinned because targetDate/cycle math is date-driven; computeAdaptive
// takes `today` as an explicit param in every call below, but we still pin
// system time per the task brief so any latent Date.now() reads are inert.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

function maleProfile(overrides = {}) {
  return { weight: 200, hFt: 5, hIn: 10, age: 30, gender: 'male', activity: 'sedentary', ...overrides };
}

describe('computeAdaptive — pace classification matrix', () => {
  // Shared setup: required weekly rate pinned at -1.0 lbs/wk (lbsToGo -4 over
  // 4 weeks / 28 days), well within the 2.5 lbs/wk safety max so isUnrealistic
  // never fires. actualRate is engineered via a 7-day-apart first/last log
  // entry so actualWeeklyRate's dailyRate*7 collapses to (last - first).
  function ratioCase(ratio) {
    const today = '2026-01-01';
    const targetDate = '2026-01-29'; // 28 days => 4 weeks
    const actualRate = ratio * -1.0; // required is -1.0 lbs/wk (losing)
    const w0 = 200;
    const w2 = w0 + actualRate;
    const weightLog = [
      { date: '2025-12-25', weight: w0 },
      { date: '2025-12-28', weight: w0 },
      { date: '2026-01-01', weight: w2 },
    ];
    const goalW = w2 - 4; // lbsToGo = -4
    const profile = maleProfile({ weight: w2, goalW, targetDate });
    return computeAdaptive(profile, weightLog, today, 'Fat Loss');
  }

  it('ratio 0.3 (well under required) → off_pace, extreme workout', () => {
    const res = ratioCase(0.3);
    expect(res.pace).toBe('off_pace');
    expect(res.workoutMode).toBe('extreme');
    expect(res.paceLabel).toBe('Off Pace — Pushing Harder');
  });

  it('ratio 0.6 (under required) → behind, high workout', () => {
    const res = ratioCase(0.6);
    expect(res.pace).toBe('behind');
    expect(res.workoutMode).toBe('high');
    expect(res.paceLabel).toBe('Slightly Behind — Tightening Up');
  });

  it('ratio 1.0 (exactly required) → on_track, normal workout', () => {
    const res = ratioCase(1.0);
    expect(res.pace).toBe('on_track');
    expect(res.workoutMode).toBe('normal');
    expect(res.paceLabel).toBe('On Track');
  });

  it('ratio 1.5 (well over required) → ahead, recovery workout', () => {
    const res = ratioCase(1.5);
    expect(res.pace).toBe('ahead');
    expect(res.workoutMode).toBe('recovery');
    expect(res.paceLabel).toBe('Ahead — Recovery Mode');
  });

  it('wrong-direction progress (gaining while goal is losing) → off_pace regardless of ratio', () => {
    const today = '2026-01-01';
    const targetDate = '2026-02-19'; // 49 days => 7 weeks
    const weightLog = [
      { date: '2025-12-20', weight: 198 },
      { date: '2025-12-27', weight: 199 },
      { date: '2026-01-01', weight: 200 }, // gaining trend
    ];
    const profile = maleProfile({ gender: 'female', hIn: 2, activity: 'active', weight: 200, goalW: 182.5, targetDate });
    const res = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    expect(res.pace).toBe('off_pace');
    expect(res.direction).toBe('losing');
    expect(res.actualRate).toBeGreaterThan(0); // moving wrong way
  });

  it('required rate beyond safe max → unrealistic, extreme workout', () => {
    const today = '2026-01-01';
    const targetDate = '2026-01-29'; // 28 days => 4 weeks
    const profile = maleProfile({ goalW: 170, targetDate }); // lbsToGo -30 / 4wk = -7.5 (> 2.5 max)
    const res = computeAdaptive(profile, [], today, 'Fat Loss');
    expect(res.requiredWeeklyRate).toBe(-7.5);
    expect(res.pace).toBe('unrealistic');
    expect(res.workoutMode).toBe('extreme');
    expect(res.paceLabel).toBe('Off Pace — Goal Aggressive');
  });

  it('lbsToGo within 0.5 lbs → direction "maintain", pace "on_track" (paceLabel "On Track")', () => {
    // NOTE: the ported archive's paceLabel ternary has a `pace === 'maintain'
    // ? 'Maintenance'` branch, but computeAdaptive's pace-selection logic
    // maps direction === 'maintain' to pace = 'on_track', never pace =
    // 'maintain' — so that branch is unreachable dead code (verbatim from
    // v2-revival-archive). Documenting rather than "fixing", per the task's
    // verbatim-port constraint.
    const today = '2026-01-01';
    const targetDate = '2026-01-29';
    const profile = maleProfile({ goalW: 200.2, targetDate }); // lbsToGo 0.2 < 0.5
    const res = computeAdaptive(profile, [], today, 'Fat Loss');
    expect(res.direction).toBe('maintain');
    expect(res.pace).toBe('on_track');
    expect(res.paceLabel).toBe('On Track');
  });
});

describe('computeAdaptive — safety floors', () => {
  it('floors male adapted target at 1800 cal when required deficit would go lower', () => {
    const today = '2026-01-01';
    const targetDate = '2026-01-29'; // 4 weeks
    const weightLog = [
      { date: '2025-12-20', weight: 198 },
      { date: '2025-12-27', weight: 199 },
      { date: '2026-01-01', weight: 200 }, // gaining → off_pace regardless of ratio
    ];
    const profile = maleProfile({ goalW: 192, targetDate }); // lbsToGo -8 / 4wk = -2.0
    const res = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    expect(res.pace).toBe('off_pace');
    expect(res.adaptedTarget).toBe(1800);
  });

  it('floors female adapted target at 1500 cal when required deficit would go lower', () => {
    const today = '2026-01-01';
    const targetDate = '2026-02-19'; // 49 days => 7 weeks
    const weightLog = [
      { date: '2025-12-20', weight: 198 },
      { date: '2025-12-27', weight: 199 },
      { date: '2026-01-01', weight: 200 }, // gaining → off_pace regardless of ratio
    ];
    const profile = { weight: 200, hFt: 5, hIn: 2, age: 30, gender: 'female', activity: 'active', goalW: 182.5, targetDate }; // lbsToGo -17.5 / 7wk = -2.5 (== safe max, not unrealistic)
    const res = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    expect(res.requiredWeeklyRate).toBe(-2.5);
    expect(res.pace).toBe('off_pace');
    expect(res.adaptedTarget).toBe(1500);
  });
});

describe('computeAdaptive — no-goal path', () => {
  it('returns pace "no_goal" with a placeholder paceLabel when goalW/targetDate are missing', () => {
    const res = computeAdaptive(maleProfile(), [], '2026-01-01', 'Fat Loss');
    expect(res.pace).toBe('no_goal');
    expect(res.direction).toBe('unset');
    expect(res.paceLabel).toBe('Set a goal weight + date to activate adaptive mode');
    expect(res.requiredWeeklyRate).toBeNull();
    expect(res.actualRate).toBeNull();
    expect(res.weeksRemaining).toBeNull();
    expect(res.daysRemaining).toBeNull();
    expect(res.lbsToGo).toBeNull();
  });
});

describe('computeAdaptive — NaN gate (Task 3 hard gate)', () => {
  function assertNoNaN(res) {
    for (const [key, value] of Object.entries(res)) {
      if (typeof value === 'number') {
        expect(Number.isNaN(value), `${key} should not be NaN`).toBe(false);
      }
    }
  }

  it('empty profile {} never NaN-propagates — pace is "no_goal", all numeric fields finite', () => {
    const res = computeAdaptive({}, [], '2026-01-01', 'Fat Loss');
    expect(res.pace).toBe('no_goal');
    assertNoNaN(res);
  });

  it('profile with weight: undefined but goalW/targetDate set never NaN-propagates', () => {
    const res = computeAdaptive({ weight: undefined, goalW: 180, targetDate: '2026-06-01' }, [], '2026-01-01', 'Fat Loss');
    // current weight falls back to 0 (falsy) since weightLog is empty and
    // profile.weight is undefined, so the no-goal/missing-data early return
    // still fires — but the important assertion is that nothing NaNs.
    expect(res.pace).toBe('no_goal');
    assertNoNaN(res);
  });

  it('profile with all numeric fields undefined and a real weight log never NaN-propagates', () => {
    const weightLog = [
      { date: '2025-12-20', weight: 198 },
      { date: '2025-12-27', weight: 199 },
      { date: '2026-01-01', weight: 200 },
    ];
    const res = computeAdaptive({ weight: undefined, hFt: undefined, hIn: undefined, age: undefined, goalW: 180, targetDate: '2026-06-01' }, weightLog, '2026-01-01', 'Fat Loss');
    assertNoNaN(res);
  });
});

describe('computeAdaptive — cycle bump (v2 addition beyond archive)', () => {
  const cycleData = { enabled: true, lastPeriod: '2026-01-01', cycleLength: 28 };
  const weightLog = [
    { date: '2025-12-25', weight: 200 },
    { date: '2025-12-28', weight: 200 },
    { date: '2026-01-20', weight: 199 },
  ];

  it('adds +150 cal to adaptedTarget and exposes cycle info during luteal phase', () => {
    const today = '2026-01-20'; // dayInCycle 20 → luteal (17-28)
    const targetDate = '2026-02-17'; // 4 weeks out
    const profile = maleProfile({ goalW: 196, targetDate, cycleData });
    const withCycle = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    const withoutCycle = computeAdaptive({ ...profile, cycleData: undefined }, weightLog, today, 'Fat Loss');

    expect(withCycle.cycle).not.toBeNull();
    expect(withCycle.cycle.phase.id).toBe('luteal');
    expect(withCycle.cycle.phase.calMod).toBe(150);
    expect(withCycle.adaptedTarget).toBe(withoutCycle.adaptedTarget + 150);
  });

  it('adds +0 cal to adaptedTarget and exposes cycle info during follicular phase', () => {
    const today = '2026-01-10'; // dayInCycle 10 → follicular (6-13)
    const targetDate = '2026-02-07'; // 4 weeks out
    const profile = maleProfile({ goalW: 196, targetDate, cycleData });
    const withCycle = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    const withoutCycle = computeAdaptive({ ...profile, cycleData: undefined }, weightLog, today, 'Fat Loss');

    expect(withCycle.cycle).not.toBeNull();
    expect(withCycle.cycle.phase.id).toBe('follicular');
    expect(withCycle.cycle.phase.calMod).toBe(0);
    expect(withCycle.adaptedTarget).toBe(withoutCycle.adaptedTarget);
  });

  it('cycle is null when profile.cycleData is absent', () => {
    const today = '2026-01-20';
    const targetDate = '2026-02-17';
    const profile = maleProfile({ goalW: 196, targetDate });
    const res = computeAdaptive(profile, weightLog, today, 'Fat Loss');
    expect(res.cycle).toBeNull();
  });
});

describe('actualWeeklyRate', () => {
  it('returns null with fewer than 3 entries (archive threshold — verbatim, not the "<5" figure in the task brief)', () => {
    expect(actualWeeklyRate([])).toBeNull();
    expect(actualWeeklyRate([{ date: '2026-01-01', weight: 200 }])).toBeNull();
    expect(actualWeeklyRate([
      { date: '2026-01-01', weight: 200 },
      { date: '2026-01-08', weight: 198 },
    ])).toBeNull();
  });

  it('computes signed lbs/week from first/last entries in the window with >= 3 entries', () => {
    const rate = actualWeeklyRate([
      { date: '2026-01-01', weight: 200 },
      { date: '2026-01-04', weight: 199 },
      { date: '2026-01-08', weight: 198 },
    ]);
    expect(rate).toBe(-2); // (198-200)/7 days * 7 = -2 lbs/wk
  });

  it('returns null when not Array.isArray(weightLog)', () => {
    expect(actualWeeklyRate(null)).toBeNull();
    expect(actualWeeklyRate(undefined)).toBeNull();
  });
});
