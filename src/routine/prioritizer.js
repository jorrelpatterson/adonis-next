// src/routine/prioritizer.js

const CAPACITY_LIMITS = {
  light: 15,
  normal: 25,
  packed: 35,
};

/**
 * Score a task based on its properties and goal priority.
 * Higher score = higher priority.
 */
function scoreTask(task, goalPriorities) {
  let score = 0;

  // Automated tasks get a massive boost
  if (task.type === 'automated') {
    score += 1000;
  }

  // Priority score: p1=300, p2=200, p3=100
  score += (4 - task.priority) * 100;

  // Goal rank score: rank 1 → 50pts, rank 5 → 10pts, default rank 5
  const rank = goalPriorities[task.goalId] ?? 5;
  score += (6 - rank) * 10;

  // Revenue/recommendation boost
  if (task.type === 'recommendation' || task.revenue) {
    score += 25;
  }

  // Non-skippable boost
  if (!task.skippable) {
    score += 50;
  }

  return score;
}

/**
 * Prioritize tasks into scheduled and deferred lists.
 *
 * @param {Array} tasks - Raw task objects
 * @param {Object} goalPriorities - Map of goalId -> rank (lower = higher priority)
 * @param {Object} settings - Settings object with routineCapacity ('light'|'normal'|'packed')
 * @returns {{ scheduled: Array, deferred: Array }}
 */
export function prioritizeTasks(tasks, goalPriorities, settings) {
  if (!tasks || tasks.length === 0) {
    return { scheduled: [], deferred: [] };
  }

  const capacity = CAPACITY_LIMITS[settings.routineCapacity] ?? CAPACITY_LIMITS.normal;

  // Score and sort tasks descending
  const scored = tasks
    .map((task) => ({ task, score: scoreTask(task, goalPriorities) }))
    .sort((a, b) => b.score - a.score);

  const scheduled = [];
  const deferred = [];
  let regularCount = 0;

  for (const { task } of scored) {
    const mustInclude =
      task.type === 'automated' || task.priority === 1 || !task.skippable;

    if (mustInclude) {
      scheduled.push(task);
    } else if (regularCount < capacity) {
      scheduled.push(task);
      regularCount++;
    } else {
      deferred.push(task);
    }
  }

  return { scheduled, deferred };
}
