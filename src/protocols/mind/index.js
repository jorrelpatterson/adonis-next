const mindProtocol = {
  id: 'mind',
  domain: 'mind',
  name: 'Mind Protocol',
  icon: '\u{1F9E0}',

  canServe(goal) { return goal.domain === 'mind'; },

  getState(profile, logs, goal) { return {}; },

  getTasks(state, profile, day) {
    const dayIdx = day.getUTCDay();
    const tasks = [];

    tasks.push({
      id: 'mind-gratitude',
      title: '\u{1F64F} Gratitude',
      subtitle: "3 things you're grateful for. Sets intention before the day.",
      type: 'manual',
      category: 'mind',
      time: null,
      priority: 3,
      skippable: true,
    });

    if (dayIdx % 2 === 0) {
      tasks.push({
        id: 'mind-breathwork',
        title: '\u{1F32C}\uFE0F Breathwork',
        subtitle: 'Box breathing: 4 in, 4 hold, 4 out, 4 hold \u00D7 4 rounds.',
        type: 'manual',
        category: 'mind',
        time: null,
        priority: 3,
        skippable: true,
      });
    } else {
      tasks.push({
        id: 'mind-meditation',
        title: '\u{1F9D8} Morning Meditation',
        subtitle: '10 min focused attention. Before stimulants.',
        type: 'manual',
        category: 'mind',
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

export default mindProtocol;
