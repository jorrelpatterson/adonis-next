import { describe, it, expect } from 'vitest';
import { TIME_BLOCKS, scheduleTasks } from '../scheduler.js';

function makeTask(overrides) {
  return {
    id: 'task_' + Math.random().toString(36).slice(2, 6),
    title: 'Test Task',
    category: 'morning',
    priority: 2,
    skippable: true,
    ...overrides,
  };
}

describe('TIME_BLOCKS', () => {
  it('has 6 entries, first is morning, last is evening', () => {
    expect(TIME_BLOCKS).toHaveLength(6);
    expect(TIME_BLOCKS[0].id).toBe('morning');
    expect(TIME_BLOCKS[TIME_BLOCKS.length - 1].id).toBe('evening');
  });
});

describe('scheduleTasks', () => {
  it('returns empty array for no tasks', () => {
    const result = scheduleTasks([], {});
    expect(result).toEqual([]);
  });

  it('preserves explicit time on tasks and sorts chronologically', () => {
    const tasks = [
      makeTask({ id: 'task_b', category: 'work', time: '14:00' }),
      makeTask({ id: 'task_a', category: 'work', time: '09:00' }),
      makeTask({ id: 'task_c', category: 'work', time: '11:00' }),
    ];
    const result = scheduleTasks(tasks, {});
    const ids = result.map((t) => t.id);
    expect(ids).toEqual(['task_a', 'task_c', 'task_b']);
    expect(result[0].time).toBe('09:00');
    expect(result[1].time).toBe('11:00');
    expect(result[2].time).toBe('14:00');
  });

  it('assigns scheduledBlock to tasks without explicit time based on category', () => {
    const tasks = [
      makeTask({ id: 'task_morning', category: 'morning' }),
      makeTask({ id: 'task_nutrition', category: 'nutrition' }),
      makeTask({ id: 'task_work', category: 'work' }),
      makeTask({ id: 'task_income', category: 'income' }),
      makeTask({ id: 'task_evening', category: 'evening' }),
    ];
    const result = scheduleTasks(tasks, {});
    const byId = Object.fromEntries(result.map((t) => [t.id, t]));
    expect(byId['task_morning'].scheduledBlock).toBe('morning');
    expect(byId['task_nutrition'].scheduledBlock).toBe('midday');
    expect(byId['task_work'].scheduledBlock).toBe('work');
    expect(byId['task_income'].scheduledBlock).toBe('afternoon');
    expect(byId['task_evening'].scheduledBlock).toBe('evening');
  });

  it('uses trainPref to determine training block (morning or evening)', () => {
    const trainingTask = makeTask({ id: 'train_task', category: 'training' });

    const morningResult = scheduleTasks([trainingTask], { trainPref: 'morning' });
    expect(morningResult[0].scheduledBlock).toBe('morning');

    const eveningResult = scheduleTasks([trainingTask], { trainPref: 'evening' });
    expect(eveningResult[0].scheduledBlock).toBe('evening');

    const defaultResult = scheduleTasks([trainingTask], {});
    expect(defaultResult[0].scheduledBlock).toBe('morning');
  });
});
