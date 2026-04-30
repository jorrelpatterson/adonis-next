// Peptide stack recommender — turns Peptide Finder answers into a ranked
// list of peptides to recommend. Pure function; testable.
//
// INPUTS
// - finderAnswers: { optimizeFor, experience, glp1Status, budget, needleComfort }
// - catalog: PEPTIDES array (or live-enriched catalog)
//
// OUTPUT
// - Array of { peptide, reason, matchedGoals } sorted by relevance,
//   trimmed by experience level (2/3/5 peptides for beginner/inter/advanced)

const GOAL_MAP = {
  fat_loss:   ['Fat Loss', 'Weight Management'],
  muscle:     ['Muscle Gain', 'Muscle Growth'],
  mind:       ['Cognitive'],
  sleep:      ['Sleep'],
  injury:     ['Recovery'],
  aging:      ['Anti-Aging', 'Longevity'],
  immune:     ['Immune'],
  skin:       ['Skin', 'Skin & Recovery'],
  libido:     ['Hormonal'],
  hormones:   ['Hormonal'],
  everything: ['Fat Loss', 'Muscle Gain', 'Recovery', 'Cognitive', 'Sleep', 'Longevity', 'Wellness'],
};

const BUDGET_CAP = {
  low:     150,
  mid:     300,
  high:    500,
  premium: Infinity,
};

const STACK_SIZE = {
  beginner:     2,
  intermediate: 3,
  advanced:     5,
};

/**
 * Returns true if the peptide route matches the user's needle preference.
 */
function passesNeedleFilter(peptide, comfort) {
  // Catalog doesn't have 'route' field on top-level objects, only PEP_DB.
  // We approximate via dose/timing strings + name.
  const name = (peptide.name || '').toLowerCase();
  const dose = (peptide.dose || '').toLowerCase();

  const isIntranasal = /nasal|spray|intranasal/.test(name + dose);
  const isOral = /oral|tablet|capsule|pill/.test(name + dose);
  const isInjectable = !isIntranasal && !isOral;

  if (comfort === 'avoid') return !isInjectable;  // oral/intranasal only
  if (comfort === 'fewer') return peptide.freq !== 'daily';  // weekly/2x preferred
  return true;  // 'fine' or unset
}

function passesGlp1Filter(peptide, glp1Status) {
  // If user is on a GLP-1 (prescribed or research), don't recommend
  // additional GLP-1s on top — risk of overlap.
  if (glp1Status === 'no') return true;
  const name = (peptide.name || '').toLowerCase();
  const isGLP1 = /semaglutide|tirzepatide|retatrutide|ozempic|mounjaro|zepbound/.test(name);
  return !isGLP1;
}

/**
 * @param {Object}  finderAnswers - state.protocolState.peptides
 * @param {Array}   catalog       - PEPTIDES or live catalog
 * @returns {Array} ranked recommendations
 */
export function recommendStack(finderAnswers, catalog) {
  if (!finderAnswers || !finderAnswers.optimizeFor || !finderAnswers.optimizeFor.length) {
    return [];
  }
  if (!Array.isArray(catalog) || catalog.length === 0) return [];

  const { optimizeFor, experience = 'beginner', glp1Status = 'no', budget = 'mid', needleComfort = 'fine' } = finderAnswers;

  // Expand user's selected categories to catalog goal labels
  const targetGoals = new Set();
  for (const id of optimizeFor) {
    for (const g of (GOAL_MAP[id] || [])) targetGoals.add(g);
  }

  // Filter + score
  const scored = [];
  for (const pep of catalog) {
    if (!passesNeedleFilter(pep, needleComfort)) continue;
    if (!passesGlp1Filter(pep, glp1Status)) continue;

    const peptideGoals = Array.isArray(pep.goals) ? pep.goals : [];
    const matchedGoals = peptideGoals.filter(g => targetGoals.has(g));
    if (matchedGoals.length === 0) continue;

    const inStock = pep.inStock !== false;  // undefined or true counts as in stock
    let score = matchedGoals.length * 100;
    if (inStock) score += 20;
    if (pep.premium && experience !== 'advanced') score -= 15;
    // Cheaper peptides edge ahead at low budget tiers
    if (budget === 'low' && pep.price > 80) score -= 30;
    if (budget === 'low' && pep.price < 50) score += 10;

    scored.push({ peptide: pep, score, matchedGoals });
  }

  // Sort by score desc, then by price asc (so cheapest wins ties)
  scored.sort((a, b) => b.score - a.score || (a.peptide.price || 0) - (b.peptide.price || 0));

  // Dedupe by base compound name (e.g. don't recommend Sema 5mg AND Sema 10mg)
  const seen = new Set();
  const deduped = [];
  for (const entry of scored) {
    const baseName = (entry.peptide.name || '').replace(/\s+\d+mg$/i, '').toLowerCase();
    if (seen.has(baseName)) continue;
    seen.add(baseName);
    deduped.push(entry);
  }

  // Cap by experience-level stack size, then check budget cap
  const maxStack = STACK_SIZE[experience] || 3;
  const cap = BUDGET_CAP[budget] || Infinity;
  const result = [];
  let runningCost = 0;
  for (const entry of deduped) {
    if (result.length >= maxStack) break;
    const cost = entry.peptide.price || 0;
    if (runningCost + cost > cap) continue;
    runningCost += cost;
    result.push({
      peptide: entry.peptide,
      matchedGoals: entry.matchedGoals,
      reason: `Matches ${entry.matchedGoals.join(', ')}`,
    });
  }

  return result;
}
