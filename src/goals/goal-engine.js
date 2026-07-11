// src/goals/goal-engine.js
// Creates goals from templates or structured input, matches protocols, tracks progress.

let idCounter = 0;
function generateId() {
  idCounter++;
  return 'goal_' + Date.now().toString(36) + '_' + idCounter.toString(36);
}

function emptyProgress() {
  return { percent: 0, current: null, trend: 'on_track', projectedCompletion: null };
}

function emptyRevenue() {
  return { total: 0, items: [] };
}

/**
 * Creates a goal from a template and user answers.
 * @param {object} template - A GOAL_TEMPLATES entry
 * @param {object} answers  - Key/value answers from setupQuestions
 * @param {object} [opts]   - Optional overrides
 * @param {string|null} [opts.parentId] - Parent goal id for decomposition (null = top-level)
 * @returns {object} goal
 */
export function createGoalFromTemplate(template, answers, opts = {}) {
  const target = template.buildTarget(answers);
  return {
    id: generateId(),
    title: template.title,
    domain: template.domain,
    type: 'template',
    templateId: template.id,
    status: 'active',
    target,
    deadline: answers.deadline || target.deadline || null,
    activeProtocols: [...template.protocols],
    parentId: opts.parentId || null,
    progress: emptyProgress(),
    revenue: emptyRevenue(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a structured goal from a raw input object.
 * @param {object} input
 * @param {object} [opts]   - Optional overrides
 * @param {string|null} [opts.parentId] - Parent goal id for decomposition (null = top-level)
 * @returns {object} goal
 */
export function createGoalFromInput(input, opts = {}) {
  return {
    id: generateId(),
    title: input.title,
    domain: input.domain,
    type: 'structured',
    templateId: null,
    status: input.status || 'active',
    target: input.target || {},
    deadline: input.deadline || null,
    activeProtocols: input.activeProtocols || [],
    parentId: opts.parentId || null,
    progress: emptyProgress(),
    revenue: emptyRevenue(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Creates a child goal decomposed from a parent goal, inheriting the
 * parent's deadline unless the child input specifies its own. This is
 * the groundwork for the post-MVP Bucket List orchestrator, where a
 * top-level goal (e.g. "Egypt trip") decomposes into child goals
 * (e.g. "Save $3k") that share a deadline by default.
 * @param {object} parentGoal - The parent goal object
 * @param {object} input      - Raw input for the child goal (same shape as createGoalFromInput)
 * @returns {object} child goal
 */
export function createChildGoal(parentGoal, input) {
  const childInput = {
    ...input,
    deadline: input.deadline || parentGoal.deadline || null,
  };
  return createGoalFromInput(childInput, { parentId: parentGoal.id });
}

/**
 * Calculates current progress for a goal.
 * @param {object} goal
 * @param {number} currentValue
 * @param {string} today - ISO date string (YYYY-MM-DD)
 * @returns {{ percent: number, current: number, trend: string, projectedCompletion: null }}
 */
export function updateGoalProgress(goal, currentValue, today) {
  const { start, end } = goal.target;
  const totalDistance = Math.abs(end - start);

  let percent = 0;
  if (totalDistance > 0) {
    const moved = Math.abs(start - currentValue);
    percent = Math.round((moved / totalDistance) * 100);
    percent = Math.min(100, Math.max(0, percent));
  }

  // Determine trend based on deadline and time elapsed
  const deadline = goal.deadline || (goal.target && goal.target.deadline) || null;
  let trend = 'on_track';

  if (deadline && goal.createdAt) {
    const startDate = new Date(goal.createdAt);
    const endDate = new Date(deadline);
    const todayDate = new Date(today);

    const totalMs = endDate - startDate;
    const elapsedMs = todayDate - startDate;

    if (totalMs > 0) {
      const timePercent = Math.round((elapsedMs / totalMs) * 100);
      if (percent > timePercent + 10) {
        trend = 'ahead';
      } else if (percent < timePercent - 10) {
        trend = 'behind';
      } else {
        trend = 'on_track';
      }
    }
  }

  return { percent, current: currentValue, trend, projectedCompletion: null };
}

/**
 * Returns the list of protocols for a given template.
 * @param {object} template - A GOAL_TEMPLATES entry
 * @returns {Array}
 */
export function activateProtocolsForGoal(template) {
  return [...template.protocols];
}

/**
 * Returns the activeProtocols array for a goal (for decomposition into tasks).
 * @param {object} goal
 * @returns {Array}
 */
export function decomposeGoal(goal) {
  return goal.activeProtocols || [];
}
