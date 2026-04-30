// src/routine/assembler.js
// Step 1 of collect → prioritize → schedule pipeline.

/**
 * Collects tasks from all active protocols across all goals.
 */
export function collectTasks(goals, protocolMap, profile, day) {
  const collected = [];

  for (const goal of goals) {
    const { id: goalId, title: goalTitle, activeProtocols = [] } = goal;

    for (const ref of activeProtocols) {
      const proto = protocolMap[ref.protocolId];
      if (!proto) continue;

      // Get protocol state, then ask for tasks
      const state = proto.getState(profile, {}, goal);
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
