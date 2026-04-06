// src/routine/assembler.js
// Step 1 of the collect→prioritize→schedule pipeline.
// Gathers raw tasks and recommendations from all active protocols across all goals.

/**
 * Collects tasks from all active protocols across all goals.
 *
 * @param {object[]} goals      - Array of goal objects (each with id, title, activeProtocols)
 * @param {object}   protocolMap - Map of protocolId → protocol instance
 * @param {object}   profile    - User profile (passed through to protocol calls)
 * @param {string}   day        - ISO date string for the current day
 * @returns {object[]} Flat array of tagged task and recommendation objects
 */
export function collectTasks(goals, protocolMap, profile, day) {
  const collected = [];

  for (const goal of goals) {
    const { id: goalId, title: goalTitle, activeProtocols = [] } = goal;

    for (const ref of activeProtocols) {
      const proto = protocolMap[ref.protocolId];
      if (!proto) continue;

      // Call getState so protocols can update internal state if needed
      proto.getState(profile, day);

      const tasks = proto.getTasks(profile, day);
      for (const task of tasks) {
        collected.push({ ...task, goalId, goalTitle, protocolId: proto.id });
      }

      const recommendations = proto.getRecommendations(profile, day);
      for (const rec of recommendations) {
        collected.push({ ...rec, type: 'recommendation', goalId, goalTitle, protocolId: proto.id });
      }
    }
  }

  return collected;
}
