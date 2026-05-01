// Routine intelligence — surfaces "yesterday's recap" + check-in-driven alerts
// + weight-trend nudges at the top of the daily routine. Makes the app feel
// alive: opens with "you crushed yesterday" or "low sleep 3 days running —
// take it easy today" instead of just a list of tasks.
//
// All functions are pure: in → out, no side effects, easy to test.
//
// LOG SHAPES (for reference)
//   logs.checkins  = { 'YYYY-MM-DD': { mood, energy, sleep, stress, ... } }
//   logs.routine   = { 'YYYY-MM-DD': [taskId, ...] }
//   logs.weight    = [{ date: 'YYYY-MM-DD', weight: 180.4 }, ...]
//   logs.food      = { 'YYYY-MM-DD': [{ name, cal, p, c, f }, ...] }
//   logs.exercise  = [{ date, name, sets, weight, reps, isPR }, ...]

import { getCheckinAverages } from '../protocols/_system/checkin/selectors.js';

const ymd = (d) => new Date(d).toISOString().slice(0, 10);

function isoDayBefore(today) {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Yesterday's recap. Returns null if there's nothing meaningful to surface.
 * @param {Object} logs   - state.logs
 * @param {string} today  - 'YYYY-MM-DD'
 */
export function buildYesterdayRecap(logs, today) {
  if (!logs) return null;
  const yKey = isoDayBefore(today);

  const ydCheckin = logs.checkins?.[yKey] || null;
  const ydRoutine = logs.routine?.[yKey] || [];
  const ydFood = logs.food?.[yKey] || [];
  const ydExercise = (logs.exercise || []).filter(e => e?.date === yKey);

  const tasksDone = Array.isArray(ydRoutine) ? ydRoutine.length : 0;
  const calorieTotal = ydFood.reduce((s, f) => s + (Number(f.cal) || 0), 0);
  const exerciseCount = ydExercise.length;
  const prCount = ydExercise.filter(e => e?.isPR).length;

  // Weight delta: yesterday vs day-before-yesterday
  let weightDelta = null;
  const weights = (logs.weight || []).filter(w => w?.date && w?.weight != null);
  if (weights.length >= 2) {
    const sorted = weights.slice().sort((a, b) => a.date.localeCompare(b.date));
    const yIdx = sorted.findIndex(w => w.date === yKey);
    if (yIdx > 0) {
      weightDelta = +(Number(sorted[yIdx].weight) - Number(sorted[yIdx - 1].weight)).toFixed(1);
    }
  }

  // If the user did literally nothing yesterday, return null
  const meaningful = ydCheckin || tasksDone > 0 || calorieTotal > 0 || exerciseCount > 0 || weightDelta != null;
  if (!meaningful) return null;

  return {
    date: yKey,
    checkin: ydCheckin,         // { mood, energy, sleep, ... } or null
    tasksDone,
    calorieTotal,
    exerciseCount,
    prCount,
    weightDelta,
  };
}

/**
 * Check-in-driven alerts. Returns up to 3 prioritized alerts based on the
 * last 7 days of check-ins.
 *
 * Alert shape: { tone: 'warn'|'info'|'good', icon, title, body }
 */
export function buildCheckinAlerts(logs) {
  const avg = getCheckinAverages(logs, 7, 3);  // need >= 3 days
  if (!avg) return [];

  const alerts = [];

  // Low sleep — pull back training
  if (avg.sleep != null && avg.sleep < 2.5) {
    alerts.push({
      tone: 'warn', icon: '\u{1F634}',
      title: 'Sleep below baseline',
      body: 'Lighter training today + earlier bedtime. Consider DSIP for sleep recovery.',
    });
  }

  // High stress — skip HIIT
  if (avg.stress != null && avg.stress < 2.5) {
    alerts.push({
      tone: 'warn', icon: '\u{1F62D}',
      title: 'Stress trending high',
      body: 'Skip HIIT today. Walks + breathwork. Ashwagandha if you stack nootropics.',
    });
  }

  // Soreness recovery
  if (avg.soreness != null && avg.soreness < 2.5) {
    alerts.push({
      tone: 'info', icon: '\u{1F4A6}',
      title: 'Recovery check',
      body: 'Foam roll first. Drop training weight 10% or take an extra rest day.',
    });
  }

  // Low energy — GH support
  if (avg.energy != null && avg.energy < 2.5) {
    alerts.push({
      tone: 'info', icon: '\u{1F50B}',
      title: 'Energy in the tank',
      body: 'Lower-volume workout. CJC/Ipa stack drives recovery if available.',
    });
  }

  // Peak day — push hard
  if (
    avg.energy != null && avg.energy >= 4 &&
    avg.sleep != null && avg.sleep >= 4 &&
    avg.mood != null && avg.mood >= 4
  ) {
    alerts.push({
      tone: 'good', icon: '\u{1F525}',
      title: 'Peak day',
      body: 'You are dialed. Push the volume + intensity. Add a finisher.',
    });
  }

  // Cap at 3, prioritized: warn first, then info, then good
  const order = { warn: 0, info: 1, good: 2 };
  return alerts.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 3);
}

