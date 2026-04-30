import { describe, it, expect } from 'vitest';
import workoutProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';

describe('workout protocol', () => {
  it('passes protocol interface validation', () => {
    expect(validateProtocol(workoutProtocol)).toBe(true);
  });

  it('has correct identity (id=workout, domain=body, name=Workout Program)', () => {
    expect(workoutProtocol.id).toBe('workout');
    expect(workoutProtocol.domain).toBe('body');
    expect(workoutProtocol.name).toBe('Workout Program');
    expect(workoutProtocol.icon).toBeTruthy();
  });

  it('canServe returns true for body domain goals, false for others', () => {
    expect(workoutProtocol.canServe({ domain: 'body' })).toBe(true);
    expect(workoutProtocol.canServe({ domain: 'mind' })).toBe(false);
    expect(workoutProtocol.canServe({ domain: 'money' })).toBe(false);
    expect(workoutProtocol.canServe(null)).toBe(false);
    expect(workoutProtocol.canServe(undefined)).toBe(false);
  });

  it('getState returns goal and program from profile', () => {
    const profile = { primary: 'Muscle Gain' };
    const state = workoutProtocol.getState(profile, [], { domain: 'body' });
    expect(state.goal).toBe('Muscle Gain');
    expect(Array.isArray(state.program)).toBe(true);
    expect(state.program.length).toBe(7);
  });

  it('getState defaults to Wellness when no primary goal', () => {
    const state = workoutProtocol.getState({}, [], null);
    expect(state.goal).toBe('Wellness');
    expect(Array.isArray(state.program)).toBe(true);
  });

  it('getTasks returns training task for a workout day (Monday = day 1)', () => {
    // Monday 2026-04-06 should return Back & Biceps for Muscle Gain
    const profile = { primary: 'Muscle Gain' };
    const state = workoutProtocol.getState(profile, [], { domain: 'body' });
    const monday = new Date('2026-04-06T12:00:00'); // Monday
    expect(monday.getUTCDay()).toBe(1);

    const tasks = workoutProtocol.getTasks(state, profile, monday);
    expect(tasks.length).toBeGreaterThan(0);
    const task = tasks[0]; // Main workout task
    expect(task.title).toContain('Back');
    expect(task.category).toBe('training');
    expect(task.type).toBe('guided');
    expect(task.skippable).toBe(false);
    expect(task.id).toBe('workout-1');
    expect(task.data).toHaveProperty('warmup');
    expect(task.data).toHaveProperty('cooldown');
    expect(task.data).toHaveProperty('exercises');
  });

  it('getTasks returns empty training tasks for rest day (Saturday = day 6)', () => {
    const profile = { primary: 'Muscle Gain' };
    const state = workoutProtocol.getState(profile, [], { domain: 'body' });
    const saturday = new Date('2026-04-11T12:00:00'); // Saturday
    expect(saturday.getDay()).toBe(6);

    const tasks = workoutProtocol.getTasks(state, profile, saturday);
    expect(tasks).toEqual([]);
  });

  it('getRecommendations returns empty array', () => {
    expect(workoutProtocol.getRecommendations()).toEqual([]);
  });

  it('getUpsells returns empty array', () => {
    expect(workoutProtocol.getUpsells()).toEqual([]);
  });

  it('getAutomations returns empty array', () => {
    expect(workoutProtocol.getAutomations()).toEqual([]);
  });
});
