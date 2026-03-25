// ─────────────────────────────────────────────────────────────────────────────
// Adonis Program Configs — programs.js
// v1.0 | Session 2 | 1 program: Adonis PPL (16-week)
//
// Usage in app.html:
//   <script src="/lib/exercises.js"></script>
//   <script src="/lib/programs.js"></script>
//
// Each program references exercises by ID from EXERCISES in exercises.js
// The workout engine in app.html reads these configs to render any program
// ─────────────────────────────────────────────────────────────────────────────

const PROGRAMS = {

// ─────────────────────────────────────────────────────────────────────────────
// ADONIS PPL — 16-Week Push / Pull / Legs
// Ported from adonis-os reference tracker
// Goals: Muscle Gain, Recomposition, Aesthetics
// Tier: Pro
// ─────────────────────────────────────────────────────────────────────────────
"adonis-ppl": {
  id: "adonis-ppl",
  name: "Adonis PPL",
  subtitle: "16-Week Push / Pull / Legs",
  goal: ["Muscle Gain", "Recomposition", "Aesthetics"],
  durationWeeks: 16,
  daysPerWeek: 6,
  split: "ppl",
  tier: "pro",
  description: "The flagship Adonis program. 6 days per week, progressive overload across 4 phases. Designed around your peptide stack — pairs with MASS, RECOMP, and GROWTH protocols.",

  // ── PHASES ───────────────────────────────────────────────────────────────
  phases: [
    { weeks: [1,2,3,4],        name: "Foundation",  rpe: "RPE 7",   color: "#FB923C", note: "Build movement patterns. Prioritize form over weight. No ego lifting." },
    { weeks: [5,6,7,8,9,10],   name: "Hypertrophy", rpe: "RPE 8–9", color: "#4ADE80", note: "Primary growth phase. Hit target reps. Progressive overload every week." },
    { weeks: [11,12,13,14],    name: "Strength+",   rpe: "RPE 9",   color: "#F87171", note: "Heavy compound focus. Lower reps, higher intensity. Push personal records." },
    { weeks: [15,16],          name: "Deload",      rpe: "RPE 5–6", color: "#60A5FA", note: "50% volume, same movements. Active recovery — let the gains consolidate.", deload: true },
  ],

  // ── SCHEDULE ─────────────────────────────────────────────────────────────
  // Maps day slot to day key or "rest"
  schedule: {
    1: "mon",  // Push A
    2: "tue",  // Pull A
    3: "wed",  // Legs A
    4: "thu",  // Push B
    5: "fri",  // Pull B
    6: "sat",  // Legs B
    7: "rest",
  },

  // ── DAYS ─────────────────────────────────────────────────────────────────
  days: {

    // ── PUSH A ─────────────────────────────────────────────────────────────
    mon: {
      key: "mon",
      name: "Monday",
      label: "Push A",
      color: "#F87171",
      muscles: "Chest · Shoulders · Triceps · Core",
      warmup: [
        "5 min treadmill walk",
        "Arm circles — 15 each direction",
        "Band pull-aparts — 20 reps",
        "Bench warm-up — 50% × 10, 70% × 5",
        "Push-ups — 15 reps",
      ],
      cardio: "20 min treadmill incline walk — 3.5–4 mph, 3–5% grade, 130–140 BPM. Expands plasma volume. Directly attacks hematocrit.",
      exercises: [
        { exId: "flat-barbell-bench",       sets: 4, targetReps: "5",  increment: 5,   note: "Work to heavy top set — 2 warm-up sets required first" },
        { exId: "incline-db-press",         sets: 4, targetReps: "10", increment: 5,   note: "30–45° incline — full stretch at bottom" },
        { exId: "cable-flyes-mid",          sets: 3, targetReps: "15", increment: 2.5, note: "Cables at lowest setting — squeeze at chest height" },
        { exId: "seated-db-press",          sets: 4, targetReps: "8",  increment: 5,   note: "Back supported — lower to ear height, full press overhead" },
        { exId: "lateral-raises",           sets: 3, targetReps: "15", increment: 2.5, superset: "A", note: "Lead with elbows, slight forward lean" },
        { exId: "rear-delt-flyes",          sets: 3, targetReps: "15", increment: 2.5, superset: "A", note: "Hinge 45°, arms out to side" },
        { exId: "tricep-pushdowns",         sets: 3, targetReps: "12", increment: 2.5, superset: "B", note: "Spread rope at bottom — full extension every rep" },
        { exId: "overhead-tricep-ext-rope", sets: 3, targetReps: "12", increment: 2.5, superset: "B", note: "Full stretch behind head" },
        { exId: "hanging-leg-raises",       sets: 4, targetReps: "12", increment: 0,   bodyweight: true, note: "Raise legs to 90°, control descent" },
        { exId: "cable-crunches",           sets: 3, targetReps: "15", increment: 2.5, note: "Curl spine down — not hips" },
        { exId: "plank-hold",               sets: 3, targetReps: "45s",increment: 0,   bodyweight: true, note: "Squeeze glutes and abs, hips level" },
      ],
    },

    // ── PULL A ─────────────────────────────────────────────────────────────
    tue: {
      key: "tue",
      name: "Tuesday",
      label: "Pull A",
      color: "#60A5FA",
      muscles: "Back · Biceps · Traps · Forearms · Neck",
      warmup: [
        "5 min treadmill walk",
        "Dead hang — 3 × 20 sec",
        "Band pull-aparts — 20 reps",
        "Deadlift warm-up — 40% × 8, 60% × 5, 80% × 3",
        "Cat-cow — 10 reps",
      ],
      cardio: null,
      exercises: [
        { exId: "conventional-deadlift", sets: 4, targetReps: "4",  increment: 10,  note: "Bar over mid-foot, hinge at hips — belt at top sets" },
        { exId: "weighted-pull-ups",     sets: 4, targetReps: "8",  increment: 5,   note: "Full dead hang to chin over bar" },
        { exId: "barbell-rows",          sets: 4, targetReps: "8",  increment: 5,   note: "Hinge 45° — bar to lower chest, overhand grip" },
        { exId: "cable-rows",            sets: 3, targetReps: "12", increment: 5,   note: "Chest up — pull to belly button" },
        { exId: "db-shrugs",             sets: 4, targetReps: "12", increment: 5,   note: "Shrug straight up — hold 1 sec at top" },
        { exId: "barbell-curls",         sets: 3, targetReps: "10", increment: 2.5, superset: "C", note: "Strict — no swing, full extension at bottom" },
        { exId: "hammer-curls",          sets: 3, targetReps: "12", increment: 2.5, superset: "C", note: "Neutral grip, alternating" },
        { exId: "wrist-curls",           sets: 3, targetReps: "15", increment: 2.5, superset: "D", note: "Forearms on bench — full ROM" },
        { exId: "reverse-wrist-curls",   sets: 3, targetReps: "15", increment: 2.5, superset: "D", note: "Overhand grip — prevents elbow pain" },
        { exId: "neck-training",         sets: 3, targetReps: "15", increment: 0,   bodyweight: true, note: "Hand against head — front, back, each side" },
      ],
    },

    // ── LEGS A ─────────────────────────────────────────────────────────────
    wed: {
      key: "wed",
      name: "Wednesday",
      label: "Legs A",
      color: "#4ADE80",
      muscles: "Quads · Glutes · Calves · Core",
      warmup: [
        "5 min bike — easy",
        "Leg swings — 15 front/back each",
        "Hip circles — 10 each direction",
        "Squat warm-up — BW × 15, 40% × 8, 60% × 5",
        "Walking lunges — 10 steps",
      ],
      cardio: "20 min stationary bike — easy resistance, 130–140 BPM. Bike preferred on leg day — zero joint impact.",
      exercises: [
        { exId: "back-squats",           sets: 5, targetReps: "5",  increment: 10, note: "Hip crease below knee — highest testosterone response exercise" },
        { exId: "bulgarian-split-squats",sets: 3, targetReps: "10", increment: 5,  note: "Rear foot on bench — deep stretch each rep" },
        { exId: "leg-press",             sets: 4, targetReps: "12", increment: 10, note: "Full ROM — never lock knees at top" },
        { exId: "leg-extensions",        sets: 3, targetReps: "15", increment: 5,  note: "3-sec eccentric — squeeze at top" },
        { exId: "hip-abduction",         sets: 3, targetReps: "20", increment: 5,  note: "Push knees out — hold 1 sec at top" },
        { exId: "seated-calf-raises",    sets: 4, targetReps: "15", increment: 5,  note: "Full stretch at bottom — pause 1 sec" },
        { exId: "ab-wheel-rollouts",     sets: 4, targetReps: "10", increment: 0,  bodyweight: true, note: "From knees — roll until back flat, pull with abs" },
        { exId: "decline-sit-ups",       sets: 3, targetReps: "15", increment: 0,  bodyweight: true, note: "Slow and controlled — full ROM" },
        { exId: "pallof-press",          sets: 3, targetReps: "12", increment: 2.5,note: "Press out and resist rotation" },
      ],
    },

    // ── PUSH B ─────────────────────────────────────────────────────────────
    thu: {
      key: "thu",
      name: "Thursday",
      label: "Push B",
      color: "#F87171",
      muscles: "Chest · Shoulders · Triceps · Core",
      warmup: [
        "5 min treadmill walk",
        "Band pull-aparts — 25 reps",
        "Incline press warm-up — 50% × 10, 70% × 5",
        "Shoulder rotations — 15 each",
        "Push-ups — 20 reps",
      ],
      cardio: null,
      exercises: [
        { exId: "incline-barbell-bench",      sets: 4, targetReps: "8",  increment: 5,   note: "30–45° incline — upper chest focus" },
        { exId: "flat-db-bench",              sets: 4, targetReps: "10", increment: 5,   note: "Greater ROM than barbell — elbows at 45°" },
        { exId: "db-flyes",                   sets: 3, targetReps: "15", increment: 2.5, note: "Slight bend in elbows — full stretch at bottom" },
        { exId: "arnold-press",               sets: 4, targetReps: "10", increment: 5,   note: "Rotate palms out as you press — hits all 3 delt heads" },
        { exId: "front-raises-cable",         sets: 3, targetReps: "12", increment: 2.5, note: "Alternating — raise to shoulder height" },
        { exId: "cable-lateral-raises",       sets: 4, targetReps: "15", increment: 2.5, note: "Slight forward lean — pinky slightly higher" },
        { exId: "skull-crushers",             sets: 3, targetReps: "12", increment: 2.5, superset: "E", note: "Lower to forehead — elbows stay tucked" },
        { exId: "close-grip-bench",           sets: 3, targetReps: "10", increment: 5,   superset: "E", note: "Same bar immediately after skull crushers" },
        { exId: "cable-pushdowns",            sets: 3, targetReps: "15", increment: 2.5, note: "Elbows pinned — full extension every rep" },
        { exId: "hanging-leg-raises",         sets: 4, targetReps: "15", increment: 0,   bodyweight: true, note: "Knees to chest — lower slowly" },
        { exId: "oblique-crunches",           sets: 3, targetReps: "15", increment: 2.5, note: "Rope sideways — elbow to opposite hip" },
        { exId: "side-plank",                 sets: 3, targetReps: "30s",increment: 0,   bodyweight: true, note: "Body in straight line — hips elevated" },
      ],
    },

    // ── PULL B ─────────────────────────────────────────────────────────────
    fri: {
      key: "fri",
      name: "Friday",
      label: "Pull B",
      color: "#60A5FA",
      muscles: "Back · Biceps · Traps · Neck · Core",
      warmup: [
        "5 min treadmill walk",
        "Dead hang — 3 × 20 sec",
        "Band pull-aparts — 25 reps",
        "Face pull with band — 15 reps",
        "Shoulder dislocates — 10 reps",
      ],
      cardio: "20 min treadmill incline walk — 3.5 mph, 4–6% grade, 130–140 BPM. End-of-week metabolic flush.",
      exercises: [
        { exId: "wide-grip-pull-ups",    sets: 4, targetReps: "6",  increment: 5,   note: "V-taper builder — full dead hang each rep" },
        { exId: "lat-pulldowns",         sets: 4, targetReps: "10", increment: 5,   note: "Pull to upper chest — elbows drive to hips" },
        { exId: "single-arm-db-row",     sets: 4, targetReps: "12", increment: 5,   note: "Row to hip not armpit — full stretch at bottom" },
        { exId: "straight-arm-pulldowns",sets: 3, targetReps: "15", increment: 5,   note: "Arms straight — pull from overhead to thighs" },
        { exId: "face-pulls",            sets: 4, targetReps: "15", increment: 2.5, note: "Pull to forehead — elbows high, rotate out at end" },
        { exId: "barbell-shrugs",        sets: 4, targetReps: "12", increment: 5,   note: "Shrug straight up — hold 1 sec at top" },
        { exId: "incline-db-curls",      sets: 3, targetReps: "10", increment: 2.5, superset: "F", note: "Arms hang fully — maximum long head stretch" },
        { exId: "cable-curls",           sets: 3, targetReps: "15", increment: 2.5, superset: "F", note: "Constant tension through full ROM" },
        { exId: "farmer-carries",        sets: 3, targetReps: "40m",increment: 5,   note: "Heavy dumbbells — walk 40m. Grip, traps, core." },
        { exId: "neck-training",         sets: 3, targetReps: "15", increment: 0,   bodyweight: true, note: "4 directions — front, back, left, right" },
        { exId: "hanging-leg-raises",    sets: 4, targetReps: "12", increment: 0,   bodyweight: true, note: "Straight legs to 90° — no swinging" },
        { exId: "dead-bug",              sets: 3, targetReps: "10", increment: 0,   bodyweight: true, note: "Opposite arm + leg — back stays flat" },
        { exId: "landmine-rotations",    sets: 3, targetReps: "12", increment: 0,   bodyweight: true, note: "Arms straight — rotate side to side" },
      ],
    },

    // ── LEGS B ─────────────────────────────────────────────────────────────
    sat: {
      key: "sat",
      name: "Saturday",
      label: "Legs B",
      color: "#4ADE80",
      muscles: "Hamstrings · Glutes · Calves · Core",
      warmup: [
        "5 min bike",
        "Leg swings — 15 each",
        "Glute bridge — 20 reps BW",
        "RDL warm-up — 40% × 8, 60% × 5",
        "Hip flexor stretch — 30 sec each",
      ],
      cardio: "OPTIONAL HIIT (only if fully recovered): Bike — 20 sec max / 40 sec easy × 15 rounds. Skip if legs are sore.",
      exercises: [
        { exId: "romanian-deadlifts",  sets: 4, targetReps: "8",  increment: 10, note: "Bar stays close — push hips back, feel hamstrings" },
        { exId: "hip-thrusts-barbell", sets: 4, targetReps: "10", increment: 10, note: "Upper back on bench — squeeze glutes hard at top" },
        { exId: "hack-squat",          sets: 3, targetReps: "12", increment: 10, note: "Low foot placement — full depth" },
        { exId: "lying-leg-curls",     sets: 4, targetReps: "12", increment: 5,  note: "Seated preferred — greater hamstring stretch" },
        { exId: "glute-kickbacks",     sets: 3, targetReps: "15", increment: 2.5,note: "Ankle strap — kick straight back, squeeze at top" },
        { exId: "hip-abduction",       sets: 3, targetReps: "20", increment: 5,  note: "Push knees out — hold 1 sec at top" },
        { exId: "standing-calf-raises",sets: 4, targetReps: "15", increment: 5,  superset: "G", note: "Full stretch — pause 2 sec at bottom" },
        { exId: "seated-calf-raises",  sets: 3, targetReps: "15", increment: 5,  superset: "G", note: "Targets soleus — different angle than standing" },
        { exId: "cable-crunches",      sets: 4, targetReps: "15", increment: 2.5,note: "Curl spine — not hips to knees" },
        { exId: "landmine-rotations",  sets: 3, targetReps: "12", increment: 0,  bodyweight: true, note: "Arms straight, rotate side to side" },
        { exId: "plank-hip-dips",      sets: 3, targetReps: "20", increment: 0,  bodyweight: true, note: "Forearm plank — rotate hips to each side" },
      ],
    },

  }, // end days

}, // end adonis-ppl

}; // end PROGRAMS


// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Get current phase for a given week
function getPhase(programId, week) {
  const program = PROGRAMS[programId];
  if (!program) return null;
  return program.phases.find(p => p.weeks.includes(week)) || program.phases[0];
}

// Get the day config for a given program + day key
function getProgramDay(programId, dayKey) {
  const program = PROGRAMS[programId];
  if (!program) return null;
  return program.days[dayKey] || null;
}

// Get all programs matching a goal
function getProgramsByGoal(goal) {
  return Object.values(PROGRAMS).filter(p => p.goal.includes(goal));
}

// Get all active days for a program (non-rest)
function getActiveDays(programId) {
  const program = PROGRAMS[programId];
  if (!program) return [];
  return Object.values(program.schedule)
    .filter(d => d !== "rest")
    .map(d => program.days[d]);
}

// Count total sets in a day
function getDayVolume(programId, dayKey) {
  const day = getProgramDay(programId, dayKey);
  if (!day) return 0;
  return day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
}

// Get all programs available at a given tier
function getProgramsByTier(tier) {
  const tiers = { free: ["free"], pro: ["free","pro"], elite: ["free","pro","elite"] };
  const allowed = tiers[tier] || ["free"];
  return Object.values(PROGRAMS).filter(p => allowed.includes(p.tier));
}

