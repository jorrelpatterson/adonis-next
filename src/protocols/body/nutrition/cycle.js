// source: v1 public/app.html:533-610 via tests/golden/v1/metabolics.js — VERBATIM, golden-gated
// Do not edit these bodies. If tests/golden/fixtures/getCycleInfo.json fails to reproduce,
// the bug is in this copy, not in the fixture — see src/protocols/body/nutrition/__tests__/cycle.test.js.
const CYCLE_PHASES = [
  {
    id: "menstrual",
    name: "Menstrual",
    days: [1, 5],
    icon: "\u{1F534}",
    color: "#EF4444",
    calMod: 0,
    intensityMod: "recovery",
    training: "Focus on light movement, yoga, walking. Energy is lowest — honor recovery.",
    nutrition: "Iron-rich foods, hydration. Cravings normal — don't restrict too hard.",
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
    training: "Peak performance window. Go heavy — PRs, high volume, HIIT. Estrogen rising = stronger recovery.",
    nutrition: "Higher carb tolerance. Fuel for performance.",
    supplements: "B-Complex, CoQ10, Creatine",
    mood: "Energy, confidence, motivation peak. Best window for hard sessions."
  },
  {
    id: "ovulatory",
    name: "Ovulatory",
    days: [14, 16],
    icon: "⚡",
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

export { CYCLE_PHASES, getCycleInfo };
