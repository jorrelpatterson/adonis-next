// src/protocols/body/workout/index.js
import { GOAL_ALIASES, getProgram } from './programs.js';

const workoutProtocol = {
  id: 'workout',
  domain: 'body',
  name: 'Workout Program',
  icon: '🏋️',

  canServe(goal) {
    return goal?.domain === 'body';
  },

  getState(profile, logs, goal) {
    const primaryGoal = profile?.primary || 'Wellness';
    const resolved = GOAL_ALIASES[primaryGoal] || primaryGoal;
    const program = getProgram(primaryGoal);
    return { goal: primaryGoal, program, resolvedGoal: resolved };
  },

  getTasks(state, profile, day) {
    const { program } = state;
    if (!program) return [];

    const dayIdx = day.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const workout = program[dayIdx];

    if (!workout || workout.dur === 0) return [];

    return [
      {
        id: 'workout-' + dayIdx,
        title: workout.d,
        type: 'guided',
        category: 'training',
        time: null,
        duration: workout.dur,
        priority: 2,
        skippable: false,
        data: {
          warmup: workout.warmup,
          cooldown: workout.cooldown,
          exercises: workout.exercises
        }
      }
    ];
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

export default workoutProtocol;
