// Curated peptide stacks ported from v1 (PROTO_STACKS at app.html:5963-6160).
// Each stack is a synergistic peptide bundle chosen for a primary goal,
// not a top-N filter on goal-match. Used by the routine engine to surface
// browse tasks AND by the Body tab's peptide-stack card.
//
// MAPPING
// - User's primary goal in the Peptide Finder maps to a stack id
//   (e.g. fat_loss → 'shred', muscle → 'sculpt', mind → 'edge').
// - User's budget tier filters which stacks are reachable (low → SLEEP,
//   mid → SHRED/SCULPT etc, high → EXECUTIVE/APEX).
// - getStackForFinder(finderAnswers) does the matching.

export const PROTO_STACKS = [
  {
    id: 'shred',
    name: 'SHRED',
    icon: '\u{1F525}',
    tag: 'Maximum fat loss + muscle preservation + energy',
    target: 'Men/women 25-55 wanting aggressive body recomp',
    monthly: '$200-300/mo',
    monthlyLow: 200, monthlyHigh: 300,
    color: '#EF4444',
    items: ['Retatrutide 10mg', 'KLOW Blend', 'MOTS-C 10mg', 'CJC/Ipa Blend', 'Semax 10mg', 'DSIP 10mg'],
    why: 'Reta drives fat loss via GLP-1/GIP/Glucagon. KLOW protects gut + accelerates recovery. MOTS-C maintains energy during deficit. CJC/Ipa preserves muscle via overnight GH pulse. Semax keeps focus sharp. DSIP optimizes deep sleep.',
  },
  {
    id: 'sculpt',
    name: 'SCULPT',
    icon: '\u{1F4AA}',
    tag: 'Lean muscle gain + recovery + GH optimization',
    target: 'Lifters wanting to add mass without fat',
    monthly: '$180-280/mo',
    monthlyLow: 180, monthlyHigh: 280,
    color: '#8B5CF6',
    items: ['CJC/Ipa Blend', 'Tesamorelin 10mg', 'Sermorelin 10mg', 'GHRP-2 10mg', 'CJC-1295 noDAC 10mg', 'KLOW Blend', 'DSIP 10mg'],
    why: 'Multi-pathway GH optimization. CJC/Ipa daily pulses. Tesamorelin sustained GHRH. Sermorelin alternative. GHRP-2 adds appetite for bulking. CJC noDAC for flexibility. KLOW recovery. DSIP sleep/GH.',
  },
  {
    id: 'prime',
    name: 'PRIME',
    icon: '⏳',
    tag: 'Anti-aging + longevity + cellular rejuvenation',
    target: 'Men/women 35-65 focused on healthspan',
    monthly: '$150-250/mo',
    monthlyLow: 150, monthlyHigh: 250,
    color: '#06B6D4',
    items: ['MOTS-C 10mg', 'NAD+ 1000mg', 'Epitalon 10mg', 'SS-31 10mg', 'GHK-Cu 50mg', 'Glutathione 1500mg'],
    why: 'Six longevity mechanisms: MOTS-C (AMPK), NAD+ (sirtuin fuel), Epitalon (telomerase), SS-31 (mitochondria), GHK-Cu (collagen), Glutathione (master antioxidant/detox).',
  },
  {
    id: 'edge',
    name: 'EDGE',
    icon: '\u{1F9E0}',
    tag: 'Cognitive performance + focus + neuroprotection',
    target: 'Entrepreneurs, executives, high performers',
    monthly: '$100-180/mo',
    monthlyLow: 100, monthlyHigh: 180,
    color: '#3B82F6',
    items: ['Semax 10mg', 'Selank 10mg', 'Pinealon 10mg', 'Cerebrolysin', 'DSIP 10mg'],
    why: 'Semax BDNF for focus/memory. Selank anxiolytic calm. Pinealon neuroprotection. Cerebrolysin premium brain repair. DSIP restorative sleep.',
  },
  {
    id: 'shield',
    name: 'SHIELD',
    icon: '\u{1F6E1}️',
    tag: 'Immune fortification + gut healing + inflammation',
    target: 'Post-illness, autoimmune support, chronic inflammation',
    monthly: '$150-200/mo',
    monthlyLow: 150, monthlyHigh: 200,
    color: '#10B981',
    items: ['Thymosin A1 10mg', 'KLOW Blend', 'LL-37', 'Thymalin', 'KPV 10mg'],
    why: 'Thymosin A1 adaptive immunity. LL-37 antimicrobial defense. Thymalin thymus regen. KLOW gut healing. KPV standalone gut anti-inflammatory.',
  },
  {
    id: 'glow',
    name: 'GLOW',
    icon: '✨',
    tag: 'Skin rejuvenation + collagen + tanning',
    target: 'Aesthetics-focused, pre-event prep',
    monthly: '$120-180/mo',
    monthlyLow: 120, monthlyHigh: 180,
    color: '#F59E0B',
    items: ['Glow Plus', 'Glow', 'GHK-Cu 50mg', 'Snap-8', 'Melanotan I', 'Melanotan II'],
    why: 'Glow Plus for deep collagen (GHK-Cu+BPC+TB). Glow budget option. GHK-Cu extra skin repair. Snap-8 wrinkles. MT-I gradual tan. MT-II fast tan + libido.',
  },
  {
    id: 'restore',
    name: 'RESTORE',
    icon: '\u{1FA79}',
    tag: 'Injury recovery + joint repair + healing',
    target: 'Athletes, post-surgery, chronic joint/tendon issues',
    monthly: '$140-220/mo',
    monthlyLow: 140, monthlyHigh: 220,
    color: '#34D399',
    items: ['KLOW Blend', 'BPC-157 10mg', 'TB-500 10mg', 'BPC+TB Blend', 'GKP Blend', 'ARA-290'],
    why: 'KLOW systemic recovery. BPC-157 targeted site injection. TB-500 tissue repair. BPC+TB convenience blend. GKP recovery blend. ARA-290 nerve repair.',
  },
  {
    id: 'balance',
    name: 'BALANCE',
    icon: '⚖️',
    tag: 'Hormonal optimization + testosterone support',
    target: 'Men 30-55 with low T symptoms',
    monthly: '$100-160/mo',
    monthlyLow: 100, monthlyHigh: 160,
    color: '#A78BFA',
    items: ['Kisspeptin-10 10mg', 'CJC/Ipa Blend', 'Ipamorelin 10mg', 'MOTS-C 10mg'],
    why: 'Kisspeptin natural LH/T upstream. CJC/Ipa GH support. Ipamorelin clean GH pulse. MOTS-C metabolic efficiency.',
  },
  {
    id: 'sleep',
    name: 'SLEEP',
    icon: '\u{1F319}',
    tag: 'Deep sleep + overnight recovery + GH optimization',
    target: 'Poor sleepers, shift workers, high-stress professionals',
    monthly: '$80-120/mo',
    monthlyLow: 80, monthlyHigh: 120,
    color: '#6366F1',
    items: ['DSIP 10mg', 'CJC/Ipa Blend', 'Selank 10mg'],
    why: 'DSIP enhances delta wave sleep. CJC/Ipa triggers overnight GH pulse. Selank calms anxiety that blocks sleep onset.',
  },
  {
    id: 'executive',
    name: 'EXECUTIVE',
    icon: '\u{1F454}',
    tag: 'The complete biohacker stack — everything optimized',
    target: 'Premium clients who want it all',
    monthly: '$400-600/mo',
    monthlyLow: 400, monthlyHigh: 600,
    color: '#E8D5B7',
    items: ['Retatrutide 10mg', 'KLOW Blend', 'MOTS-C 10mg', 'CJC/Ipa Blend', 'Semax 10mg', 'DSIP 10mg', 'NAD+ 1000mg', 'Epitalon 10mg', 'GHK-Cu 50mg', 'Glutathione 1500mg'],
    why: 'SHRED + PRIME combined. Fat loss, recovery, energy, muscle preservation, cognitive performance, sleep, longevity, skin — every system covered.',
  },
  {
    id: 'apex',
    name: 'APEX',
    icon: '\u{1F3C6}',
    tag: 'Advanced muscle building + performance',
    target: 'Competitive bodybuilders, serious athletes',
    monthly: '$250-400/mo',
    monthlyLow: 250, monthlyHigh: 400,
    color: '#DC2626',
    items: ['IGF-1 LR3 1mg', 'IGF-DES', 'CJC-1295 wDAC', 'Ipamorelin 10mg', 'KLOW Blend'],
    why: 'IGF-1 LR3 systemic growth. IGF-DES site-specific. CJC wDAC sustained weekly GH. Ipamorelin daily GH pulse. KLOW recovery at extreme volume.',
  },
  {
    id: 'lean',
    name: 'LEAN',
    icon: '\u{1F343}',
    tag: 'GLP-1 weight management — pick your path',
    target: 'Clients who prefer Sema or Tirz over Reta',
    monthly: '$150-220/mo',
    monthlyLow: 150, monthlyHigh: 220,
    color: '#22C55E',
    items: ['Semaglutide 10mg', 'Tirzepatide 10mg', 'AOD-9604 10mg', 'Lipo-C', 'KLOW Blend'],
    why: 'Pick ONE GLP-1: Semaglutide (proven) or Tirzepatide (dual agonist). AOD fasted fat burn. Lipo-C lipotropic support. KLOW GI protection. Never stack GLP-1s.',
  },
  {
    id: 'drive',
    name: 'DRIVE',
    icon: '\u{1F49C}',
    tag: 'Libido + intimacy + connection',
    target: 'Low libido, couples',
    monthly: '$50-80/mo',
    monthlyLow: 50, monthlyHigh: 80,
    color: '#EC4899',
    items: ['PT-141', 'Oxytocin 10mg', 'Melanotan II'],
    why: 'PT-141 on-demand arousal (30-60 min before). Oxytocin bonding/connection. MT-II libido + tanning. All as-needed, not daily.',
  },
  {
    id: 'mass',
    name: 'MASS',
    icon: '\u{1F9AC}',
    tag: 'Advanced hypertrophy + size + appetite',
    target: 'Bodybuilders, hard gainers, mass phase',
    monthly: '$200-300/mo',
    monthlyLow: 200, monthlyHigh: 300,
    color: '#B45309',
    items: ['MGF', 'PEG MGF', 'GHRP-2 10mg', 'GHRP-6 10mg', 'TB-500 10mg', 'CJC/Ipa Blend'],
    why: 'MGF site-specific muscle repair. PEG MGF sustained growth signaling. GHRP-2/6 GH release + appetite for caloric surplus. TB-500 recovery. CJC/Ipa GH base.',
  },
];

