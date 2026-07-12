// src/routine/__tests__/pipeline.test.js
import { describe, it, expect } from 'vitest';
import { buildDailyRoutine } from '../pipeline.js';
import creditProtocol from '../../protocols/money/credit/index.js';

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

  describe('_system domain sweep regression coverage', () => {
    it('surfaces _system protocol tasks when ≥1 active goal exists', () => {
      const systemProto = makeProtocol('sys-check', '_system', [
        { id: 'sys-task-1', title: 'Daily Check-in', category: 'morning', priority: 1, skippable: true },
      ]);
      const workoutProto = makeProtocol('workout', 'body', [
        { id: 't1', label: 'Morning lift', priority: 1, category: 'training', skippable: false },
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
        protocolMap: { 'sys-check': systemProto, workout: workoutProto },
        profile: {},
        settings: { routineCapacity: 'normal' },
      });

      const allTasks = [...result.scheduled, ...result.deferred];
      expect(allTasks.some(t => t.id === 'sys-task-1')).toBe(true);
      const sysTask = allTasks.find(t => t.id === 'sys-task-1');
      expect(sysTask.protocolId).toBe('sys-check');
    });

    it('does not sweep _system protocols when goals array is empty', () => {
      const systemProto = makeProtocol('sys-check', '_system', [
        { id: 'sys-task-1', title: 'Daily Check-in', category: 'morning', priority: 1, skippable: true },
      ]);

      const result = buildDailyRoutine({
        goals: [],
        protocolMap: { 'sys-check': systemProto },
        profile: {},
        settings: { routineCapacity: 'normal' },
      });

      const allTasks = [...result.scheduled, ...result.deferred];
      expect(allTasks.some(t => t.id === 'sys-task-1')).toBe(false);
    });

    it('does not crash when _system protocol lacks getTasks function', () => {
      const systemProtoNoGetTasks = {
        id: 'sys-broken',
        domain: '_system',
        name: 'sys-broken',
        icon: '',
        canServe: () => true,
        getState: () => ({ phase: 'active' }),
        // Missing getTasks intentionally
        getAutomations: () => [],
        getRecommendations: () => [],
        getUpsells: () => [],
      };
      const workoutProto = makeProtocol('workout', 'body', [
        { id: 't1', label: 'Morning lift', priority: 1, category: 'training', skippable: false },
      ]);

      const goals = [
        {
          id: 'goal_1',
          title: 'Get Shredded',
          priority: 1,
          activeProtocols: [{ protocolId: 'workout' }],
        },
      ];

      expect(() => {
        buildDailyRoutine({
          goals,
          protocolMap: { 'sys-broken': systemProtoNoGetTasks, workout: workoutProto },
          profile: {},
          settings: { routineCapacity: 'normal' },
        });
      }).not.toThrow();
    });
  });

  describe('credit-repair protocol wiring (object-shaped logs regression)', () => {
    it('buildDailyRoutine with an active money/credit-repair goal + object-shaped logs does not throw and returns a routine', () => {
      // The store keeps `logs` as an OBJECT keyed by log type (e.g.
      // logs.peptideCatalog, logs.weight — see src/state/store.jsx), never
      // an array. creditProtocol.getState() used to assume `logs` was an
      // array and called `.filter()` directly on it, which throws once a
      // goal actually wires up credit-repair as an activeProtocol and
      // real (non-empty-default) object-shaped logs flow through
      // assembler.js's collectTasks() → proto.getState(profile, logs, goal, ...).
      const goals = [
        {
          id: 'goal_money',
          title: 'Fix My Credit',
          priority: 1,
          domain: 'money',
          activeProtocols: [{ protocolId: 'credit-repair' }],
        },
      ];

      const objectShapedLogs = {
        peptideCatalog: [{ id: 'bpc-157' }],
        weight: [{ date: '2026-07-01', lbs: 180 }],
      };

      let result;
      expect(() => {
        result = buildDailyRoutine({
          goals,
          protocolMap: { 'credit-repair': creditProtocol },
          profile: {},
          protocolStates: {},
          logs: objectShapedLogs,
          settings: { routineCapacity: 'normal' },
        });
      }).not.toThrow();

      expect(result).toHaveProperty('scheduled');
      expect(result).toHaveProperty('deferred');
      expect(result).toHaveProperty('upsells');
      expect(result).toHaveProperty('retention');
      expect(Array.isArray(result.scheduled)).toBe(true);
      expect(Array.isArray(result.deferred)).toBe(true);
    });
  });
});
