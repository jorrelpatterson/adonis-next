// src/protocols/travel/citizenship/index.js
import { CZ_COUNTRIES } from './data.js';

const citizenshipProtocol = {
  id: 'citizenship',
  domain: 'travel',
  name: 'Citizenship Protocol',
  icon: '🌐',

  canServe(goal) {
    return goal?.domain === 'travel';
  },

  getState(profile, logs, goal) {
    return {
      applications: profile?.citizenshipApplications || [],
      targetCountry: profile?.targetCountry || null,
    };
  },

  getTasks(state, profile, day) {
    const tasks = [];
    const applications = state?.applications || [];

    // Monday: weekly timeline review
    if (day.getDay() === 1) {
      tasks.push({
        id: 'citizenship-weekly-review',
        title: 'Review citizenship timeline',
        type: 'check_in',
        category: 'citizenship',
        time: null,
        duration: 10,
        priority: 3,
        skippable: true,
        data: { applications },
      });
    }

    // Active applications: document gathering tasks
    const gatheringApps = applications.filter(
      (a) => a.status === 'gathering_docs'
    );

    for (const app of gatheringApps) {
      const country = CZ_COUNTRIES.find((c) => c.id === app.countryId);
      const countryName = country ? country.name : app.countryId;

      tasks.push({
        id: 'citizenship-docs-' + app.countryId,
        title: 'Gather documents for ' + countryName + ' citizenship',
        type: 'action',
        category: 'citizenship',
        time: null,
        duration: 30,
        priority: 2,
        skippable: false,
        data: {
          countryId: app.countryId,
          docs: country?.docs || [],
          status: app.status,
        },
      });
    }

    return tasks;
  },

  getRecommendations(state, profile, goal) {
    return [
      {
        id: 'citizenship-attorney',
        type: 'service',
        name: 'Immigration Attorney Consultation',
        description:
          'Work with a specialist immigration attorney to navigate your citizenship pathway, verify eligibility, and avoid costly mistakes.',
        revenue: {
          model: 'referral',
          commission: 200,
        },
        data: {
          category: 'legal',
          domain: 'travel',
        },
      },
    ];
  },

  getUpsells(state, profile, goal) {
    return [];
  },

  getAutomations(state, profile, goal) {
    return [];
  },

  getOnboardingQuestions() {
    return [
      {
        id: 'pathwayInterest',
        type: 'multi',
        label: 'Pathways that interest you',
        subtitle: 'You can pick more than one',
        required: true,
        options: [
          { value: 'descent', label: 'Descent', sub: 'Italy, Ireland, Poland — by ancestry' },
          { value: 'investment', label: 'Investment', sub: 'Caribbean CBI, golden visas' },
          { value: 'residency', label: 'Residency', sub: 'Portugal, Mexico, Argentina' },
          { value: 'just_passport', label: 'Just better travel', sub: 'Visa-free + power index' },
        ],
      },
      {
        id: 'budgetTier',
        type: 'select',
        label: 'Investment budget',
        subtitle: 'Citizenship-by-investment range you\'re comfortable with',
        options: [
          { value: 'low', label: 'Under $50k' },
          { value: 'mid', label: '$50k-250k' },
          { value: 'high', label: '$250k+' },
          { value: 'na', label: 'Not relevant — descent or residency only' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const paths = state?.pathwayInterest || [];
    const lines = [];
    if (paths.includes('descent')) lines.push('Descent pathway: Italy, Ireland, Poland eligible');
    if (paths.includes('investment')) lines.push('CBI options ranked by your budget');
    if (paths.includes('residency')) lines.push('Residency pathways: 24-84 month timelines');
    if (paths.includes('just_passport')) lines.push('Visa-free travel optimization');
    if (!lines.length) lines.push('11 country pathways tracked · quiz unlocks ranked picks');
    return {
      title: 'Travel',
      icon: '\u{1F30D}',
      lines: lines.slice(0, 2),
    };
  },
};

export default citizenshipProtocol;
