// src/protocols/body/peptides/index.js
import { getPeptidesByGoal, PEPTIDES } from './catalog.js';
import { getCheckinAverages } from '../../_system/checkin/selectors.js';
import { getStackAdjustments } from './stack-adjustments.js';

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

  getState(profile, logs, goal) {
    const activePeptides = profile?.activePeptides || [];
    const stackNames = activePeptides.map(p => p.name).filter(Boolean);
    const checkinAverages = getCheckinAverages(logs);
    return {
      activePeptides,
      stackNames,
      supplyDaysLeft: profile?.supplyDaysLeft ?? null,
      activeProduct: profile?.activeProduct ?? null,
      checkinAverages,
    };
  },

  getTasks(state, profile, day) {
    const activePeptides = state?.activePeptides || [];
    if (!activePeptides.length) return [];

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

    // Adaptive recommendations based on 7-day check-in averages.
    // When the user has 5+ days of check-ins, these take precedence over
    // generic goal-based suggestions because they're personalized.
    const adjustments = getStackAdjustments(
      state?.checkinAverages,
      state?.stackNames || [],
      PEPTIDES,
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
        data: { peptide: adj.peptide, adaptive: true, reason: adj.reason },
      }));

    if (adaptiveRecs.length > 0) return adaptiveRecs;

    // Fallback: goal-based catalog recommendations
    const templateId = goal?.templateId;
    const catalogGoal = GOAL_TEMPLATE_MAP[templateId];
    if (!catalogGoal) return [];

    const peptides = getPeptidesByGoal(catalogGoal).slice(0, 3);
    return peptides.map(p => ({
      type: 'product',
      id: 'peptide-rec-' + p.id,
      name: p.name,
      description: p.desc,
      price: p.price,
      revenue: { model: 'direct', margin: p.margin },
      data: { peptide: p },
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
};

export default peptideProtocol;
