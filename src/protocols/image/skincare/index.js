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
  }
};

export default skincareProtocol;
