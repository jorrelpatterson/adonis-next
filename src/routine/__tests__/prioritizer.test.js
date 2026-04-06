import { describe, it, expect } from 'vitest';
import { prioritizeTasks } from '../prioritizer.js';

function makeTask(overrides) {
  return {
    id: 'task_' + Math.random().toString(36).slice(2, 6),
    title: 'Test Task',
    type: 'guided',
    time: '09:00',
    priority: 3,
    goalId: 'goal_1',
    goalTitle: 'Test Goal',
    protocolId: 'test',
    skippable: true,
    ...overrides,
  };
}

describe('prioritizeTasks', () => {
  it('returns {scheduled: [], deferred: []} when no tasks', () => {
    const result = prioritizeTasks([], {}, { routineCapacity: 'normal' });
    expect(result).toEqual({ scheduled: [], deferred: [] });
  });

  it('automated tasks always make it through regardless of capacity', () => {
    const settings = { routineCapacity: 'light' };
    const normalTasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: 'normal_' + i, type: 'guided', priority: 3 })
    );
    const automatedTask = makeTask({ id: 'auto_1', type: 'automated', priority: 3 });
    const tasks = [...normalTasks, automatedTask];

    const result = prioritizeTasks(tasks, {}, settings);
    const scheduledIds = result.scheduled.map((t) => t.id);
    expect(scheduledIds).toContain('auto_1');
  });

  it('priority 1 tasks always make it through', () => {
    const settings = { routineCapacity: 'light' };
    const normalTasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: 'normal_' + i, type: 'guided', priority: 3 })
    );
    const p1Task = makeTask({ id: 'p1_task', type: 'guided', priority: 1 });
    const tasks = [...normalTasks, p1Task];

    const result = prioritizeTasks(tasks, {}, settings);
    const scheduledIds = result.scheduled.map((t) => t.id);
    expect(scheduledIds).toContain('p1_task');
  });

  it('respects goal priority ordering (lower rank = higher priority)', () => {
    const settings = { routineCapacity: 'light' };
    const goalPriorities = {
      goal_high: 1,
      goal_low: 5,
    };

    const highPriorityGoalTasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ id: 'high_' + i, goalId: 'goal_high', priority: 3 })
    );
    const lowPriorityGoalTasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ id: 'low_' + i, goalId: 'goal_low', priority: 3 })
    );
    const tasks = [...lowPriorityGoalTasks, ...highPriorityGoalTasks];

    const result = prioritizeTasks(tasks, goalPriorities, settings);

    const scheduledHighCount = result.scheduled.filter((t) => t.id.startsWith('high_')).length;
    const scheduledLowCount = result.scheduled.filter((t) => t.id.startsWith('low_')).length;
    expect(scheduledHighCount).toBeGreaterThan(scheduledLowCount);
  });

  it('caps scheduled tasks based on capacity', () => {
    const makeLotsOfTasks = (count) =>
      Array.from({ length: count }, (_, i) =>
        makeTask({ id: 'task_' + i, type: 'guided', priority: 3 })
      );

    const tasks = makeLotsOfTasks(50);

    const lightResult = prioritizeTasks(tasks, {}, { routineCapacity: 'light' });
    const normalResult = prioritizeTasks(tasks, {}, { routineCapacity: 'normal' });
    const packedResult = prioritizeTasks(tasks, {}, { routineCapacity: 'packed' });

    expect(lightResult.scheduled.length).toBe(15);
    expect(normalResult.scheduled.length).toBe(25);
    expect(packedResult.scheduled.length).toBe(35);

    expect(lightResult.scheduled.length + lightResult.deferred.length).toBe(50);
  });

  it('revenue-generating recommendations get a slight priority boost', () => {
    const settings = { routineCapacity: 'light' };

    const regularTasks = Array.from({ length: 14 }, (_, i) =>
      makeTask({ id: 'regular_' + i, type: 'guided', priority: 3 })
    );
    const revenueTask = makeTask({ id: 'revenue_task', type: 'recommendation', priority: 3, revenue: true });
    const nonRevenueTask = makeTask({ id: 'non_revenue_task', type: 'guided', priority: 3 });

    const tasks = [...regularTasks, nonRevenueTask, revenueTask];

    const result = prioritizeTasks(tasks, {}, settings);
    const scheduledIds = result.scheduled.map((t) => t.id);

    expect(scheduledIds).toContain('revenue_task');
    expect(result.deferred.map((t) => t.id)).toContain('non_revenue_task');
  });
});
