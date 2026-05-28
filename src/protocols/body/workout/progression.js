// src/protocols/body/workout/progression.js
import { logKey } from './keys';

const COMPOUND_PATTERNS = [
  /squat/i, /deadlift/i, /bench press/i, /\brows?\b/i,
  /\bohp\b/i, /overhead press/i, /push press/i,
  /pull-?ups?/i, /\bdips?\b/i, /thrusters?/i, /clean/i,
];

export function isCompound(name) {
  if (!name) return false;
  return COMPOUND_PATTERNS.some(p => p.test(name));
}

export function parseRepTarget(reps) {
  if (!reps || typeof reps !== 'string') return 0;
  if (/^\d+\s*s\b/i.test(reps)) return 0; // time-based, e.g. "45s"
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function parseRestSeconds(rest) {
  if (!rest || typeof rest !== 'string') return 0;
  const match = rest.match(/(\d+)\s*s/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getPhase(wkWeek) {
  if (wkWeek <= 4) return 'Foundation';
  if (wkWeek <= 8) return 'Hypertrophy';
  if (wkWeek <= 12) return 'Strength';
  return 'Deload/Peak';
}

export function needsDeload(wkWeek) {
  return wkWeek > 0 && wkWeek % 4 === 0;
}

export function getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise }) {
  if (!exercise || week <= 1) return null;
  const prevWeek = week - 1;
  const target = parseRepTarget(exercise.reps);
  const setCount = exercise.sets || 0;
  if (setCount === 0) return null;

  let lastWeight = null;
  let hitTarget = true;
  for (let i = 0; i < setCount; i++) {
    const entry = wkLogs[logKey(goal, prevWeek, dayIdx, exercise.name, i)];
    // All-or-nothing precondition: every prior set must be marked complete.
    // Partial data returns null so the UI shows no suggestion at all.
    if (!entry || !entry.c) return null;
    const wt = parseFloat(entry.wt) || 0;
    // Track the highest weight across the prior week's sets (handles pyramid loading).
    if (lastWeight === null || wt > lastWeight) lastWeight = wt;
    const reps = parseFloat(entry.r) || 0;
    if (target > 0 && reps < target) hitTarget = false;
  }
  if (lastWeight === null) return null;

  const unlockDelta = isCompound(exercise.name) ? 5 : 2.5;
  const delta = hitTarget ? unlockDelta : 0;
  return { lastWeight, nextWeight: lastWeight + delta, delta, unlockDelta, hitTarget };
}

export function getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout) {
  if (!dayWorkout || !dayWorkout.exercises || dayWorkout.exercises.length === 0) {
    return { completed: 0, total: 0, status: 'rest' };
  }
  let total = 0;
  let completed = 0;
  for (const ex of dayWorkout.exercises) {
    const sets = ex.sets || 0;
    total += sets;
    for (let i = 0; i < sets; i++) {
      const entry = wkLogs[logKey(goal, week, dayIdx, ex.name, i)];
      if (entry && entry.c) completed++;
    }
  }
  let status = 'empty';
  if (total === 0) status = 'rest';
  else if (completed >= total) status = 'complete';
  else if (completed > 0) status = 'partial';
  return { completed, total, status };
}
