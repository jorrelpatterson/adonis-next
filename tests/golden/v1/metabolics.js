// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies
// CYCLE_PHASES (dependency of getCycleInfo): public/app.html lines 533-586
// getCycleInfo: public/app.html lines 587-610
// calcBMR: public/app.html lines 653-655
// calcTDEE: public/app.html lines 656-658
// calcMacros: public/app.html lines 659-662
// Note: getCycleInfo calls `new Date()` when `today` is not provided — pin the clock in tests.
// No browser globals (localStorage/window/document) are referenced; no shims needed.
const CYCLE_PHASES = [
  {
    id: "menstrual",
    name: "Menstrual",
    days: [1, 5],
    icon: "\u{1F534}",
    color: "#EF4444",
    calMod: 0,
    intensityMod: "recovery",
    training: "Focus on light movement, yoga, walking. Energy is lowest \u2014 honor recovery.",
    nutrition: "Iron-rich foods, hydration. Cravings normal \u2014 don't restrict too hard.",
    supplements: "Iron, Magnesium, Omega-3, Vitamin C",
    mood: "Energy and mood lowest. Self-compassion > discipline."
  },
  {
    id: "follicular",
    name: "Follicular",
    days: [6, 13],
    icon: "\u{1F7E2}",
    color: "#34D399",
    calMod: 0,
    intensityMod: "high",
    training: "Peak performance window. Go heavy \u2014 PRs, high volume, HIIT. Estrogen rising = stronger recovery.",
    nutrition: "Higher carb tolerance. Fuel for performance.",
    supplements: "B-Complex, CoQ10, Creatine",
    mood: "Energy, confidence, motivation peak. Best window for hard sessions."
  },
  {
    id: "ovulatory",
    name: "Ovulatory",
    days: [14, 16],
    icon: "\u26A1",
    color: "#FBBF24",
    calMod: 50,
    intensityMod: "normal",
    training: "Still strong but ligament laxity elevated. Maintain intensity, focus form.",
    nutrition: "Balanced macros. Anti-inflammatory foods.",
    supplements: "DIM, Calcium D-Glucarate, Zinc",
    mood: "Social energy and verbal fluency peak."
  },
  {
    id: "luteal",
    name: "Luteal",
    days: [17, 28],
    icon: "\u{1F7E1}",
    color: "#F59E0B",
    calMod: 150,
    intensityMod: "normal",
    training: "Early: moderate intensity. Late (PMS): deload, reduce volume 20-30%.",
    nutrition: "BMR +100-300 cal/day. Increase healthy fats, complex carbs. Magnesium for cramps.",
    supplements: "Magnesium Glycinate, B6, Evening Primrose Oil, Calcium",
    mood: "Progesterone rises then drops. PMS days 24-28. Plan lighter workload."
  }
];
function getCycleInfo(cycleData, today) {
  if (!cycleData?.enabled || !cycleData?.lastPeriod) return null;
  const lastP = /* @__PURE__ */ new Date(cycleData.lastPeriod + "T12:00:00");
  const now = today ? /* @__PURE__ */ new Date(today + "T12:00:00") : /* @__PURE__ */ new Date();
  const daysSincePeriod = Math.floor((now - lastP) / 864e5);
  const cycleLen = cycleData.cycleLength || 28;
  const dayInCycle = (daysSincePeriod % cycleLen + cycleLen) % cycleLen + 1;
  const scale = cycleLen / 28;
  let phase = CYCLE_PHASES[0];
  for (const p of CYCLE_PHASES) {
    const start = Math.round((p.days[0] - 1) * scale) + 1;
    const end = Math.round(p.days[1] * scale);
    if (dayInCycle >= start && dayInCycle <= end) {
      phase = p;
      break;
    }
  }
  const daysUntilPeriod = cycleLen - dayInCycle + 1;
  const nextPeriod = new Date(lastP);
  nextPeriod.setDate(nextPeriod.getDate() + cycleLen);
  const isLateLuteal = phase.id === "luteal" && daysUntilPeriod <= 5;
  const waterRetention = phase.id === "luteal" ? Math.min(4, Math.round((1 - daysUntilPeriod / 12) * 3 * 10) / 10) : phase.id === "menstrual" ? 1.5 : 0;
  return { dayInCycle, cycleLen, phase, daysUntilPeriod, nextPeriod, isLateLuteal, waterRetention, daysSincePeriod, scale };
}
function calcBMR(w, h, a, g) {
  return g === "male" ? 10 * (w * 0.453592) + 6.25 * (h * 2.54) - 5 * a + 5 : 10 * (w * 0.453592) + 6.25 * (h * 2.54) - 5 * a - 161;
}
function calcTDEE(b, a) {
  return b * ({ desk: 1.2, moderate: 1.4, physical: 1.6, sedentary: 1.2, light: 1.375, active: 1.725, very_active: 1.9 }[a] || 1.3);
}
function calcMacros(cal, g) {
  const r = { "Fat Loss": [0.4, 0.3, 0.3], "Muscle Gain": [0.3, 0.45, 0.25], "Recomposition": [0.35, 0.35, 0.3], "Aesthetics": [0.35, 0.35, 0.3] }[g] || [0.3, 0.4, 0.3];
  return { protein: Math.round(cal * r[0] / 4), carbs: Math.round(cal * r[1] / 4), fat: Math.round(cal * r[2] / 9) };
}

export { calcBMR, calcTDEE, calcMacros, getCycleInfo, CYCLE_PHASES };
