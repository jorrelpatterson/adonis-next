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
  // workout
  wkLogs: { 'Muscle Gain|7|1|Bench Press|0': { weight: '225', reps: '5' } },
  wkPRs: { 'Muscle Gain|Bench Press': { weight: 225, reps: 5 } },
  wkWeek: 7,
  // peptides
  activeCycles: [{ id: 1, name: 'BPC-157 cycle' }],
  supplyInv: [{ id: 9, name: 'Tirzepatide 30mg', qty: 2 }],
  injectionLog: [{ date: '2026-04-04', peptide: 'BPC-157', dose: 250 }],
  pepCart: [],
  orderHistory: [{ id: 'ord_001', total: 199 }],
  shippingInfo: { name: 'Jorrel', address: '123 Main St' },
  // credit
  ccWallet: [{ id: 'cc_001', name: 'Chase Sapphire', limit: 10000, balance: 2000 }],
  disputes: [{ id: 'dp_001', bureau: 'Equifax', status: 'pending' }],
  creditScores: [{ date: '2026-04-01', score: 720, bureau: 'Equifax' }],
  creditFactors: { payment: 95, utilization: 20, ageYears: 5, accounts: 8, inquiries: 1 },
  repairAuto: false,
  // income
  incomeTarget: 5000,
  incomePartnerType: 'affiliate',
  incomeLeads: [{ id: 'lead_001', name: 'John D.' }],
  incomeEarnings: [{ date: '2026-04-01', amount: 500 }],
  // citizenship
  czApps: [{ country: 'Portugal', status: 'researching' }],
  czPassports: [{ country: 'us', visaFree: 186 }, { country: 'pt', visaFree: 190 }],
  czAnswers: { residencyMonths: 12, languageLevel: 'intermediate' },
  // image
  skinType: 'oily',
  skinConcerns: ['acne', 'hyperpigmentation'],
  groomingLog: { '2026-04-04': ['moisturizer', 'spf'] },
  fragranceCollection: [{ name: 'Bleu de Chanel', season: 'all' }],
  wardrobeItems: { shirts: 10, pants: 5 },
  styleArchetype: 'sharp-casual',
  // mind
  mindSessions: [{ date: '2026-04-04', type: 'meditation', duration: 10 }],
  mindStreak: 14,
  mindStack: [{ name: 'Ashwagandha', dose: '600mg' }],
  gratitudeEntries: [{ date: '2026-04-04', entries: ['health', 'family'] }],
  // purpose
  bucketList: [{ item: 'Visit Japan', done: false }],
  coreValues: ['discipline', 'loyalty', 'growth'],
  lifeScores: { body: 8, money: 7, mind: 6 },
  yearlyGoals: [{ year: 2026, goal: 'Hit 7 figures' }],
  // environment
  envScores: { sleep: 8, workspace: 7, air: 6, light: 7, digital: 5, cleanliness: 9 },
  envChecklist: { 'air-purifier': true, 'blackout-curtains': false },
  // logs
  foodLogs: { '2026-04-04': [{ name: 'Chicken Breast', cal: 280, p: 53, c: 0, f: 6 }] },
  weightLog: [{ date: '2026-04-04', weight: 210 }],
  checkins: { '2026-04-04': { mood: 4, energy: 3 } },
  checkedR: { '4-peptide-0': true, '4-morning-1': true },
  bodyMeasurements: [{ date: '2026-04-04', chest: 42, waist: 34 }],
  // legacy field
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

  it('migrates bodyMeasurements to logs', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.bodyMeasurements).toHaveLength(1);
    expect(v2.logs.bodyMeasurements[0].chest).toBe(42);
  });

  it('returns null if no v1 data exists', () => {
    const v2 = migrateV1ToV2(null);
    expect(v2).toBeNull();
  });

  // Workout
  it('migrates wkLogs to protocolState.workout.wkLogs', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.workout.wkLogs).toEqual(MOCK_V1.wkLogs);
  });

  it('migrates wkPRs to protocolState.workout.wkPRs', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.workout.wkPRs).toEqual(MOCK_V1.wkPRs);
  });

  it('migrates wkWeek to protocolState.workout.wkWeek', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.workout.wkWeek).toBe(7);
  });

  // Peptides
  it('migrates activeCycles to protocolState.peptides.activeCycles', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.activeCycles).toHaveLength(1);
    expect(v2.protocolState.peptides.activeCycles[0].name).toBe('BPC-157 cycle');
  });

  it('migrates supplyInv to protocolState.peptides.supplyInv', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.supplyInv).toHaveLength(1);
  });

  it('migrates injectionLog to protocolState.peptides.injectionLog', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.injectionLog).toHaveLength(1);
    expect(v2.protocolState.peptides.injectionLog[0].peptide).toBe('BPC-157');
  });

  it('migrates orderHistory to protocolState.peptides.orderHistory', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.orderHistory).toHaveLength(1);
  });

  it('migrates shippingInfo to protocolState.peptides.shippingInfo', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.shippingInfo.name).toBe('Jorrel');
  });

  it('falls back activePeps to activeCycles when no activeCycles present', () => {
    const v1 = { ...MOCK_V1, activeCycles: undefined };
    const v2 = migrateV1ToV2(v1);
    expect(v2.protocolState.peptides.activeCycles).toHaveLength(1);
    expect(v2.protocolState.peptides.activeCycles[0].name).toBe('Tirzepatide 30mg');
  });

  // Credit
  it('migrates ccWallet to protocolState.credit.ccWallet', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.credit.ccWallet).toHaveLength(1);
    expect(v2.protocolState.credit.ccWallet[0].name).toBe('Chase Sapphire');
  });

  it('migrates disputes to protocolState.credit.disputes', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.credit.disputes).toHaveLength(1);
    expect(v2.protocolState.credit.disputes[0].bureau).toBe('Equifax');
  });

  it('migrates creditScores to protocolState.credit.creditScores', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.credit.creditScores).toHaveLength(1);
    expect(v2.protocolState.credit.creditScores[0].score).toBe(720);
  });

  it('migrates creditFactors to protocolState.credit.creditFactors', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.credit.creditFactors.payment).toBe(95);
  });

  it('migrates repairAuto to protocolState.credit.repairAuto', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.credit.repairAuto).toBe(false);
  });

  // Income
  it('migrates incomeTarget to protocolState.income.incomeTarget', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.income.incomeTarget).toBe(5000);
  });

  it('migrates incomePartnerType to protocolState.income.incomePartnerType', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.income.incomePartnerType).toBe('affiliate');
  });

  it('migrates incomeLeads to protocolState.income.incomeLeads', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.income.incomeLeads).toHaveLength(1);
  });

  it('migrates incomeEarnings to protocolState.income.incomeEarnings', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.income.incomeEarnings).toHaveLength(1);
    expect(v2.protocolState.income.incomeEarnings[0].amount).toBe(500);
  });

  // Citizenship
  it('migrates czApps to protocolState.citizenship.czApps', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.citizenship.czApps).toHaveLength(1);
    expect(v2.protocolState.citizenship.czApps[0].country).toBe('Portugal');
  });

  it('migrates czPassports to protocolState.citizenship.czPassports', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.citizenship.czPassports).toHaveLength(2);
  });

  it('migrates czAnswers to protocolState.citizenship.czAnswers', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.citizenship.czAnswers.residencyMonths).toBe(12);
  });

  // Image
  it('migrates skinType to protocolState.image.skinType', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.skinType).toBe('oily');
  });

  it('migrates skinConcerns to protocolState.image.skinConcerns', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.skinConcerns).toEqual(['acne', 'hyperpigmentation']);
  });

  it('migrates groomingLog to protocolState.image.groomingLog', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.groomingLog['2026-04-04']).toHaveLength(2);
  });

  it('migrates fragranceCollection to protocolState.image.fragranceCollection', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.fragranceCollection).toHaveLength(1);
  });

  it('migrates wardrobeItems to protocolState.image.wardrobeItems', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.wardrobeItems.shirts).toBe(10);
  });

  it('migrates styleArchetype to protocolState.image.styleArchetype', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.image.styleArchetype).toBe('sharp-casual');
  });

  // Mind
  it('migrates mindSessions to protocolState.mind.mindSessions', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.mind.mindSessions).toHaveLength(1);
    expect(v2.protocolState.mind.mindSessions[0].type).toBe('meditation');
  });

  it('migrates mindStreak to protocolState.mind.mindStreak', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.mind.mindStreak).toBe(14);
  });

  it('migrates mindStack to protocolState.mind.mindStack', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.mind.mindStack).toHaveLength(1);
  });

  it('migrates gratitudeEntries to protocolState.mind.gratitudeEntries', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.mind.gratitudeEntries).toHaveLength(1);
  });

  // Purpose
  it('migrates bucketList to protocolState.purpose.bucketList', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.purpose.bucketList).toHaveLength(1);
    expect(v2.protocolState.purpose.bucketList[0].item).toBe('Visit Japan');
  });

  it('migrates coreValues to protocolState.purpose.coreValues', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.purpose.coreValues).toEqual(['discipline', 'loyalty', 'growth']);
  });

  it('migrates lifeScores to protocolState.purpose.lifeScores', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.purpose.lifeScores.body).toBe(8);
  });

  it('migrates yearlyGoals to protocolState.purpose.yearlyGoals', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.purpose.yearlyGoals).toHaveLength(1);
  });

  // Environment
  it('migrates envScores to protocolState.environment.envScores', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.environment.envScores.sleep).toBe(8);
    expect(v2.protocolState.environment.envScores.workspace).toBe(7);
  });

  it('migrates envChecklist to protocolState.environment.envChecklist', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.environment.envChecklist['air-purifier']).toBe(true);
  });

  // Empty v1 produces defaults
  it('produces valid structure with empty v1', () => {
    const v2 = migrateV1ToV2({});
    expect(v2.protocolState.workout.wkLogs).toEqual({});
    expect(v2.protocolState.peptides.activeCycles).toEqual([]);
    expect(v2.protocolState.credit.ccWallet).toEqual([]);
    expect(v2.protocolState.mind.mindSessions).toEqual([]);
    expect(v2.protocolState.purpose.bucketList).toEqual([]);
    expect(v2.protocolState.image.skinType).toBeNull();
    expect(v2.protocolState.environment.envScores.sleep).toBe(0);
    expect(v2.logs.bodyMeasurements).toEqual([]);
  });
});
