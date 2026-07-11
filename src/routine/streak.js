// Streak — consecutive-day counters for engagement tracking.
//
// Routine streak: walk backward from today counting days where the user
// completed at least one routine task. Breaks on a fully-empty day.
// Today doesn't break the streak (in case the user hasn't checked in yet).

function isoDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

function shiftDay(iso, deltaDays) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the current routine streak in days.
 * @param {Object} routineLogs - { 'YYYY-MM-DD': string[] }  (task IDs checked that day)
 * @param {string} todayISO - today as YYYY-MM-DD
 */
export function computeRoutineStreak(routineLogs, todayISO) {
  if (!routineLogs || typeof routineLogs !== 'object') return 0;
  const today = todayISO || isoDay(new Date());

  // Today doesn't break streak — start counting from yesterday backward
  // unless today already has logged tasks (then today counts).
  let count = 0;
  let cursor = today;
  const todayHasActivity = Array.isArray(routineLogs[today]) && routineLogs[today].length > 0;
  if (todayHasActivity) {
    count = 1;
    cursor = shiftDay(cursor, -1);
  } else {
    cursor = shiftDay(cursor, -1);
  }

  // Walk back day by day
  for (let i = 0; i < 365; i++) {
    const arr = routineLogs[cursor];
    if (Array.isArray(arr) && arr.length > 0) {
      count += 1;
      cursor = shiftDay(cursor, -1);
    } else {
      break;
    }
  }
  return count;
}
