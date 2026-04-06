// src/protocols/mind/index.js

const mindProtocol = {
  id: 'mind',
  domain: 'mind',
  name: 'Mind Protocol',
  icon: '🧠',

  canServe(goal) {
    return goal?.domain === 'mind';
  },

  getState(profile, logs, goal) {
    return {};
  },

  getTasks(state, profile, day) {
    const dayIdx = day instanceof Date ? day.getDay() : new Date(day).getDay();
    const tasks = [];

    // Daily: Gratitude
    tasks.push({
      id: 'mind-gratitude',
      title: 'Gratitude',
      description: 'Write down 3 things you are grateful for today.',
      type: 'manual',
      category: 'mind',
      priority: 3,
      skippable: true,
      data: { prompt: '3 things grateful for' },
    });

    // Even days: Breathwork; Odd days: Morning Meditation
    if (dayIdx % 2 === 0) {
      tasks.push({
        id: 'mind-breathwork',
        title: 'Breathwork',
        description: 'Box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 rounds.',
        type: 'manual',
        category: 'mind',
        priority: 3,
        skippable: true,
        data: { technique: 'box breathing 4x4x4x4' },
      });
    } else {
      tasks.push({
        id: 'mind-meditation',
        title: 'Morning Meditation',
        description: '10 minutes of focused attention meditation.',
        type: 'manual',
        category: 'mind',
        priority: 3,
        skippable: true,
        data: { duration: 10, style: 'focused attention' },
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

export default mindProtocol;
