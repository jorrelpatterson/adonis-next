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

  getOnboardingQuestions() {
    return [
      {
        id: 'lifeAreas',
        type: 'multi',
        label: 'Which areas need the most focus?',
        subtitle: 'Pick 2-3',
        required: true,
        options: [
          { value: 'health', label: 'Health' },
          { value: 'wealth', label: 'Wealth' },
          { value: 'mind', label: 'Mind' },
          { value: 'relationships', label: 'Relationships' },
          { value: 'adventure', label: 'Adventure' },
          { value: 'environment', label: 'Environment' },
          { value: 'inner_peace', label: 'Inner peace' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const areas = state?.lifeAreas || [];
    return {
      title: 'Purpose',
      icon: '\u{1F9ED}',
      lines: [
        areas.length ? `Focus areas: ${areas.slice(0, 3).join(', ').replace(/_/g, ' ')}` : 'Life wheel + bucket list ready',
        '20 core values, yearly goals, life audit',
      ],
    };
  },
};

export default purposeProtocol;
