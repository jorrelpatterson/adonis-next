const communityProtocol = {
  id: 'community',
  domain: 'community',
  name: 'Community Protocol',
  icon: '\u{1F91D}',

  canServe(goal) { return goal.domain === 'community'; },

  getState(profile, logs, goal) { return {}; },

  getTasks(state, profile, day) {
    const dayIdx = day.getUTCDay();
    const tasks = [];

    if (dayIdx === 0) {
      tasks.push({
        id: 'community-weekly-checkin',
        title: '\u{1F91D} Weekly Check-In',
        subtitle: 'Connect with accountability partner. Share wins, gaps, and goals for the week.',
        type: 'manual',
        category: 'purpose',
        time: null,
        priority: 3,
        skippable: true,
      });
    }

    if (dayIdx === 3) {
      tasks.push({
        id: 'community-midweek-pulse',
        title: '\u{1F4AC} Midweek Pulse',
        subtitle: 'Quick check with your partner. On track? Any adjustments needed?',
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
        id: 'lookingFor',
        type: 'select',
        label: 'What are you looking for?',
        required: true,
        options: [
          { value: 'accountability', label: 'Accountability partner', sub: 'Someone tracking similar goals' },
          { value: 'mastermind', label: 'Mastermind group', sub: 'Small group, weekly check-ins' },
          { value: 'just_streaks', label: 'Just my own streaks', sub: 'No matching, solo mode' },
        ],
      },
      {
        id: 'shareStreaks',
        type: 'toggle',
        label: 'Share streaks publicly?',
        subtitle: 'Lets others find you for matching',
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const looking = state?.lookingFor;
    if (looking === 'just_streaks') return null;
    return {
      title: 'Community',
      icon: '\u{1F91D}',
      lines: [
        looking === 'mastermind' ? 'Mastermind group matching' : 'Accountability partner matching',
        state?.shareStreaks ? 'Public streak sharing on' : 'Streaks private until you flip the switch',
      ],
    };
  },
};

export default communityProtocol;
