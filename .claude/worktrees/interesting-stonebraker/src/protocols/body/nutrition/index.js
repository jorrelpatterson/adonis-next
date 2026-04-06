// src/protocols/body/nutrition/index.js
import { MEALS } from './meals.js';
import { MORNING_SUPPS, EVENING_SUPPS } from './supplements.js';

const nutritionProtocol = {
  id: 'nutrition',
  domain: 'body',
  name: 'Nutrition & Supplements',
  icon: '\u{1F37D}\uFE0F',

  canServe(goal) {
    return goal?.domain === 'body';
  },

  getState(profile) {
    const goal = profile?.primary || 'Wellness';
    return { goal };
  },

  getTasks(state) {
    const { goal } = state;
    const tasks = [];

    // Morning supplements task
    const morningSupps = MORNING_SUPPS[goal] || MORNING_SUPPS['Wellness'];
    tasks.push({
      id: 'nutrition-morning-supps',
      title: 'Morning Supplements',
      type: 'guided',
      category: 'supplement',
      time: '7:00 AM',
      priority: 2,
      skippable: true,
      data: {
        supplements: morningSupps,
        goal
      }
    });

    // Meal tasks — use day 0 (Monday) as the default daily plan
    const goalMeals = MEALS[goal] || MEALS['Wellness'];
    const dayPlan = goalMeals[0] || [];
    dayPlan.forEach((meal, idx) => {
      tasks.push({
        id: 'nutrition-meal-' + idx,
        title: meal.n,
        type: 'guided',
        category: 'nutrition',
        time: meal.t,
        priority: 2,
        skippable: true,
        data: {
          food: meal.f,
          calories: meal.cal,
          protein: meal.p,
          carbs: meal.c,
          fat: meal.fat,
          goal
        }
      });
    });

    // Evening supplements task
    const eveningSupps = EVENING_SUPPS[goal] || EVENING_SUPPS['Wellness'];
    tasks.push({
      id: 'nutrition-evening-supps',
      title: 'Evening Supplements',
      type: 'guided',
      category: 'supplement',
      time: '9:00 PM',
      priority: 2,
      skippable: true,
      data: {
        supplements: eveningSupps,
        goal
      }
    });

    return tasks;
  },

  getAutomations() {
    return [];
  },

  getRecommendations() {
    return [];
  },

  getUpsells() {
    return [];
  }
};

export default nutritionProtocol;
