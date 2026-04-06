export const WORKOUTS = {
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

export const GOAL_ALIASES = {
  "Cognitive": "Anti-Aging",
  "Hormonal": "Recomposition",
  "Wellness": "Anti-Aging",
  "Weight Loss": "Fat Loss",
  "Recovery": "Anti-Aging"
};

export function getProgram(goal) {
  const resolved = GOAL_ALIASES[goal] || goal;
  return WORKOUTS[resolved] || WORKOUTS["Anti-Aging"];
}
