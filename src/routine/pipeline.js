// src/routine/pipeline.js
// Main entry point for the daily routine pipeline.
// Wires together: collect → prioritize → schedule → upsell → retention.

import { collectTasks } from './assembler.js';
import { prioritizeTasks } from './prioritizer.js';
import { scheduleTasks } from './scheduler.js';
import { checkUpsells } from './upsell-engine.js';
import { checkRetention } from '../protocols/_system/retention/index.js';

/**
 * Build the full daily routine from goals and protocol map.
 *
 * @param {object} options
 * @param {object[]} options.goals          - Array of goal objects
 * @param {object}   options.protocolMap    - Map of protocolId → protocol instance
 * @param {object}   options.profile        - User profile
 * @param {object}   options.protocolStates - Protocol states (for upsell/retention checks)
 * @param {object}   options.logs           - Log data (for upsell/retention checks)
 * @param {object}   options.settings       - Settings (e.g. routineCapacity)
 * @param {Date}     options.day            - Date object for the current day
 * @param {string}   options.today          - ISO date string 'YYYY-MM-DD' for today
 * @returns {{ scheduled: object[], deferred: object[], upsells: object[], retention: object[] }}
 */
export function buildDailyRoutine({
  goals = [],
  protocolMap = {},
  profile = {},
  protocolStates = {},
  logs = {},
  settings = {},
  day = new Date(),
  today = new Date().toISOString().slice(0, 10),
}) {
  const allTasks = collectTasks(goals, protocolMap, profile, day);

  const goalPriorities = {};
  for (const goal of goals) {
    goalPriorities[goal.id] = goal.priority || goals.indexOf(goal) + 1;
  }

  const { scheduled: prioritized, deferred } = prioritizeTasks(allTasks, goalPriorities, settings);
  const scheduled = scheduleTasks(prioritized, profile);
  const upsells = checkUpsells(goals, protocolStates, profile, logs, undefined, protocolMap);
  const retention = checkRetention(profile, logs, goals, protocolStates, today);

  return { scheduled, deferred, upsells, retention };
}
