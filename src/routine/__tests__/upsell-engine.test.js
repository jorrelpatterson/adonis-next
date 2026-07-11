// src/routine/__tests__/upsell-engine.test.js
import { describe, it, expect } from 'vitest';
import { checkUpsells, countSkippedTasks } from '../upsell-engine.js';

// Shared helpers
const eliteProfile = { tier: 'elite' };
const freeProfile = { tier: 'free' };
const proProfile = { tier: 'pro' };

describe('checkUpsells', () => {
  it('returns empty array when nothing triggers (tier: elite)', () => {
    const goals = [{ id: 'g1', percent: 50 }];
    const protocolStates = [{ protocolId: 'trt', supplyDaysLeft: 10, activeProduct: 'Testosterone' }];
    const result = checkUpsells(goals, protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });

  it('suggests pro upgrade for free user with >20% progress', () => {
    const goals = [{ id: 'g1', percent: 25 }];
    const result = checkUpsells(goals, [], freeProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tier_upgrade');
    expect(result[0].target).toBe('pro');
  });

  it('does not suggest pro upgrade for free user with <=20% progress', () => {
    const goals = [{ id: 'g1', percent: 20 }];
    const result = checkUpsells(goals, [], freeProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });

  it('suggests elite upgrade for pro user skipping 8+ tasks (via skippedThisWeek param)', () => {
    const result = checkUpsells([], [], proProfile, {}, 8, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tier_upgrade');
    expect(result[0].target).toBe('elite');
  });

  it('suggests reorder with urgency high when supply <=2 days', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 2, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('reorder');
    expect(result[0].urgency).toBe('high');
    expect(result[0].product).toBe('Testosterone Cypionate');
  });

  it('suggests reorder with urgency low for 4-5 days supply', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 4, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('reorder');
    expect(result[0].urgency).toBe('low');
  });

  it('does not suggest reorder when supply >5 days', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 6, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });

  it('does not suggest elite upgrade for pro user with a fully-active week (real logs, no override)', () => {
    // Real logs.routine data with completions every day of the trailing window
    // should compute skipped=0 via countSkippedTasks and never trip the (currently
    // unreachable via real data, since max is 7 < threshold 8) elite threshold.
    const logs = { routine: buildRoutineLog({ allDays: ['task1'] }) };
    const result = checkUpsells([], [], proProfile, logs, undefined, undefined);
    expect(result).toEqual([]);
  });
});

// Builds a date-keyed logs.routine fixture for the trailing 7-day window
// (today .. today-6), matching the real `{ 'YYYY-MM-DD': [taskId, ...] }` shape.
function buildRoutineLog({ allDays } = {}) {
  const routine = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (allDays) routine[key] = allDays;
  }
  return routine;
}

describe('countSkippedTasks', () => {
  it('returns 0 for missing/malformed logs', () => {
    expect(countSkippedTasks(null)).toBe(0);
    expect(countSkippedTasks(undefined)).toBe(0);
    expect(countSkippedTasks({})).toBe(0);
  });

  it('ignores the dead array shape (logs.routine as an array of entries)', () => {
    // Old shape: [{ date, completions }] — no longer honored; must not throw
    // and must not be treated as valid data.
    const logs = { routine: [{ date: '2026-04-29', completions: 0 }] };
    expect(countSkippedTasks(logs)).toBe(0);
  });

  it('counts all 7 days as skipped when logs.routine is present but empty', () => {
    // Container exists but every date key in the window is absent.
    expect(countSkippedTasks({ routine: {} })).toBe(7);
  });

  it('does not count a day as skipped when it has at least one completion', () => {
    const logs = { routine: buildRoutineLog({ allDays: ['task1', 'task2'] }) };
    expect(countSkippedTasks(logs)).toBe(0);
  });

  it('counts a day as skipped when its completions array is empty', () => {
    const routine = buildRoutineLog({ allDays: ['task1'] });
    const today = new Date().toISOString().slice(0, 10);
    routine[today] = []; // explicitly logged in, but nothing completed
    const skipped = countSkippedTasks({ routine });
    expect(skipped).toBe(1);
  });

  it('counts a day as skipped when its date key is absent entirely', () => {
    const routine = buildRoutineLog({ allDays: ['task1'] });
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    delete routine[sixDaysAgo.toISOString().slice(0, 10)];
    const skipped = countSkippedTasks({ routine });
    expect(skipped).toBe(1);
  });

  it('only counts skipped days within the trailing 7-day window', () => {
    const routine = buildRoutineLog({ allDays: ['task1'] });
    // A completion logged well outside the window should not offset skips.
    routine['2000-01-01'] = ['old-task'];
    expect(countSkippedTasks({ routine })).toBe(0);
  });
});
