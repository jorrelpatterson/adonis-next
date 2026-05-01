// src/protocols/body/peptides/index.js
import { getPeptidesByGoal, PEPTIDES } from './catalog.js';
import { getCheckinAverages } from '../../_system/checkin/selectors.js';
import { getStackAdjustments } from './stack-adjustments.js';
import { recommendStack } from './recommend-stack.js';
import { getStackForFinder, findCatalogPeptide } from './proto-stacks.js';

// Returns the live peptide catalog if loaded into logs, otherwise falls back
// to the static v2 catalog. The live catalog is populated on app mount by
// src/services/peptide-catalog.js → App.jsx (logs.peptideCatalog).
function resolveCatalog(logs) {
  return (logs && Array.isArray(logs.peptideCatalog) && logs.peptideCatalog.length > 0)
    ? logs.peptideCatalog
    : PEPTIDES;
}

// Determine if a peptide should be shown today based on frequency
// dayIdx: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function pepShowsToday(freq, dayIdx) {
  switch (freq) {
    case 'daily':
      return true;
    case 'weekly':
      return dayIdx === 1;
    case '2x_week':
      return dayIdx === 1 || dayIdx === 4;
    case '3x_week':
      return dayIdx === 1 || dayIdx === 3 || dayIdx === 5;
    case '5x_week':
      return dayIdx >= 1 && dayIdx <= 5;
    case 'eod':
      return dayIdx === 0 || dayIdx === 1 || dayIdx === 3 || dayIdx === 5;
    case 'as_needed':
      return false;
    default:
      return false;
  }
}

// Map goal templateId to peptide catalog goal label
const GOAL_TEMPLATE_MAP = {
  'lose-weight': 'Fat Loss',
  'body-recomp': 'Recomposition',
  'build-muscle': 'Muscle Gain',
};

