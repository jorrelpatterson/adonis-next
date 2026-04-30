// src/protocols/image/skincare/index.js
import { SKIN_AM, SKIN_PM, SKIN_AM_BASE, SKIN_PM_BASE } from './data.js';

const skincareProtocol = {
  id: 'skincare',
  domain: 'image',
  name: 'Skincare Protocol',
  icon: '✨',

  canServe(goal) {
    return goal?.domain === 'image';
  },

  getState(profile, logs, goal) {
    return {};
  },

  getTasks(state, profile, day) {
    const dayIdx = day instanceof Date ? day.getDay() : new Date(day).getDay();
    const tasks = [];

    // AM routine
    SKIN_AM_BASE.forEach((step, i) => {
      tasks.push({
        id: 'skincare-am-base-' + i,
        title: step,
        type: 'manual',
        category: 'skincare',
        timeBlock: 'morning',
        priority: 3,
        skippable: true,
        data: { routine: 'AM', step }
      });
    });

    const amActive = SKIN_AM[dayIdx];
    if (amActive) {
      tasks.push({
        id: 'skincare-am-active-' + dayIdx,
        title: 'Active: ' + amActive,
        type: 'manual',
        category: 'skincare',
        timeBlock: 'morning',
        priority: 3,
        skippable: true,
        data: { routine: 'AM', step: amActive, isActive: true }
      });
    }

    // PM routine
    SKIN_PM_BASE.forEach((step, i) => {
      tasks.push({
        id: 'skincare-pm-base-' + i,
        title: step,
        type: 'manual',
        category: 'skincare',
        timeBlock: 'evening',
        priority: 3,
        skippable: true,
        data: { routine: 'PM', step }
      });
    });

    const pmActive = SKIN_PM[dayIdx];
    if (pmActive) {
      tasks.push({
        id: 'skincare-pm-active-' + dayIdx,
        title: 'Active: ' + pmActive,
        type: 'manual',
        category: 'skincare',
        timeBlock: 'evening',
        priority: 3,
        skippable: true,
        data: { routine: 'PM', step: pmActive, isActive: true }
      });
    }

    return tasks;
  },

  getRecommendations(state, profile) {
    return [
      {
        id: 'rec-spf',
        title: 'SPF 50 Sunscreen',
        reason: 'Daily UV protection is the #1 anti-aging investment.',
        category: 'skincare',
        affiliate: true
      },
      {
        id: 'rec-retinol',
        title: 'Retinol (0.5%)',
        reason: 'Proven to increase collagen production and reduce fine lines.',
        category: 'skincare',
        affiliate: true
      },
      {
        id: 'rec-cleanser',
        title: 'Gentle Foaming Cleanser',
        reason: 'Double cleansing removes SPF and pollution buildup effectively.',
        category: 'skincare',
        affiliate: true
      }
    ];
  },

  getUpsells() {
    return [];
  },

  getAutomations() {
    return [];
  },

  getOnboardingQuestions() {
    return [
      {
        id: 'skinType',
        type: 'select',
        label: 'Skin type',
        required: true,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'dry', label: 'Dry' },
          { value: 'oily', label: 'Oily' },
          { value: 'combination', label: 'Combination' },
          { value: 'sensitive', label: 'Sensitive' },
        ],
      },
      {
        id: 'concerns',
        type: 'multi',
        label: 'Top concerns',
        subtitle: 'Pick all that apply',
        options: [
          { value: 'acne', label: 'Acne' },
          { value: 'aging', label: 'Anti-aging / wrinkles' },
          { value: 'dark_spots', label: 'Dark spots / hyperpigmentation' },
          { value: 'redness', label: 'Redness / inflammation' },
          { value: 'texture', label: 'Texture / pores' },
          { value: 'dullness', label: 'Dullness / lack of glow' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const lines = ['7-day rotation: Vitamin C, niacinamide, retinol nights'];
    if (state?.concerns && state.concerns.length) {
      lines.push(`Targeted: ${state.concerns.join(', ').replace(/_/g, ' ')}`);
    }
    return {
      title: 'Image',
      icon: '✨',
      lines,
    };
  },
};

export default skincareProtocol;