/**
 * Weight-trend alert — only fires when there's a meaningful insight.
 * Goal-aware: knows whether the user is trying to lose/gain.
 *
 * @param {Object} logs   - state.logs
 * @param {Object} profile - has .goalW (target weight)
 * @returns {Object|null}
 */
export function buildWeightTrendAlert(logs, profile) {
  const weights = (logs?.weight || []).filter(w => w?.date && w?.weight != null);
  if (weights.length < 5) return null;

  const sorted = weights.slice().sort((a, b) => a.date.localeCompare(b.date));
  const last7 = sorted.slice(-7);
  if (last7.length < 4) return null;

  const start = Number(last7[0].weight);
  const end = Number(last7[last7.length - 1].weight);
  const delta = end - start;
  const days = Math.max(1, last7.length - 1);
  const dailyDelta = delta / days;
  const weeklyDelta = dailyDelta * 7;

  const current = Number(profile?.weight || end);
  const goal = Number(profile?.goalW || 0);
  const isLosing = goal && goal < current;
  const isGaining = goal && goal > current;

  // Almost at goal
  if (goal && Math.abs(end - goal) < 1) {
    return { tone: 'good', icon: '\u{1F3AF}', title: 'Almost there',
      body: `You are within 1 lb of your goal. ${end} → ${goal}.` };
  }

  // Wrong direction
  if (isLosing && weeklyDelta > 0.5) {
    return { tone: 'warn', icon: '⚠️', title: 'Trending up',
      body: `Up ${weeklyDelta.toFixed(1)} lbs/wk this week — flip the deficit. Re-check macros.` };
  }
  if (isGaining && weeklyDelta < -0.5) {
    return { tone: 'warn', icon: '⚠️', title: 'Trending down',
      body: `Down ${Math.abs(weeklyDelta).toFixed(1)} lbs/wk this week — eat more. Add a meal.` };
  }

  // Too fast
  if (isLosing && weeklyDelta < -3) {
    return { tone: 'warn', icon: '\u{1F6A8}', title: 'Cutting too fast',
      body: `Losing ${Math.abs(weeklyDelta).toFixed(1)} lbs/wk — risk of muscle loss. Bump cals 200.` };
  }
  if (isGaining && weeklyDelta > 2) {
    return { tone: 'warn', icon: '\u{1F6A8}', title: 'Bulking too fast',
      body: `Up ${weeklyDelta.toFixed(1)} lbs/wk — fat is outpacing muscle. Trim 200 cal/day.` };
  }

  // On track for losing/gaining
  if (isLosing && weeklyDelta < -0.3 && weeklyDelta > -2.5) {
    return { tone: 'good', icon: '\u{1F4C9}', title: 'On track',
      body: `Down ${Math.abs(weeklyDelta).toFixed(1)} lbs/wk — keep going.` };
  }
  if (isGaining && weeklyDelta > 0.3 && weeklyDelta < 1.5) {
    return { tone: 'good', icon: '\u{1F4C8}', title: 'On track',
      body: `Up ${weeklyDelta.toFixed(1)} lbs/wk — quality bulk pace.` };
  }

  return null;
}

