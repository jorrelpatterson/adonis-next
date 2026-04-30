// src/routine/__tests__/pipeline.test.js
import { describe, it, expect } from 'vitest';
import { buildDailyRoutine } from '../pipeline.js';

function makeProtocol(id, domain, tasks, recs) {
  return {
    id, domain, name: id, icon: '',
    canServe: () => true,
    getState: () => ({ phase: 'active', progress: 0.5 }),
    getTasks: () => tasks || [],
    getAutomations: () => [],
    getRecommendations: () => recs || [],
    getUpsells: () => [],
  };
}

describe('buildDailyRoutine', () => {
  it('returns structured output with scheduled, deferred, upsells, retention arrays', () => {
    const result = buildDailyRoutine({});
    expect(result).toHaveProperty('scheduled');
    expect(result).toHaveProperty('deferred');
    expect(result).toHaveProperty('upsells');
    expect(result).toHaveProperty('retention');
    expect(Array.isArray(result.scheduled)).toBe(true);
    expect(Array.isArray(result.deferred)).toBe(true);
    expect(Array.isArray(result.upsells)).toBe(true);
    expect(Array.isArray(result.retention)).toBe(true);
  });

  it('full pipeline: goals with protocols → collected, prioritized, scheduled tasks (verify ordering and goal tagging)', () => {
    const proto = makeProtocol('workout', 'body', [
      { id: 't1', label: 'Morning lift', priority: 1, category: 'training', skippable: false },
      { id: 't2', label: 'Evening stretch', priority: 2, category: 'evening', skippable: true },
    ]);

    const goals = [
      {
        id: 'goal_1',
        title: 'Get Shredded',
        priority: 1,
        activeProtocols: [{ protocolId: 'workout' }],
      },
    ];

    const result = buildDailyRoutine({
      goals,
      protocolMap: { workout: proto },
      profile: {},
      settings: { routineCapacity: 'normal' },
    });

    expect(result.scheduled.length + result.deferred.length).toBe(2);

    // All tasks should be tagged with goalId and goalTitle
    const allTasks = [...result.scheduled, ...result.deferred];
    for (const task of allTasks) {
      expect(task.goalId).toBe('goal_1');
      expect(task.goalTitle).toBe('Get Shredded');
    }

    // t1 is priority 1 + non-skippable so must be scheduled
    expect(result.scheduled.some(t => t.id === 't1')).toBe(true);

    // Tasks in scheduled should have scheduledBlock assigned
    for (const task of result.scheduled) {
      expect(task.scheduledBlock).toBeDefined();
    }
  });

  it('cross-domain goal generates tasks from multiple protocol domains', () => {
    const bodyProto = makeProtocol('workout', 'body', [
      { id: 'b1', label: 'Lift', priority: 2, category: 'training', skippable: true },
    ]);
    const mindProto = makeProtocol('meditation', 'mind', [
      { id: 'm1', label: 'Meditate', priority: 2, category: 'mind', skippable: true },
    ]);

    const goals = [
      {
        id: 'goal_x',
        title: 'Full Life Upgrade',
        priority: 1,
        activeProtocols: [
          { protocolId: 'workout' },
          { protocolId: 'meditation' },
        ],
      },
    ];

    const result = buildDailyRoutine({
      goals,
      protocolMap: { workout: bodyProto, meditation: mindProto },
      profile: {},
      settings: { routineCapacity: 'normal' },
    });

    const allTasks = [...result.scheduled, ...result.deferred];
    expect(allTasks).toHaveLength(2);

    const taskIds = allTasks.map(t => t.id);
    expect(taskIds).toContain('b1');
    expect(taskIds).toContain('m1');

    // Both come from different protocol domains but same goal
    const bodyTask = allTasks.find(t => t.id === 'b1');
    const mindTask = allTasks.find(t => t.id === 'm1');
    expect(bodyTask.protocolId).toBe('workout');
    expect(mindTask.protocolId).toBe('meditation');
    expect(bodyTask.goalId).toBe('goal_x');
    expect(mindTask.goalId).toBe('goal_x');
  });

  it('includes upsells when triggered (free user with progress > 20%)', () => {
    const proto = makeProtocol('workout', 'body', []);

    const goals = [
      {
        id: 'goal_1',
        title: 'Get Lean',
        priority: 1,
        percent: 25, // > 20% threshold
        activeProtocols: [{ protocolId: 'workout' }],
      },
    ];

    const result = buildDailyRoutine({
      goals,
      protocolMap: { workout: proto },
      profile: { tier: 'free' },
      protocolStates: {},
      logs: {},
      settings: {},
    });

    expect(result.upsells.length).toBeGreaterThan(0);

    const tierUpsell = result.upsells.find(u => u.type === 'tier_upgrade');
    expect(tierUpsell).toBeDefined();
    expect(tierUpsell.target).toBe('pro');
  });
});