// Primary goal in Peptide Finder → preferred stack id.
// Matches v1's goalToProto mapping at app.html:5094.
export const GOAL_TO_STACK = {
  fat_loss:   'shred',
  muscle:     'sculpt',
  mind:       'edge',
  sleep:      'sleep',
  injury:     'restore',
  aging:      'prime',
  immune:     'shield',
  skin:       'glow',
  libido:     'drive',
  hormones:   'balance',
  everything: 'executive',
};

// Reverse map: workout.primary (the Body Fitness Goal) → peptide
// optimizeFor IDs. Used to keep the peptide stack in sync when the user
// flips their fitness goal in Profile.
export const WORKOUT_GOAL_TO_OPTIMIZE = {
  'Fat Loss':       ['fat_loss'],
  'Muscle Gain':    ['muscle'],
  'Recomposition':  ['fat_loss', 'muscle'],
  'Aesthetics':     ['muscle', 'skin'],
  'Wellness':       ['everything'],
};

// Budget tier → stacks accessible at that price level.
const BUDGET_STACKS = {
  low:     ['sleep', 'edge', 'balance', 'drive'],
  mid:     ['shred', 'sculpt', 'prime', 'restore', 'glow', 'shield', 'lean', 'mass'],
  high:    ['executive', 'apex'],
  premium: PROTO_STACKS.map(s => s.id),  // anything goes
};

