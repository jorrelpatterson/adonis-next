// src/protocols/purpose/index.js

const purposeProtocol = {
  id: 'purpose',
  domain: 'purpose',
  name: 'Purpose Protocol',
  icon: '🧭',

  canServe(goal) {
    return goal?.domain === 'purpose';
  },

  getState(profile, logs, goal) {
    return {};
  },

  getTasks(state, profile, day) {
    const dayIdx = day instanceof Date ? day.getDay() : new Date(day).getDay();
    const tasks = [];

    // Daily: Morning Intention
    tasks.push({
      id: 'purpose-morning-intention',
      title: 'Morning Intention',
      description: 'Write one sentence stating your intention for today.',
      type: 'manual',
      category: 'purpose',
      priority: 3,
      skippable: true,
      data: { prompt: 'one sentence intention' },
    });

    // Sunday (dayIdx === 0): Weekly Life Audit
    if (dayIdx === 0) {
      tasks.push({
        id: 'purpose-weekly-audit',
        title: 'Weekly Life Audit',
        description: 'Review your week across all life domains. What worked? What needs adjustment?',
        type: 'manual',
        category: 'purpose',
        priority: 3,
        skippable: true,
        data: { frequency: 'weekly', day: 'Sunday' },
      });
    }

    return tasks;
  },

  getRecommendations(state, profile, goal) {
    return [];
  },

  getUpsells(state, profile, goal) {
    return [];
  },

  getAutomations(state, profile, goal) {
    return [];
  },
};

export default purposeProtocol;
