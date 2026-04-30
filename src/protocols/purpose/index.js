const purposeProtocol = {
  id: 'purpose',
  domain: 'purpose',
  name: 'Purpose Protocol',
  icon: '\u{1F9ED}',

  canServe(goal) { return goal.domain === 'purpose'; },

  getState(profile, logs, goal) { return {}; },

  getTasks(state, profile, day) {
    const dayIdx = day.getUTCDay();
    const tasks = [];

    tasks.push({
      id: 'purpose-intention',
      title: '\u{1F9ED} Morning Intention',
      subtitle: 'One sentence: what matters most today?',
      type: 'manual',
      category: 'purpose',
      time: null,
      priority: 3,
      skippable: true,
    });

    if (dayIdx === 0) {
      tasks.push({
        id: 'purpose-audit',
        title: '\u{1F4CA} Weekly Life Audit',
        subtitle: 'Rate each life area. Where did you grow? Where to focus next week?',
        type: 'manual',
        category: 'purpose',
        time: null,
        priority: 3,
        skippable: true,
      });
    }

    return tasks;
  },

  getAutomations() { return []; },
  getRecommendations() { return []; },
  getUpsells() { return []; },
};

export default purposeProtocol;