/**
 * Selects the right stack for a user given their Peptide Finder answers.
 * Priority: matches primary goal, but falls back to a budget-appropriate
 * alternative if the goal's preferred stack is too expensive.
 *
 * @param {Object} finderAnswers - { optimizeFor, experience, glp1Status, budget, needleComfort }
 * @returns {Object|null} stack object, or null if no answers
 */
export function getStackForFinder(finderAnswers) {
  if (!finderAnswers || !Array.isArray(finderAnswers.optimizeFor) || finderAnswers.optimizeFor.length === 0) {
    return null;
  }

  const primaryGoal = finderAnswers.optimizeFor[0];
  const preferredStackId = GOAL_TO_STACK[primaryGoal] || 'executive';
  const budget = finderAnswers.budget || 'mid';
  const accessible = new Set(BUDGET_STACKS[budget] || BUDGET_STACKS.mid);

  // 1. Primary goal stack within budget
  if (accessible.has(preferredStackId)) {
    const stack = PROTO_STACKS.find(s => s.id === preferredStackId);
    if (stack) return applyGlp1Filter(stack, finderAnswers);
  }

  // 2. Budget-tier fallback for the goal
  // Try to find any stack in the user's budget that matches the primary goal
  const fallbacks = {
    fat_loss: ['lean', 'sleep'],   // budget alternatives for fat_loss
    muscle: ['balance'],
    aging: ['prime', 'sleep'],
    everything: ['shred', 'sculpt'],
  };
  for (const fallbackId of (fallbacks[primaryGoal] || [])) {
    if (accessible.has(fallbackId)) {
      const stack = PROTO_STACKS.find(s => s.id === fallbackId);
      if (stack) return applyGlp1Filter(stack, finderAnswers);
    }
  }

  // 3. Last resort: pick the cheapest stack in the user's accessible tier
  const accessibleStacks = PROTO_STACKS.filter(s => accessible.has(s.id));
  if (accessibleStacks.length > 0) {
    accessibleStacks.sort((a, b) => a.monthlyLow - b.monthlyLow);
    return applyGlp1Filter(accessibleStacks[0], finderAnswers);
  }

  return null;
}

