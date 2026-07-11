// src/routine/upsell-engine.js
// Monitors protocol state and surfaces upgrade/product recommendations.
// Runs after the routine assembler.

const FREE_PROGRESS_THRESHOLD = 20;
const SUPPLY_LOW_THRESHOLD = 5;
const SUPPLY_CRITICAL_THRESHOLD = 2;
const SKIPPED_TASKS_THRESHOLD = 8;

/**
 * Counts skipped days from the last 7 days of routine logs.
 *
 * `logs.routine` is date-keyed: { 'YYYY-MM-DD': [taskId, ...] } — there is no
 * per-day "scheduled task count" to diff completions against, so we can't
 * derive a skipped *task* count from completions alone. Instead we preserve
 * the original intent (penalize inactivity) with the data we actually have:
 * a day counts as skipped if it has zero completions — either the array for
 * that date is empty, or the date key is absent entirely.
 *
 * @param {object} logs - Log object with a date-keyed `routine` map
 * @returns {number} Count of skipped days (0-7) in the trailing 7-day window
 */
export function countSkippedTasks(logs) {
  if (!logs || !logs.routine || typeof logs.routine !== 'object' || Array.isArray(logs.routine)) {
    return 0;
  }

  const now = new Date();
  let skipped = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const completions = logs.routine[key];
    if (!Array.isArray(completions) || completions.length === 0) {
      skipped += 1;
    }
  }

  return skipped;
}

/**
 * Checks for upsell opportunities based on user state.
 *
 * @param {object[]} goals           - Array of goal objects with progress percent
 * @param {object[]} protocolStates  - Array of protocol state objects with supplyDaysLeft and activeProduct
 * @param {object}   profile         - User profile with tier property
 * @param {object}   logs            - Log data for counting skipped tasks
 * @param {number}   [skippedThisWeek] - Override for skipped tasks count (used in tests / pre-computed)
 * @param {object}   [protocolMap]   - Map of protocolId => protocol instance (for getUpsells)
 * @returns {object[]} Array of upsell objects
 */
export function checkUpsells(goals, protocolStates, profile, logs, skippedThisWeek, protocolMap) {
  const upsells = [];
  const tier = profile?.tier;

  // 1. Tier upgrade: free => pro
  if (tier === 'free') {
    const hasHighProgress = Array.isArray(goals) && goals.some(
      goal => (goal.percent || goal.progress || 0) > FREE_PROGRESS_THRESHOLD
    );
    if (hasHighProgress) {
      upsells.push({
        type: 'tier_upgrade',
        target: 'pro',
        urgency: 'medium',
        message: "You're making great progress! Upgrade to Pro to unlock advanced features and keep the momentum going.",
        product: null,
        placement: 'dashboard',
      });
    }
  }

  // 2. Tier upgrade: pro => elite
  if (tier === 'pro') {
    const skipped = skippedThisWeek !== undefined
      ? skippedThisWeek
      : countSkippedTasks(logs);

    if (skipped >= SKIPPED_TASKS_THRESHOLD) {
      upsells.push({
        type: 'tier_upgrade',
        target: 'elite',
        urgency: 'high',
        message: "You've been skipping tasks this week. Upgrade to Elite for personalized accountability coaching.",
        product: null,
        placement: 'dashboard',
      });
    }
  }

  // 3. Reorder alerts based on protocol supply
  if (Array.isArray(protocolStates)) {
    for (const state of protocolStates) {
      const { supplyDaysLeft, activeProduct, protocolId } = state;
      if (supplyDaysLeft !== undefined && supplyDaysLeft <= SUPPLY_LOW_THRESHOLD && activeProduct) {
        const urgency = supplyDaysLeft <= SUPPLY_CRITICAL_THRESHOLD ? 'high' : 'low';
        upsells.push({
          type: 'reorder',
          protocolId: protocolId || null,
          urgency,
          message: urgency === 'high'
            ? 'Critical: Only ' + supplyDaysLeft + ' days of ' + activeProduct + ' left. Reorder now to avoid interruption.'
            : 'Low supply: ' + supplyDaysLeft + ' days of ' + activeProduct + ' remaining. Consider reordering soon.',
          product: activeProduct,
          placement: 'protocol',
        });
      }
    }
  }

  // 4. Protocol-level upsells from protocolMap
  if (protocolMap && Array.isArray(goals)) {
    for (const goal of goals) {
      const activeProtocols = goal.activeProtocols || [];
      for (const ref of activeProtocols) {
        const proto = protocolMap[ref.protocolId];
        if (!proto || typeof proto.getUpsells !== 'function') continue;

        const protoUpsells = proto.getUpsells(profile) || [];
        for (const upsell of protoUpsells) {
          if (typeof upsell.condition === 'function' && !upsell.condition(profile, goal)) {
            continue;
          }
          upsells.push({
            type: upsell.type || 'protocol_upsell',
            protocolId: ref.protocolId,
            urgency: upsell.urgency || 'low',
            message: upsell.message || '',
            product: upsell.product || null,
            placement: upsell.placement || 'protocol',
          });
        }
      }
    }
  }

  return upsells;
}
