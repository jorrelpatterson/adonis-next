import { describe, it, expect } from 'vitest';
import { buildYesterdayRecap, buildCheckinAlerts, buildWeightTrendAlert } from '../intelligence.js';

const TODAY = '2026-04-30';
const YESTERDAY = '2026-04-29';

describe('buildYesterdayRecap', () => {
  it('returns null for empty logs', () => {
    expect(buildYesterdayRecap({}, TODAY)).toBeNull();
    expect(buildYesterdayRecap(null, TODAY)).toBeNull();
  });

  it('returns null when nothing happened yesterday', () => {
    const logs = { checkins: { '2026-04-25': { mood: 4 } }, routine: {}, food: {}, weight: [], exercise: [] };
    expect(buildYesterdayRecap(logs, TODAY)).toBeNull();
  });

  it('counts tasks done yesterday', () => {
    const logs = { routine: { [YESTERDAY]: ['task1', 'task2', 'task3'] } };
    const recap = buildYesterdayRecap(logs, TODAY);
    expect(recap).not.toBeNull();
    expect(recap.tasksDone).toBe(3);
  });

  it('sums calories from yesterday\'s food', () => {
    const logs = { food: { [YESTERDAY]: [{ cal: 500 }, { cal: 300 }, { cal: 250 }] } };
    const recap = buildYesterdayRecap(logs, TODAY);
    expect(recap.calorieTotal).toBe(1050);
  });

  it('counts exercises and PRs', () => {
    const logs = {
      exercise: [
        { date: YESTERDAY, name: 'Squat', isPR: true },
        { date: YESTERDAY, name: 'Bench' },
        { date: '2026-04-28', name: 'Deadlift', isPR: true },
      ],
    };
    const recap = buildYesterdayRecap(logs, TODAY);
    expect(recap.exerciseCount).toBe(2);
    expect(recap.prCount).toBe(1);
  });

  it('computes weight delta from yesterday vs prior', () => {
    const logs = {
      weight: [
        { date: '2026-04-27', weight: 180.5 },
        { date: '2026-04-28', weight: 180.0 },
        { date: YESTERDAY,    weight: 179.6 },
      ],
    };
    const recap = buildYesterdayRecap(logs, TODAY);
    expect(recap.weightDelta).toBe(-0.4);
  });

  it('surfaces yesterday\'s check-in metrics', () => {
    const logs = { checkins: { [YESTERDAY]: { mood: 4, energy: 5, sleep: 3 } } };
    const recap = buildYesterdayRecap(logs, TODAY);
    expect(recap.checkin.mood).toBe(4);
  });
});

describe('buildCheckinAlerts', () => {
  it('returns empty when fewer than 3 days of data', () => {
    expect(buildCheckinAlerts({ checkins: {} })).toEqual([]);
    expect(buildCheckinAlerts({ checkins: { '2026-04-29': { mood: 3 } } })).toEqual([]);
  });

  it('warns when sleep is consistently low', () => {
    const logs = {
      checkins: {
        '2026-04-25': { mood: 3, energy: 3, sleep: 2, stress: 4, soreness: 4 },
        '2026-04-26': { mood: 3, energy: 3, sleep: 2, stress: 4, soreness: 4 },
        '2026-04-27': { mood: 3, energy: 3, sleep: 2, stress: 4, soreness: 4 },
        '2026-04-28': { mood: 3, energy: 3, sleep: 2, stress: 4, soreness: 4 },
        '2026-04-29': { mood: 3, energy: 3, sleep: 2, stress: 4, soreness: 4 },
      },
    };
    const alerts = buildCheckinAlerts(logs);
    expect(alerts.some(a => /sleep/i.test(a.title))).toBe(true);
  });

  it('flags peak day when energy + sleep + mood all high', () => {
    const logs = {
      checkins: {
        '2026-04-25': { mood: 5, energy: 5, sleep: 5, stress: 5, soreness: 5 },
        '2026-04-26': { mood: 5, energy: 5, sleep: 5, stress: 5, soreness: 5 },
        '2026-04-27': { mood: 5, energy: 5, sleep: 5, stress: 5, soreness: 5 },
        '2026-04-28': { mood: 5, energy: 5, sleep: 5, stress: 5, soreness: 5 },
        '2026-04-29': { mood: 5, energy: 5, sleep: 5, stress: 5, soreness: 5 },
      },
    };
    const alerts = buildCheckinAlerts(logs);
    expect(alerts.some(a => /peak/i.test(a.title))).toBe(true);
  });

  it('caps at 3 alerts', () => {
    const logs = {
      checkins: {
        '2026-04-25': { mood: 1, energy: 1, sleep: 1, stress: 1, soreness: 1 },
        '2026-04-26': { mood: 1, energy: 1, sleep: 1, stress: 1, soreness: 1 },
        '2026-04-27': { mood: 1, energy: 1, sleep: 1, stress: 1, soreness: 1 },
        '2026-04-28': { mood: 1, energy: 1, sleep: 1, stress: 1, soreness: 1 },
        '2026-04-29': { mood: 1, energy: 1, sleep: 1, stress: 1, soreness: 1 },
      },
    };
    const alerts = buildCheckinAlerts(logs);
    expect(alerts.length).toBeLessThanOrEqual(3);
  });
});

describe('buildWeightTrendAlert', () => {
  it('returns null when fewer than 5 weight entries', () => {
    expect(buildWeightTrendAlert({ weight: [] }, {})).toBeNull();
    expect(buildWeightTrendAlert({ weight: [{ date: '2026-04-29', weight: 180 }] }, {})).toBeNull();
  });

  it('flags "almost at goal" when within 1 lb', () => {
    const logs = {
      weight: Array.from({ length: 7 }, (_, i) => ({
        date: '2026-04-2' + (3 + i), weight: 175.5 - i * 0.1,
      })),
    };
    const alert = buildWeightTrendAlert(logs, { weight: 175, goalW: 174.5 });
    expect(alert).not.toBeNull();
    expect(/almost there|goal/i.test(alert.title)).toBe(true);
  });

  it('warns when losing trends in wrong direction', () => {
    const logs = {
      weight: [
        { date: '2026-04-23', weight: 178 },
        { date: '2026-04-24', weight: 178.5 },
        { date: '2026-04-25', weight: 179 },
        { date: '2026-04-26', weight: 179.5 },
        { date: '2026-04-27', weight: 180 },
        { date: '2026-04-28', weight: 180.3 },
        { date: '2026-04-29', weight: 180.6 },
      ],
    };
    const alert = buildWeightTrendAlert(logs, { weight: 180.6, goalW: 170 });
    expect(alert).not.toBeNull();
    expect(/up|wrong/i.test(alert.title.toLowerCase() + alert.body.toLowerCase())).toBe(true);
  });

  it('returns null when no goal set', () => {
    const logs = {
      weight: Array.from({ length: 7 }, (_, i) => ({
        date: '2026-04-2' + (3 + i), weight: 180,
      })),
    };
    const alert = buildWeightTrendAlert(logs, {});
    // Without goalW, only "almost at goal" can fire (and won't, since goal is missing)
    expect(alert).toBeNull();
  });
});