/**
 * If the user is on a GLP-1 already, strip GLP-1 compounds from the stack
 * (Retatrutide, Semaglutide, Tirzepatide). They shouldn't double up.
 */
function applyGlp1Filter(stack, finderAnswers) {
  if (finderAnswers.glp1Status === 'no' || !finderAnswers.glp1Status) return stack;
  const glp1Pattern = /retatrutide|semaglutide|tirzepatide|survodutide|mazdutide/i;
  const filtered = stack.items.filter(name => !glp1Pattern.test(name));
  if (filtered.length === stack.items.length) return stack;  // no change
  return {
    ...stack,
    items: filtered,
    why: stack.why + ' (GLP-1 compounds removed since you\'re already on one — stacking is unsafe.)',
  };
}

/**
 * Resolves a stack item name (e.g. 'Retatrutide 10mg') to the catalog
 * peptide entry. Returns null if not found.
 */
export function findCatalogPeptide(itemName, catalog) {
  if (!Array.isArray(catalog)) return null;
  const direct = catalog.find(p => p.name === itemName);
  if (direct) return direct;
  // Fallback: name prefix match (e.g. "DSIP 10mg" item → "DSIP 10mg" or "DSIP 5mg")
  const baseName = itemName.replace(/\s+\d+mg$/i, '').toLowerCase();
  return catalog.find(p => (p.name || '').toLowerCase().startsWith(baseName)) || null;
}
