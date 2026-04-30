import { describe, it, expect } from 'vitest';
import {
  getTodaysWorkout,
  getExercisePR,
  getLastSession,
  isNewPR,
} from '../WorkoutLogger';

// Sample 7-day program — Sunday=0..Saturday=6.
const sampleProgram = [
  { d: 'Rest', dur: 0, exercises: [] },
  { d: 'Push Day', dur: 60, exercises: [{ name: 'Bench Press', sets: 4, reps: '8', rest: '90s' }] },
  { d: 'Pull Day', dur: 60, exercises: [{ name: 'Barbell Row', sets: 4, reps: '8', rest: '90s' }] },
  { d: 'Legs', dur: 65, exercises: [{ name: 'Back Squat', sets: 5, reps: '5', rest: '120s' }] },
  { d: 'Shoulders', dur: 50, exercises: [] },
  { d: 'Cardio', dur: 30, exercises: [] },
  { d: 'Rest', dur: 0, exercises: [] },
];

describe('getTodaysWorkout', () => {
  it('returns the entry matching the date\'s UTC day index', () => {
    // Pick a date known to be a Monday in UTC (2026-04-27 is a Monday).
    const monday = new Date('2026-04-27T12:00:00Z');
    expect(monday.getUTCDay()).toBe(1);
    const w = getTodaysWorkout(sampleProgram, monday);
    expect(w).toBeTruthy();
    expect(w.d).toBe('Push Day');
  });

  it('returns rest entry for Sunday', () => {
    const sunday = new Date('2026-04-26T12:00:00Z');
    expect(sunday.getUTCDay()).toBe(0);
    const w = getTodaysWorkout(sampleProgram, sunday);
    expect(w.dur).toBe(0);
    expect(w.d).toBe('Rest');
  });

  it('returns null for invalid program', () => {
    expect(getTodaysWorkout(null, new Date())).toBeNull();
    expect(getTodaysWorkout(undefined, new Date())).toBeNull();
  });
});

describe('getExercisePR', () => {
  it('returns 0 when logs are empty or missing', () => {
    expect(getExercisePR({}, 'Bench Press')).toBe(0);
    expect(getExercisePR({ exercise: [] }, 'Bench Press')).toBe(0);
    expect(getExercisePR(null, 'Bench Press')).toBe(0);
  });

  it('returns the highest complete set weight across all sessions', () => {
    const logs = {
      exercise: [
        { date: '2026-04-20', exercise: 'Bench Press', sets: [
          { weight: 185, reps: 8, complete: true },
          { weight: 195, reps: 5, complete: true },
        ]},
        { date: '2026-04-22', exercise: 'Bench Press', sets: [
          { weight: 190, reps: 8, complete: true },
        ]},
        // Different exercise — should be ignored.
        { date: '2026-04-22', exercise: 'Squat', sets: [
          { weight: 315, reps: 5, complete: true },
        ]},
      ],
    };
    expect(getExercisePR(logs, 'Bench Press')).toBe(195);
  });

  it('ignores incomplete sets', () => {
    const logs = {
      exercise: [
        { date: '2026-04-20', exercise: 'Bench Press', sets: [
          { weight: 225, reps: 0, complete: false },
          { weight: 185, reps: 8, complete: true },
        ]},
      ],
    };
    expect(getExercisePR(logs, 'Bench Press')).toBe(185);
  });
});

describe('getLastSession', () => {
  it('returns null when there is no history for the exercise', () => {
    expect(getLastSession({ exercise: [] }, 'Bench Press')).toBeNull();
    expect(getLastSession(null, 'Bench Press')).toBeNull();
  });

  it('returns the most-recent session by date string', () => {
    const logs = {
      exercise: [
        { date: '2026-04-20', exercise: 'Bench Press', sets: [{ weight: 185, reps: 8, complete: true }] },
        { date: '2026-04-22', exercise: 'Bench Press', sets: [{ weight: 190, reps: 8, complete: true }] },
        { date: '2026-04-21', exercise: 'Bench Press', sets: [{ weight: 188, reps: 8, complete: true }] },
      ],
    };
    const last = getLastSession(logs, 'Bench Press');
    expect(last.date).toBe('2026-04-22');
    expect(last.sets[0].weight).toBe(190);
  });

  it('handles day rollover — yesterday\'s session is "last" until today logs', () => {
    const logs = {
      exercise: [
        { date: '2026-04-28', exercise: 'Bench Press', sets: [{ weight: 200, reps: 6, complete: true }] },
      ],
    };
    expect(getLastSession(logs, 'Bench Press').date).toBe('2026-04-28');
    // Add today's log.
    logs.exercise.push({ date: '2026-04-29', exercise: 'Bench Press', sets: [{ weight: 205, reps: 6, complete: true }] });
    expect(getLastSession(logs, 'Bench Press').date).toBe('2026-04-29');
  });
});

describe('isNewPR', () => {
  it('returns false when no sets are complete', () => {
    expect(isNewPR([{ weight: 300, reps: 1, complete: false }], 200)).toBe(false);
  });

  it('returns true when a complete set exceeds previous PR', () => {
    const sets = [
      { weight: 195, reps: 8, complete: true },
      { weight: 200, reps: 5, complete: true },
    ];
    expect(isNewPR(sets, 195)).toBe(true);
  });

  it('returns false when no complete set beats previous PR', () => {
    const sets = [
      { weight: 185, reps: 8, complete: true },
      { weight: 195, reps: 5, complete: true },
    ];
    expect(isNewPR(sets, 195)).toBe(false);
  });

  it('treats first session (previousPR=0) with any complete weight as PR', () => {
    expect(isNewPR([{ weight: 135, reps: 10, complete: true }], 0)).toBe(true);
  });

  it('handles non-numeric / undefined inputs safely', () => {
    expect(isNewPR(null, 100)).toBe(false);
    expect(isNewPR([{ weight: 'abc', reps: 5, complete: true }], 100)).toBe(false);
  });
});
