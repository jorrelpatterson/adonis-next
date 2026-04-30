import { GOAL_ALIASES, getProgram } from './programs.js';

const workoutProtocol = {
  id: 'workout',
  domain: 'body',
  name: 'Workout Program',
  icon: '\u{1F3CB}\uFE0F',

  canServe(goal) { return goal?.domain === 'body'; },

  getState(profile, logs, goal, protocolState) {
    // Onboarding writes `primary` into protocolState.workout.primary.
    // Fall back to profile.primary for backwards-compat with v1 data shape.
    const goalName = protocolState?.primary || profile?.primary || 'Wellness';
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

  getOnboardingQuestions() {
    return [
      {
        id: 'primary',
        type: 'select',
        label: 'Primary fitness goal',
        subtitle: 'Drives your workout split + meal plan',
        required: true,
        options: [
          { value: 'Fat Loss', label: 'Lose fat', sub: 'Cut while preserving muscle' },
          { value: 'Muscle Gain', label: 'Build muscle', sub: 'Bulk with structured progression' },
          { value: 'Recomposition', label: 'Recomp', sub: 'Lose fat + gain muscle simultaneously' },
          { value: 'Aesthetics', label: 'Aesthetics', sub: 'Symmetry, proportion, V-taper' },
          { value: 'Wellness', label: 'General wellness', sub: 'Health-first, no aggressive goal' },
        ],
      },
      {
        id: 'trainPref',
        type: 'select',
        label: 'When do you train?',
        required: true,
        options: [
          { value: 'morning', label: 'Morning' },
          { value: 'midday', label: 'Midday' },
          { value: 'evening', label: 'Evening' },
        ],
      },
      {
        id: 'equipment',
        type: 'select',
        label: 'What equipment do you have?',
        required: true,
        options: [
          { value: 'gym', label: 'Full gym', sub: 'Barbell, rack, machines, cables' },
          { value: 'home', label: 'Home gym', sub: 'Dumbbells + adjustable bench' },
          { value: 'minimal', label: 'Minimal', sub: 'Bodyweight + bands' },
        ],
      },
    ];
  },

  getOnboardingSummary(profile, state) {
    const goalLabel = profile?.primary || 'Wellness';
    const program = getProgram(goalLabel);
    const trainingDays = program ? program.filter(d => d.dur > 0).length : 6;
    return {
      title: 'Train',
      icon: '\u{1F3CB}️',
      lines: [
        `Program: ${goalLabel} · ${trainingDays} training days/week`,
        `Time slot: ${profile?.trainPref || 'morning'} · ${profile?.equipment || 'gym'} setup`,
      ],
      emphasis: goalLabel,
    };
  },
};

export default workoutProtocol;