/**
 * Counts consecutive weeks (Mon-Sun) where the user logged at least one
 * exercise. Returns the count.
 *
 * @param {Object} logs - state.logs
 * @param {string} today - 'YYYY-MM-DD'
 */
export function countConsecutiveTrainingWeeks(logs, today) {
  const exercise = (logs?.exercise || []).filter(e => e?.date);
  if (exercise.length === 0) return 0;

  // Bucket exercises by week start (Mon)
  const weekStart = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dow = d.getUTCDay() || 7;  // 1=Mon..7=Sun
    d.setUTCDate(d.getUTCDate() - (dow - 1));
    return d.toISOString().slice(0, 10);
  };

  const weeksWithTraining = new Set(exercise.map(e => weekStart(e.date)));

  // Walk back from this week, counting consecutive weeks with training
  let count = 0;
  let cursor = new Date(weekStart(today) + 'T12:00:00Z');
  while (true) {
    const wk = cursor.toISOString().slice(0, 10);
    if (weeksWithTraining.has(wk)) {
      count++;
      cursor.setUTCDate(cursor.getUTCDate() - 7);
    } else {
      break;
    }
    if (count > 52) break;  // safety
  }
  return count;
}

/**
 * Suggest a deload week after 4+ consecutive training weeks. Returns
 * an alert object compatible with the buildCheckinAlerts shape.
 */
export function buildDeloadAlert(logs, today) {
  const weeks = countConsecutiveTrainingWeeks(logs, today);
  if (weeks < 4) return null;
  return {
    tone: 'info',
    icon: '\u{1F4A4}',
    title: `Deload week recommended`,
    body: `${weeks} weeks of consistent training — drop weight 30-40% and reduce volume this week. Your CNS will thank you.`,
  };
}

/**
 * Goal pace → workout intensity modifier.
 *
 * Compares current weight vs target weight (from goal) to deadline. If
 * dramatically behind, suggest "extreme" intensity; if ahead, suggest
 * "recovery" (back off). Returns one of: 'recovery'|'normal'|'high'|'extreme'.
 *
 * @param {Object} profile - has weight, goalW, targetDate
 * @param {Object} logs - has weight log
 * @param {string} today
 */
export function computeWorkoutIntensity(profile, logs, today) {
  const current = Number(profile?.weight);
  const goal = Number(profile?.goalW);
  const deadline = profile?.targetDate;
  if (!current || !goal || !deadline) return 'normal';

  // Days from today to deadline
  const todayDate = new Date(today);
  const deadlineDate = new Date(deadline);
  const daysLeft = Math.max(1, Math.round((deadlineDate - todayDate) / (1000 * 60 * 60 * 24)));

  // Required weekly delta to hit goal
  const lbsToGo = goal - current;  // negative if losing
  const weeksLeft = Math.max(1, daysLeft / 7);
  const reqWeeklyRate = lbsToGo / weeksLeft;
  const absRequired = Math.abs(reqWeeklyRate);

  // Determine if user is behind: required rate exceeds safe limits
  const isLosing = goal < current;
  const safeMax = isLosing ? 2.5 : 1.5;  // lbs/week

  if (absRequired > safeMax * 1.6) return 'extreme';   // behind by a wide margin
  if (absRequired > safeMax * 1.0) return 'high';      // behind, push harder
  if (absRequired < safeMax * 0.3) return 'recovery';  // way ahead — back off
  return 'normal';
}

const INTENSITY_LABELS = {
  recovery: { label: 'RECOVERY',  icon: '\u{1F7E2}', color: '#34D399' },
  normal:   { label: '',          icon: '',          color: null },
  high:     { label: 'HIGH',      icon: '⚡',    color: '#E8D5B7' },
  extreme:  { label: 'EXTREME',   icon: '\u{1F525}', color: '#EF4444' },
};

export function getIntensityLabel(intensity) {
  return INTENSITY_LABELS[intensity] || INTENSITY_LABELS.normal;
}
