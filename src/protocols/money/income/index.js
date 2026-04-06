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
};

export default incomeProtocol;
