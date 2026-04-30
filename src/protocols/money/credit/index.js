// src/protocols/money/credit/index.js

const creditProtocol = {
  id: 'credit-repair',
  domain: 'money',
  name: 'Credit Repair',
  icon: '\u{1F4B3}',

  canServe(goal) {
    return goal?.domain === 'money';
  },

  getState(profile, logs, goal) {
    const disputes = (logs || []).filter((l) => l.type === 'dispute');
    const scores = (logs || []).filter((l) => l.type === 'credit_score');
    return { disputes, scores };
  },

  getTasks(state, profile, day) {
    const tasks = [];
    const dayIdx = day instanceof Date ? day.getDay() : new Date(day).getDay();

    const pendingDisputes = (state.disputes || []).filter((d) => d.status === 'pending');
    if (pendingDisputes.length > 0) {
      tasks.push({
        id: 'credit-mail-dispute',
        title: 'Mail Dispute Letter',
        type: 'action',
        category: 'credit',
        priority: 2,
        skippable: false,
        data: { disputes: pendingDisputes },
      });
    }

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const sentDisputes = (state.disputes || []).filter((d) => {
      if (d.status !== 'sent') return false;
      const sentAt = d.sentAt ? new Date(d.sentAt).getTime() : 0;
      return sentAt > 0 && (now - sentAt) >= thirtyDays;
    });
    if (sentDisputes.length > 0) {
      tasks.push({
        id: 'credit-followup-dispute',
        title: 'Send Follow-Up Dispute Letter',
        type: 'action',
        category: 'credit',
        priority: 2,
        skippable: false,
        data: { disputes: sentDisputes },
      });
    }

    // Monday = dayIdx 1: check credit score
    if (dayIdx === 1) {
      tasks.push({
        id: 'credit-check-score',
        title: 'Check Credit Score',
        type: 'check',
        category: 'credit',
        priority: 3,
        skippable: true,
        data: {},
      });
    }

    return tasks;
  },

  getRecommendations(state, profile, goal) {
    if (profile?.tier === 'pro' || profile?.tier === 'elite') {
      return [
        {
          id: 'credit-monitoring',
          title: 'Enroll in Credit Monitoring',
          desc: 'Get real-time alerts for any changes to your credit report across all three bureaus.',
          priority: 1,
          category: 'credit',
        },
      ];
    }
    return [];
  },

  getUpsells(state, profile) {
    const disputes = state?.disputes || [];
    if (profile?.tier === 'pro' && disputes.length > 3) {
      return [
        {
          id: 'elite-upsell-credit',
          title: 'Upgrade to Elite for Dispute Automation',
          desc: 'Elite tier auto-sends dispute letters and tracks bureau responses \u2014 no manual mailing required.',
          tier: 'elite',
          category: 'credit',
        },
      ];
    }
    return [];
  },

  getAutomations(state, profile) {
    if (profile?.tier === 'elite') {
      return [
        {
          id: 'auto-dispute-send',
          title: 'Auto-Send Dispute Letters',
          desc: 'Automatically generate and send dispute letters for flagged items.',
          trigger: 'dispute_pending',
          category: 'credit',
        },
      ];
    }
    return [];
  },

  getOnboardingQuestions() {
    return [
      {
        id: 'creditScoreRange',
        type: 'select',
        label: 'Where\'s your credit score?',
        subtitle: 'Drives which strategy fits',
        required: true,
        options: [
          { value: 'rebuild', label: 'Below 600', sub: 'Repair phase' },
          { value: '600_700', label: '600-700', sub: 'Building' },
          { value: '700_800', label: '700-800', sub: 'Optimizing' },
          { value: '800_plus', label: '800+', sub: 'Stacking + travel hacking' },
        ],
      },
      {
        id: 'primaryFocus',
        type: 'select',
        label: 'Primary focus',
        required: true,
        options: [
          { value: 'repair', label: 'Repair my credit', sub: 'Disputes, paydowns, factor improvement' },
          { value: 'build', label: 'Build credit', sub: 'New accounts, mix optimization' },
          { value: 'stack', label: 'Card stacking', sub: 'Signup bonuses, points, 5/24 strategy' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const focus = state?.primaryFocus;
    const labels = { repair: 'Credit repair plan', build: 'Credit building plan', stack: 'Card stacking strategy' };
    return {
      title: 'Money',
      icon: '\u{1F4B3}',
      lines: [
        labels[focus] || 'Credit strategy ready',
        state?.creditScoreRange === 'rebuild' ? 'Dispute engine activated' :
        state?.creditScoreRange === '800_plus' ? 'Stacking + travel hacking unlocked' :
        'Score analysis + factor improvements queued',
      ],
    };
  },
};

export default creditProtocol;
