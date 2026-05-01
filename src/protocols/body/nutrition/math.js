// Pure nutrition math — Mifflin-St Jeor BMR, TDEE, macro split, base
// calorie target. Extracted from FoodLogger so the adaptive-calories
// engine can import without a circular dep on JSX.

const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.4,
  active: 1.6,
  very_active: 1.9,
};

// Mifflin-St Jeor BMR. Imperial inputs (lbs, ft, in, years).
export function calcBMR(weight, hFt, hIn, age, gender) {
  const w = Number(weight);
  const ft = Number(hFt);
  const inches = Number(hIn);
  const a = Number(age);
  if (!Number.isFinite(w) || w <= 0) return 0;
  if (!Number.isFinite(ft) || ft <= 0) return 0;
  if (!Number.isFinite(a) || a <= 0) return 0;
  const kg = w * 0.453592;
  const cm = (ft * 12 + (Number.isFinite(inches) ? inches : 0)) * 2.54;
  const base = 10 * kg + 6.25 * cm - 5 * a;
  const g = String(gender || '').toLowerCase();
  if (g === 'female' || g === 'f') return Math.round(base - 161);
  return Math.round(base + 5);
}

export function calcTDEE(bmr, activity) {
  const b = Number(bmr);
  if (!Number.isFinite(b) || b <= 0) return 0;
  const mult = ACTIVITY_MULT[String(activity || '').toLowerCase()] || 1.4;
  return Math.round(b * mult);
}

// Macro split by goal. Returns grams of protein/carbs/fat.
// Protein/carbs = 4 cal/g, fat = 9 cal/g.
export function calcMacros(targetCal, goal) {
  const cal = Number(targetCal);
  if (!Number.isFinite(cal) || cal <= 0) return { protein: 0, carbs: 0, fat: 0 };
  let pP, pC, pF;
  switch (String(goal || '')) {
    case 'Fat Loss':       pP = 0.40; pC = 0.30; pF = 0.30; break;
    case 'Muscle Gain':    pP = 0.30; pC = 0.45; pF = 0.25; break;
    case 'Recomposition':  pP = 0.35; pC = 0.35; pF = 0.30; break;
    case 'Aesthetics':     pP = 0.35; pC = 0.35; pF = 0.30; break;
    default:               pP = 0.30; pC = 0.40; pF = 0.30; break;
  }
  return {
    protein: Math.round((cal * pP) / 4),
    carbs:   Math.round((cal * pC) / 4),
    fat:     Math.round((cal * pF) / 9),
  };
}

// Final BASE daily calorie target = TDEE + goal adjustment.
// Returns 0 if profile too sparse. The ADAPTIVE engine
// (adaptive-calories.js) layers progress-based adjustments on top.
export function calcCalorieTarget(profile, goal) {
  if (!profile) return 0;
  const bmr = calcBMR(profile.weight, profile.hFt, profile.hIn, profile.age, profile.gender);
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
