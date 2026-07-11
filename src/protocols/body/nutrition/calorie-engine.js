export function calcBMR(weightLbs, heightInches, age, gender) {
  const kg = weightLbs * 0.453592;
  const cm = heightInches * 2.54;
  return gender === 'male'
    ? Math.round(10 * kg + 6.25 * cm - 5 * age + 5)
    : Math.round(10 * kg + 6.25 * cm - 5 * age - 161);
}

export function calcTDEE(bmr, activity) {
  const mult = { desk: 1.2, moderate: 1.4, physical: 1.6, sedentary: 1.2, light: 1.375, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (mult[activity] || 1.2));
}

export function calcMacros(calories, goal) {
  const ratios = {
    'Fat Loss': [0.4, 0.3, 0.3],
    'Muscle Gain': [0.3, 0.45, 0.25],
    'Recomposition': [0.35, 0.35, 0.3],
    'Aesthetics': [0.35, 0.35, 0.3],
  };
  const r = ratios[goal] || [0.3, 0.4, 0.3];
  return { protein: Math.round(calories * r[0] / 4), carbs: Math.round(calories * r[1] / 4), fat: Math.round(calories * r[2] / 9) };
}

// Final BASE daily calorie target = TDEE + goal adjustment.
// Returns 0 if profile too sparse. The ADAPTIVE engine
// (adaptive-calories.js) layers progress-based adjustments on top.
// Ported from archive math.js; adapted to call this file's calcBMR, whose
// signature takes a single heightInches param rather than separate
// hFt/hIn — profile.hFt/profile.hIn are combined before the call.
export function calcCalorieTarget(profile, goal) {
  if (!profile) return 0;
  const heightInches = (Number(profile.hFt) || 0) * 12 + (Number(profile.hIn) || 0);
  const bmr = calcBMR(profile.weight, heightInches, profile.age, profile.gender);
  if (bmr <= 0) return 0;
  const tdee = calcTDEE(bmr, profile.activity);
  if (tdee <= 0) return 0;
  switch (String(goal || '')) {
    case 'Fat Loss':      return tdee - 500;
    case 'Muscle Gain':   return tdee + 350;
    case 'Recomposition': return tdee - 200;
    default:              return tdee;
  }
}

// Sum totals across an array of meals.
export function sumDayMeals(meals) {
  const totals = { cal: 0, p: 0, c: 0, f: 0 };
  if (!Array.isArray(meals)) return totals;
  for (const m of meals) {
    totals.cal += Number(m?.cal) || 0;
    totals.p   += Number(m?.p)   || 0;
    totals.c   += Number(m?.c)   || 0;
    totals.f   += Number(m?.f)   || 0;
  }
  return totals;
}
