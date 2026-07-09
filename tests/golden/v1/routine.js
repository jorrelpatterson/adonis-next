// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies
//
// PEP_DB            — public/app.html lines 464-531   (dose-info lookup inside buildRoutine)
// CYCLE_PHASES      — public/app.html lines 533-586   (dependency of getCycleInfo)
// getCycleInfo      — public/app.html lines 587-610   (used by the test to build a realistic
//                                                      cycleInfo INPUT; own verbatim copy —
//                                                      module is self-contained by design)
// DAYS              — public/app.html line  666
// SKIN_AM           — public/app.html lines 685-693
// SKIN_PM           — public/app.html lines 694-702
// SKIN_AM_BASE      — public/app.html line  703
// SKIN_PM_BASE      — public/app.html line  704
// WORKOUTS          — public/app.html lines 705-955   (incl. the 5 alias assignments 951-955)
// MEALS             — public/app.html lines 1117-1142 (incl. the assignments 1129-1142)
// GROOMING_ITEMS    — public/app.html lines 1158-1165
// BUREAUS           — public/app.html line  1248
// getIncomeActions  — public/app.html lines 1590-1609
// buildRoutine      — public/app.html lines 1946-2446
//
// Notes (facts about the verbatim code, no behavior changed):
// - buildRoutine references `wkWeek`/`wkLogs` behind `typeof` guards (line 2169 in
//   app.html). In v1 those are React component state, NOT visible at module scope where
//   buildRoutine is defined, so the guards always fall back (wkWeek→1, no logs). The same
//   is true here — no shim needed, behavior is identical.
// - `isPremium` (4th param) is accepted but never read by the function body.
// - buildRoutine returns an Array with an extra `_blocks` property attached.
const PEP_DB = [
  { name: "5-Amino-1MQ", mg: 50, bac: 1, dose: "50mg/day", mcg: 5e4, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "50mg vial \u2014 use entire vial per dose" },
  { name: "Retatrutide", mg: 10, bac: 2, dose: "0.5-12mg/wk", mcg: 2e3, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Titrate: 0.5\u21922\u21924\u21928\u219212mg q4wk" },
  { name: "Semaglutide", mg: 10, bac: 2, dose: "0.25-2.5mg/wk", mcg: 500, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 56 days", notes: "Start 0.25mg, titrate q4wk" },
  { name: "Tirzepatide", mg: 10, bac: 2, dose: "2.5-15mg/wk", mcg: 2500, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Dual GIP/GLP-1. Start 2.5mg" },
  { name: "Cagrilintide", mg: 10, bac: 2, dose: "1.2-4.8mg/wk", mcg: 2400, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Amylin analog" },
  { name: "Cagri+Sema", mg: 10, bac: 2, dose: "2.4mg each/wk", mcg: 2400, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Combination vial" },
  { name: "Survodutide", mg: 10, bac: 2, dose: "2-6mg/wk", mcg: 2e3, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Dual GLP-1/glucagon" },
  { name: "Mazdutide", mg: 10, bac: 1, dose: "3-9mg/wk", mcg: 3e3, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "GLP-1/glucagon dual agonist" },
  { name: "AOD-9604", mg: 5, bac: 2, dose: "300mcg/day", mcg: 300, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Fasted AM. GH fat fragment" },
  { name: "Lipo-C", mg: 10, bac: 1, dose: "1mL/wk IM", mcg: 1e3, freq: "Weekly", route: "IM", store: "Room temp", notes: "Pre-mixed 10mL vial \u2014 draw 10u per dose" },
  { name: "SLU-PP-332", mg: 5, bac: 2, dose: "0.25mg/day", mcg: 250, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Leptin receptor agonist" },
  { name: "BPC-157", mg: 10, bac: 2, dose: "250-500mcg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Inject near injury site" },
  { name: "BPC+TB Blend", mg: 20, bac: 2, dose: "0.3ml/day", mcg: 3e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "10mg BPC + 10mg TB per vial" },
  { name: "TB-500", mg: 10, bac: 2, dose: "2-5mg 2x/wk", mcg: 2500, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Systemic healing \u2014 inject anywhere" },
  { name: "KLOW Blend", mg: 20, bac: 2, dose: "0.3ml/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "BPC+TB+GHK-Cu+KPV recovery blend" },
  { name: "GKP Blend", mg: 20, bac: 2, dose: "0.3ml/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "GHK-Cu + KPV anti-inflammatory" },
  { name: "Glow Plus", mg: 70, bac: 3, dose: "0.3ml/day", mcg: 7e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "50mg GHK-Cu + 10mg BPC + 10mg TB" },
  { name: "Glow", mg: 50, bac: 3, dose: "0.3ml/day", mcg: 5e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "GHK-Cu 50mg skin blend" },
  { name: "GHK-Cu", mg: 50, bac: 3, dose: "1-2mg/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Collagen/skin rejuvenation" },
  { name: "KPV", mg: 10, bac: 2, dose: "500mcg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Anti-inflammatory peptide" },
  { name: "MOTS-C", mg: 10, bac: 0.5, dose: "5-10mg 2-3x/wk", mcg: 5e3, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Mitochondrial peptide" },
  { name: "NAD+", mg: 1e3, bac: 2, dose: "250-500mg SubQ", mcg: 25e4, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "1000mg vial. High concentration \u2014 small volume draws" },
  { name: "Epitalon", mg: 10, bac: 0.5, dose: "5-10mg/day", mcg: 5e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "10-20 day cycles. Telomerase activator" },
  { name: "SS-31", mg: 10, bac: 1, dose: "5-10mg/day", mcg: 5e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Cardiolipin/mitochondrial antioxidant" },
  { name: "Pinealon", mg: 10, bac: 2, dose: "500mcg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Neuropeptide \u2014 brain repair" },
  { name: "Cerebrolysin", mg: 10, bac: 1, dose: "5mg/day", mcg: 5e3, freq: "Daily", route: "IM", store: "Refrigerate \xB7 28 days", notes: "Reconstitute with 1mL BAC water" },
  { name: "Tesamorelin", mg: 10, bac: 2, dose: "2mg/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed. Visceral fat reduction" },
  { name: "CJC-1295 noDAC", mg: 5, bac: 2, dose: "100mcg/day", mcg: 200, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed on empty stomach" },
  { name: "CJC-1295 wDAC", mg: 5, bac: 0.5, dose: "2mg/wk", mcg: 2e3, freq: "Weekly", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Long-acting GHRH \u2014 weekly dosing" },
  { name: "CJC/Ipa Blend", mg: 10, bac: 2, dose: "100mcg each/day", mcg: 300, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "5mg CJC + 5mg Ipa. Before bed, empty stomach" },
  { name: "Ipamorelin", mg: 5, bac: 2, dose: "200-300mcg/day", mcg: 300, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed. Clean GH secretagogue" },
  { name: "Sermorelin", mg: 10, bac: 2, dose: "200-500mcg/day", mcg: 300, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed. GHRH analog" },
  { name: "GHRP-6", mg: 5, bac: 2, dose: "100-300mcg/day", mcg: 200, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed. Increases hunger" },
  { name: "HGH", mg: 10, bac: 2, dose: "2-4iu/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "AM or before bed. 5-on/2-off common" },
  { name: "IGF-1 LR3", mg: 1, bac: 2, dose: "20-80mcg/day", mcg: 50, freq: "Daily", route: "SubQ/IM", store: "Refrigerate \xB7 21 days", notes: "Post-workout. 4-week cycles" },
  { name: "IGF-DES", mg: 1, bac: 2, dose: "50-100mcg pre-workout", mcg: 50, freq: "Daily", route: "IM", store: "Refrigerate \xB7 21 days", notes: "Site-specific injection" },
  { name: "Semax", mg: 10, bac: 2, dose: "200-600mcg/day", mcg: 600, freq: "Daily", route: "Intranasal", store: "Refrigerate \xB7 21 days", notes: "BDNF modulator. Cognitive enhancer" },
  { name: "Selank", mg: 10, bac: 2, dose: "250-500mcg/day", mcg: 500, freq: "Daily", route: "Intranasal/SubQ", store: "Refrigerate \xB7 21 days", notes: "Anxiolytic + cognitive support" },
  { name: "DSIP", mg: 5, bac: 2, dose: "100-200mcg/bed", mcg: 200, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 21 days", notes: "Delta sleep-inducing peptide" },
  { name: "Snap-8", mg: 10, bac: 2, dose: "500mcg/day topical", mcg: 500, freq: "Daily", route: "Topical/SubQ", store: "Refrigerate \xB7 28 days", notes: "Anti-wrinkle peptide" },
  { name: "PNC-27", mg: 5, bac: 2, dose: "500mcg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Research peptide \u2014 anti-tumor" },
  { name: "ARA-290", mg: 5, bac: 0.5, dose: "2mg/day", mcg: 2e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Neuroprotective/anti-inflammatory" },
  { name: "LL-37", mg: 5, bac: 2, dose: "50-200mcg/day", mcg: 200, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Antimicrobial host defense peptide" },
  { name: "VIP", mg: 5, bac: 2, dose: "100-300mcg/day", mcg: 200, freq: "Daily", route: "SubQ/Intranasal", store: "Refrigerate \xB7 28 days", notes: "Vasointestinal peptide" },
  { name: "Thymosin A1", mg: 10, bac: 2, dose: "1.6mg 2x/wk", mcg: 1600, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Immune modulator" },
  { name: "Thymalin", mg: 10, bac: 1, dose: "5-10mg/day", mcg: 5e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Thymus peptide \u2014 immune support" },
  { name: "Kisspeptin-10", mg: 10, bac: 2, dose: "50-100mcg/day", mcg: 100, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Natural LH/testosterone stimulation" },
  { name: "HCG", mg: 5e3, bac: 2, dose: "250-500iu 2x/wk", mcg: 5e5, freq: "2x/week", route: "SubQ/IM", store: "Refrigerate \xB7 28 days", notes: "IU dosing. Fertility/testosterone support" },
  { name: "HMG", mg: 75, bac: 1, dose: "75iu 2x/wk", mcg: 75e3, freq: "2x/week", route: "IM", store: "Refrigerate \xB7 28 days", notes: "FSH+LH combo for fertility" },
  { name: "Melanotan I", mg: 10, bac: 2, dose: "0.5mg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Gradual tanning. Loading then maintenance" },
  { name: "Melanotan II", mg: 10, bac: 2, dose: "0.5mg PRN", mcg: 500, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Tanning + libido. Start 0.25mg" },
  { name: "PT-141", mg: 10, bac: 2, dose: "1-2mg PRN", mcg: 1500, freq: "As needed", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "30-60 min before. Max 2mg per dose" },
  { name: "Oxytocin", mg: 10, bac: 2, dose: "10-40iu intranasal", mcg: 500, freq: "As needed", route: "Intranasal", store: "Refrigerate \xB7 28 days", notes: "Social bonding peptide" },
  { name: "Dermorphin", mg: 5, bac: 2, dose: "0.25mg PRN", mcg: 250, freq: "As needed", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Pain management \u2014 use sparingly" },
  { name: "Glutathione", mg: 1500, bac: 2, dose: "600mg 2-3x/wk", mcg: 6e5, freq: "2x/week", route: "SubQ/IM", store: "Refrigerate \xB7 28 days", notes: "1500mg vial. Use 1-2mL BAC only \u2014 high concentration peptide" },
  { name: "Glutathione 600", mg: 600, bac: 1, dose: "200-600mg IM", mcg: 2e5, freq: "2x/week", route: "IM", store: "Refrigerate \xB7 28 days", notes: "600mg vial. Reconstitute with 1mL BAC water" },
  { name: "B12", mg: 10, bac: 1, dose: "1000mcg IM/wk", mcg: 1e3, freq: "2x/week", route: "IM", store: "Room temp", notes: "Draw 10u per dose from multi-use vial" },
  { name: "Melatonin Inj", mg: 10, bac: 2, dose: "0.3mg before bed", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Injectable melatonin for sleep" },
  { name: "Botox", mg: 100, bac: 2.5, dose: "20-60 units per area", mcg: 4e3, freq: "As needed", route: "IM", store: "Refrigerate \xB7 24 hours", notes: "Reconstitute with 2.5mL saline \u2014 provider-administered" },
  { name: "FOXO4", mg: 10, bac: 1, dose: "1-3mg 2-3x/wk", mcg: 2e3, freq: "2x/week", route: "SubQ", store: "Refrigerate \xB7 21 days", notes: "Senolytic peptide. 4-week cycles. Run before NAD+/longevity stack for best results" },
  { name: "Adipotide", mg: 5, bac: 2, dose: "0.5-1mg/day", mcg: 500, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 21 days", notes: "Experimental \u2014 monitor kidney function. 4 wks on/4 wks off" },
  { name: "GHRP-2", mg: 10, bac: 2, dose: "100-300mcg 2-3x/day", mcg: 200, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "Before bed on empty stomach. Strong appetite stim. Pairs with CJC/GHRH" },
  { name: "MGF", mg: 2, bac: 1, dose: "100-200mcg post-workout", mcg: 200, freq: "Daily", route: "IM", store: "Refrigerate \xB7 14 days", notes: "Inject into target muscle immediately post-training. Very short half-life" },
  { name: "PEG MGF", mg: 2, bac: 1, dose: "200mcg 2-3x/wk", mcg: 200, freq: "2x/week", route: "SubQ/IM", store: "Refrigerate \xB7 21 days", notes: "PEGylated \u2014 longer acting than MGF. Can inject SubQ. Non-training days" },
  { name: "AICAR", mg: 50, bac: 2, dose: "25-50mg 3-5x/wk", mcg: 25e3, freq: "Daily", route: "SubQ", store: "Refrigerate \xB7 28 days", notes: "AMPK activator. Fasted AM dosing. Not a peptide \u2014 nucleoside analog" },
  { name: "Custom Peptide", mg: 0, bac: 2, dose: "\u2014", mcg: 0, freq: "\u2014", route: "SubQ", store: "Refrigerate", notes: "Enter your own values" }
];
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
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SKIN_AM = [
  null,
  "Vitamin C Serum (20%)",
  "Niacinamide (10%)",
  "Vitamin C Serum (20%)",
  "Niacinamide (10%)",
  "Vitamin C Serum (20%)",
  "Antioxidant Serum"
];
const SKIN_PM = [
  "Hydrating Mask",
  "Retinol (0.5-1%)",
  "Hydrating Mask",
  "Exfoliating Acid (BHA/AHA)",
  "Retinol (0.5-1%)",
  "Hydrating Serum",
  "Exfoliating Acid (BHA/AHA)"
];
const SKIN_AM_BASE = ["Gentle Cleanser", "Hyaluronic Acid", "Moisturizer", "SPF 50"];
const SKIN_PM_BASE = ["Oil Cleanser", "Foaming Cleanser", "Night Cream"];
const WORKOUTS = {
  "Fat Loss": [
    { d: "HIIT + Core", dur: 45, warmup: "5 min jump rope + dynamic stretches", cooldown: "5 min walk + static stretches", exercises: [
      { name: "Burpees", sets: 4, reps: "12", rest: "30s" },
      { name: "KB Swings", sets: 4, reps: "15", rest: "30s" },
      { name: "Mountain Climbers", sets: 3, reps: "30s", rest: "20s" },
      { name: "Box Jumps", sets: 3, reps: "10", rest: "30s" },
      { name: "Plank Hold", sets: 3, reps: "45s", rest: "20s" },
      { name: "Russian Twists", sets: 3, reps: "20", rest: "20s" },
      { name: "Dead Bug", sets: 3, reps: "12/side", rest: "20s" }
    ] },
    { d: "Steady-State Cardio", dur: 40, warmup: "5 min easy pace", cooldown: "5 min walk + foam roll", exercises: [
      { name: "Incline Treadmill Walk (12-15%)", sets: 1, reps: "35 min", rest: "\u2014", note: "3.5-4.0 mph, keep HR 130-150" }
    ] },
    { d: "Full Body Circuit", dur: 50, warmup: "5 min row + leg swings + arm circles", cooldown: "5 min walk + stretch", exercises: [
      { name: "Goblet Squats", sets: 4, reps: "12", rest: "30s" },
      { name: "Push-ups", sets: 4, reps: "15", rest: "30s" },
      { name: "DB Rows", sets: 3, reps: "12/arm", rest: "30s" },
      { name: "Walking Lunges", sets: 3, reps: "12/leg", rest: "30s" },
      { name: "Farmer Carries", sets: 3, reps: "40 yds", rest: "45s" },
      { name: "Plank to Push-up", sets: 3, reps: "10", rest: "30s" }
    ] },
    { d: "Active Recovery", dur: 30, warmup: "None", cooldown: "None", exercises: [
      { name: "Yoga Flow", sets: 1, reps: "15 min", rest: "\u2014" },
      { name: "Foam Rolling (Full Body)", sets: 1, reps: "10 min", rest: "\u2014" },
      { name: "Light Walk", sets: 1, reps: "5 min", rest: "\u2014" }
    ] },
    { d: "HIIT + Upper", dur: 45, warmup: "5 min row + band pull-aparts", cooldown: "5 min walk + shoulder stretches", exercises: [
      { name: "Battle Ropes", sets: 4, reps: "30s on/30s off", rest: "30s" },
      { name: "Push Press", sets: 4, reps: "10", rest: "45s" },
      { name: "Pull-ups", sets: 4, reps: "8-10", rest: "45s" },
      { name: "Dips", sets: 3, reps: "12", rest: "30s" },
      { name: "Renegade Rows", sets: 3, reps: "10/arm", rest: "30s" },
      { name: "Ball Slams", sets: 3, reps: "12", rest: "30s" },
      { name: "Lateral Raises", sets: 3, reps: "15", rest: "30s", note: "Light weight, controlled — side delt isolation" },
      { name: "Face Pulls", sets: 3, reps: "15", rest: "30s", note: "Pull to forehead, elbows high — rear delt and rotator cuff health" }
    ] },
    { d: "Lower Body + Cardio", dur: 50, warmup: "5 min bike + hip circles + leg swings", cooldown: "5 min walk + hip flexor stretch", exercises: [
      { name: "Trap Bar Deadlifts", sets: 4, reps: "8", rest: "60s" },
      { name: "Step-ups (weighted)", sets: 3, reps: "10/leg", rest: "45s" },
      { name: "Sled Push", sets: 4, reps: "30 yds", rest: "60s" },
      { name: "Treadmill Sprints", sets: 6, reps: "20s on/40s off", rest: "\u2014" },
      { name: "Leg Press", sets: 3, reps: "12", rest: "45s" },
      { name: "Calf Raises", sets: 3, reps: "15", rest: "30s" }
    ] },
    { d: "Rest", dur: 0, warmup: "", cooldown: "", exercises: [] }
  ],
  "Muscle Gain": [
    { d: "Chest & Triceps", dur: 60, warmup: "5 min incline walk + band flyes + rotator cuff", cooldown: "5 min chest/tricep stretches", exercises: [
      { name: "Flat Barbell Bench Press", sets: 4, reps: "6-8", rest: "90s", note: "Progressive overload \u2014 add 5lbs when you hit 4x8" },
      { name: "Incline DB Press", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Cable Flyes (low to high)", sets: 3, reps: "12", rest: "60s" },
      { name: "Weighted Dips", sets: 3, reps: "8-10", rest: "75s" },
      { name: "Overhead Tricep Extension (rope)", sets: 3, reps: "12", rest: "60s" },
      { name: "Tricep Pushdowns", sets: 3, reps: "15", rest: "45s", note: "Drop set on last set" },
      { name: "Hanging Leg Raises", sets: 3, reps: "12", rest: "45s", note: "Raise legs to 90 degrees, control descent" },
      { name: "Cable Crunches", sets: 3, reps: "15", rest: "45s", note: "Curl spine down — not hips to knees" },
      { name: "Plank Hold", sets: 3, reps: "45s", rest: "30s" }
    ] },
    { d: "Back & Biceps", dur: 60, warmup: "5 min row + band pull-aparts + dead hangs", cooldown: "5 min lat/bicep stretches", exercises: [
      { name: "Conventional Deadlifts", sets: 4, reps: "5", rest: "120s", note: "Top set + back-off sets" },
      { name: "Barbell Rows", sets: 4, reps: "8", rest: "90s" },
      { name: "Weighted Pull-ups", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Face Pulls", sets: 3, reps: "15", rest: "45s" },
      { name: "Barbell Curls", sets: 3, reps: "10", rest: "60s" },
      { name: "Hammer Curls", sets: 3, reps: "12", rest: "45s" },
      { name: "Ab Wheel Rollouts", sets: 3, reps: "10", rest: "45s", note: "From knees — roll until back flat, pull with abs" },
      { name: "Dead Bug", sets: 3, reps: "10", rest: "30s", note: "Opposite arm and leg — back stays flat on floor" }
    ] },
    { d: "Legs (Quad Focus)", dur: 65, warmup: "5 min bike + leg swings + goblet squat warmup", cooldown: "5 min quad/hip stretch + foam roll", exercises: [
      { name: "Back Squats", sets: 5, reps: "5", rest: "120s", note: "5x5 \u2014 track weight progression" },
      { name: "Leg Press", sets: 4, reps: "10-12", rest: "90s" },
      { name: "Walking Lunges (DB)", sets: 3, reps: "12/leg", rest: "60s" },
      { name: "Leg Extensions", sets: 3, reps: "15", rest: "45s", note: "Slow eccentric, squeeze at top" },
      { name: "Standing Calf Raises", sets: 4, reps: "15", rest: "45s" },
      { name: "Seated Calf Raises", sets: 3, reps: "20", rest: "30s" }
    ] },
    { d: "Shoulders & Arms", dur: 55, warmup: "5 min band work + rotator cuff + light OHP", cooldown: "5 min shoulder/arm stretches", exercises: [
      { name: "Standing OHP", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Lateral Raises", sets: 4, reps: "12-15", rest: "45s", note: "Controlled, slight forward lean" },
      { name: "Reverse Pec Deck", sets: 3, reps: "15", rest: "45s" },
      { name: "EZ Bar Curls", sets: 3, reps: "10", rest: "60s" },
      { name: "Skull Crushers", sets: 3, reps: "10", rest: "60s" },
      { name: "Incline DB Curls", sets: 3, reps: "12", rest: "45s" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "12", rest: "45s" },
      { name: "Pallof Press", sets: 3, reps: "12", rest: "30s", note: "Press out and resist rotation — anti-rotation core" },
      { name: "Russian Twists", sets: 3, reps: "20", rest: "30s", note: "Feet elevated, rotate torso side to side" }
    ] },
    { d: "Legs (Posterior)", dur: 60, warmup: "5 min walk + hip circles + RDL warmup", cooldown: "5 min hamstring/glute stretch", exercises: [
      { name: "Romanian Deadlifts", sets: 4, reps: "8", rest: "90s" },
      { name: "Hip Thrusts (barbell)", sets: 4, reps: "10", rest: "75s", note: "Pause 2s at top" },
      { name: "Lying Leg Curls", sets: 3, reps: "12", rest: "60s" },
      { name: "Bulgarian Split Squats", sets: 3, reps: "10/leg", rest: "60s" },
      { name: "Glute Kickbacks (cable)", sets: 3, reps: "12/leg", rest: "45s" },
      { name: "Calf Raises (seated)", sets: 4, reps: "15", rest: "30s" }
    ] },
    { d: "Upper Power", dur: 50, warmup: "5 min row + band pull-aparts + push-up warmup", cooldown: "5 min full upper body stretch", exercises: [
      { name: "Weighted Pull-ups", sets: 5, reps: "3-5", rest: "120s", note: "Heavy \u2014 max strength" },
      { name: "Incline Barbell Press", sets: 4, reps: "5", rest: "120s" },
      { name: "Heavy Barbell Rows", sets: 4, reps: "6", rest: "90s" },
      { name: "DB Arnold Press", sets: 3, reps: "8", rest: "75s" },
      { name: "Weighted Dips", sets: 3, reps: "6-8", rest: "90s" }
    ] },
    { d: "Rest", dur: 0, warmup: "", cooldown: "", exercises: [] }
  ],
  "Recomposition": [
    { d: "Upper Push", dur: 55, warmup: "5 min row + band flyes + rotator cuff", cooldown: "5 min chest/shoulder stretch", exercises: [
      { name: "Flat Bench Press", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Standing OHP", sets: 4, reps: "8", rest: "75s" },
      { name: "Incline DB Press", sets: 3, reps: "10", rest: "60s" },
      { name: "Dips", sets: 3, reps: "12", rest: "60s" },
      { name: "Lateral Raises", sets: 4, reps: "15", rest: "30s" },
      { name: "Tricep Pushdowns", sets: 3, reps: "15", rest: "45s" }
    ] },
    { d: "Lower Strength", dur: 55, warmup: "5 min bike + hip circles + goblet squat", cooldown: "5 min lower body stretch + foam roll", exercises: [
      { name: "Back Squats", sets: 4, reps: "6", rest: "120s" },
      { name: "Romanian Deadlifts", sets: 4, reps: "8", rest: "90s" },
      { name: "Walking Lunges", sets: 3, reps: "10/leg", rest: "60s" },
      { name: "Leg Press", sets: 3, reps: "12", rest: "75s" },
      { name: "Standing Calf Raises", sets: 4, reps: "15", rest: "45s" },
      { name: "Pallof Press", sets: 3, reps: "12", rest: "30s", note: "Anti-rotation core — press out and resist" },
      { name: "Plank Hold", sets: 3, reps: "45s", rest: "30s" }
    ] },
    { d: "Cardio + Core", dur: 40, warmup: "5 min easy jog", cooldown: "5 min walk + stretch", exercises: [
      { name: "Treadmill Intervals", sets: 8, reps: "30s sprint / 60s walk", rest: "\u2014" },
      { name: "Ab Wheel Rollouts", sets: 3, reps: "10", rest: "45s" },
      { name: "Hanging Leg Raises", sets: 3, reps: "12", rest: "45s" },
      { name: "Farmer Carries", sets: 3, reps: "40 yds", rest: "60s" },
      { name: "Pallof Press", sets: 3, reps: "10/side", rest: "30s" }
    ] },
    { d: "Upper Pull", dur: 55, warmup: "5 min row + band pull-aparts + dead hangs", cooldown: "5 min lat/bicep stretch", exercises: [
      { name: "Barbell Rows", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Weighted Pull-ups", sets: 4, reps: "6-8", rest: "90s" },
      { name: "Face Pulls", sets: 3, reps: "15", rest: "45s" },
      { name: "Rear Delt Flyes", sets: 3, reps: "15", rest: "45s" },
      { name: "Barbell Curls", sets: 3, reps: "10", rest: "60s" },
      { name: "Hammer Curls", sets: 3, reps: "12", rest: "45s" }
    ] },
    { d: "Lower Hypertrophy", dur: 50, warmup: "5 min bike + hip circles + leg swings", cooldown: "5 min stretch + foam roll", exercises: [
      { name: "Hip Thrusts", sets: 4, reps: "10", rest: "75s" },
      { name: "Bulgarian Split Squats", sets: 3, reps: "10/leg", rest: "60s" },
      { name: "Lying Leg Curls", sets: 3, reps: "12", rest: "60s" },
      { name: "Leg Extensions", sets: 3, reps: "15", rest: "45s" },
      { name: "Seated Calf Raises", sets: 4, reps: "20", rest: "30s" }
    ] },
    { d: "Full Body + HIIT", dur: 50, warmup: "5 min jump rope + dynamic stretches", cooldown: "5 min walk + full body stretch", exercises: [
      { name: "Barbell Complexes", sets: 4, reps: "6 each movement", rest: "90s", note: "Clean \u2192 Press \u2192 Squat \u2192 Row" },
      { name: "KB Swings", sets: 4, reps: "15", rest: "30s" },
      { name: "Thrusters", sets: 3, reps: "10", rest: "45s" },
      { name: "Burpees", sets: 3, reps: "10", rest: "30s" },
      { name: "Box Jumps", sets: 3, reps: "8", rest: "30s" },
      { name: "Ab Wheel Rollouts", sets: 3, reps: "10", rest: "45s" },
      { name: "Russian Twists", sets: 3, reps: "20", rest: "30s" }
    ] },
    { d: "Rest", dur: 0, warmup: "", cooldown: "", exercises: [] }
  ],
  "Aesthetics": [
    { d: "Chest & Delts", dur: 55, warmup: "5 min row + band flyes + rotator cuff", cooldown: "5 min chest/shoulder stretch", exercises: [
      { name: "Incline DB Press", sets: 4, reps: "8-10", rest: "75s", note: "30\xB0 incline \u2014 upper chest focus" },
      { name: "Cable Flyes (mid)", sets: 3, reps: "12", rest: "60s" },
      { name: "Machine Chest Press", sets: 3, reps: "12", rest: "60s", note: "Squeeze, slow negative" },
      { name: "Standing OHP", sets: 3, reps: "8", rest: "75s" },
      { name: "Lateral Raises", sets: 5, reps: "15", rest: "30s", note: "Light weight, high volume for caps" },
      { name: "Front Raises (cable)", sets: 3, reps: "12", rest: "45s" }
    ] },
    { d: "Back & Rear Delts", dur: 55, warmup: "5 min row + dead hangs + band pull-aparts", cooldown: "5 min lat stretch", exercises: [
      { name: "Wide Grip Pull-ups", sets: 4, reps: "8-10", rest: "75s" },
      { name: "Seated Cable Row (wide)", sets: 4, reps: "10", rest: "60s" },
      { name: "Single Arm DB Row", sets: 3, reps: "10/arm", rest: "60s" },
      { name: "Straight Arm Pulldowns", sets: 3, reps: "12", rest: "45s" },
      { name: "Face Pulls", sets: 4, reps: "15", rest: "30s" },
      { name: "Reverse Flyes", sets: 3, reps: "15", rest: "30s" }
    ] },
    { d: "Legs & Glutes", dur: 60, warmup: "5 min bike + hip circles + glute activation", cooldown: "5 min hip/glute stretch + foam roll", exercises: [
      { name: "Back Squats", sets: 4, reps: "8", rest: "90s" },
      { name: "Hip Thrusts", sets: 4, reps: "10", rest: "75s", note: "2s pause at top" },
      { name: "Romanian Deadlifts", sets: 3, reps: "10", rest: "75s" },
      { name: "Walking Lunges", sets: 3, reps: "12/leg", rest: "60s" },
      { name: "Leg Extensions", sets: 3, reps: "15", rest: "45s" },
      { name: "Calf Raises (standing)", sets: 4, reps: "15", rest: "30s" },
      { name: "Cable Crunches", sets: 3, reps: "15", rest: "45s" },
      { name: "Hanging Leg Raises", sets: 3, reps: "12", rest: "45s" }
    ] },
    { d: "Arms & Abs", dur: 45, warmup: "5 min light curls + tricep warmup", cooldown: "5 min arm stretches", exercises: [
      { name: "EZ Bar Curls", sets: 4, reps: "10", rest: "60s" },
      { name: "Close Grip Bench", sets: 4, reps: "8-10", rest: "60s" },
      { name: "Incline DB Curls", sets: 3, reps: "12", rest: "45s" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "12", rest: "45s" },
      { name: "Cable Crunches", sets: 3, reps: "15", rest: "45s" },
      { name: "Hanging Leg Raises", sets: 3, reps: "12", rest: "45s" },
      { name: "Plank Hold", sets: 3, reps: "45s", rest: "30s" }
    ] },
    { d: "Shoulders & Back Width", dur: 55, warmup: "5 min row + rotator cuff + band work", cooldown: "5 min shoulder/lat stretch", exercises: [
      { name: "Arnold Press", sets: 4, reps: "10", rest: "75s" },
      { name: "Cable Lateral Raises", sets: 4, reps: "15", rest: "30s" },
      { name: "Wide Grip Lat Pulldown", sets: 4, reps: "10", rest: "60s" },
      { name: "Chest Supported DB Row", sets: 3, reps: "10", rest: "60s" },
      { name: "Upright Rows (cable)", sets: 3, reps: "12", rest: "45s" },
      { name: "Rear Delt Machine", sets: 3, reps: "15", rest: "30s" }
    ] },
    { d: "Full Body Pump", dur: 50, warmup: "5 min light cardio + dynamic stretches", cooldown: "5 min full body stretch", exercises: [
      { name: "DB Bench Press", sets: 3, reps: "15", rest: "45s", note: "Light weight, squeeze contractions" },
      { name: "Lat Pulldowns", sets: 3, reps: "15", rest: "45s" },
      { name: "Leg Press", sets: 3, reps: "15", rest: "45s" },
      { name: "Lateral Raise Superset \u2192 Front Raise", sets: 3, reps: "12+12", rest: "30s" },
      { name: "Curls Superset \u2192 Pushdowns", sets: 3, reps: "12+12", rest: "30s" },
      { name: "Cable Crunches", sets: 3, reps: "15", rest: "30s" }
    ] },
    { d: "Rest", dur: 0, warmup: "", cooldown: "", exercises: [] }
  ]
};
WORKOUTS["Anti-Aging"] = [
  { d: "Resistance Training A", dur: 45, warmup: "5 min walk + dynamic stretches + light warmup sets", cooldown: "5 min stretch + foam roll", exercises: [
    { name: "Goblet Squats", sets: 3, reps: "10", rest: "60s" },
    { name: "Flat DB Bench Press", sets: 3, reps: "10", rest: "60s" },
    { name: "Cable Rows", sets: 3, reps: "12", rest: "60s" },
    { name: "DB Lunges", sets: 3, reps: "10/leg", rest: "60s" },
    { name: "Face Pulls", sets: 3, reps: "15", rest: "45s" }
  ] },
  { d: "Zone 2 Cardio", dur: 40, warmup: "5 min easy pace", cooldown: "5 min cool down walk", exercises: [
    { name: "Incline Treadmill Walk or Cycling", sets: 1, reps: "35 min", rest: "\u2014", note: "HR 120-140 bpm, conversational pace" }
  ] },
  { d: "Mobility & Yoga", dur: 40, warmup: "None", cooldown: "None", exercises: [
    { name: "Sun Salutations", sets: 1, reps: "5 rounds", rest: "\u2014" },
    { name: "Hip Opener Flow", sets: 1, reps: "10 min", rest: "\u2014" },
    { name: "Thoracic Spine Mobility", sets: 1, reps: "5 min", rest: "\u2014" },
    { name: "Balance Work (single leg)", sets: 3, reps: "30s/leg", rest: "\u2014" },
    { name: "Deep Breathing & Savasana", sets: 1, reps: "5 min", rest: "\u2014" }
  ] },
  { d: "Resistance Training B", dur: 45, warmup: "5 min walk + dynamic stretches + light warmup sets", cooldown: "5 min stretch + foam roll", exercises: [
    { name: "Trap Bar Deadlifts", sets: 3, reps: "8", rest: "75s" },
    { name: "Standing DB OHP", sets: 3, reps: "10", rest: "60s" },
    { name: "Pull-ups (assisted if needed)", sets: 3, reps: "8", rest: "60s" },
    { name: "Farmer Carries", sets: 3, reps: "40 yds", rest: "60s" },
    { name: "Plank Hold", sets: 3, reps: "30s", rest: "30s" }
  ] },
  { d: "Zone 2 Cardio", dur: 40, warmup: "5 min easy pace", cooldown: "5 min cool down", exercises: [
    { name: "Swimming, Rowing, or Elliptical", sets: 1, reps: "35 min", rest: "\u2014", note: "HR 120-140 bpm, steady effort" }
  ] },
  { d: "Active Recovery", dur: 30, warmup: "None", cooldown: "None", exercises: [
    { name: "Gentle Yoga Flow", sets: 1, reps: "15 min", rest: "\u2014" },
    { name: "Foam Rolling (Full Body)", sets: 1, reps: "10 min", rest: "\u2014" },
    { name: "Light Walk", sets: 1, reps: "5 min", rest: "\u2014" }
  ] },
  { d: "Rest", dur: 0, warmup: "", cooldown: "", exercises: [] }
];
WORKOUTS["Cognitive"] = WORKOUTS["Anti-Aging"];
WORKOUTS["Hormonal"] = WORKOUTS["Recomposition"];
WORKOUTS["Wellness"] = WORKOUTS["Anti-Aging"];
WORKOUTS["Weight Loss"] = WORKOUTS["Fat Loss"];
WORKOUTS["Recovery"] = WORKOUTS["Anti-Aging"];
const MEALS = {
  "Fat Loss": [
    [{ t: "7:00 AM", n: "Breakfast", f: "3 egg whites + 1 whole egg scramble, spinach, \xBD avocado, everything seasoning", cal: 280, p: 28, c: 8, fat: 16 }, { t: "10:00 AM", n: "Snack", f: "Protein shake (whey) + 12 almonds", cal: 230, p: 30, c: 10, fat: 8 }, { t: "12:30 PM", n: "Lunch", f: "Grilled chicken breast (6oz), mixed greens, quinoa (\xBD cup), lemon olive oil dressing", cal: 420, p: 45, c: 30, fat: 12 }, { t: "3:30 PM", n: "Snack", f: "Greek yogurt (1 cup) + \xBD cup blueberries", cal: 180, p: 22, c: 18, fat: 2 }, { t: "6:30 PM", n: "Dinner", f: "Salmon fillet (5oz), roasted broccoli (2 cups), medium sweet potato", cal: 450, p: 36, c: 35, fat: 15 }],
    [{ t: "7:00 AM", n: "Breakfast", f: "Overnight oats: \xBD cup oats, 1 scoop protein, \xBD banana, 1 tbsp PB", cal: 340, p: 32, c: 35, fat: 10 }, { t: "10:00 AM", n: "Snack", f: "2 hard-boiled eggs + cucumber slices", cal: 160, p: 14, c: 4, fat: 10 }, { t: "12:30 PM", n: "Lunch", f: "Turkey lettuce wraps (5oz turkey), hummus, bell peppers", cal: 380, p: 40, c: 18, fat: 14 }, { t: "3:30 PM", n: "Snack", f: "Protein shake + 1 rice cake", cal: 200, p: 30, c: 15, fat: 2 }, { t: "6:30 PM", n: "Dinner", f: "Shrimp stir-fry (6oz), zucchini noodles, sesame ginger sauce", cal: 380, p: 38, c: 15, fat: 12 }],
    [{ t: "7:00 AM", n: "Breakfast", f: "Protein smoothie: 1 scoop whey, \xBD cup berries, spinach, 1 tbsp almond butter, ice", cal: 300, p: 32, c: 20, fat: 10 }, { t: "10:00 AM", n: "Snack", f: "Cottage cheese (1 cup) + cherry tomatoes", cal: 190, p: 28, c: 10, fat: 4 }, { t: "12:30 PM", n: "Lunch", f: "Tuna poke bowl: 5oz tuna, \xBD cup rice, edamame, cucumber, ponzu", cal: 440, p: 42, c: 35, fat: 10 }, { t: "3:30 PM", n: "Snack", f: "Celery + 2 tbsp almond butter", cal: 200, p: 6, c: 8, fat: 16 }, { t: "6:30 PM", n: "Dinner", f: "Chicken thigh (5oz) baked, roasted Brussels sprouts, \xBD cup brown rice", cal: 420, p: 38, c: 30, fat: 14 }],
    [{ t: "7:00 AM", n: "Breakfast", f: "2 eggs + 2 whites, turkey sausage (2 links), \xBD grapefruit", cal: 290, p: 30, c: 12, fat: 14 }, { t: "10:00 AM", n: "Snack", f: "Beef jerky (2oz) + apple slices", cal: 220, p: 20, c: 22, fat: 4 }, { t: "12:30 PM", n: "Lunch", f: "Grilled salmon (5oz) over arugula, avocado (\xBC), balsamic vinaigrette", cal: 440, p: 36, c: 10, fat: 28 }, { t: "3:30 PM", n: "Snack", f: "Protein bar (low sugar, 20g+ protein)", cal: 210, p: 22, c: 18, fat: 7 }, { t: "6:30 PM", n: "Dinner", f: "Lean ground beef (5oz) bowl, cauliflower rice, peppers, onions, salsa", cal: 380, p: 38, c: 15, fat: 16 }],
    [{ t: "7:00 AM", n: "Breakfast", f: "Greek yogurt parfait: 1 cup yogurt, \xBC cup granola, berries, honey drizzle", cal: 310, p: 26, c: 35, fat: 8 }, { t: "10:00 AM", n: "Snack", f: "Turkey roll-ups (3oz turkey, mustard, lettuce)", cal: 130, p: 18, c: 3, fat: 4 }, { t: "12:30 PM", n: "Lunch", f: "Chicken Caesar salad (6oz chicken), romaine, parmesan, light Caesar", cal: 400, p: 44, c: 12, fat: 18 }, { t: "3:30 PM", n: "Snack", f: "Protein shake + \xBD banana", cal: 200, p: 30, c: 18, fat: 2 }, { t: "6:30 PM", n: "Dinner", f: "Cod fillet (6oz) baked, asparagus, lemon, \xBD cup couscous", cal: 400, p: 42, c: 28, fat: 8 }],
    [{ t: "7:00 AM", n: "Breakfast", f: "Avocado toast: 1 slice whole wheat, \xBD avocado, 2 poached eggs, chili flakes", cal: 350, p: 20, c: 22, fat: 22 }, { t: "10:00 AM", n: "Snack", f: "Edamame (1 cup shelled)", cal: 190, p: 17, c: 15, fat: 8 }, { t: "12:30 PM", n: "Lunch", f: "Grilled chicken (6oz) + black bean bowl, corn, pico, lime", cal: 440, p: 45, c: 35, fat: 10 }, { t: "3:30 PM", n: "Snack", f: "String cheese (2) + 10 baby carrots", cal: 170, p: 14, c: 8, fat: 10 }, { t: "6:30 PM", n: "Dinner", f: "Flank steak (5oz) grilled, roasted sweet potato fries, green beans", cal: 420, p: 38, c: 32, fat: 14 }],
    [{ t: "8:00 AM", n: "Brunch", f: "Veggie omelet: 3 eggs, mushrooms, peppers, onions, feta, side of fruit", cal: 380, p: 28, c: 18, fat: 22 }, { t: "12:00 PM", n: "Lunch", f: "Turkey burger (no bun), side salad, sweet potato wedges", cal: 420, p: 38, c: 30, fat: 16 }, { t: "3:30 PM", n: "Snack", f: "Protein shake + mixed berries", cal: 200, p: 30, c: 15, fat: 2 }, { t: "6:30 PM", n: "Dinner", f: "Grilled chicken (5oz), roasted Mediterranean veggies, tahini drizzle", cal: 400, p: 40, c: 20, fat: 16 }]
  ]
};
MEALS["Muscle Gain"] = [
  [{ t: "7:00 AM", n: "Breakfast", f: "4 whole eggs, oatmeal (1 cup) with banana and PB (1 tbsp)", cal: 650, p: 35, c: 65, fat: 25 }, { t: "10:00 AM", n: "Snack", f: "Protein shake, 2 rice cakes, almond butter (1 tbsp)", cal: 400, p: 35, c: 40, fat: 10 }, { t: "12:30 PM", n: "Lunch", f: "Steak (8oz), white rice (1.5 cups), broccoli, olive oil", cal: 720, p: 52, c: 65, fat: 20 }, { t: "3:30 PM", n: "Snack", f: "Chicken wrap (6oz), cheese, avocado (\xBD)", cal: 480, p: 40, c: 30, fat: 18 }, { t: "6:30 PM", n: "Dinner", f: "Ground turkey (6oz), pasta (1.5 cups), marinara, side salad", cal: 650, p: 45, c: 60, fat: 16 }, { t: "9:00 PM", n: "Before Bed", f: "Casein shake + cottage cheese (1 cup)", cal: 300, p: 40, c: 15, fat: 8 }],
  [{ t: "7:00 AM", n: "Breakfast", f: "Protein pancakes (3): 2 scoops whey, 1 egg, \xBD cup oats, blended. Maple syrup", cal: 550, p: 45, c: 55, fat: 12 }, { t: "10:00 AM", n: "Snack", f: "Bagel + cream cheese + smoked salmon (2oz)", cal: 420, p: 22, c: 42, fat: 16 }, { t: "12:30 PM", n: "Lunch", f: "Double chicken burrito bowl: 8oz chicken, rice, beans, salsa, guac", cal: 750, p: 55, c: 70, fat: 20 }, { t: "3:30 PM", n: "Snack", f: "Trail mix (\xBC cup) + protein bar", cal: 400, p: 25, c: 40, fat: 16 }, { t: "6:30 PM", n: "Dinner", f: "Salmon (6oz), mashed potatoes (1.5 cups), green beans, butter", cal: 680, p: 42, c: 55, fat: 22 }, { t: "9:00 PM", n: "Before Bed", f: "Greek yogurt (1 cup) + granola + honey", cal: 320, p: 28, c: 35, fat: 8 }],
  [{ t: "7:00 AM", n: "Breakfast", f: "5 egg whites + 2 whole eggs, toast (2 slices), avocado (\xBD)", cal: 500, p: 38, c: 32, fat: 22 }, { t: "10:00 AM", n: "Snack", f: "Mass gainer shake: 2 scoops whey + banana + oats + milk", cal: 550, p: 40, c: 65, fat: 10 }, { t: "12:30 PM", n: "Lunch", f: "Pulled chicken (8oz), mac & cheese, coleslaw", cal: 700, p: 50, c: 55, fat: 24 }, { t: "3:30 PM", n: "Snack", f: "PB&J sandwich on whole wheat + glass of milk", cal: 450, p: 18, c: 50, fat: 18 }, { t: "6:30 PM", n: "Dinner", f: "NY strip steak (8oz), baked potato with sour cream, Caesar salad", cal: 750, p: 55, c: 50, fat: 30 }, { t: "9:00 PM", n: "Before Bed", f: "Casein pudding: casein powder + almond milk, thickened", cal: 250, p: 35, c: 12, fat: 6 }],
  [{ t: "7:00 AM", n: "Breakfast", f: "French toast: 3 slices thick bread, 2 eggs, cinnamon, syrup, side of turkey bacon", cal: 600, p: 32, c: 65, fat: 20 }, { t: "10:00 AM", n: "Snack", f: "Protein smoothie: whey, banana, PB, oats, milk", cal: 500, p: 38, c: 55, fat: 14 }, { t: "12:30 PM", n: "Lunch", f: "Turkey meatballs (6oz), spaghetti (1.5 cups), garlic bread", cal: 720, p: 45, c: 75, fat: 18 }, { t: "3:30 PM", n: "Snack", f: "Beef jerky (3oz) + mixed nuts (\xBC cup)", cal: 380, p: 28, c: 15, fat: 22 }, { t: "6:30 PM", n: "Dinner", f: "Chicken thighs (8oz), fried rice (1.5 cups), vegetables", cal: 700, p: 48, c: 60, fat: 22 }, { t: "9:00 PM", n: "Before Bed", f: "Cottage cheese (1.5 cups) + walnuts", cal: 350, p: 38, c: 12, fat: 16 }],
  [{ t: "7:00 AM", n: "Breakfast", f: "Breakfast burrito: 3 eggs, chorizo (2oz), cheese, tortilla, salsa", cal: 580, p: 35, c: 38, fat: 30 }, { t: "10:00 AM", n: "Snack", f: "Protein shake + 2 tbsp PB + banana", cal: 450, p: 38, c: 42, fat: 14 }, { t: "12:30 PM", n: "Lunch", f: "Grilled chicken (8oz), jasmine rice (2 cups), teriyaki, broccoli", cal: 750, p: 55, c: 80, fat: 12 }, { t: "3:30 PM", n: "Snack", f: "Greek yogurt (1 cup) + granola + honey", cal: 320, p: 22, c: 40, fat: 8 }, { t: "6:30 PM", n: "Dinner", f: "Pork tenderloin (6oz), sweet potato mash, roasted veggies", cal: 600, p: 42, c: 50, fat: 18 }, { t: "9:00 PM", n: "Before Bed", f: "Casein shake + 1 tbsp almond butter", cal: 280, p: 35, c: 10, fat: 12 }],
  [{ t: "7:00 AM", n: "Breakfast", f: "Egg & cheese bagel sandwich + side of fruit + OJ", cal: 550, p: 28, c: 60, fat: 20 }, { t: "10:00 AM", n: "Snack", f: "Tuna salad (5oz) on crackers", cal: 350, p: 30, c: 22, fat: 14 }, { t: "12:30 PM", n: "Lunch", f: "Double patty smash burger, cheese, sweet potato fries", cal: 800, p: 50, c: 60, fat: 35 }, { t: "3:30 PM", n: "Snack", f: "Protein shake + rice cakes + PB", cal: 400, p: 35, c: 38, fat: 10 }, { t: "6:30 PM", n: "Dinner", f: "Lamb chops (6oz), couscous, roasted vegetables, tzatziki", cal: 680, p: 45, c: 45, fat: 28 }, { t: "9:00 PM", n: "Before Bed", f: "Casein shake + cottage cheese", cal: 300, p: 42, c: 12, fat: 6 }],
  [{ t: "8:00 AM", n: "Brunch", f: "Stack: 3 pancakes, 4 eggs, bacon (3 strips), maple syrup, fruit bowl", cal: 850, p: 45, c: 80, fat: 35 }, { t: "12:00 PM", n: "Lunch", f: "Chipotle-style bowl: double chicken, rice, beans, corn, guac, cheese", cal: 800, p: 60, c: 70, fat: 25 }, { t: "3:30 PM", n: "Snack", f: "Protein bar + banana + glass of milk", cal: 400, p: 28, c: 50, fat: 10 }, { t: "6:30 PM", n: "Dinner", f: "BBQ ribs (6oz), baked beans, cornbread, coleslaw", cal: 750, p: 40, c: 55, fat: 35 }, { t: "9:00 PM", n: "Before Bed", f: "Casein pudding + walnuts", cal: 300, p: 35, c: 15, fat: 12 }]
];
MEALS["Recomposition"] = MEALS["Fat Loss"].map((day) => day.map((m) => ({ ...m, cal: Math.round(m.cal * 1.1), p: Math.round(m.p * 1.1) })));
MEALS["Aesthetics"] = MEALS["Fat Loss"];
MEALS["Anti-Aging"] = MEALS["Fat Loss"].map((day) => day.map((m) => ({ ...m })));
MEALS["Cognitive"] = MEALS["Anti-Aging"];
MEALS["Hormonal"] = MEALS["Muscle Gain"];
MEALS["Wellness"] = MEALS["Anti-Aging"];
const GROOMING_ITEMS = [
  { id: "haircut", name: "Haircut", icon: "\u2702\uFE0F", freqDays: 21, freqLabel: "Every 3 weeks", tip: "Book next appointment before leaving. Tuesday/Wednesday = less wait." },
  { id: "beard", name: "Beard Trim/Shape", icon: "\u{1F9D4}", freqDays: 7, freqLabel: "Weekly", tip: "Trim neckline 2 fingers above Adam's apple. Shape cheek line naturally." },
  { id: "nails", name: "Nail Care", icon: "\u{1F485}", freqDays: 10, freqLabel: "Every 10 days", tip: "File, don't clip. Push cuticles after shower. Clean under nails daily." },
  { id: "dental", name: "Dental Whitening", icon: "\u{1F9B7}", freqDays: 90, freqLabel: "Every 3 months", tip: "Professional cleaning 2x/year. Whitening strips max 2 weeks on, 2 months off." },
  { id: "brows", name: "Brow Grooming", icon: "\u{1F441}\uFE0F", freqDays: 14, freqLabel: "Every 2 weeks", tip: "Remove strays only. Don't over-thin. Follow natural arch." },
  { id: "nose_ear", name: "Nose/Ear Hair", icon: "\u{1F443}", freqDays: 14, freqLabel: "Every 2 weeks", tip: "Trim, don't pluck. Use dedicated trimmer." }
];
const BUREAUS = [{ id: "experian", name: "Experian", addr: "P.O. Box 4500, Allen, TX 75013" }, { id: "equifax", name: "Equifax", addr: "P.O. Box 740256, Atlanta, GA 30374" }, { id: "transunion", name: "TransUnion", addr: "P.O. Box 2000, Chester, PA 19016" }];
function getIncomeActions(dayIdx, partnerType, weeklyRefs, weeklyConvos) {
  const actions = [];
  const pt = partnerType || "referrer";
  if (pt === "referrer") {
    if (dayIdx === 1) actions.push({ time: "10:00 AM", title: "Network Outreach", sub: `Reach out to ${Math.ceil(weeklyConvos / 3)} people about referral program` });
    if (dayIdx === 3) actions.push({ time: "12:00 PM", title: "Follow Up Leads", sub: "Check in with interested prospects from this week" });
    if (dayIdx === 5) actions.push({ time: "11:00 AM", title: "Weekend Conversations", sub: `Talk to ${Math.ceil(weeklyConvos / 3)} people \xB7 Share your referral link` });
  } else if (pt === "business") {
    if (dayIdx === 1) actions.push({ time: "9:00 AM", title: "Database Review", sub: `Pull ${Math.ceil(weeklyConvos / 2)} customer contacts to reach out` });
    if (dayIdx === 2) actions.push({ time: "10:00 AM", title: "Customer Outreach", sub: "Call/text customers from your database" });
    if (dayIdx === 4) actions.push({ time: "3:00 PM", title: "On-Site Mentions", sub: "Mention referral program to today's customers" });
  } else if (pt === "sales") {
    if (dayIdx === 1) actions.push({ time: "9:00 AM", title: "Lead Gen \u2014 AI Calls", sub: "Review overnight call results, pull qualified leads" });
    if (dayIdx === 2) actions.push({ time: "10:00 AM", title: "Set Appointments", sub: "Call qualified leads, schedule consultations" });
    if (dayIdx === 3) actions.push({ time: "1:00 PM", title: "Run Presentations", sub: "Deliver proposals to scheduled prospects" });
    if (dayIdx === 4) actions.push({ time: "9:00 AM", title: "Close Follow-Ups", sub: "Follow up on pending proposals" });
    if (dayIdx === 5) actions.push({ time: "10:00 AM", title: "Pipeline Review", sub: "Advance or close stale leads, plan next week" });
  }
  return actions;
}
function buildRoutine(dayIdx, prof, recPeps, isPremium, intensity, workSched, cycleInfo, incomeData, suggestedPeps, disputes, tCal, intel) {
  const items = [];
  let id = 0;
  const dayName = DAYS[dayIdx];
  const isRest = dayIdx === 0;
  const pepShowsToday = (p) => {
    const f = (p.freq || "").toLowerCase().replace(/\s+/g, "");
    if (f === "daily" || f.startsWith("daily(") || f === "dailyoreod" || f === "daily(10-20daycycles)") return true;
    if (f === "weekly") return dayIdx === 1;
    if (f === "2x_week" || f === "2x/week") return dayIdx === 1 || dayIdx === 4;
    if (f === "2-3x/week" || f === "3x/week") return dayIdx === 1 || dayIdx === 3 || dayIdx === 5;
    if (f === "5x/week" || f === "5x_week") return dayIdx >= 1 && dayIdx <= 5;
    if (f.includes("eod")) return dayIdx === 0 || dayIdx === 1 || dayIdx === 3 || dayIdx === 5;
    if (f.includes("as_needed") || f.includes("asneeded") || f === "\u2014") return false;
    return true;
  };
  const pepFreqLabel = (p) => {
    const f = (p.freq || "").toLowerCase().replace(/\s+/g, "");
    if (f === "daily" || f.startsWith("daily(")) return "Daily";
    if (f === "weekly") return "Weekly (Mon)";
    if (f === "2x_week" || f === "2x/week") return "2x/wk (Mon/Thu)";
    if (f === "2-3x/week" || f === "3x/week") return "3x/wk (M/W/F)";
    if (f.includes("eod")) return "Every other day";
    if (f.includes("as_needed") || f.includes("asneeded")) return "As needed";
    return p.freq || "Daily";
  };
  const pepDoseInfo = (p) => {
    const baseName = (p.name || "").replace(/\s*\d+m[gG].*$/, "").replace(/\s*\d+iu.*$/i, "").trim();
    const db = PEP_DB.find((d) => p.name.indexOf(d.name) === 0 || d.name.toLowerCase() === baseName.toLowerCase());
    if (!db) return null;
    if (!db.bac || !db.mcg) {
      return { premixed: true, route: db.route || "", notes: db.notes || "", dose: db.dose || p.dose, mg: db.mg };
    }
    const concMcgPerMl = db.mg * 1e3 / db.bac;
    const doseVolMl = db.mcg / concMcgPerMl;
    const units = Math.round(doseVolMl * 100);
    const syringe = units < 10 ? "30u" : "100u";
    return { units, mcg: db.mcg, mg: db.mg, bac: db.bac, vol: Math.round(doseVolMl * 1e3), syringe };
  };
  const daySched = workSched?.enabled ? workSched.schedule?.[dayIdx] : null;
  const isWorkDay = !!daySched;
  const wStart = daySched?.s || "09:00";
  const wEnd = daySched?.e || "17:00";
  const wStartH = parseInt(wStart.split(":")[0]);
  const wStartM = parseInt(wStart.split(":")[1] || 0);
  const wEndH = parseInt(wEnd.split(":")[0]);
  const wEndM = parseInt(wEnd.split(":")[1] || 0);
  const isEntrepreneur = workSched?.mode === "entrepreneur";
  const fmt = (h, m) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
  };
  const toMin = (timeStr) => {
    if (!timeStr || timeStr === "\u2014") return 0;
    const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1]), mn = parseInt(m[2]);
    if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + mn;
  };
  const wakeH = isWorkDay ? Math.max(wStartH - 2, 4) : 6;
  const wakeM = isWorkDay ? wStartM : 0;
  const wakeTime = fmt(wakeH, wakeM);
  const trainPref = prof.trainPref || "morning";
  const trainH = (() => {
    if (!isWorkDay) {
      if (trainPref === "evening") return 17;
      return Math.max(wakeH + 2, 8);
    }
    if (trainPref === "morning") return Math.max(wakeH + 1, 5);
    return Math.max(wEndH + (wEndM > 0 ? 1 : 0), 17);
  })();
  const trainTime = fmt(trainH, 0);
  const effIntensity = cycleInfo?.phase?.intensityMod === "recovery" ? "recovery" : cycleInfo?.phase?.intensityMod === "high" && intensity !== "extreme" ? "high" : intensity;
  const userName = prof.name ? prof.name.split(" ")[0] : "";
  const add = (cat, time, title, sub, block, extra) => {
    items.push({ id: id++, cat, time, title, sub: sub || "", sortKey: toMin(time), block: block || "", ...extra || {} });
  };
  const ydIdx = (dayIdx + 6) % 7;
  const ydKey = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const ydCheckin = intel?.checkins?.[ydKey];
  const ydFoods = intel?.foodLogs?.[ydKey] || [];
  const ydCals = ydFoods.reduce((s, f) => s + (f.cal || 0), 0);
  const ydWorkout = intel?.exerciseLogs?.filter((l) => l.date === ydKey) || [];
  const ydCheckedCount = intel?.checkedR ? Object.keys(intel.checkedR).filter((k) => k.startsWith(ydIdx + "-")).length : 0;
  const recentPR = intel?.exerciseLogs?.length > 0 ? (() => {
    const recent = intel.exerciseLogs.filter((l) => l.date === ydKey);
    for (const log of recent) {
      const pr = log.sets?.reduce((best, s) => {
        const v = (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
        return v > best.v ? { name: log.exercise, w: s.weight, r: s.reps, v } : best;
      }, { v: 0, name: "", w: 0, r: 0 });
      if (pr.v > 0) return pr;
    }
    return null;
  })() : null;
  const lastWeight = intel?.weightLog?.length > 0 ? intel.weightLog[intel.weightLog.length - 1] : null;
  const prevWeight = intel?.weightLog?.length > 1 ? intel.weightLog[intel.weightLog.length - 2] : null;
  const wDelta = lastWeight && prevWeight ? lastWeight.weight - prevWeight.weight : null;
  const hasMind = prof.domains.includes("mind");
  if (hasMind) {
    add("mind", fmt(wakeH, 5), "\u{1F64F} Gratitude", "3 things you're grateful for. Sets intention before the day.", "morning");
    if (dayIdx % 2 === 0) add("mind", fmt(wakeH, 10), "\u{1F32C}\uFE0F Breathwork", "Box breathing: 4 in, 4 hold, 4 out, 4 hold \xD7 4 rounds. Primes nervous system.", "morning");
    else add("mind", fmt(wakeH, 10), "\u{1F9D8} Morning Meditation", "10 min focused attention. Before stimulants \u2014 your brain is most receptive now.", "morning");
  }
  const hasPurpose = prof.domains.includes("purpose");
  if (hasPurpose) {
    add("purpose", fmt(wakeH, 15), "\u{1F9ED} Morning Intention", "One sentence: what matters most today? Align your actions with your values.", "morning");
    if (dayIdx === 0) add("purpose", "9:00 AM", "\u{1F4CA} Weekly Life Audit", "Rate each life area. Where did you grow? Where to focus next week?", "morning");
  }
  if (cycleInfo) add("cycle", wakeTime, `${cycleInfo.phase.icon} ${cycleInfo.phase.name} Phase \xB7 Day ${cycleInfo.dayInCycle}`, cycleInfo.phase.training, "morning");
  add("morning", wakeTime, "Wake Up", userName ? `Good morning, ${userName}. Consistent wake time for circadian rhythm.` : "Consistent wake time for circadian rhythm", "morning");
  if (ydCheckin || ydWorkout.length > 0 || ydCals > 0) {
    const parts = [];
    if (ydWorkout.length > 0) parts.push(`\u{1F4AA} ${ydWorkout.length} exercise${ydWorkout.length > 1 ? "s" : ""} logged`);
    if (ydCals > 0) parts.push(`\u{1F37D}\uFE0F ${ydCals} cal tracked`);
    if (ydCheckin?.mood) parts.push(`\u{1F60A} Mood: ${ydCheckin.mood}/5`);
    if (recentPR) parts.push(`\u{1F3C6} PR: ${recentPR.name} ${recentPR.w}\xD7${recentPR.r}`);
    if (parts.length > 0) add("morning", fmt(wakeH, 2), "\u{1F4CB} Yesterday", parts.join(" \xB7 "), "morning");
  }
  const ozTarget = prof.weight ? Math.round(parseFloat(prof.weight) * 0.6) : 100;
  add("morning", fmt(wakeH, 20), "Hydration Protocol", `${Math.round(ozTarget * 0.2)}oz water + pinch sea salt + lemon. Daily target: ${ozTarget}oz`, "morning");
  add("morning", fmt(wakeH, 25), "Sunlight Exposure", "10-15 min outdoor light, no sunglasses. Sets circadian clock for better sleep tonight.", "morning");
  if (lastWeight && prof.domains.includes("body")) {
    const wMsg = wDelta === null ? `Current: ${lastWeight.weight} lbs (${lastWeight.date})` : wDelta < 0 ? `\u{1F4C9} ${lastWeight.weight} lbs (\u2193${Math.abs(wDelta).toFixed(1)} since last weigh-in) \u2014 momentum!` : wDelta > 0 ? `\u{1F4C8} ${lastWeight.weight} lbs (\u2191${wDelta.toFixed(1)} since last) \u2014 water/food weight fluctuation is normal` : `\u2696\uFE0F ${lastWeight.weight} lbs \u2014 holding steady`;
    add("morning", fmt(wakeH, 18), "\u2696\uFE0F Weight", wMsg, "morning");
  }
  const morningPeps = recPeps.filter((p) => {
    if (p.tod !== "morning") return false;
    if (!pepShowsToday(p)) return false;
    return true;
  });
  morningPeps.forEach((p) => {
    const di = pepDoseInfo(p);
    const unitStr = di ? di.premixed ? " \xB7 " + di.route + (di.notes ? " \u2014 " + di.notes : "") : " \xB7 Draw " + di.units + "u" + (di.syringe === "30u" ? " (30u syringe)" : "") : "";
    add("peptide", fmt(wakeH, 30), p.name, `${p.dose} \xB7 ${pepFreqLabel(p)}${unitStr}`, null, { pepId: p.id });
  });
  const sugMorning = (suggestedPeps || []).filter((p) => {
    if (p.tod !== "morning") return false;
    if (!pepShowsToday(p)) return false;
    return true;
  });
  if (sugMorning.length > 0) {
    sugMorning.forEach((p) => {
      const di = pepDoseInfo(p);
      const unitStr = di ? di.premixed ? " \xB7 " + di.route + (di.notes ? " \u2014 " + di.notes : "") : " \xB7 Draw " + di.units + "u (" + di.mg + "mg vial + " + di.bac + "mL BAC" + (di.syringe === "30u" ? ", 30u syringe" : "") + ")" : "";
      add("peptide_rec", fmt(wakeH, 30), "\u{1F4A1} " + p.name, `${p.dose} \xB7 Recommended${unitStr}`, null, { pepId: p.id, suggested: true });
    });
  }
  const hasAesth = prof.domains?.includes("image");
  if (hasAesth) {
    add("skincare", fmt(wakeH, 40), SKIN_AM_BASE[0], "AM Step 1");
    if (SKIN_AM[dayIdx]) add("skincare", fmt(wakeH, 42), SKIN_AM[dayIdx], `Active \xB7 ${dayName}`);
    SKIN_AM_BASE.slice(1).forEach((step, i) => add("skincare", fmt(wakeH, 44 + i), step, `AM Step ${i + 3}`));
  }
  const goal = prof.primary || prof.goals[0] || "Wellness";
  const goalSupps = {
    "Fat Loss": "Vitamin D3 (5000 IU) + K2 (100mcg), Omega-3 (2g EPA/DHA), L-Carnitine (2g), Green Tea Extract (500mg)",
    "Muscle Gain": "Vitamin D3 (5000 IU) + K2, Creatine Monohydrate (5g), Omega-3 (2g), Zinc (30mg), Ashwagandha (600mg KSM-66)",
    "Recomposition": "Vitamin D3 (5000 IU) + K2, Creatine (5g), Omega-3 (2g), L-Carnitine (2g), Ashwagandha (600mg)",
    "Aesthetics": "Vitamin D3 (5000 IU) + K2, Omega-3 (2g), Biotin (5000mcg), Collagen Peptides (10g), Vitamin C (1000mg)",
    "Anti-Aging": "Vitamin D3 (5000 IU) + K2, Omega-3 (2g), NMN (500mg), Resveratrol (500mg), CoQ10 (200mg)",
    "Cognitive": "Vitamin D3 (5000 IU) + K2, Omega-3 (2g DHA-heavy), Lions Mane (1g), Alpha-GPC (300mg), Magnesium L-Threonate (2g)",
    "Hormonal": "Vitamin D3 (5000 IU) + K2, Zinc (30mg), Magnesium (400mg), Boron (10mg), Ashwagandha (600mg KSM-66), Tongkat Ali (400mg)",
    "Wellness": "Vitamin D3 (5000 IU) + K2, Omega-3 (2g), Magnesium Glycinate (400mg), Probiotics (50B CFU), Vitamin C (1000mg)"
  };
  add("supplement", fmt(wakeH, 50), "Morning Supplements", goalSupps[goal] || goalSupps["Wellness"]);
  const mealPlan = MEALS[goal] || MEALS["Fat Loss"];
  const dayMeals = Array.isArray(mealPlan[0]) ? mealPlan[dayIdx % mealPlan.length] : mealPlan;
  let runP = 0, runC = 0, runF = 0, runCal = 0;
  dayMeals.forEach((m) => {
    runP += m.p;
    runC += m.c || 0;
    runF += m.fat || 0;
    runCal += m.cal;
    const atWork = isWorkDay && toMin(m.t) >= wStartH * 60 + wStartM && toMin(m.t) <= wEndH * 60 + wEndM;
    add("nutrition", m.t, m.n, `${m.f} \xB7 ${m.cal} cal \xB7 ${m.p}P/${m.c || 0}C/${m.fat || 0}F \u2014 Running: ${runCal}/${tCal || "\u2014"} cal${atWork ? " \xB7 \u{1F4CD} prep ahead" : ""}`);
  });
  if (dayIdx === 0) {
    const weekProteins = /* @__PURE__ */ new Set();
    const weekCarbs = /* @__PURE__ */ new Set();
    for (let d = 0; d < 7; d++) {
      const dm = Array.isArray(mealPlan[0]) ? mealPlan[d % mealPlan.length] : mealPlan;
      dm.forEach((m) => {
        if (m.f.match(/chicken/i)) weekProteins.add("chicken breast");
        if (m.f.match(/salmon/i)) weekProteins.add("salmon");
        if (m.f.match(/steak|beef/i)) weekProteins.add("steak/beef");
        if (m.f.match(/turkey/i)) weekProteins.add("ground turkey");
        if (m.f.match(/shrimp/i)) weekProteins.add("shrimp");
        if (m.f.match(/rice/i)) weekCarbs.add("rice");
        if (m.f.match(/sweet potato/i)) weekCarbs.add("sweet potatoes");
        if (m.f.match(/oat/i)) weekCarbs.add("oats");
      });
    }
    add("nutrition", "10:00 AM", "\u{1F6D2} Weekly Meal Prep", "Batch cook: " + [...weekProteins].slice(0, 3).join(", ") + ". Prep: " + [...weekCarbs].slice(0, 3).join(", ") + ". Portion into containers for the week.");
  }
  if (isWorkDay) {
    if (isEntrepreneur) {
      const blockStart = wStartH;
      add("work", fmt(blockStart, 0), "\u{1F3AF} Deep Work Block 1", "High-leverage tasks. Phone off. No email. 90-min sprint.");
      add("work", fmt(blockStart + 1, 30), "\u2615 Break + Movement", "Walk, stretch, clear your head. 15 min.");
      add("work", fmt(blockStart + 2, 0), "\u{1F4DE} Admin Block", "Calls, emails, meetings, ops. Batch process everything.");
      add("work", fmt(blockStart + 3, 0), "\u{1F3AF} Deep Work Block 2", "Revenue-generating work. Sales, building, creating.");
      add("work", fmt(blockStart + 4, 30), "\u26A1 Sprint Block", "Quick wins, follow-ups, outreach. Clear the queue.");
      if (wEndH - wStartH >= 7) {
        add("work", fmt(blockStart + 5, 30), "\u{1F9E0} Strategy Hour", "Planning, learning, big picture thinking. Review metrics.");
      }
      add("work", fmt(wEndH, wEndM), "\u{1F4BC} Work Complete", "Shut the laptop. Hard boundary. Protect your evening protocol.");
    } else {
      add("work", fmt(wStartH, wStartM), `\u{1F4BC} ${workSched.label || "Work"} starts`, `Block until ${fmt(wEndH, wEndM)}`);
      add("work", fmt(wEndH, wEndM), `\u{1F4BC} ${workSched.label || "Work"} ends`, "Transition to evening protocol");
    }
  }
  add("supplement", fmt(14, 0), "Hydration Check", `${Math.round(ozTarget * 0.6)}oz+ by now (of ${ozTarget}oz daily). ${isWorkDay ? "Keep water at desk. Add electrolytes if training later." : "Add electrolytes if training later."}`);
  const workout = (WORKOUTS[goal] || WORKOUTS["Wellness"])[dayIdx];
  const iLbl = effIntensity === "extreme" ? " \xB7 \u{1F6A8} EXTREME" : effIntensity === "high" ? " \xB7 \u26A1 HIGH INTENSITY" : effIntensity === "recovery" ? " \xB7 \u{1F7E2} RECOVERY" : "";
  const cycleLbl = cycleInfo ? ` \xB7 ${cycleInfo.phase.icon} ${cycleInfo.phase.name}` : "";
  if (workout && workout.dur > 0) {
    // session completion from Train tab logs
  const _wg = prof.primary || (prof.goals&&prof.goals[0]) || "Wellness";
  let _wd=0,_wt=0;
  if(workout&&workout.exercises){workout.exercises.forEach(ex=>{for(let _i=0;_i<ex.sets;_i++){_wt++;const _k=_wg+"|"+(typeof wkWeek!=="undefined"?wkWeek:1)+"|"+dayIdx+"|"+ex.name+"|"+_i;if(typeof wkLogs!=="undefined"&&wkLogs[_k]&&wkLogs[_k].c)_wd++;}});}  
  const _ws=_wt>0&&_wd===_wt?" ✓ Done":_wd>0?" · "+_wd+"/"+_wt+" sets":"";
  add("training", trainTime, "\\u{1F525} " + workout.d + _ws, `${workout.dur} min session${iLbl}${cycleLbl}${isWorkDay ? " \\xB7 Post-work" : ""}`);
    if (workout.warmup) add("training", fmt(trainH, 5), "Warm-up", workout.warmup);
    workout.exercises.forEach((ex, i) => {
      let sets = ex.sets, reps = ex.reps;
      if (effIntensity === "extreme") sets = Math.min(ex.sets + 1, 6);
      else if (effIntensity === "high" && typeof reps === "string" && /^\d+$/.test(reps)) reps = String(parseInt(reps) + 2);
      else if (effIntensity === "recovery") sets = Math.max(ex.sets - 1, 1);
      const detail = `${sets}\xD7${reps} \xB7 Rest ${ex.rest}`;
      let smartNote = ex.note ? ` \u2014 ${ex.note}` : "";
      if (intel?.exerciseLogs) {
        const hist = intel.exerciseLogs.filter((l) => l.exercise === ex.name).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (hist.length > 0) {
          const last = hist[0];
          const bestSet = last.sets?.reduce((best, s) => {
            const v = (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            return v > (best.v || 0) ? { w: s.weight, r: s.reps, v } : best;
          }, {});
          if (bestSet?.w) {
            const compounds = ["Bench Press", "Squat", "Deadlift", "OHP", "Barbell Row", "Hip Thrust", "Leg Press"];
            const isCompound = compounds.some((c) => ex.name.includes(c));
            const inc = isCompound ? 5 : 2.5;
            const allHit = last.sets?.every((s) => (parseInt(s.reps) || 0) >= parseInt(reps));
            smartNote = allHit ? ` \u2014 \u2B06 Last: ${bestSet.w}lbs \u2192 Today: ${parseFloat(bestSet.w) + inc}lbs (+${inc})` : ` \u2014 \u{1F3AF} ${bestSet.w}lbs \xD7 ${bestSet.r} last time. Hit all reps to unlock +${inc}`;
          }
        } else {
          smartNote = smartNote || " \u2014 First time! Start light, focus on form.";
        }
      }
      add("training", fmt(trainH, 15), ex.name, detail + smartNote);
    });
    if (workout.cooldown) add("training", fmt(trainH + 1, 0), "Cool Down", workout.cooldown);
    if (effIntensity === "extreme" || effIntensity === "high") {
      add("training", fmt(trainH + 1, 5), "Finisher: 10 min HIIT", "Bike sprints or burpees \u2014 push through the clock");
    }
    add("nutrition", fmt(trainH + 1, 15), "Post-Workout Shake", `1 scoop whey (25g protein) + 5g creatine + ${goal === "Muscle Gain" ? "fast carbs (banana + honey)" : "water/ice"} within 30 min`);
  }
  const eveningPeps = recPeps.filter((p) => {
    if (p.tod !== "evening") return false;
    if (!pepShowsToday(p)) return false;
    return true;
  });
  if (hasAesth) {
    SKIN_PM_BASE.forEach((step, i) => add("skincare", fmt(21, i * 2), step, `PM Step ${i + 1}`));
    if (SKIN_PM[dayIdx]) add("skincare", fmt(21, 10), SKIN_PM[dayIdx], `PM Active \xB7 ${dayName}`);
  }
  const eveningSupps = {
    "Fat Loss": "Magnesium Glycinate (400mg), ZMA (Zinc 30mg + Mag + B6), Ashwagandha (600mg KSM-66)",
    "Muscle Gain": "Magnesium Glycinate (400mg), ZMA, Casein Protein (before bed if not in meal plan), Ashwagandha (600mg)",
    "Recomposition": "Magnesium Glycinate (400mg), ZMA, Ashwagandha (600mg), Melatonin (0.5mg if needed)",
    "Aesthetics": "Magnesium Glycinate (400mg), Zinc (15mg), Evening Primrose Oil (1g), Melatonin (0.5mg if needed)",
    "Anti-Aging": "Magnesium Glycinate (400mg), Glycine (3g), Melatonin (0.3mg), Resveratrol (if not taken AM)",
    "Cognitive": "Magnesium L-Threonate (2g), L-Theanine (200mg), Glycine (3g)",
    "Hormonal": "Magnesium Glycinate (400mg), ZMA, Boron (if not taken AM), Ashwagandha (600mg)",
    "Wellness": "Magnesium Glycinate (400mg), Ashwagandha (600mg), Chamomile or Valerian if needed"
  };
  add("supplement", fmt(21, 0), "Evening Supplements", cycleInfo ? `${cycleInfo.phase.supplements}` : eveningSupps[goal] || eveningSupps["Wellness"]);
  eveningPeps.forEach((p) => {
    const di = pepDoseInfo(p);
    const unitStr = di ? di.premixed ? " \xB7 " + di.route + (di.notes ? " \u2014 " + di.notes : "") : " \xB7 Draw " + di.units + "u" + (di.syringe === "30u" ? " (30u syringe)" : "") : "";
    add("peptide", fmt(21, 15), p.name, `${p.dose} \xB7 ${pepFreqLabel(p)}${unitStr}`, null, { pepId: p.id });
  });
  const sugEvening = (suggestedPeps || []).filter((p) => {
    if (p.tod !== "evening") return false;
    if (!pepShowsToday(p)) return false;
    return true;
  });
  if (sugEvening.length > 0) {
    sugEvening.forEach((p) => {
      const di = pepDoseInfo(p);
      const unitStr = di ? di.premixed ? " \xB7 " + di.route + (di.notes ? " \u2014 " + di.notes : "") : " \xB7 Draw " + di.units + "u (" + di.mg + "mg vial + " + di.bac + "mL BAC" + (di.syringe === "30u" ? ", 30u syringe" : "") + ")" : "";
      add("peptide_rec", fmt(21, 15), "\u{1F4A1} " + p.name, `${p.dose} \xB7 Recommended${unitStr}`, null, { pepId: p.id, suggested: true });
    });
  }
  add("evening", fmt(21, 30), "Wind Down", "Blue light glasses on. Dim lights to 30%. 10 min reading or breathwork. Room temp to 65-68\xB0F.");
  const sleepTarget = intensity === "high" ? "8-9" : intensity === "low" ? "7-8" : "7.5-8.5";
  add("evening", fmt(22, 0), "Lights Out", `${sleepTarget} hours sleep for recovery & GH release. Phone on airplane mode. Blackout curtains.`);
  const hasIncome = prof.domains.includes("money");
  if (hasIncome && incomeData) {
    const iActs = getIncomeActions(dayIdx, incomeData.partnerType, incomeData.weeklyRefs || 2, incomeData.weeklyConvos || 10);
    iActs.forEach((a) => add("income", a.time, a.title, a.sub));
  }
  const hasMoney = prof.domains.includes("money");
  const hasImage = prof.domains.includes("image");
  if (hasImage) {
    if (typeof intel?.groomingLog !== "undefined") {
      GROOMING_ITEMS.forEach((g) => {
        const lastD = intel.groomingLog?.[g.id];
        if (!lastD) return;
        const days = Math.ceil((/* @__PURE__ */ new Date() - new Date(lastD)) / 864e5);
        if (days >= g.freqDays) add("skincare", fmt(wakeH, 35), g.icon + " " + g.name + " \u2014 Due", "Last done " + days + " days ago. " + g.freqLabel + " recommended.");
      });
    }
    if (isWorkDay) add("skincare", fmt(Math.floor((wStartH + wEndH) / 2), 0), "\u{1F9CD} Posture Check", "Shoulders back, chin neutral, feet flat. Stand/stretch 5 min every hour.");
  }
  const hasEnvironment = prof.domains.includes("environment");
  if (hasEnvironment) {
    add("morning", fmt(wakeH, 5), "\u{1F6CF}\uFE0F Make Bed", "First win of the day. 2 minutes. Sets the tone.");
    if (isWorkDay) add("work", fmt(wStartH, 0), "\u{1F4BB} Workspace Prep", "Clear desk, fill water, close unnecessary tabs. Set intention for the session.");
    add("evening", fmt(21, 15), "\u{1F9F9} 10-Min Reset", "Dishes done, surfaces cleared, tomorrow's clothes out, bag packed.");
    if (dayIdx === 0) add("morning", "10:00 AM", "\u{1F9FD} Weekly Deep Clean", "Bathroom, kitchen, vacuum, laundry. 60-90 min. Fresh space = fresh mind.");
  }
  const hasSocial = prof.domains.includes("relationships");
  if (hasSocial && intel?.partners && intel.partners.length > 0) {
    if (dayIdx === 0) add("purpose", "10:00 AM", "\u{1F91D} Weekly Check-In", "Share your biggest win this week and your #1 focus for next week with your accountability partner.");
    if (dayIdx === 3) add("purpose", "8:00 PM", "\u{1F91D} Midweek Pulse", "Quick check with your partner \u2014 are you both on track? Adjust if needed.");
  }
  if (hasMoney && disputes && disputes.length > 0) {
    const now3 = /* @__PURE__ */ new Date();
    const pendingD = disputes.filter((d) => d.status === "pending");
    const sentD = disputes.filter((d) => d.status === "sent");
    const nearDeadlineD = sentD.filter((d) => {
      const days = Math.ceil((now3 - new Date(d.dateOpened)) / 864e5);
      return days >= 25 && days <= 30;
    });
    const overdueD = sentD.filter((d) => {
      const days = Math.ceil((now3 - new Date(d.dateOpened)) / 864e5);
      return days > 30;
    });
    const resolvedToday = disputes.filter((d) => d.status === "resolved" && d.dateOpened);
    if (pendingD.length > 0) {
      add("credit", "8:00 AM", "\u{1F4EC} Mail Dispute Letter" + (pendingD.length > 1 ? "s" : ""), pendingD.length + " letter" + (pendingD.length > 1 ? "s" : "") + " ready. Print, sign, and send via certified mail (USPS). Keep tracking number.");
    }
    if (nearDeadlineD.length > 0) {
      nearDeadlineD.forEach((d) => {
        const bureau = BUREAUS.find((b) => b.id === d.bureau)?.name || d.bureau;
        const days = Math.ceil((now3 - new Date(d.dateOpened)) / 864e5);
        add("credit", "8:00 AM", "\u23F0 " + d.creditor + " \u2014 " + bureau + " deadline in " + (30 - days) + "d", "Follow-up letter auto-generated. Print and send if no response by day 30.");
      });
    }
    if (overdueD.length > 0) {
      overdueD.forEach((d) => {
        const bureau = BUREAUS.find((b) => b.id === d.bureau)?.name || d.bureau;
        add("credit", "8:00 AM", "\u{1F6A8} ESCALATE: " + d.creditor + " (" + bureau + ")", "30-day deadline passed. Send follow-up letter + file CFPB complaint. Bureau violated FCRA.");
      });
    }
    if (resolvedToday.length > 0) {
      add("credit", "8:00 AM", "\u2705 Log Updated Credit Score", "Dispute resolved! Pull your updated score and log it \u2014 new card recommendations may unlock.");
    }
    if (dayIdx === 1 && disputes.length > 0) {
      add("credit", "9:00 AM", "\u{1F4CA} Weekly Credit Check", "Review dispute statuses. Check Credit Karma for score changes. Update any resolved items.");
    }
  }
  if (hasMind) {
    if (isWorkDay) add("mind", fmt(Math.max(wStartH, 9), 0), "\u26A1 Focus Block", "90 min deep work. Phone off. Single task. Peak cognitive window.");
    else add("mind", "9:00 AM", "\u26A1 Focus Block", "90 min deep work sprint. No distractions. Your sharpest hours.");
    if (dayIdx === 3 || dayIdx === 5) add("mind", "2:30 PM", "\u{1F3AF} Visualization", "5 min. Mentally rehearse your week's biggest goal as already achieved.");
    add("mind", "9:20 PM", "\u{1F4DD} Evening Journal", "What went well? What to improve? Capture insights before sleep.");
    if (dayIdx === 0 || dayIdx === 6) add("mind", "10:00 AM", "\u{1F4D6} Reading Block", "30 min non-fiction. Invest in your knowledge base.");
  }
  if (intel?.checkins) {
    const yesterday = /* @__PURE__ */ new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yk = [yesterday.getFullYear(), String(yesterday.getMonth() + 1).padStart(2, "0"), String(yesterday.getDate()).padStart(2, "0")].join("-");
    const yCheckin = intel.checkins[yk];
    if (yCheckin) {
      if ((yCheckin.sleep || 3) <= 2) add("morning", "6:02 AM", "\u26A0\uFE0F Low Sleep Recovery", "Yesterday's sleep was poor. Consider lighter training today, extra caffeine AM only, 20 min nap at 1 PM if possible.");
      if ((yCheckin.stress || 3) >= 4) add("morning", "6:02 AM", "\u{1F9D8} High Stress Alert", "Stress was elevated yesterday. Prioritize breathwork, skip HIIT finisher, add 5 min meditation before training.");
      if ((yCheckin.energy || 3) >= 5 && (yCheckin.sleep || 3) >= 4) add("morning", "6:02 AM", "\u{1F525} Peak Day", "Energy and sleep both high. Push hard today \u2014 add weight or reps to compound lifts.");
      if ((yCheckin.soreness || 3) <= 2) add("morning", "6:02 AM", "\u{1F4AA} Recovery Check", "High soreness reported. Foam roll 10 min pre-workout. Prioritize warm-up. Drop weight 10% if form breaks.");
    }
  }
  if (intel?.weightLog && intel.weightLog.length >= 3 && prof.goalW) {
    const recent = intel.weightLog.slice(-7);
    const goalW = parseFloat(prof.goalW);
    const currentW = parseFloat(recent[recent.length - 1]?.weight || prof.weight);
    const weekAgoW = recent.length >= 7 ? parseFloat(recent[0]?.weight) : null;
    const isLosing = goalW < currentW;
    if (weekAgoW) {
      const weeklyChange = currentW - weekAgoW;
      if (isLosing && weeklyChange > 0.5) add("nutrition", "7:00 AM", "\u26A0\uFE0F Weight Trending Up", "Up " + weeklyChange.toFixed(1) + "lbs this week vs goal of losing. Tighten portions today. Extra 15 min cardio.");
      if (isLosing && weeklyChange < -2.5) add("nutrition", "7:00 AM", "\u26A0\uFE0F Losing Too Fast", "Down " + Math.abs(weeklyChange).toFixed(1) + "lbs this week. Muscle loss risk. Add 200 cal today + prioritize protein.");
      if (!isLosing && weeklyChange < -0.5) add("nutrition", "7:00 AM", "\u26A0\uFE0F Weight Dropping", "Down " + Math.abs(weeklyChange).toFixed(1) + "lbs but goal is to gain. Add 300 extra cal today. Extra meal before bed.");
      if (!isLosing && weeklyChange > 1.5) add("nutrition", "7:00 AM", "\u26A0\uFE0F Gaining Fast", "Up " + weeklyChange.toFixed(1) + "lbs this week. Some may be fat. Reduce carbs slightly, maintain protein.");
    }
    const toGo = Math.abs(goalW - currentW);
    if (toGo <= 2) add("morning", "6:00 AM", "\u{1F3AF} Almost There!", "Only " + toGo.toFixed(1) + "lbs from your goal weight. Stay the course this week.");
    if (toGo <= 0.5) add("morning", "6:00 AM", "\u{1F3C6} GOAL REACHED", "You hit your target weight! Time to transition to maintenance calories.");
  }
  const hasCitizenship = prof.domains.includes("citizenship");
  if (hasCitizenship && intel?.czApps && intel.czApps.length > 0) {
    intel.czApps.forEach((app) => {
      if (app.status === "gathering_docs") add("work", "9:00 AM", "\u{1F30D} " + app.country + " \u2014 Gather Documents", "Check your citizenship checklist. Scan and upload pending documents. Contact consulate if needed.");
      if (app.status === "submitted") add("work", "9:00 AM", "\u{1F30D} " + app.country + " \u2014 Application Submitted", "Check consulate portal for updates. Estimated wait: check your timeline.");
    });
    if (dayIdx === 1) add("work", "9:00 AM", "\u{1F30D} Citizenship Check-In", "Review all active applications. Follow up on anything pending 30+ days. Check document expiration dates.");
  }
  if (hasMoney && intel?.creditScores && intel.creditScores.length > 0 && intel?.ccWallet) {
    const latestScore = intel.creditScores.slice(-1)[0]?.score || 0;
    const prevScore = intel.creditScores.length >= 2 ? intel.creditScores.slice(-2)[0]?.score : null;
    const walletIds = new Set((intel.ccWallet || []).map((c) => c.name));
    const count524 = (intel.ccWallet || []).filter((c) => {
      const d = new Date(c.opened);
      const m24 = /* @__PURE__ */ new Date();
      m24.setMonth(m24.getMonth() - 24);
      return d >= m24;
    }).length;
    const slots524 = 5 - count524;
    if (prevScore && latestScore > prevScore + 15) {
      add("credit", "9:00 AM", "\u{1F4C8} Score Jump Detected", "Up " + (latestScore - prevScore) + " points! Review card recommendations \u2014 you may qualify for better cards now.");
    }
    if (latestScore >= 700 && slots524 > 0 && dayIdx === 3) {
      add("credit", "9:00 AM", "\u{1F4B3} Card Application Window", "Score: " + latestScore + ". " + slots524 + " 5/24 slot" + (slots524 > 1 ? "s" : "") + " open. Check Money tab for recommended next card.");
    }
    if (slots524 === 0) {
      const oldestIn24 = intel.ccWallet.filter((c) => {
        const d = new Date(c.opened);
        const m24 = /* @__PURE__ */ new Date();
        m24.setMonth(m24.getMonth() - 24);
        return d >= m24;
      }).sort((a, b) => new Date(a.opened) - new Date(b.opened))[0];
      if (oldestIn24) {
        const falloffDate = new Date(oldestIn24.opened);
        falloffDate.setMonth(falloffDate.getMonth() + 24);
        const daysUntil = Math.ceil((falloffDate - /* @__PURE__ */ new Date()) / 864e5);
        if (daysUntil <= 30) add("credit", "9:00 AM", "\u{1F4B3} 5/24 Slot Opening Soon", "A card falls off 5/24 in " + daysUntil + " days. Plan your next application.");
      }
    }
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.id - b.id);
  const wSM = isWorkDay ? wStartH * 60 + wStartM : 540;
  const BLOCK_DEFS = [
    {
      id: "morning",
      name: "Morning Protocol",
      icon: "\u2600\uFE0F",
      startMin: 0,
      endMin: wSM,
      color: "#F59E0B",
      synergy: hasMind ? "Mind primes Body \u2014 gratitude lowers cortisol, breathwork activates parasympathetic. Peptide absorption peaks when stress is low." : "Hydration \u2192 Sunlight \u2192 Peptides. Your circadian reset sequence."
    },
    {
      id: "work",
      name: isWorkDay ? isEntrepreneur ? "Execution Protocol" : "Work Protocol" : "Deep Work",
      icon: isWorkDay ? isEntrepreneur ? "\u{1F3AF}" : "\u{1F4BC}" : "\u26A1",
      startMin: wSM,
      endMin: wSM + 240,
      color: "#60A5FA",
      synergy: hasMind ? "Focus block first, admin second. Your prefrontal cortex is sharpest in the first 3 hours after waking." : "Front-load hard decisions. Willpower depletes throughout the day."
    },
    {
      id: "midday",
      name: "Midday Protocol",
      icon: "\u26A1",
      startMin: wSM + 240,
      endMin: 960,
      color: "#06B6D4",
      synergy: "Cortisol dips after lunch. Protein prevents the crash. Movement resets your focus for the afternoon."
    },
    {
      id: "training",
      name: "Training Protocol",
      icon: "\u{1F525}",
      startMin: 960,
      endMin: 1140,
      color: "#E8D5B7",
      synergy: hasMind ? "Mental energy spent \u2192 channel into physical. Post-focus training prevents overthinking." : "Peak body temperature = peak strength. Afternoon is optimal for hypertrophy."
    },
    {
      id: "evening",
      name: "Wind-Down Protocol",
      icon: "\u{1F319}",
      startMin: 1140,
      endMin: 1440,
      color: "#D4C4AA",
      synergy: hasMind ? "Journal processes the day, magnesium calms the nervous system, darkness triggers melatonin. Each step compounds into deeper sleep." : "Every minute of deep sleep = recovery + GH release. Protect this window."
    }
  ];
  items.forEach((item) => {
    if (!item.block) {
      const block = BLOCK_DEFS.find((b) => item.sortKey >= b.startMin && item.sortKey < b.endMin);
      item.block = block?.id || "morning";
    }
  });
  items._blocks = BLOCK_DEFS;
  return items;
}

export { PEP_DB, CYCLE_PHASES, getCycleInfo, DAYS, SKIN_AM, SKIN_PM, SKIN_AM_BASE, SKIN_PM_BASE, WORKOUTS, MEALS, GROOMING_ITEMS, BUREAUS, getIncomeActions, buildRoutine };
