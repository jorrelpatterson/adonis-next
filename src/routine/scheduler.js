// src/routine/scheduler.js
// Step 3 of the collect→prioritize→schedule pipeline.
// Assigns time blocks to prioritized tasks and sorts them into a daily timeline.

export const TIME_BLOCKS = [
  { id: 'morning',   label: 'Morning',   startHour: 5,  endHour: 9  },
  { id: 'training',  label: 'Training',  startHour: 6,  endHour: 10 },
  { id: 'work',      label: 'Work',      startHour: 9,  endHour: 17 },
  { id: 'midday',    label: 'Midday',    startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', startHour: 14, endHour: 18 },
  { id: 'evening',   label: 'Evening',   startHour: 18, endHour: 23 },
];

const CATEGORY_TO_BLOCK = {
  morning:     'morning',
  peptide:     'morning',
  peptide_rec: 'morning',
  skincare:    'morning',
  nutrition:   'midday',
  supplement:  'morning',
  training:    'training',
  work:        'work',
  income:      'afternoon',
  credit:      'afternoon',
  travel:      'afternoon',
  mind:        'morning',
  purpose:     'morning',
  evening:     'evening',
  cycle:       'evening',
};

const BLOCK_ORDER = {
  morning:   0,
  training:  1,
  work:      2,
  midday:    3,
  afternoon: 4,
  evening:   5,
};

/**
 * Convert a "HH:MM" time string to total minutes for comparison.
 * @param {string} time
 * @returns {number}
 */
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Assign time blocks to tasks and sort them into a daily timeline.
 *
 * Sort order:
 * 1. Tasks with explicit time come first, sorted chronologically
 * 2. Tasks without explicit time, sorted by block order, then category, then priority
 *
 * @param {object[]} tasks   - Prioritized task objects
 * @param {object}   profile - User profile (trainPref: 'morning'|'evening')
 * @returns {object[]} Tasks with scheduledBlock set, in daily order
 */
export function scheduleTasks(tasks, profile) {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const withBlocks = tasks.map((task) => {
    let block;
    if (task.category === 'training') {
      block = profile.trainPref === 'evening' ? 'evening' : 'morning';
    } else {
      block = CATEGORY_TO_BLOCK[task.category] ?? 'afternoon';
    }
    return { ...task, scheduledBlock: block };
  });

  const withTime = withBlocks.filter((t) => t.time);
  const withoutTime = withBlocks.filter((t) => !t.time);

  withTime.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  withoutTime.sort((a, b) => {
    const blockDiff = (BLOCK_ORDER[a.scheduledBlock] ?? 4) - (BLOCK_ORDER[b.scheduledBlock] ?? 4);
    if (blockDiff !== 0) return blockDiff;

    const catDiff = (a.category ?? '').localeCompare(b.category ?? '');
    if (catDiff !== 0) return catDiff;

    return (a.priority ?? 3) - (b.priority ?? 3);
  });

  return [...withTime, ...withoutTime];
}
