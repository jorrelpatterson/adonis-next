const environmentProtocol = {
  id: 'environment',
  domain: 'environment',
  name: 'Environment Protocol',
  icon: '\u{1F3E0}',

  canServe(goal) { return goal.domain === 'environment'; },

  getState(profile, logs, goal) { return {}; },

  getTasks(state, profile, day) {
    const dayIdx = day.getUTCDay();
    const tasks = [];

    tasks.push({
      id: 'env-make-bed',
      title: '\u{1F3E0} Make Bed',
      subtitle: 'First win of the day. Sets the tone for everything after.',
      type: 'manual',
      category: 'morning',
      time: null,
      priority: 3,
      skippable: true,
    });

    if (dayIdx >= 1 && dayIdx <= 5) {
      tasks.push({
        id: 'env-workspace-prep',
        title: '\u{1F4BC} Workspace Prep',
        subtitle: 'Clear desk, open tools, set up for focused work.',
        type: 'manual',
        category: 'work',
        time: null,
        priority: 3,
        skippable: true,
      });
    }

    tasks.push({
      id: 'env-10min-reset',
      title: '\u{1F9F9} 10-Min Reset',
      subtitle: 'Dishes, surfaces, prep for tomorrow. End the day clean.',
      type: 'manual',
      category: 'evening',
      time: null,
      priority: 3,
      skippable: true,
    });

    if (dayIdx === 0) {
      tasks.push({
        id: 'env-deep-clean',
        title: '\u{2728} Weekly Deep Clean',
        subtitle: 'Full reset: floors, bathroom, laundry, fridge. One hour.',
        type: 'manual',
        category: 'morning',
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
        id: 'livingSituation',
        type: 'select',
        label: 'Living situation',
        required: true,
        options: [
          { value: 'apartment', label: 'Apartment' },
          { value: 'house', label: 'House' },
          { value: 'condo', label: 'Condo' },
          { value: 'shared', label: 'Shared housing' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        id: 'priorityArea',
        type: 'select',
        label: 'Top priority',
        subtitle: 'Where to focus the 36-item daily checklist',
        options: [
          { value: 'sleep', label: 'Sleep environment' },
          { value: 'workspace', label: 'Workspace setup' },
          { value: 'air', label: 'Air quality' },
          { value: 'digital', label: 'Digital wellness' },
          { value: 'all', label: 'All of it' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    return {
      title: 'Environment',
      icon: '\u{1F3E0}',
      lines: [
        '36-item daily checklist activated',
        state?.priorityArea && state.priorityArea !== 'all'
          ? `Priority: ${state.priorityArea}`
          : 'Sleep, workspace, air, light, digital, cleanliness',
      ],
    };
  },
};

export default environmentProtocol;
