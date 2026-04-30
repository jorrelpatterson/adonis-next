// Helpers used by the check-in protocol AND downstream adaptive engines
// (calorie engine, getStackAdj for peptides, workout intensity modifier).

import { CHECKIN_FIELDS } from './fields.js';

const FIELD_IDS = CHECKIN_FIELDS.map(f => f.id);

/**
 * @returns {Object|null} today's check-in entry, or null if not submitted yet
 */
export function getTodayCheckin(logs, today) {
  if (!logs || !logs.checkins) return null;
  return logs.checkins[today] || null;
}

/**
 * @returns {number} count of check-in entries logged
 */
export function getCheckinCount(logs) {
  if (!logs || !logs.checkins) return 0;
  return Object.keys(logs.checkins).length;
}

/**
 * Compute averages across the most recent N days of check-ins.
 * Mirrors v1's getStackAdj semantics: takes the last N entries from the
 * checkins object, computes per-field average across whatever fields are present.
 *
 * @param {Object} logs - state.logs
 * @param {number} days - window size (default 7)
 * @returns {Object|null} { mood, energy, sleep, stress, appetite, skin, focus, soreness, _count }
 *                        or null if not enough data (count < minSamples)
 */
export function getCheckinAverages(logs, days = 7, minSamples = 5) {
  if (!logs || !logs.checkins) return null;
  const entries = Object.entries(logs.checkins).slice(-days);
  if (entries.length < minSamples) return null;

  const result = { _count: entries.length };
  for (const id of FIELD_IDS) {
    const vals = entries
      .map(([, entry]) => entry[id])
      .filter(v => v != null && Number.isFinite(v));
    result[id] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return result;
}
