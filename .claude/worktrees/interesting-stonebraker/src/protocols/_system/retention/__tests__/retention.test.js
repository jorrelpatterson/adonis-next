// src/protocols/_system/retention/__tests__/retention.test.js
import { describe, it, expect } from 'vitest';
import { checkRetention } from '../index.js';

const TODAY = '2026-04-06';

// Helper: build a routineLogs object with activity on specified dates
function makeLogs(activeDates) {
  const logs = {};
  for (const d of activeDates) {
    logs[d] = ['completed_workout'];
  }
  return { routine: logs };
}

// Helper: offset a date by N days from TODAY
function offsetDate(days) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('checkRetention', () => {
  it('returns empty when no triggers fire (recent activity, on_track goal)', () => {
    const logs = makeLogs([
      offsetDate(-1),
      offsetDate(-2),
      offsetDate(-3),
    ]);
    const goals = [
      { id: 'g1', trend: 'on_track', lastProgressDate: offsetDate(-3) },
    ];
    const protocolStates = {
      peptides: { lastDoseDate: offsetDate(-1), maxGapDays: 3 },
    };
    const profile = { renewalDate: offsetDate(30) };

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    expect(result).toEqual([]);
  });

  it('detects broken streak (3+ consecutive missed days) with encouraging tone', () => {
    // Last active 4 days ago → 3 consecutive missed days (days -1, -2, -3)
    const logs = makeLogs([offsetDate(-4)]);
    const goals = [];
    const protocolStates = {};
    const profile = {};

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    const streakIntervention = result.find(r => r.signal === 'streak_broken');

    expect(streakIntervention).toBeDefined();
    expect(streakIntervention.response.tone).toBe('encouraging');
  });

  it('detects peptide gap (lastDoseDate + maxGapDays exceeded)', () => {
    // Last dose 8 days ago, max gap is 7 days
    const logs = makeLogs([offsetDate(-1), offsetDate(-2), offsetDate(-3)]);
    const goals = [];
    const protocolStates = {
      peptides: { lastDoseDate: offsetDate(-8), maxGapDays: 7 },
    };
    const profile = {};

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    const peptideIntervention = result.find(r => r.signal === 'peptide_gap');

    expect(peptideIntervention).toBeDefined();
    expect(peptideIntervention.goalId).toBeNull();
  });

  it('detects stalled goal (trend===stalled + lastProgressDate 14+ days ago)', () => {
    const logs = makeLogs([offsetDate(-1), offsetDate(-2), offsetDate(-3)]);
    const goals = [
      {
        id: 'goal_lose_weight',
        title: 'Lose Weight',
        trend: 'stalled',
        lastProgressDate: offsetDate(-20),
      },
    ];
    const protocolStates = {};
    const profile = {};

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    const stalledIntervention = result.find(r => r.signal === 'goal_stalled');

    expect(stalledIntervention).toBeDefined();
    expect(stalledIntervention.goalId).toBe('goal_lose_weight');
    expect(stalledIntervention.response.showProgressChart).toBe(true);
  });

  it('does NOT fire stalled if progress is recent (2 days ago)', () => {
    const logs = makeLogs([offsetDate(-1), offsetDate(-2), offsetDate(-3)]);
    const goals = [
      {
        id: 'goal_lose_weight',
        title: 'Lose Weight',
        trend: 'stalled',
        lastProgressDate: offsetDate(-2),
      },
    ];
    const protocolStates = {};
    const profile = {};

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    const stalledIntervention = result.find(r => r.signal === 'goal_stalled');

    expect(stalledIntervention).toBeUndefined();
  });

  it('detects low engagement before renewal (renewalDate within 7 days + weekly completion <30%)', () => {
    // Only 1 active day out of 7 = ~14% completion
    const logs = makeLogs([offsetDate(-5)]);
    const goals = [];
    const protocolStates = {};
    const profile = { renewalDate: offsetDate(3) };

    const result = checkRetention(profile, logs, goals, protocolStates, TODAY);
    const renewalIntervention = result.find(r => r.signal === 'low_engagement_pre_renewal');

    expect(renewalIntervention).toBeDefined();
    expect(renewalIntervention.response.tone).toBe('urgent');
    expect(renewalIntervention.response.cta).toBeDefined();
  });
});
