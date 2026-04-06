// src/routine/upsell-engine.js
// Monitors protocol state and surfaces upgrade/product recommendations.
// Runs after the routine assembler.

const FREE_PROGRESS_THRESHOLD = 20;
const SUPPLY_LOW_THRESHOLD = 5;
const SUPPLY_CRITICAL_THRESHOLD = 2;
const SKIPPED_TASKS_THRESHOLD = 8;

/**
 * Counts skipped tasks from the last 7 days of routine logs.
 * A day is considered "skipped" if it has fewer than 3 completions,
 * and we sum the gaps (3 - completions) across those days.
 *
 * @param {object} logs - Log object with a `routine` array of daily entries
 * @returns {number} Total count of skipped task slots
 */
export function countSkippedTasks(logs) {
  if (!logs || !Array.isArray(logs.routine) || logs.routine.length === 0) {
    return 0;
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let skipped = 0;

  for (const entry of logs.routine) {
    const entryDate = new Date(entry.date);
    if (entryDate >= sevenDaysAgo && entryDate <= now) {
      const completions = entry.completions || 0;
      if (completions < 3) {
        skipped += 3 - completions;
      }
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
