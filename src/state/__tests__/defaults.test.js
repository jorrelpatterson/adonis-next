import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from '../defaults';

describe('expanded state defaults', () => {
  it('has protocolState with all domains', () => {
    expect(DEFAULT_STATE.protocolState).toHaveProperty('workout');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('peptides');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('credit');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('income');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('citizenship');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('image');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('mind');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('purpose');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('environment');
    expect(DEFAULT_STATE.protocolState).toHaveProperty('community');
  });

  it('workout state has wkLogs and wkPRs', () => {
    expect(DEFAULT_STATE.protocolState.workout.wkWeek).toBe(1);
    expect(DEFAULT_STATE.protocolState.workout.wkLogs).toEqual({});
    expect(DEFAULT_STATE.protocolState.workout.wkPRs).toEqual({});
  });

  it('peptides state has activeCycles and supplyInv', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.peptides.activeCycles)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.peptides.supplyInv)).toBe(true);
  });

  it('credit state has ccWallet and disputes', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.credit.ccWallet)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.credit.disputes)).toBe(true);
    expect(DEFAULT_STATE.protocolState.credit.repairAuto).toBe(true);
  });

  it('profile has targetDate and cycleData', () => {
    expect(DEFAULT_STATE.profile).toHaveProperty('targetDate');
    expect(DEFAULT_STATE.profile).toHaveProperty('cycleData');
  });

  it('logs has bodyMeasurements', () => {
    expect(Array.isArray(DEFAULT_STATE.logs.bodyMeasurements)).toBe(true);
  });

  it('mind state has mindSessions and mindStreak', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.mind.mindSessions)).toBe(true);
    expect(DEFAULT_STATE.protocolState.mind.mindStreak).toBe(0);
  });

  it('purpose state has bucketList and coreValues', () => {
    expect(Array.isArray(DEFAULT_STATE.protocolState.purpose.bucketList)).toBe(true);
    expect(Array.isArray(DEFAULT_STATE.protocolState.purpose.coreValues)).toBe(true);
  });

  it('environment state has envScores with 6 areas', () => {
    const env = DEFAULT_STATE.protocolState.environment;
    expect(env.envScores).toHaveProperty('sleep');
    expect(env.envScores).toHaveProperty('workspace');
    expect(env.envScores).toHaveProperty('air');
    expect(env.envScores).toHaveProperty('light');
    expect(env.envScores).toHaveProperty('digital');
    expect(env.envScores).toHaveProperty('cleanliness');
  });
});
