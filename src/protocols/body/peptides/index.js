// src/protocols/body/peptides/index.js
import { getPeptidesByGoal } from './catalog.js';

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
    return {
      activePeptides: profile?.activePeptides || [],
      supplyDaysLeft: profile?.supplyDaysLeft ?? null,
      activeProduct: profile?.activeProduct ?? null,
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
