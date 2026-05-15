// src/state/migration.js
import { DEFAULT_STATE } from './defaults';

export function migrateV1ToV2(v1) {
  if (!v1) return null;

  const prof = v1.prof || {};

  const v2 = {
    ...DEFAULT_STATE,

    profile: {
      ...DEFAULT_STATE.profile,
      name: prof.name || '',
      age: prof.age || '',
      gender: prof.gender || '',
      weight: prof.weight || '',
      goalW: prof.goalW || '',
      hFt: prof.hFt || '',
      hIn: prof.hIn || '',
      activity: prof.activity || '',
      trainPref: prof.trainPref || 'morning',
      equipment: prof.equipment || 'gym',
      domains: prof.domains || ['body'],
      tier: v1.subTier || 'free',
    },

    goals: [],

    protocolState: {
      ...DEFAULT_STATE.protocolState,

      workout: {
        ...DEFAULT_STATE.protocolState.workout,
        wkLogs: v1.wkLogs || {},
        wkPRs: v1.wkPRs || {},
        wkWeek: v1.wkWeek != null ? v1.wkWeek : DEFAULT_STATE.protocolState.workout.wkWeek,
      },

      peptides: {
        ...DEFAULT_STATE.protocolState.peptides,
        activeCycles: v1.activeCycles || [],
        supplyInv: v1.supplyInv || [],
        injectionLog: v1.injectionLog || [],
        pepCart: v1.pepCart || [],
        orderHistory: v1.orderHistory || [],
        shippingInfo: v1.shippingInfo || {},
        // Legacy: map activePeps to activeCycles if no activeCycles present
        ...(v1.activePeps && !v1.activeCycles ? { activeCycles: v1.activePeps } : {}),
      },

      credit: {
        ...DEFAULT_STATE.protocolState.credit,
        ccWallet: v1.ccWallet || [],
        disputes: v1.disputes || [],
        creditScores: v1.creditScores || [],
        creditFactors: v1.creditFactors || DEFAULT_STATE.protocolState.credit.creditFactors,
        repairAuto: v1.repairAuto != null ? v1.repairAuto : DEFAULT_STATE.protocolState.credit.repairAuto,
      },

      income: {
        ...DEFAULT_STATE.protocolState.income,
        incomeTarget: v1.incomeTarget != null ? v1.incomeTarget : DEFAULT_STATE.protocolState.income.incomeTarget,
        incomePartnerType: v1.incomePartnerType || DEFAULT_STATE.protocolState.income.incomePartnerType,
        incomeLeads: v1.incomeLeads || [],
        incomeEarnings: v1.incomeEarnings || [],
      },

      citizenship: {
        ...DEFAULT_STATE.protocolState.citizenship,
        czApps: v1.czApps || [],
        czPassports: v1.czPassports || DEFAULT_STATE.protocolState.citizenship.czPassports,
        czAnswers: v1.czAnswers || {},
      },

      image: {
        ...DEFAULT_STATE.protocolState.image,
        skinType: v1.skinType != null ? v1.skinType : null,
        skinConcerns: v1.skinConcerns || [],
        groomingLog: v1.groomingLog || {},
        fragranceCollection: v1.fragranceCollection || [],
        wardrobeItems: v1.wardrobeItems || {},
        styleArchetype: v1.styleArchetype != null ? v1.styleArchetype : null,
      },

      mind: {
        ...DEFAULT_STATE.protocolState.mind,
        mindSessions: v1.mindSessions || [],
        mindStreak: v1.mindStreak != null ? v1.mindStreak : 0,
        mindStack: v1.mindStack || [],
        gratitudeEntries: v1.gratitudeEntries || [],
      },

      purpose: {
        ...DEFAULT_STATE.protocolState.purpose,
        bucketList: v1.bucketList || [],
        coreValues: v1.coreValues || [],
        lifeScores: v1.lifeScores || {},
        yearlyGoals: v1.yearlyGoals || [],
      },

      environment: {
        ...DEFAULT_STATE.protocolState.environment,
        envScores: v1.envScores || DEFAULT_STATE.protocolState.environment.envScores,
        envChecklist: v1.envChecklist || {},
      },
    },

    logs: {
      checkins: v1.checkins || {},
      weight: v1.weightLog || [],
      food: v1.foodLogs || {},
      exercise: migrateExerciseLogs(v1.wkLogs, v1.wkPRs),
      routine: migrateRoutineChecks(v1.checkedR),
      bodyMeasurements: v1.bodyMeasurements || [],
    },
  };

  return v2;
}

function migrateExerciseLogs(wkLogs, wkPRs) {
  if (!wkLogs) return [];
  const logs = [];
  for (const [key, data] of Object.entries(wkLogs)) {
    const parts = key.split('|');
    if (parts.length >= 4) {
      logs.push({
        goal: parts[0],
        week: parseInt(parts[1]) || 0,
        dayIdx: parseInt(parts[2]) || 0,
        exercise: parts[3],
        setIdx: parseInt(parts[4]) || 0,
        weight: data.weight,
        reps: data.reps,
      });
    }
  }
  return logs;
}

function migrateRoutineChecks(checkedR) {
  if (!checkedR) return {};
  return checkedR;
}

export function runMigrationIfNeeded() {
  const hasV2 = localStorage.getItem('adonis_v2');
  if (hasV2) return null;

  const v1Raw = localStorage.getItem('adonis_v1');
  if (!v1Raw) return null;

  try {
    const v1 = JSON.parse(v1Raw);
    const v2 = migrateV1ToV2(v1);
    if (v2) {
      localStorage.setItem('adonis_v2', JSON.stringify(v2));
      return v2;
    }
  } catch {
    return null;
  }
  return null;
}
