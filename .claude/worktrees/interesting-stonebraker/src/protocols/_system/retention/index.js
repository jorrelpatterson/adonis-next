// src/protocols/_system/retention/index.js

const STREAK_BROKEN_THRESHOLD = 3;
const GOAL_STALLED_DAYS = 14;
const RENEWAL_WINDOW_DAYS = 7;

/**
 * Count consecutive missed days walking backward from today.
 * A day is "missed" if there's no array entry or an empty array in routineLogs.
 * @param {Object} routineLogs - keyed by 'YYYY-MM-DD', values are arrays of completed items
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {number}
 */
export function countConsecutiveMissedDays(routineLogs, today) {
  const todayDate = new Date(today);
  let count = 0;
  let cursor = new Date(todayDate);
  // Start from yesterday — today is in progress
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const entries = routineLogs[key];
    if (!entries || entries.length === 0) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    // Safety: don't walk back more than 365 days
    if (count > 365) break;
  }
  return count;
}

/**
 * Get completion rate over the last 7 days (not including today).
 * @param {Object} routineLogs - keyed by 'YYYY-MM-DD'
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {number} fraction 0..1
 */
export function getWeeklyCompletionRate(routineLogs, today) {
  const todayDate = new Date(today);
  let activeDays = 0;
  for (let i = 1; i <= 7; i++) {
    const cursor = new Date(todayDate);
    cursor.setDate(cursor.getDate() - i);
    const key = cursor.toISOString().slice(0, 10);
    const entries = routineLogs[key];
    if (entries && entries.length > 0) {
      activeDays++;
    }
  }
  return activeDays / 7;
}

/**
 * Calculate days between a past date string and today string.
 */
function daysSince(dateStr, today) {
  const past = new Date(dateStr);
  const now = new Date(today);
  const diffMs = now - past;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until a future date string from today.
 */
function daysUntil(dateStr, today) {
  const future = new Date(dateStr);
  const now = new Date(today);
  const diffMs = future - now;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Run all retention checks and return any triggered interventions.
 *
 * @param {Object} profile - user profile (renewalDate, etc.)
 * @param {Object} logs - { routine: { 'YYYY-MM-DD': string[] } }
 * @param {Array}  goals - array of goal objects { id, trend, lastProgressDate, ... }
 * @param {Object} protocolStates - { peptides: { lastDoseDate, maxGapDays } }
 * @param {string} today - 'YYYY-MM-DD'
 * @returns {Array} interventions
 */
export function checkRetention(profile, logs, goals, protocolStates, today) {
  const interventions = [];
  const routineLogs = (logs && logs.routine) ? logs.routine : {};

  // 1. Broken streak: 3+ consecutive missed days
  const missedDays = countConsecutiveMissedDays(routineLogs, today);
  if (missedDays >= STREAK_BROKEN_THRESHOLD) {
    interventions.push({
      signal: 'streak_broken',
      goalId: null,
      response: {
        type: 'streak_broken',
        message: `You've missed ${missedDays} days in a row. Let's get back on track.`,
        tone: 'encouraging',
        cta: 'Resume Today',
        options: ['Log a workout', 'Adjust your schedule'],
        showProgressChart: false,
      },
    });
  }

  // 2. Peptide gap: lastDoseDate + maxGapDays exceeded
  const peptideState = protocolStates && protocolStates.peptides;
  if (peptideState && peptideState.lastDoseDate && peptideState.maxGapDays != null) {
    const gap = daysSince(peptideState.lastDoseDate, today);
    if (gap > peptideState.maxGapDays) {
      interventions.push({
        signal: 'peptide_gap',
        goalId: null,
        response: {
          type: 'peptide_gap',
          message: `It's been ${gap} days since your last peptide dose. Your protocol recommends dosing every ${peptideState.maxGapDays} days.`,
          tone: 'informational',
          cta: 'Log Dose',
          options: ['Log dose now', 'Adjust protocol'],
          showProgressChart: false,
        },
      });
    }
  }

  // 3. Stalled goal: trend==='stalled' and lastProgressDate 14+ days ago
  if (Array.isArray(goals)) {
    for (const goal of goals) {
      if (goal.trend === 'stalled' && goal.lastProgressDate) {
        const stalledDays = daysSince(goal.lastProgressDate, today);
        if (stalledDays >= GOAL_STALLED_DAYS) {
          interventions.push({
            signal: 'goal_stalled',
            goalId: goal.id,
            response: {
              type: 'goal_stalled',
              message: `Your goal "${goal.title || goal.id}" has been stalled for ${stalledDays} days. Time to reassess.`,
              tone: 'motivational',
              cta: 'Review Goal',
              options: ['Update progress', 'Adjust target', 'Get coaching'],
              showProgressChart: true,
            },
          });
        }
      }
    }
  }

  // 4. Low engagement before renewal: renewalDate within 7 days + weekly completion < 30%
  if (profile && profile.renewalDate) {
    const daysToRenewal = daysUntil(profile.renewalDate, today);
    if (daysToRenewal >= 0 && daysToRenewal <= RENEWAL_WINDOW_DAYS) {
      const weeklyRate = getWeeklyCompletionRate(routineLogs, today);
      if (weeklyRate < 0.3) {
        interventions.push({
          signal: 'low_engagement_pre_renewal',
          goalId: null,
          response: {
            type: 'low_engagement_pre_renewal',
            message: `Your renewal is in ${daysToRenewal} days and your weekly completion is ${Math.round(weeklyRate * 100)}%. Let's make the most of your subscription.`,
            tone: 'urgent',
            cta: 'Get Back on Track',
            options: ['See your plan', 'Talk to a coach', 'Pause subscription'],
            showProgressChart: true,
          },
        });
      }
    }
  }

  return interventions;
}
