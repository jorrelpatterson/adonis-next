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
  const allTasks = collectTasks(goals, protocolMap, profile, day, logs, protocolStates);

  // System protocols (domain: '_system') run independently of goals.
  // Currently: daily check-in. They emit tasks once per day, not per-goal.
  //
  // Ported additively from v2-revival-archive:src/routine/pipeline.js
  // (task-14 brief, binding-review follow-up): main's checkinProtocol
  // (src/protocols/_system/checkin/index.js) was registered via
  // register-all.js but its getTasks() was never invoked anywhere —
  // collectTasks() above only walks each goal's activeProtocols, and
  // checkin isn't attached to any goal. This block is the missing link
  // that actually surfaces the "Daily Check-in" task in the routine.
  //
  // task-7 follow-up: collectTasks() now ALSO threads `logs`/`protocolStates`
  // through to the per-goal `proto.getState()` path (previously scoped out
  // here as "a broader behavior change") — the peptides protocol needed it
  // to resolve `protocolStates.peptides` into routine browse tasks. See
  // src/routine/assembler.js and .superpowers/sdd/task-7-report.md.
  if (goals.length > 0) {
    for (const proto of Object.values(protocolMap)) {
      if (proto.domain !== '_system' || typeof proto.getTasks !== 'function') continue;
      if (typeof proto.canServe === 'function' && !proto.canServe()) continue;
      const sysState = proto.getState ? proto.getState(profile, logs, null, protocolStates[proto.id]) : {};
      const sysTasks = proto.getTasks(sysState, profile, day);
      for (const task of sysTasks) {
        allTasks.push({ ...task, protocolId: proto.id });
      }
    }
  }

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