const peptideProtocol = {
  id: 'peptides',
  domain: 'body',
  name: 'Peptide Protocol',
  icon: '💉',

  canServe(goal) {
    return goal?.domain === 'body';
  },

  getState(profile, logs, goal, protocolState) {
    const activePeptides = profile?.activePeptides || [];
    const stackNames = activePeptides.map(p => p.name).filter(Boolean);
    const checkinAverages = getCheckinAverages(logs);
    const catalog = resolveCatalog(logs);
    return {
      activePeptides,
      stackNames,
      supplyDaysLeft: profile?.supplyDaysLeft ?? null,
      activeProduct: profile?.activeProduct ?? null,
      checkinAverages,
      catalog,
      // Peptide Finder answers (from onboarding) — used to surface
      // "Browse →" suggestion tasks before user commits to a stack.
      finderAnswers: protocolState || {},
    };
  },

  getTasks(state, profile, day) {
    const activePeptides = state?.activePeptides || [];

    // BROWSE MODE — user hasn't committed to peptides yet but has finder
    // answers. Surface the curated NAMED STACK (SHRED/SCULPT/EDGE/etc.)
    // on the routine as "Browse →" tasks linking to advnce labs.
    // Adonis recommends, advnce sells.
    //
    // FILTERED BY FREQUENCY — only items due today appear on the routine.
    // Weekly peptides (e.g. Retatrutide, Tirzepatide) only show on Mondays.
    // 'as_needed' compounds (PT-141, Oxytocin) never appear automatically.
    // The full stack is still visible on the Body tab as a reference.
    if (activePeptides.length === 0) {
      const finder = state?.finderAnswers || {};
      const stack = getStackForFinder(finder);
      if (!stack) return [];
      const catalog = state?.catalog || [];
      const dayIdx = day.getUTCDay();
      const tasks = [];
      stack.items.forEach((itemName) => {
        const peptide = findCatalogPeptide(itemName, catalog);
        // No catalog match → can't determine freq → skip routine emission
        // (still browseable from Body tab)
        if (!peptide) return;
        if (!pepShowsToday(peptide.freq, dayIdx)) return;
        tasks.push({
          id: 'peptide-browse-' + peptide.id,
          title: '\u{1F489} ' + itemName,
          subtitle: stack.name + ' stack · ' + (peptide.dose || 'See product page'),
          type: 'browse',
          category: 'peptide_rec',
          time: peptide.tod || null,
          priority: 4,
          skippable: true,
          data: {
            peptide,
            url: 'https://advncelabs.com/?q=' + encodeURIComponent(itemName),
            inStock: peptide.inStock !== false,
            price: peptide.price,
            stackName: stack.name,
            stackId: stack.id,
          },
        });
      });
      return tasks;
    }

    // ACTIVE MODE — user has committed peptides; emit dose tasks
    const dayIdx = day.getUTCDay();

    return activePeptides
      .filter(pep => pepShowsToday(pep.freq, dayIdx))
      .map(pep => ({
        id: 'peptide-' + (pep.id || pep.name),
        title: pep.name + ' — ' + pep.dose,
        type: 'check',
        category: 'peptide',
        time: pep.tod || null,
        duration: 5,
        priority: 1,
        skippable: false,
        data: { peptide: pep },
      }));
  },

  getAutomations() {
    return [];
  },

  getRecommendations(state, profile, goal) {
    if (!profile || profile.tier === 'free') return [];

    const catalog = state?.catalog || PEPTIDES;

    // Adaptive recommendations based on 7-day check-in averages.
    // When the user has 5+ days of check-ins, these take precedence over
    // generic goal-based suggestions because they're personalized.
    const adjustments = getStackAdjustments(
      state?.checkinAverages,
      state?.stackNames || [],
      catalog,
    );

    const adaptiveRecs = adjustments
      .filter(adj => adj.type === 'add')
      .map(adj => ({
        type: 'product',
        id: 'peptide-adaptive-' + adj.peptide.id,
        name: adj.peptide.name,
        description: adj.reason,
        price: adj.peptide.price,
        revenue: { model: 'direct', margin: adj.peptide.margin },
        data: { peptide: adj.peptide, adaptive: true, reason: adj.reason, inStock: adj.peptide.inStock },
      }));

    if (adaptiveRecs.length > 0) return adaptiveRecs;

    // Fallback: goal-based catalog recommendations.
    // Uses the live catalog if loaded; otherwise falls back to the static one.
    const templateId = goal?.templateId;
    const catalogGoal = GOAL_TEMPLATE_MAP[templateId];
    if (!catalogGoal) return [];

    const peptides = catalog
      .filter(p => Array.isArray(p.goals) && p.goals.includes(catalogGoal))
      .slice(0, 3);

    return peptides.map(p => ({
      type: 'product',
      id: 'peptide-rec-' + p.id,
      name: p.name,
      description: p.desc,
      price: p.price,
      revenue: { model: 'direct', margin: p.margin },
      data: { peptide: p, inStock: p.inStock },
    }));
  },

  getUpsells(state, profile, goal) {
    const { supplyDaysLeft, activeProduct } = state || {};
    if (supplyDaysLeft == null || supplyDaysLeft > 5) return [];

    return [
      {
        id: 'peptide-supply-low',
        type: 'supply_low',
        title: 'Running low on ' + (activeProduct?.name || 'peptide supply'),
        description: supplyDaysLeft + ' days of supply remaining. Reorder now to stay on protocol.',
        price: activeProduct?.price ?? null,
        condition: () => true,
        data: { supplyDaysLeft, activeProduct },
      },
    ];
  },

  // Peptide Finder — 5-question wizard ported from v1 (the conversion moment).
  // Drives personalized peptide stack recommendations that link to advncelabs.com.
  getOnboardingQuestions() {
    return [
      {
        id: 'optimizeFor',
        type: 'multi',
        label: 'What are you trying to optimize?',
        subtitle: 'Select all that apply — we\'ll match peptides to your goals',
        required: true,
        options: [
          { value: 'fat_loss',  label: '\u{1F525} Drop body fat' },
          { value: 'muscle',    label: '\u{1F4AA} Build muscle' },
          { value: 'mind',      label: '\u{1F9E0} Sharpen my mind' },
          { value: 'sleep',     label: '\u{1F319} Fix my sleep' },
          { value: 'injury',    label: '\u{1FA79} Heal an injury' },
          { value: 'aging',     label: '⏳ Slow aging' },
          { value: 'immune',    label: '\u{1F6E1}️ Boost immunity' },
          { value: 'skin',      label: '✨ Improve my skin' },
          { value: 'libido',    label: '\u{1F49C} Boost libido' },
          { value: 'hormones',  label: '⚖️ Balance hormones' },
          { value: 'everything', label: '\u{1F454} Maximize everything' },
        ],
      },
      {
        id: 'experience',
        type: 'select',
        label: 'Have you used peptides before?',
        required: true,
        options: [
          { value: 'beginner',     label: 'Never — I\'m new to this',  sub: 'We\'ll start you with simpler protocols' },
          { value: 'intermediate', label: 'I\'ve tried a few',          sub: 'You\'ll get the full recommended stacks' },
          { value: 'advanced',     label: 'I run protocols regularly',  sub: 'Premium stacks + advanced compounds' },
        ],
      },
      {
        id: 'glp1Status',
        type: 'select',
        label: 'Are you currently taking any GLP-1 medication?',
        subtitle: 'Critical for safe stack building',
        required: true,
        options: [
          { value: 'no',          label: 'No' },
          { value: 'prescribed',  label: 'Yes — prescribed (Ozempic, Mounjaro, etc.)' },
          { value: 'research',    label: 'Yes — research peptide (Sema, Tirz, Reta)' },
        ],
      },
      {
        id: 'budget',
        type: 'select',
        label: 'Monthly budget for peptides?',
        subtitle: 'We\'ll never recommend beyond this',
        required: true,
        options: [
          { value: 'low',     label: 'Under $150/mo',  sub: 'SLEEP, EDGE, BALANCE, DRIVE stacks' },
          { value: 'mid',     label: '$150-300/mo',    sub: 'SHRED, SCULPT, PRIME, RESTORE stacks' },
          { value: 'high',    label: '$300-500/mo',    sub: 'EXECUTIVE, APEX premium stacks' },
          { value: 'premium', label: '$500+/mo',       sub: 'Custom protocols, advanced compounds' },
        ],
      },
      {
        id: 'needleComfort',
        type: 'select',
        label: 'How do you feel about injections?',
        required: true,
        options: [
          { value: 'fine',  label: 'Fine with daily SubQ',     sub: 'Tiny insulin needles, painless' },
          { value: 'fewer', label: 'Prefer fewer injections',  sub: 'We\'ll favor weekly protocols' },
          { value: 'avoid', label: 'I\'d rather avoid needles', sub: 'Oral + intranasal options only' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    if (!state?.optimizeFor || !state.optimizeFor.length) {
      return {
        title: 'Peptides',
        icon: '\u{1F489}',
        lines: ['Goal-matched stack suggestions ready when you want them'],
      };
    }
    const goalLabels = {
      fat_loss: 'Fat loss', muscle: 'Muscle', mind: 'Cognitive', sleep: 'Sleep',
      injury: 'Recovery', aging: 'Longevity', immune: 'Immune', skin: 'Skin',
      libido: 'Libido', hormones: 'Hormonal', everything: 'Optimization',
    };
    const goals = state.optimizeFor.slice(0, 3).map(g => goalLabels[g] || g).join(', ');
    const budgetLabel = {
      low: '<$150/mo', mid: '$150-300/mo', high: '$300-500/mo', premium: '$500+/mo',
    }[state.budget] || '';
    return {
      title: 'Peptides',
      icon: '\u{1F489}',
      lines: [
        `Targeting: ${goals}`,
        budgetLabel ? `Budget: ${budgetLabel}` : 'Stack ready — see Body tab',
      ],
      emphasis: 'Recommendations link out to advnce labs',
    };
  },
};

export default peptideProtocol;
