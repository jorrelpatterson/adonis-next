// src/protocols/body/workout/__tests__/progression.test.js
import { describe, it, expect } from 'vitest';
import {
  isCompound, parseRepTarget, parseRestSeconds,
  getProgressionSuggestion, needsDeload, getPhase, getDayCompletion,
} from '../progression';
import { logKey } from '../keys';

describe('isCompound', () => {
  it('flags squats, deadlifts, rows, presses, pull-ups, dips as compound', () => {
    ['Back Squats', 'Conventional Deadlifts', 'Barbell Rows', 'Flat Barbell Bench Press',
     'Standing OHP', 'Weighted Pull-ups', 'Weighted Dips', 'Push Press', 'Thrusters']
      .forEach(n => expect(isCompound(n)).toBe(true));
  });
  it('flags isolation moves as not compound', () => {
    ['Lateral Raises', 'Hammer Curls', 'Tricep Pushdowns', 'Leg Extensions',
     'Cable Crunches', 'Pallof Press', 'Face Pulls']
      .forEach(n => expect(isCompound(n)).toBe(false));
  });
});

describe('parseRepTarget', () => {
  it('parses "8" -> 8', () => { expect(parseRepTarget('8')).toBe(8); });
  it('parses "6-8" -> min 6', () => { expect(parseRepTarget('6-8')).toBe(6); });
  it('parses "12/leg" -> 12', () => { expect(parseRepTarget('12/leg')).toBe(12); });
  it('parses "45s" -> 0 (time-based)', () => { expect(parseRepTarget('45s')).toBe(0); });
  it('parses garbage -> 0', () => { expect(parseRepTarget('')).toBe(0); });
});

describe('parseRestSeconds', () => {
  it('parses "60s" -> 60', () => { expect(parseRestSeconds('60s')).toBe(60); });
  it('parses "120s" -> 120', () => { expect(parseRestSeconds('120s')).toBe(120); });
  it('parses "30s on/30s off" -> 30 (first number)', () => { expect(parseRestSeconds('30s on/30s off')).toBe(30); });
  it('parses dash -> 0', () => { expect(parseRestSeconds('—')).toBe(0); });
  it('parses empty -> 0', () => { expect(parseRestSeconds('')).toBe(0); });
});

describe('getPhase', () => {
  it('weeks 1-4 -> Foundation', () => {
    [1, 2, 3, 4].forEach(w => expect(getPhase(w)).toBe('Foundation'));
  });
  it('weeks 5-8 -> Hypertrophy', () => {
    expect(getPhase(5)).toBe('Hypertrophy');
    expect(getPhase(8)).toBe('Hypertrophy');
  });
  it('weeks 9-12 -> Strength', () => {
    expect(getPhase(9)).toBe('Strength');
    expect(getPhase(12)).toBe('Strength');
  });
  it('weeks 13-16 -> Deload/Peak', () => {
    expect(getPhase(13)).toBe('Deload/Peak');
    expect(getPhase(16)).toBe('Deload/Peak');
  });
});

describe('needsDeload', () => {
  it('true on every 4th week', () => {
    expect(needsDeload(4)).toBe(true);
    expect(needsDeload(8)).toBe(true);
    expect(needsDeload(12)).toBe(true);
    expect(needsDeload(16)).toBe(true);
  });
  it('false otherwise', () => {
    [1, 2, 3, 5, 7, 9, 11, 13, 15].forEach(w => expect(needsDeload(w)).toBe(false));
  });
});

describe('getProgressionSuggestion', () => {
  const goal = 'Muscle Gain', week = 2, dayIdx = 1;
  const exercise = { name: 'Back Squats', sets: 3, reps: '5' };

  it('returns null when no prior data exists', () => {
    const out = getProgressionSuggestion({ wkLogs: {}, goal, week, dayIdx, exercise });
    expect(out).toBeNull();
  });

  it('suggests +5 lbs when all prior compound sets hit target reps', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 1)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 2)]: { wt: 225, r: 5, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise });
    expect(out).toEqual({ lastWeight: 225, nextWeight: 230, delta: 5, unlockDelta: 5, hitTarget: true });
  });

  it('suggests +2.5 lbs when prior isolation sets all hit target', () => {
    const ex = { name: 'Lateral Raises', sets: 3, reps: '15' };
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 0)]: { wt: 20, r: 15, c: true },
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 1)]: { wt: 20, r: 15, c: true },
      [logKey(goal, 1, dayIdx, 'Lateral Raises', 2)]: { wt: 20, r: 15, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise: ex });
    expect(out).toEqual({ lastWeight: 20, nextWeight: 22.5, delta: 2.5, unlockDelta: 2.5, hitTarget: true });
  });

  it('flags hitTarget=false when any set missed target reps, but still reports the would-unlock delta', () => {
    const wkLogs = {
      [logKey(goal, 1, dayIdx, 'Back Squats', 0)]: { wt: 225, r: 5, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 1)]: { wt: 225, r: 4, c: true },
      [logKey(goal, 1, dayIdx, 'Back Squats', 2)]: { wt: 225, r: 3, c: true },
    };
    const out = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise });
    expect(out).toEqual({ lastWeight: 225, nextWeight: 225, delta: 0, unlockDelta: 5, hitTarget: false });
  });
});

describe('getDayCompletion', () => {
  const goal = 'Muscle Gain', week = 1, dayIdx = 1;
  const dayWorkout = {
    d: 'Back & Biceps', dur: 60,
    exercises: [
      { name: 'Deadlifts', sets: 3, reps: '5', rest: '120s' },
      { name: 'Rows', sets: 3, reps: '8', rest: '90s' },
    ],
  };

  it('returns { status: "rest", total: 0 } when day has no exercises', () => {
    expect(getDayCompletion({}, goal, week, dayIdx, { d: 'Rest', dur: 0, exercises: [] }))
      .toEqual({ completed: 0, total: 0, status: 'rest' });
  });

  it('returns { status: "empty" } when no sets are complete', () => {
    expect(getDayCompletion({}, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 0, total: 6, status: 'empty' });
  });

  it('returns { status: "partial" } when some but not all sets are complete', () => {
    const wkLogs = {
      [logKey(goal, week, dayIdx, 'Deadlifts', 0)]: { wt: 0, r: 5, c: true },
      [logKey(goal, week, dayIdx, 'Deadlifts', 1)]: { wt: 0, r: 5, c: true },
    };
    expect(getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 2, total: 6, status: 'partial' });
  });

  it('returns { status: "complete" } when all sets complete', () => {
    const wkLogs = {};
    dayWorkout.exercises.forEach(ex => {
      for (let i = 0; i < ex.sets; i++) {
        wkLogs[logKey(goal, week, dayIdx, ex.name, i)] = { wt: 0, r: 5, c: true };
      }
    });
    expect(getDayCompletion(wkLogs, goal, week, dayIdx, dayWorkout))
      .toEqual({ completed: 6, total: 6, status: 'complete' });
  });
});
