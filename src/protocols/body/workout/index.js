import { GOAL_ALIASES, getProgram } from './programs.js';

const workoutProtocol = {
  id: 'workout',
  domain: 'body',
  name: 'Workout Program',
  icon: '\u{1F3CB}\uFE0F',

  canServe(goal) { return goal?.domain === 'body'; },

  getState(profile, logs, goal) {
    const goalName = profile?.primary || 'Wellness';
    return { goal: goalName, program: getProgram(goalName) };
  },

  getTasks(state, profile, day) {
    const { program } = state;
    if (!program) return [];

    const dayIdx = day.getUTCDay();
    const workout = program[dayIdx];
    if (!workout || workout.dur === 0) return [];

    const tasks = [{
      id: 'workout-' + dayIdx,
      title: '\u{1F525} ' + workout.d,
      subtitle: workout.dur + ' min session',
      type: 'guided',
      category: 'training',
      time: null,
      duration: workout.dur,
      priority: 2,
      skippable: false,
      data: { warmup: workout.warmup, cooldown: workout.cooldown, exercises: workout.exercises },
    }];

    // Add individual exercises as sub-tasks
    if (workout.exercises) {
      workout.exercises.forEach((ex, i) => {
        tasks.push({
          id: 'exercise-' + dayIdx + '-' + i,
          title: ex.name,
          subtitle: ex.sets + '\u00D7' + ex.reps + ' \u00B7 Rest ' + ex.rest + (ex.note ? ' \u2014 ' + ex.note : ''),
          type: 'guided',
          category: 'training',
          time: null,
          priority: 3,
          skippable: true,
        });
      });
    }

    return tasks;
  },

  getAutomations() { return []; },
  getRecommendations() { return []; },
  getUpsells() { return []; },
};

export default workoutProtocol;
