// Question schema for the onboarding wizard.
//
// Each protocol declares its onboarding questions via getOnboardingQuestions(profile).
// The OnboardingFlow renders one screen per protocol (filtered to selected domains)
// and collects answers into state.protocolState[protocolId].
//
// QUESTION TYPES
//
//   text        — single-line text input
//   number      — numeric input (with optional unit, min, max)
//   select      — single-choice (radio-style buttons)
//   multi       — multi-choice (toggleable buttons)
//   toggle      — boolean (yes/no)
//   date        — date picker
//   slider      — numeric slider with min/max/step
//
// SHAPE
//
//   {
//     id: 'targetWeight',           // unique within protocol
//     type: 'number',
//     label: 'Goal weight',
//     subtitle: 'Where you want to land',  // optional helper text
//     placeholder: '180',
//     unit: 'lbs',                   // optional, shown next to value
//     required: true,                // optional, defaults false
//     min: 50, max: 800,             // for number/slider
//     options: [                     // for select/multi
//       { value: 'cut', label: 'Lose fat', sub: 'Calorie deficit' },
//       { value: 'bulk', label: 'Build muscle', sub: 'Surplus + lifting' },
//     ],
//     dependsOn: { field: 'gender', value: 'female', protocolId: 'workout' },
//                                    // only show if another answer matches
//   }

/**
 * Validates a question definition and an answer value.
 * Returns { valid: boolean, error: string|null }
 */
export function validateAnswer(question, value) {
  if (question.required) {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return { valid: false, error: `${question.label} is required` };
    }
  }
  if (value == null || value === '') return { valid: true, error: null };

  switch (question.type) {
    case 'number':
    case 'slider': {
      const n = Number(value);
      if (!Number.isFinite(n)) return { valid: false, error: 'Must be a number' };
      if (question.min != null && n < question.min) return { valid: false, error: `Min ${question.min}` };
      if (question.max != null && n > question.max) return { valid: false, error: `Max ${question.max}` };
      return { valid: true, error: null };
    }
    case 'select': {
      const ok = (question.options || []).some(opt => opt.value === value);
      if (!ok) return { valid: false, error: 'Invalid option' };
      return { valid: true, error: null };
    }
    case 'multi': {
      if (!Array.isArray(value)) return { valid: false, error: 'Must be an array' };
      const validValues = new Set((question.options || []).map(o => o.value));
      for (const v of value) if (!validValues.has(v)) return { valid: false, error: 'Invalid option' };
      return { valid: true, error: null };
    }
    default:
      return { valid: true, error: null };
  }
}

/**
 * Returns true if a question's dependsOn condition is met given current
 * profile + protocolStates. If no dependsOn, always true.
 */
export function shouldShowQuestion(question, profile, protocolStates) {
  const dep = question.dependsOn;
  if (!dep) return true;
  if (dep.protocolId) {
    const ps = protocolStates?.[dep.protocolId];
    return ps && ps[dep.field] === dep.value;
  }
  return profile && profile[dep.field] === dep.value;
}
