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
