// src/routine/assembler.js
// Step 1 of collect → prioritize → schedule pipeline.

/**
 * Collects tasks from all active protocols across all goals.
 *
 * `logs`/`protocolStates` are threaded through to `proto.getState()` —
 * ported additively from v2-revival-archive (task-7 wiring fix): the
 * peptides protocol needs `protocolStates.peptides` (finder answers /
 * selected stack, written by BodyView) to resolve which stack to surface
 * as routine tasks. Defaults keep every existing call site (which passed
 * neither) behaviorally identical — `getState(profile, {}, goal, undefined)`.
 */
export function collectTasks(goals, protocolMap, profile, day, logs = {}, protocolStates = {}) {
  const collected = [];

  for (const goal of goals) {
    const { id: goalId, title: goalTitle, activeProtocols = [] } = goal;

    for (const ref of activeProtocols) {
      const proto = protocolMap[ref.protocolId];
      if (!proto) continue;

      // Get protocol state, then ask for tasks
      const state = proto.getState(profile, logs, goal, protocolStates[proto.id]);
      const tasks = proto.getTasks(state, profile, day);
      const recs = proto.getRecommendations(state, profile, goal);

      for (const task of tasks) {
        collected.push({ ...task, goalId, goalTitle, protocolId: proto.id });
      }
      for (const rec of recs) {
        collected.push({ ...rec, goalId, goalTitle, protocolId: proto.id });
      }
    }
  }

  return collected;
}
