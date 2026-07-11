// src/protocols/money/income/index.js

import { getIncomeActions } from './data.js';

const incomeProtocol = {
  id: 'income',
  domain: 'money',
  name: 'Income Protocol',
  icon: '\u{1F4B9}',

  canServe(goal) {
    return goal?.domain === 'money';
  },

  getState(profile, logs, goal) {
    return {
      partnerType: 'referrer',
      weeklyRefs: 2,
      weeklyConvos: 10,
    };
  },

  getTasks(state, profile, day) {
    const d = day instanceof Date ? day : new Date(day);
    const dayIdx = d.getUTCDay();
    const { partnerType, weeklyRefs, weeklyConvos } = state || {};
    const actions = getIncomeActions(dayIdx, partnerType, weeklyRefs, weeklyConvos);
    return actions.map((action, i) => ({
      id: 'income-' + dayIdx + '-' + i,
      title: action.title,
      sub: action.sub,
      time: action.time,
      category: 'income',
      type: 'guided',
      priority: 3,
      skippable: true,
    }));
  },

  getRecommendations() {
    return [];
  },

  getUpsells() {
    return [];
  },

  getAutomations() {
    return [];
  },

  getOnboardingQuestions() {
    return [
      {
        id: 'incomeTarget',
        type: 'number',
        label: 'Monthly income target',
        subtitle: 'Above your current — what you\'re aiming for',
        placeholder: '5000',
        unit: '$',
        min: 0,
        required: true,
      },
      {
        id: 'partnerType',
        type: 'select',
        label: 'How do you want to earn?',
        required: true,
        options: [
          { value: 'referrer', label: 'Referrals', sub: 'Network referrer · $250+/install' },
          { value: 'business', label: 'Partner', sub: '30% profit share' },
          { value: 'sales', label: 'Sales', sub: '70% margin · $5,600 avg/deal' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const partner = state?.partnerType;
    const labels = { referrer: 'Network referrer pipeline', business: 'Partnership profit-share', sales: 'Direct sales pipeline' };
    return {
      title: 'Income',
      icon: '\u{1F4B5}',
      lines: [
        labels[partner] || 'Income pipeline ready',
        state?.incomeTarget ? `Target: $${state.incomeTarget}/mo` : 'Daily lead-gen actions queued',
      ],
    };
  },
};

export default incomeProtocol;
