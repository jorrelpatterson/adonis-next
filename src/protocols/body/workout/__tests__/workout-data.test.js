import { describe, it, expect } from 'vitest';
import { WORKOUTS, GOAL_ALIASES, getProgram } from '../programs.js';

describe('WORKOUTS data', () => {
  const CORE_PROGRAMS = ['Fat Loss', 'Muscle Gain', 'Recomposition', 'Aesthetics'];

  it('has all 4 core programs', () => {
    for (const name of CORE_PROGRAMS) {
      expect(WORKOUTS).toHaveProperty(name);
    }
  });

  it('has Anti-Aging program', () => {
    expect(WORKOUTS).toHaveProperty('Anti-Aging');
  });

  it('each core program has 7 days', () => {
    for (const name of CORE_PROGRAMS) {
      expect(WORKOUTS[name]).toHaveLength(7);
    }
  });

  it('Anti-Aging program has 7 days', () => {
    expect(WORKOUTS['Anti-Aging']).toHaveLength(7);
  });

  it('each day has d, dur, exercises fields', () => {
    for (const name of [...CORE_PROGRAMS, 'Anti-Aging']) {
      for (const day of WORKOUTS[name]) {
        expect(day).toHaveProperty('d');
        expect(day).toHaveProperty('dur');
        expect(day).toHaveProperty('exercises');
      }
    }
  });

  it('exercises have name, sets, reps, rest', () => {
    for (const name of [...CORE_PROGRAMS, 'Anti-Aging']) {
      for (const day of WORKOUTS[name]) {
        for (const exercise of day.exercises) {
          expect(exercise).toHaveProperty('name');
          expect(exercise).toHaveProperty('sets');
          expect(exercise).toHaveProperty('reps');
          expect(exercise).toHaveProperty('rest');
        }
      }
    }
  });

  it('last day of each program is Rest with dur=0', () => {
    for (const name of [...CORE_PROGRAMS, 'Anti-Aging']) {
      const days = WORKOUTS[name];
      const lastDay = days[days.length - 1];
      expect(lastDay.d).toBe('Rest');
      expect(lastDay.dur).toBe(0);
    }
  });
});

describe('GOAL_ALIASES', () => {
  it('Cognitive maps to Anti-Aging', () => {
    expect(GOAL_ALIASES['Cognitive']).toBe('Anti-Aging');
  });

  it('Hormonal maps to Recomposition', () => {
    expect(GOAL_ALIASES['Hormonal']).toBe('Recomposition');
  });

  it('Wellness maps to Anti-Aging', () => {
    expect(GOAL_ALIASES['Wellness']).toBe('Anti-Aging');
  });

  it('Weight Loss maps to Fat Loss', () => {
    expect(GOAL_ALIASES['Weight Loss']).toBe('Fat Loss');
  });

  it('Recovery maps to Anti-Aging', () => {
    expect(GOAL_ALIASES['Recovery']).toBe('Anti-Aging');
  });
});

describe('getProgram()', () => {
  it('resolves Cognitive to Anti-Aging program', () => {
    expect(getProgram('Cognitive')).toBe(WORKOUTS['Anti-Aging']);
  });

  it('resolves Hormonal to Recomposition program', () => {
    expect(getProgram('Hormonal')).toBe(WORKOUTS['Recomposition']);
  });

  it('resolves Wellness to Anti-Aging program', () => {
    expect(getProgram('Wellness')).toBe(WORKOUTS['Anti-Aging']);
  });

  it('resolves Weight Loss to Fat Loss program', () => {
    expect(getProgram('Weight Loss')).toBe(WORKOUTS['Fat Loss']);
  });

  it('resolves Recovery to Anti-Aging program', () => {
    expect(getProgram('Recovery')).toBe(WORKOUTS['Anti-Aging']);
  });

  it('returns Fat Loss directly', () => {
    expect(getProgram('Fat Loss')).toBe(WORKOUTS['Fat Loss']);
  });

  it('returns Muscle Gain directly', () => {
    expect(getProgram('Muscle Gain')).toBe(WORKOUTS['Muscle Gain']);
  });

  it('returns Recomposition directly', () => {
    expect(getProgram('Recomposition')).toBe(WORKOUTS['Recomposition']);
  });

  it('returns Aesthetics directly', () => {
    expect(getProgram('Aesthetics')).toBe(WORKOUTS['Aesthetics']);
  });

  it('defaults to Anti-Aging for unknown goal', () => {
    expect(getProgram('Unknown Goal')).toBe(WORKOUTS['Anti-Aging']);
    expect(getProgram(undefined)).toBe(WORKOUTS['Anti-Aging']);
    expect(getProgram(null)).toBe(WORKOUTS['Anti-Aging']);
  });
});
