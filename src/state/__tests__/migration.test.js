// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { migrateV1ToV2 } from '../migration';

const MOCK_V1 = {
  prof: {
    name: 'Jorrel',
    age: '40',
    gender: 'Male',
    weight: '210',
    goalW: '185',
    hFt: '5',
    hIn: '10',
    activity: 'active',
    primary: 'Muscle Gain',
    secondary: 'Fat Loss',
    goals: ['Muscle Gain', 'Fat Loss'],
    domains: ['body', 'money', 'image'],
    trainPref: 'morning',
  },
  subTier: 'pro',
  wkLogs: { 'Muscle Gain|7|1|Bench Press|0': { weight: '225', reps: '5' } },
  wkPRs: { 'Muscle Gain|Bench Press': { weight: 225, reps: 5 } },
  foodLogs: { '2026-04-04': [{ name: 'Chicken Breast', cal: 280, p: 53, c: 0, f: 6 }] },
  weightLog: [{ date: '2026-04-04', weight: 210 }],
  checkins: { '2026-04-04': { mood: 4, energy: 3 } },
  checkedR: { '4-peptide-0': true, '4-morning-1': true },
  activePeps: [{ id: 9, name: 'Tirzepatide 30mg' }],
};

describe('migrateV1ToV2', () => {
  it('migrates profile fields', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.profile.name).toBe('Jorrel');
    expect(v2.profile.weight).toBe('210');
    expect(v2.profile.tier).toBe('pro');
    expect(v2.profile.domains).toEqual(['body', 'money', 'image']);
  });

  it('migrates weight log', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.weight).toEqual([{ date: '2026-04-04', weight: 210 }]);
  });

  it('migrates food logs', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.food['2026-04-04']).toHaveLength(1);
    expect(v2.logs.food['2026-04-04'][0].name).toBe('Chicken Breast');
  });

  it('migrates checkins', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.checkins['2026-04-04'].mood).toBe(4);
  });

  it('migrates active peptides to protocol state', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.activePeptides).toHaveLength(1);
    expect(v2.protocolState.peptides.activePeptides[0].name).toBe('Tirzepatide 30mg');
  });

  it('returns null if no v1 data exists', () => {
    const v2 = migrateV1ToV2(null);
    expect(v2).toBeNull();
  });
});
