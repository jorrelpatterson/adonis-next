import { MEALS } from './meals.js';
import { MORNING_SUPPS, EVENING_SUPPS } from './supplements.js';

const nutritionProtocol = {
  id: 'nutrition',
  domain: 'body',
  name: 'Nutrition & Supplements',
  icon: '\u{1F37D}\uFE0F',

  canServe(goal) { return goal?.domain === 'body'; },

  getState(profile, logs, goal) {
    return { goal: profile?.primary || 'Wellness' };
  },

  getTasks(state, profile, day) {
    const { goal } = state;
    const dayIdx = day.getUTCDay();
    const tasks = [];

    // Morning supplements
    const morningSupps = MORNING_SUPPS[goal] || MORNING_SUPPS['Wellness'];
    tasks.push({
      id: 'supp-morning',
      title: '\u{1F48A} Morning Supplements',
      subtitle: morningSupps,
      type: 'guided',
      category: 'supplement',
      time: null,
      priority: 2,
      skippable: true,
    });

    // Meals for today
    const goalMeals = MEALS[goal] || MEALS['Wellness'] || MEALS['Fat Loss'];
    if (goalMeals) {
      const dayPlan = Array.isArray(goalMeals[0]) ? goalMeals[dayIdx % goalMeals.length] : goalMeals;
      if (dayPlan) {
        dayPlan.forEach((meal, i) => {
          tasks.push({
            id: 'meal-' + dayIdx + '-' + i,
            title: '\u{1F37D}\uFE0F ' + meal.n,
            subtitle: meal.f + ' \u00B7 ' + meal.cal + ' cal \u00B7 ' + meal.p + 'P/' + (meal.c || 0) + 'C/' + (meal.fat || 0) + 'F',
            type: 'guided',
            category: 'nutrition',
            time: meal.t || null,
            priority: 3,
            skippable: true,
          });
        });
      }
    }

    // Evening supplements
    const eveningSupps = EVENING_SUPPS[goal] || EVENING_SUPPS['Wellness'];
    tasks.push({
      id: 'supp-evening',
      title: '\u{1F48A} Evening Supplements',
      subtitle: eveningSupps,
      type: 'guided',
      category: 'supplement',
      time: null,
      priority: 2,
      skippable: true,
    });

    return tasks;
  },

  getAutomations() { return []; },
  getRecommendations(state, profile, goal) { return []; },
  getUpsells(state, profile, goal) { return []; },
};

export default nutritionProtocol;
