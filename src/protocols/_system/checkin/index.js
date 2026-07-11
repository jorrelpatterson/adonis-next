// System-level protocol: emits a single daily check-in task at the top of
// the routine if today's check-in hasn't been submitted yet.
// Once submitted, the task disappears until the next day.

import { getTodayCheckin } from './selectors.js';

const checkinProtocol = {
  id: 'checkin',
  domain: '_system',
  name: 'Daily Check-in',
  icon: '\u{1FA7A}',

  canServe() { return true; },

  getState(profile, logs) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      submittedToday: !!getTodayCheckin(logs, today),
    };
  },

  getTasks(state, profile, day) {
    const todayKey = day.toISOString().slice(0, 10);
    if (state?.submittedToday) return [];

    return [{
      id: 'checkin-' + todayKey,
      title: '\u{1FA7A} Daily Check-in',
      subtitle: 'How are you feeling today? · ~10 sec',
      type: 'check-in',
      category: 'morning',
      time: null,
      priority: 1,
      skippable: true,
    }];
  },

  getAutomations() { return []; },
  getRecommendations() { return []; },
  getUpsells() { return []; },
};

export default checkinProtocol;
