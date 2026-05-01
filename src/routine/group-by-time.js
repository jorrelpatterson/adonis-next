// Groups routine tasks into time blocks (Morning / Midday / Afternoon /
// Evening / Night), and within each block collapses same-category tasks
// (workouts, peptides, supplements) into expandable groups so the routine
// reads like a calendar instead of a flat 30-item list.

export const TIME_BLOCKS = [
  { id: 'morning',   label: 'Morning',   icon: '☀️',  startHour: 5,  endHour: 11 },
  { id: 'midday',    label: 'Midday',    icon: '\u{1F324}️', startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', icon: '\u{1F31E}', startHour: 14, endHour: 18 },
  { id: 'evening',   label: 'Evening',   icon: '\u{1F319}', startHour: 18, endHour: 22 },
  { id: 'night',     label: 'Night',     icon: '\u{1F4A4}', startHour: 22, endHour: 5  },
];

/**
 * Map a task to a time block id. Priority:
 * 1. task.time string ('HH:MM') → parse hour → block
 * 2. task.tod string ('morning'/'evening') → block
 * 3. category fallback (training/peptide → block hint)
 * 4. default to 'morning'
 */
export function blockForTask(task) {
  // 1. Explicit time on task
  if (task.time && /^\d{1,2}:/.test(task.time)) {
    const hour = Number(task.time.split(':')[0]);
    return blockFromHour(hour);
  }
  // 2. tod field on task data
  const tod = task.tod || task.data?.peptide?.tod;
  if (tod) {
    if (/morning/i.test(tod)) return 'morning';
    if (/midday|noon/i.test(tod)) return 'midday';
    if (/afternoon/i.test(tod)) return 'afternoon';
    if (/evening/i.test(tod)) return 'evening';
    if (/night|bed/i.test(tod)) return 'night';
  }
  // 3. Category-based defaults
  switch (task.category) {
    case 'morning':    return 'morning';
    case 'training':   return 'afternoon';
    case 'evening':    return 'evening';
    case 'cycle':      return 'evening';
    default:           return 'morning';
  }
}

function blockFromHour(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

// Categories that should collapse into one expandable group when 2+ are
// present in the same time block. Each task in such a group gets shown
// when the user taps to expand the parent.
//
// NOTE: peptides (both active and suggested) are intentionally NOT grouped.
// They're individual products with their own dose data and Browse → links;
// hiding them under a collapsed header reduces visibility/conversion. Only
// training collapses (a typical workout is 6-8 exercises = real bloat).
const GROUPABLE_CATEGORIES = new Set(['training']);

/**
 * Group tasks by time block, then within each block collapse groupable
 * categories into expandable groups.
 *
 * Returns: [
 *   { block: 'morning', label: 'Morning', icon: '☀️', items: [
 *     { kind: 'task', task: <task object> }                      // single
 *     | { kind: 'group', category: 'training',
 *         summary: { title, count, ... }, tasks: [<tasks>] }     // multiple
 *   ]},
 *   ...
 * ]
 */
export function groupTasksByTimeBlock(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];

  // 1. Bucket tasks by block id
  const buckets = {};
  for (const task of tasks) {
    const blockId = blockForTask(task);
    if (!buckets[blockId]) buckets[blockId] = [];
    buckets[blockId].push(task);
  }

  // 2. Within each bucket, collapse groupable categories
  const result = [];
  for (const block of TIME_BLOCKS) {
    const tasksInBlock = buckets[block.id];
    if (!tasksInBlock || tasksInBlock.length === 0) continue;

    // Bucket by category within the block
    const byCat = {};
    for (const t of tasksInBlock) {
      const cat = t.category || '_other';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(t);
    }

    const items = [];
    // Order matters — preserve original task order as best we can by
    // walking tasks in original order, only collapsing the first time
    // a groupable category is seen
    const seenGroups = new Set();
    for (const t of tasksInBlock) {
      const cat = t.category || '_other';
      if (GROUPABLE_CATEGORIES.has(cat) && byCat[cat].length >= 2) {
        if (seenGroups.has(cat)) continue;  // already emitted the group
        seenGroups.add(cat);
        items.push({
          kind: 'group',
          category: cat,
          summary: buildGroupSummary(cat, byCat[cat]),
          tasks: byCat[cat],
        });
      } else {
        items.push({ kind: 'task', task: t });
      }
    }

    result.push({
      block: block.id,
      label: block.label,
      icon: block.icon,
      items,
    });
  }

  return result;
}

const CAT_GROUP_LABELS = {
  training:    { icon: '\u{1F525}', title: 'Training' },
  peptide:     { icon: '\u{1F489}', title: 'Peptides' },
  peptide_rec: { icon: '\u{1F489}', title: 'Suggested Peptides' },
  supplement:  { icon: '\u{1F48A}', title: 'Supplements' },
  skincare:    { icon: '✨',         title: 'Skincare' },
};

function buildGroupSummary(category, tasks) {
  const meta = CAT_GROUP_LABELS[category] || { icon: '', title: category };
  const count = tasks.length;
  let subtitle = count + ' item' + (count === 1 ? '' : 's');

  // Training-specific subtitle: pull the parent workout name + duration
  if (category === 'training') {
    const main = tasks.find(t => t.duration > 0) || tasks[0];
    const dur = tasks.reduce((s, t) => s + (t.duration || 0), 0);
    subtitle = (main?.title || 'Workout') + (dur ? ' · ' + dur + ' min' : '');
  }

  // Peptide group subtitle: list compound names
  if (category === 'peptide' || category === 'peptide_rec') {
    const names = tasks
      .map(t => (t.title || '').replace(/^\W+/, '').split(' — ')[0])
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    subtitle = count + ' compound' + (count === 1 ? '' : 's') + (names ? ' · ' + names : '');
  }

  return {
    icon: meta.icon,
    title: meta.title,
    subtitle,
    count,
  };
}
