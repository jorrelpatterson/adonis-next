// src/routine/__tests__/assembler.test.js
import { describe, it, expect } from 'vitest';
import { collectTasks } from '../assembler.js';

function makeProtocol(id, domain, tasks, recommendations) {
  return {
    id, domain, name: id, icon: '',
    canServe: () => true,
    getState: () => ({ phase: 'active', progress: 0.5 }),
    getTasks: () => tasks || [],
    getAutomations: () => [],
    getRecommendations: () => recommendations || [],
    getUpsells: () => [],
  };
}

describe('collectTasks', () => {
  it('returns empty array when no goals', () => {
    const result = collectTasks([], {}, {}, '2026-04-06');
    expect(result).toEqual([]);
  });

  it('collects tasks from all protocols of all goals, each tagged with goalId, goalTitle, protocolId', () => {
    const proto1 = makeProtocol('workout', 'body', [
      { id: 't1', label: 'Morning lift' },
      { id: 't2', label: 'Evening stretch' },
    ]);
    const proto2 = makeProtocol('nutrition', 'body', [
      { id: 't3', label: 'Track macros' },
    ]);

    const goals = [
      {
        id: 'goal_1',
        title: 'Get Shredded',
        activeProtocols: [
          { protocolId: 'workout' },
          { protocolId: 'nutrition' },
        ],
      },
    ];

    const protocolMap = { workout: proto1, nutrition: proto2 };
    const result = collectTasks(goals, protocolMap, {}, '2026-04-06');

    expect(result).toHaveLength(3);
    result.forEach(task => {
      expect(task.goalId).toBe('goal_1');
      expect(task.goalTitle).toBe('Get Shredded');
    });
    expect(result[0].protocolId).toBe('workout');
    expect(result[1].protocolId).toBe('workout');
    expect(result[2].protocolId).toBe('nutrition');
  });

  it('includes recommendations as tasks with type: recommendation', () => {
    const proto = makeProtocol(
      'sleep',
      'body',
      [{ id: 't1', label: 'Wind-down routine' }],
      [{ id: 'r1', type: 'recommendation', label: 'Take magnesium' }]
    );

    const goals = [
      {
        id: 'goal_2',
        title: 'Optimize Recovery',
        activeProtocols: [{ protocolId: 'sleep' }],
      },
    ];

    const protocolMap = { sleep: proto };
    const result = collectTasks(goals, protocolMap, {}, '2026-04-06');

    expect(result).toHaveLength(2);
    const rec = result.find(t => t.id === 'r1');
    expect(rec).toBeDefined();
    expect(rec.type).toBe('recommendation');
    expect(rec.goalId).toBe('goal_2');
    expect(rec.protocolId).toBe('sleep');
  });

  it('skips protocols not found in protocolMap', () => {
    const proto = makeProtocol('cardio', 'body', [
      { id: 't1', label: 'Run 3 miles' },
    ]);

    const goals = [
      {
        id: 'goal_3',
        title: 'Build Endurance',
        activeProtocols: [
          { protocolId: 'cardio' },
          { protocolId: 'missing_protocol' },
        ],
      },
    ];

    const protocolMap = { cardio: proto };
    const result = collectTasks(goals, protocolMap, {}, '2026-04-06');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
    expect(result[0].protocolId).toBe('cardio');
  });
});
