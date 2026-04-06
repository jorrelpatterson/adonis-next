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

    protocolState: {},

    logs: {
      checkins: v1.checkins || {},
      weight: v1.weightLog || [],
      food: v1.foodLogs || {},
      exercise: migrateExerciseLogs(v1.wkLogs, v1.wkPRs),
      routine: migrateRoutineChecks(v1.checkedR),
    },
  };

  if (v1.activePeps && v1.activePeps.length > 0) {
    v2.protocolState.peptides = {
      activePeptides: v1.activePeps,
    };
  }

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
