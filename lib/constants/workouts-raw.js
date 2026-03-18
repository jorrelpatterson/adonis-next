export const WORKOUTS={
  "Fat Loss":[
    {d:"HIIT + Core",dur:45,warmup:"5 min jump rope + dynamic stretches",cooldown:"5 min walk + static stretches",exercises:[
      {name:"Burpees",sets:4,reps:"12",rest:"30s"},{name:"KB Swings",sets:4,reps:"15",rest:"30s"},{name:"Mountain Climbers",sets:3,reps:"30s",rest:"20s"},
      {name:"Box Jumps",sets:3,reps:"10",rest:"30s"},{name:"Plank Hold",sets:3,reps:"45s",rest:"20s"},{name:"Russian Twists",sets:3,reps:"20",rest:"20s"},
      {name:"Dead Bug",sets:3,reps:"12/side",rest:"20s"}]},
    {d:"Steady-State Cardio",dur:40,warmup:"5 min easy pace",cooldown:"5 min walk + foam roll",exercises:[
      {name:"Incline Treadmill Walk (12-15%)",sets:1,reps:"35 min",rest:"—",note:"3.5-4.0 mph, keep HR 130-150"}]},
    {d:"Full Body Circuit",dur:50,warmup:"5 min row + leg swings + arm circles",cooldown:"5 min walk + stretch",exercises:[
      {name:"Goblet Squats",sets:4,reps:"12",rest:"30s"},{name:"Push-ups",sets:4,reps:"15",rest:"30s"},{name:"DB Rows",sets:3,reps:"12/arm",rest:"30s"},
      {name:"Walking Lunges",sets:3,reps:"12/leg",rest:"30s"},{name:"Farmer Carries",sets:3,reps:"40 yds",rest:"45s"},{name:"Plank to Push-up",sets:3,reps:"10",rest:"30s"}]},
    {d:"Active Recovery",dur:30,warmup:"None",cooldown:"None",exercises:[
      {name:"Yoga Flow",sets:1,reps:"15 min",rest:"—"},{name:"Foam Rolling (Full Body)",sets:1,reps:"10 min",rest:"—"},{name:"Light Walk",sets:1,reps:"5 min",rest:"—"}]},
    {d:"HIIT + Upper",dur:45,warmup:"5 min row + band pull-aparts",cooldown:"5 min walk + shoulder stretches",exercises:[
      {name:"Battle Ropes",sets:4,reps:"30s on/30s off",rest:"30s"},{name:"Push Press",sets:4,reps:"10",rest:"45s"},{name:"Pull-ups",sets:4,reps:"8-10",rest:"45s"},
      {name:"Dips",sets:3,reps:"12",rest:"30s"},{name:"Renegade Rows",sets:3,reps:"10/arm",rest:"30s"},{name:"Ball Slams",sets:3,reps:"12",rest:"30s"}]},
    {d:"Lower Body + Cardio",dur:50,warmup:"5 min bike + hip circles + leg swings",cooldown:"5 min walk + hip flexor stretch",exercises:[
      {name:"Trap Bar Deadlifts",sets:4,reps:"8",rest:"60s"},{name:"Step-ups (weighted)",sets:3,reps:"10/leg",rest:"45s"},{name:"Sled Push",sets:4,reps:"30 yds",rest:"60s"},
      {name:"Treadmill Sprints",sets:6,reps:"20s on/40s off",rest:"—"},{name:"Leg Press",sets:3,reps:"12",rest:"45s"},{name:"Calf Raises",sets:3,reps:"15",rest:"30s"}]},
    {d:"Rest",dur:0,warmup:"",cooldown:"",exercises:[]}
  ],
  "Muscle Gain":[
    {d:"Chest & Triceps",dur:60,warmup:"5 min incline walk + band flyes + rotator cuff",cooldown:"5 min chest/tricep stretches",exercises:[
      {name:"Flat Barbell Bench Press",sets:4,reps:"6-8",rest:"90s",note:"Progressive overload — add 5lbs when you hit 4x8"},
      {name:"Incline DB Press",sets:4,reps:"8-10",rest:"75s"},{name:"Cable Flyes (low to high)",sets:3,reps:"12",rest:"60s"},
      {name:"Weighted Dips",sets:3,reps:"8-10",rest:"75s"},{name:"Overhead Tricep Extension (rope)",sets:3,reps:"12",rest:"60s"},
      {name:"Tricep Pushdowns",sets:3,reps:"15",rest:"45s",note:"Drop set on last set"}]},
    {d:"Back & Biceps",dur:60,warmup:"5 min row + band pull-aparts + dead hangs",cooldown:"5 min lat/bicep stretches",exercises:[
      {name:"Conventional Deadlifts",sets:4,reps:"5",rest:"120s",note:"Top set + back-off sets"},
      {name:"Barbell Rows",sets:4,reps:"8",rest:"90s"},{name:"Weighted Pull-ups",sets:4,reps:"6-8",rest:"90s"},
      {name:"Face Pulls",sets:3,reps:"15",rest:"45s"},{name:"Barbell Curls",sets:3,reps:"10",rest:"60s"},
      {name:"Hammer Curls",sets:3,reps:"12",rest:"45s"}]},
    {d:"Legs (Quad Focus)",dur:65,warmup:"5 min bike + leg swings + goblet squat warmup",cooldown:"5 min quad/hip stretch + foam roll",exercises:[
      {name:"Back Squats",sets:5,reps:"5",rest:"120s",note:"5x5 — track weight progression"},
      {name:"Leg Press",sets:4,reps:"10-12",rest:"90s"},{name:"Walking Lunges (DB)",sets:3,reps:"12/leg",rest:"60s"},
      {name:"Leg Extensions",sets:3,reps:"15",rest:"45s",note:"Slow eccentric, squeeze at top"},
      {name:"Standing Calf Raises",sets:4,reps:"15",rest:"45s"},{name:"Seated Calf Raises",sets:3,reps:"20",rest:"30s"}]},
    {d:"Shoulders & Arms",dur:55,warmup:"5 min band work + rotator cuff + light OHP",cooldown:"5 min shoulder/arm stretches",exercises:[
      {name:"Standing OHP",sets:4,reps:"6-8",rest:"90s"},{name:"Lateral Raises",sets:4,reps:"12-15",rest:"45s",note:"Controlled, slight forward lean"},
      {name:"Reverse Pec Deck",sets:3,reps:"15",rest:"45s"},{name:"EZ Bar Curls",sets:3,reps:"10",rest:"60s"},
      {name:"Skull Crushers",sets:3,reps:"10",rest:"60s"},{name:"Incline DB Curls",sets:3,reps:"12",rest:"45s"},
      {name:"Overhead Tricep Extension",sets:3,reps:"12",rest:"45s"}]},
    {d:"Legs (Posterior)",dur:60,warmup:"5 min walk + hip circles + RDL warmup",cooldown:"5 min hamstring/glute stretch",exercises:[
      {name:"Romanian Deadlifts",sets:4,reps:"8",rest:"90s"},{name:"Hip Thrusts (barbell)",sets:4,reps:"10",rest:"75s",note:"Pause 2s at top"},
      {name:"Lying Leg Curls",sets:3,reps:"12",rest:"60s"},{name:"Bulgarian Split Squats",sets:3,reps:"10/leg",rest:"60s"},
      {name:"Glute Kickbacks (cable)",sets:3,reps:"12/leg",rest:"45s"},{name:"Calf Raises (seated)",sets:4,reps:"15",rest:"30s"}]},
    {d:"Upper Power",dur:50,warmup:"5 min row + band pull-aparts + push-up warmup",cooldown:"5 min full upper body stretch",exercises:[
      {name:"Weighted Pull-ups",sets:5,reps:"3-5",rest:"120s",note:"Heavy — max strength"},
      {name:"Incline Barbell Press",sets:4,reps:"5",rest:"120s"},{name:"Heavy Barbell Rows",sets:4,reps:"6",rest:"90s"},
      {name:"DB Arnold Press",sets:3,reps:"8",rest:"75s"},{name:"Weighted Dips",sets:3,reps:"6-8",rest:"90s"}]},
    {d:"Rest",dur:0,warmup:"",cooldown:"",exercises:[]}
  ],
  "Recomposition":[
    {d:"Upper Push",dur:55,warmup:"5 min row + band flyes + rotator cuff",cooldown:"5 min chest/shoulder stretch",exercises:[
      {name:"Flat Bench Press",sets:4,reps:"6-8",rest:"90s"},{name:"Standing OHP",sets:4,reps:"8",rest:"75s"},
      {name:"Incline DB Press",sets:3,reps:"10",rest:"60s"},{name:"Dips",sets:3,reps:"12",rest:"60s"},
      {name:"Lateral Raises",sets:4,reps:"15",rest:"30s"},{name:"Tricep Pushdowns",sets:3,reps:"15",rest:"45s"}]},
    {d:"Lower Strength",dur:55,warmup:"5 min bike + hip circles + goblet squat",cooldown:"5 min lower body stretch + foam roll",exercises:[
      {name:"Back Squats",sets:4,reps:"6",rest:"120s"},{name:"Romanian Deadlifts",sets:4,reps:"8",rest:"90s"},
      {name:"Walking Lunges",sets:3,reps:"10/leg",rest:"60s"},{name:"Leg Press",sets:3,reps:"12",rest:"75s"},
      {name:"Standing Calf Raises",sets:4,reps:"15",rest:"45s"}]},
    {d:"Cardio + Core",dur:40,warmup:"5 min easy jog",cooldown:"5 min walk + stretch",exercises:[
      {name:"Treadmill Intervals",sets:8,reps:"30s sprint / 60s walk",rest:"—"},{name:"Ab Wheel Rollouts",sets:3,reps:"10",rest:"45s"},
      {name:"Hanging Leg Raises",sets:3,reps:"12",rest:"45s"},{name:"Farmer Carries",sets:3,reps:"40 yds",rest:"60s"},
      {name:"Pallof Press",sets:3,reps:"10/side",rest:"30s"}]},
    {d:"Upper Pull",dur:55,warmup:"5 min row + band pull-aparts + dead hangs",cooldown:"5 min lat/bicep stretch",exercises:[
      {name:"Barbell Rows",sets:4,reps:"6-8",rest:"90s"},{name:"Weighted Pull-ups",sets:4,reps:"6-8",rest:"90s"},
      {name:"Face Pulls",sets:3,reps:"15",rest:"45s"},{name:"Rear Delt Flyes",sets:3,reps:"15",rest:"45s"},
      {name:"Barbell Curls",sets:3,reps:"10",rest:"60s"},{name:"Hammer Curls",sets:3,reps:"12",rest:"45s"}]},
    {d:"Lower Hypertrophy",dur:50,warmup:"5 min bike + hip circles + leg swings",cooldown:"5 min stretch + foam roll",exercises:[
      {name:"Hip Thrusts",sets:4,reps:"10",rest:"75s"},{name:"Bulgarian Split Squats",sets:3,reps:"10/leg",rest:"60s"},
      {name:"Lying Leg Curls",sets:3,reps:"12",rest:"60s"},{name:"Leg Extensions",sets:3,reps:"15",rest:"45s"},
      {name:"Seated Calf Raises",sets:4,reps:"20",rest:"30s"}]},
    {d:"Full Body + HIIT",dur:50,warmup:"5 min jump rope + dynamic stretches",cooldown:"5 min walk + full body stretch",exercises:[
      {name:"Barbell Complexes",sets:4,reps:"6 each movement",rest:"90s",note:"Clean → Press → Squat → Row"},
      {name:"KB Swings",sets:4,reps:"15",rest:"30s"},{name:"Thrusters",sets:3,reps:"10",rest:"45s"},
      {name:"Burpees",sets:3,reps:"10",rest:"30s"},{name:"Box Jumps",sets:3,reps:"8",rest:"30s"}]},
    {d:"Rest",dur:0,warmup:"",cooldown:"",exercises:[]}
  ],
  "Aesthetics":[
    {d:"Chest & Delts",dur:55,warmup:"5 min row + band flyes + rotator cuff",cooldown:"5 min chest/shoulder stretch",exercises:[
      {name:"Incline DB Press",sets:4,reps:"8-10",rest:"75s",note:"30° incline — upper chest focus"},
      {name:"Cable Flyes (mid)",sets:3,reps:"12",rest:"60s"},{name:"Machine Chest Press",sets:3,reps:"12",rest:"60s",note:"Squeeze, slow negative"},
      {name:"Standing OHP",sets:3,reps:"8",rest:"75s"},{name:"Lateral Raises",sets:5,reps:"15",rest:"30s",note:"Light weight, high volume for caps"},
      {name:"Front Raises (cable)",sets:3,reps:"12",rest:"45s"}]},
    {d:"Back & Rear Delts",dur:55,warmup:"5 min row + dead hangs + band pull-aparts",cooldown:"5 min lat stretch",exercises:[
      {name:"Wide Grip Pull-ups",sets:4,reps:"8-10",rest:"75s"},{name:"Seated Cable Row (wide)",sets:4,reps:"10",rest:"60s"},
      {name:"Single Arm DB Row",sets:3,reps:"10/arm",rest:"60s"},{name:"Straight Arm Pulldowns",sets:3,reps:"12",rest:"45s"},
      {name:"Face Pulls",sets:4,reps:"15",rest:"30s"},{name:"Reverse Flyes",sets:3,reps:"15",rest:"30s"}]},
    {d:"Legs & Glutes",dur:60,warmup:"5 min bike + hip circles + glute activation",cooldown:"5 min hip/glute stretch + foam roll",exercises:[
      {name:"Back Squats",sets:4,reps:"8",rest:"90s"},{name:"Hip Thrusts",sets:4,reps:"10",rest:"75s",note:"2s pause at top"},
      {name:"Romanian Deadlifts",sets:3,reps:"10",rest:"75s"},{name:"Walking Lunges",sets:3,reps:"12/leg",rest:"60s"},
      {name:"Leg Extensions",sets:3,reps:"15",rest:"45s"},{name:"Calf Raises (standing)",sets:4,reps:"15",rest:"30s"}]},
    {d:"Arms & Abs",dur:45,warmup:"5 min light curls + tricep warmup",cooldown:"5 min arm stretches",exercises:[
      {name:"EZ Bar Curls",sets:4,reps:"10",rest:"60s"},{name:"Close Grip Bench",sets:4,reps:"8-10",rest:"60s"},
      {name:"Incline DB Curls",sets:3,reps:"12",rest:"45s"},{name:"Overhead Tricep Extension",sets:3,reps:"12",rest:"45s"},
      {name:"Cable Crunches",sets:3,reps:"15",rest:"45s"},{name:"Hanging Leg Raises",sets:3,reps:"12",rest:"45s"},
      {name:"Plank Hold",sets:3,reps:"45s",rest:"30s"}]},
    {d:"Shoulders & Back Width",dur:55,warmup:"5 min row + rotator cuff + band work",cooldown:"5 min shoulder/lat stretch",exercises:[
      {name:"Arnold Press",sets:4,reps:"10",rest:"75s"},{name:"Cable Lateral Raises",sets:4,reps:"15",rest:"30s"},
      {name:"Wide Grip Lat Pulldown",sets:4,reps:"10",rest:"60s"},{name:"Chest Supported DB Row",sets:3,reps:"10",rest:"60s"},
      {name:"Upright Rows (cable)",sets:3,reps:"12",rest:"45s"},{name:"Rear Delt Machine",sets:3,reps:"15",rest:"30s"}]},
    {d:"Full Body Pump",dur:50,warmup:"5 min light cardio + dynamic stretches",cooldown:"5 min full body stretch",exercises:[
      {name:"DB Bench Press",sets:3,reps:"15",rest:"45s",note:"Light weight, squeeze contractions"},
      {name:"Lat Pulldowns",sets:3,reps:"15",rest:"45s"},{name:"Leg Press",sets:3,reps:"15",rest:"45s"},
      {name:"Lateral Raise Superset → Front Raise",sets:3,reps:"12+12",rest:"30s"},{name:"Curls Superset → Pushdowns",sets:3,reps:"12+12",rest:"30s"},
      {name:"Cable Crunches",sets:3,reps:"15",rest:"30s"}]},
    {d:"Rest",dur:0,warmup:"",cooldown:"",exercises:[]}
  ],
};
WORKOUTS["Anti-Aging"]=[
  {d:"Resistance Training A",dur:45,warmup:"5 min walk + dynamic stretches + light warmup sets",cooldown:"5 min stretch + foam roll",exercises:[
    {name:"Goblet Squats",sets:3,reps:"10",rest:"60s"},{name:"Flat DB Bench Press",sets:3,reps:"10",rest:"60s"},
    {name:"Cable Rows",sets:3,reps:"12",rest:"60s"},{name:"DB Lunges",sets:3,reps:"10/leg",rest:"60s"},
    {name:"Face Pulls",sets:3,reps:"15",rest:"45s"}]},
  {d:"Zone 2 Cardio",dur:40,warmup:"5 min easy pace",cooldown:"5 min cool down walk",exercises:[
    {name:"Incline Treadmill Walk or Cycling",sets:1,reps:"35 min",rest:"—",note:"HR 120-140 bpm, conversational pace"}]},
  {d:"Mobility & Yoga",dur:40,warmup:"None",cooldown:"None",exercises:[
    {name:"Sun Salutations",sets:1,reps:"5 rounds",rest:"—"},{name:"Hip Opener Flow",sets:1,reps:"10 min",rest:"—"},
    {name:"Thoracic Spine Mobility",sets:1,reps:"5 min",rest:"—"},{name:"Balance Work (single leg)",sets:3,reps:"30s/leg",rest:"—"},
    {name:"Deep Breathing & Savasana",sets:1,reps:"5 min",rest:"—"}]},
  {d:"Resistance Training B",dur:45,warmup:"5 min walk + dynamic stretches + light warmup sets",cooldown:"5 min stretch + foam roll",exercises:[
    {name:"Trap Bar Deadlifts",sets:3,reps:"8",rest:"75s"},{name:"Standing DB OHP",sets:3,reps:"10",rest:"60s"},
    {name:"Pull-ups (assisted if needed)",sets:3,reps:"8",rest:"60s"},{name:"Farmer Carries",sets:3,reps:"40 yds",rest:"60s"},
    {name:"Plank Hold",sets:3,reps:"30s",rest:"30s"}]},
  {d:"Zone 2 Cardio",dur:40,warmup:"5 min easy pace",cooldown:"5 min cool down",exercises:[
    {name:"Swimming, Rowing, or Elliptical",sets:1,reps:"35 min",rest:"—",note:"HR 120-140 bpm, steady effort"}]},
  {d:"Active Recovery",dur:30,warmup:"None",cooldown:"None",exercises:[
    {name:"Gentle Yoga Flow",sets:1,reps:"15 min",rest:"—"},{name:"Foam Rolling (Full Body)",sets:1,reps:"10 min",rest:"—"},
    {name:"Light Walk",sets:1,reps:"5 min",rest:"—"}]},
  {d:"Rest",dur:0,warmup:"",cooldown:"",exercises:[]}
];
WORKOUTS["Cognitive"]=WORKOUTS["Anti-Aging"];
WORKOUTS["Hormonal"]=WORKOUTS["Recomposition"];
WORKOUTS["Wellness"]=WORKOUTS["Anti-Aging"];
WORKOUTS["Weight Loss"]=WORKOUTS["Fat Loss"];
WORKOUTS["Recovery"]=WORKOUTS["Anti-Aging"];

export const EXERCISE_DB={
  "Flat Barbell Bench Press":{muscles:"Chest, front delts, triceps",form:"Retract shoulder blades, arch slightly, grip 1.5x shoulder width. Lower bar to mid-chest, pause, drive up. Feet flat. Don't bounce off chest.",tips:"Breathe in on the way down, exhale pressing up. Spotter recommended for heavy sets.",level:"intermediate"},
  "Incline DB Press":{muscles:"Upper chest, front delts, triceps",form:"Set bench to 30-45°. Elbows at 45°, not flared. Press up in slight arc, bring DBs together at top without clanking.",tips:"Start lighter than flat bench. 30° hits upper chest best — steeper angles shift to shoulders.",level:"beginner"},
  "Cable Flyes (low to high)":{muscles:"Upper chest, inner chest",form:"Set cables low. Slight bend in elbows, sweep arms up and together in a hugging motion. Squeeze at top.",tips:"Constant tension throughout. Don't go too heavy — this is an isolation move.",level:"beginner"},
  "Weighted Dips":{muscles:"Lower chest, triceps, front delts",form:"Lean forward 15-30° for chest emphasis. Lower until upper arms parallel to floor. Drive up without locking elbows.",tips:"Upright = more triceps. Leaning forward = more chest. Add weight with belt or DB between feet.",level:"intermediate"},
  "Overhead Tricep Extension":{muscles:"Triceps (long head)",form:"Hold rope/DB overhead, elbows close to ears. Lower behind head, extend fully. Keep upper arms stationary.",tips:"The long head of the triceps is stretched most in the overhead position — critical for mass.",level:"beginner"},
  "Tricep Pushdowns":{muscles:"Triceps (lateral head)",form:"Elbows pinned to sides. Push rope/bar down to full extension, squeeze at bottom. Slow negative.",tips:"Don't let elbows drift forward. Keep torso upright. Try different attachments (rope, V-bar, straight bar).",level:"beginner"},
  "Conventional Deadlifts":{muscles:"Entire posterior chain — hamstrings, glutes, erectors, traps, lats, grip",form:"Bar over mid-foot, hip-width stance. Hinge at hips, flat back, grip just outside knees. Drive through floor, lock out hips at top.",tips:"The deadlift is a hinge, not a squat. Keep bar close to body (drag up shins). Don't round lower back. Belt recommended for heavy sets.",level:"advanced"},
  "Barbell Rows":{muscles:"Mid/upper back, lats, biceps, rear delts",form:"Hinge 45-60°, pull bar to lower chest. Squeeze shoulder blades at top. Control the negative.",tips:"Don't use momentum. If you're jerking the weight, go lighter. Overhand grip = more upper back, underhand = more lats/biceps.",level:"intermediate"},
  "Weighted Pull-ups":{muscles:"Lats, biceps, rear delts, forearms",form:"Full dead hang start, pull chin over bar. Shoulder blades down and back. Control descent.",tips:"If you can't do 8 bodyweight, don't add weight yet. Use a belt or hold DB between feet for load.",level:"advanced"},
  "Face Pulls":{muscles:"Rear delts, rotator cuff, mid traps",form:"Set cable at face height. Pull rope to face, externally rotate at end (fists up by ears). Squeeze rear delts.",tips:"Essential for shoulder health. Do these every upper body day. Light weight, high reps, feel the squeeze.",level:"beginner"},
  "Barbell Curls":{muscles:"Biceps (short and long head)",form:"Shoulder-width grip, elbows pinned. Curl to top, squeeze, slow negative. Don't swing.",tips:"EZ bar is easier on wrists. Strict form > heavy weight for biceps.",level:"beginner"},
  "Hammer Curls":{muscles:"Brachialis, brachioradialis, biceps",form:"Neutral grip (palms facing each other). Curl up, no rotation. Keep elbows stationary.",tips:"Builds the 'thick arm' look from the front. The brachialis pushes the biceps peak higher.",level:"beginner"},
  "Back Squats":{muscles:"Quads, glutes, hamstrings, core, erectors",form:"Bar on upper traps (high bar) or rear delts (low bar). Feet shoulder-width, toes slightly out. Descend until hip crease below knee. Drive up through mid-foot.",tips:"Keep chest up, knees tracking over toes. Don't let knees cave. Belt recommended for heavy sets. Squat shoes help depth.",level:"advanced"},
  "Leg Press":{muscles:"Quads, glutes, hamstrings",form:"Feet shoulder-width on platform. Lower sled until knees at 90°. Press through heels. Don't lock knees at top.",tips:"Feet high = more hamstring/glute. Feet low = more quad. Never let lower back round off the pad.",level:"beginner"},
  "Walking Lunges":{muscles:"Quads, glutes, hamstrings, balance",form:"Big step forward, lower until back knee nearly touches floor. Front knee over ankle. Drive through front heel.",tips:"Keep torso upright. Longer stride = more glute. Shorter stride = more quad. Hold DBs at sides.",level:"beginner"},
  "Leg Extensions":{muscles:"Quads (isolation)",form:"Pad on lower shins. Extend legs fully, squeeze quads at top for 1-2s. Slow negative (3-4s).",tips:"Go lighter than you think. The squeeze at the top is what builds the quad sweep. Don't lock out aggressively.",level:"beginner"},
  "Standing Calf Raises":{muscles:"Gastrocnemius (calves)",form:"Full stretch at bottom, explosive drive up, 2s hold at top. Straight legs throughout.",tips:"Calves need high reps and full range of motion. Don't bounce — pause at bottom stretch and top contraction.",level:"beginner"},
  "Romanian Deadlifts":{muscles:"Hamstrings, glutes, erectors",form:"Start from standing, hinge at hips pushing butt back. Slight knee bend, bar slides down thighs. Stop when you feel hamstring stretch. Drive hips forward to return.",tips:"Think 'push your butt to the wall behind you.' Keep bar close to body. Feel the stretch in hamstrings, not lower back.",level:"intermediate"},
  "Hip Thrusts":{muscles:"Glutes (primary), hamstrings",form:"Upper back on bench, feet flat. Drive hips up until body is straight from knees to shoulders. Squeeze glutes hard at top for 2s. Lower controlled.",tips:"The single best glute exercise. Chin tucked, eyes forward (not up at ceiling). Use pad for heavy barbell.",level:"intermediate"},
  "Standing OHP":{muscles:"Front delts, lateral delts, triceps, core",form:"Strict press from front of shoulders to lockout overhead. Elbows slightly in front of bar. Brace core hard.",tips:"Full body brace — squeeze glutes and abs. Push head through at top. This builds real shoulder strength.",level:"intermediate"},
  "Lateral Raises":{muscles:"Lateral delts (side caps)",form:"Slight bend in elbows, raise to shoulder height. Lean slightly forward. Pinky up at top for more lateral delt.",tips:"Light weight, high volume. 15-20 reps. This is the exercise that builds the wide-shoulder V-taper look.",level:"beginner"},
  "Burpees":{muscles:"Full body — chest, shoulders, quads, core, cardio",form:"Squat down, hands on floor, jump feet back to plank, push-up, jump feet to hands, explosive jump up.",tips:"Modify by stepping back instead of jumping if needed. The push-up is optional for speed focus.",level:"beginner"},
  "KB Swings":{muscles:"Glutes, hamstrings, core, shoulders, grip",form:"Hinge at hips, swing bell between legs, snap hips forward to drive bell to chest height. Arms are just along for the ride.",tips:"Power comes from hips, not arms. It's a hip hinge, not a squat. Keep core tight throughout.",level:"intermediate"},
  "Mountain Climbers":{muscles:"Core, hip flexors, shoulders, cardio",form:"Plank position, drive knees to chest alternating. Keep hips level — don't let butt pike up.",tips:"Faster = more cardio. Slower = more core. Keep shoulders over wrists.",level:"beginner"},
  "Box Jumps":{muscles:"Quads, glutes, calves, explosiveness",form:"Stand facing box. Swing arms back, explode up, land softly with both feet fully on box. Stand up, step down.",tips:"Step down, don't jump down (saves your achilles). Start with a lower box and increase height as you improve.",level:"intermediate"},
  "Plank Hold":{muscles:"Core (transverse abdominis, rectus abdominis, obliques)",form:"Forearms and toes on ground. Body in straight line from head to heels. Squeeze glutes and brace abs.",tips:"Don't let hips sag or pike. Breathe normally. If shaking, you're working. Progress by adding time.",level:"beginner"},
  "Russian Twists":{muscles:"Obliques, core",form:"Sit with knees bent, lean back 45°. Rotate torso side to side, touching weight to floor each side.",tips:"Hold a plate, DB, or medicine ball. Feet up = harder. Feet down = easier. Controlled rotation, not fast swinging.",level:"beginner"},
  "Goblet Squats":{muscles:"Quads, glutes, core",form:"Hold DB/KB at chest. Squat deep — elbows between knees at bottom. Drive up through heels.",tips:"The best squat variation for beginners. The front load forces good posture. Great for warming up too.",level:"beginner"},
  "Push-ups":{muscles:"Chest, front delts, triceps, core",form:"Hands shoulder-width, body in straight line. Lower chest to floor, push up to lockout.",tips:"Hands wider = more chest. Hands narrow = more triceps. Diamond push-ups for maximum tricep work.",level:"beginner"},
  "DB Rows":{muscles:"Lats, mid back, biceps, rear delts",form:"One hand and knee on bench, other hand holding DB. Pull to hip, squeeze lat at top. Slow negative.",tips:"Don't rotate torso. Think about pulling your elbow to your hip, not lifting the weight.",level:"beginner"},
  "Farmer Carries":{muscles:"Grip, traps, core, shoulders, full body",form:"Pick up heavy DBs/KBs. Walk with tall posture, shoulders back, core braced. Don't lean to either side.",tips:"Grip strength transfer to every other lift. Go heavy. Pinch shoulder blades back. Walk for distance or time.",level:"beginner"},
  "Pull-ups":{muscles:"Lats, biceps, rear delts",form:"Dead hang start, pull chin over bar. Wide grip = more lat width. Narrow grip = more bicep involvement.",tips:"Can't do one? Use assisted machine or band. Negative-only (jump up, lower slowly) builds strength fast.",level:"intermediate"},
  "Battle Ropes":{muscles:"Shoulders, arms, core, cardio",form:"Feet shoulder-width, slight squat. Alternate arms making waves in the rope. Keep waves going to the anchor.",tips:"Different patterns: alternating, double slam, side waves. 20-30 second bursts with equal rest.",level:"beginner"},
  "Sled Push":{muscles:"Quads, glutes, calves, shoulders, core",form:"Hands high or low on sled. Drive through legs, staying low. Short powerful steps.",tips:"Hands high = more upright. Hands low = more forward lean and quad drive. Great for leg drive without spinal loading.",level:"beginner"},
  "Trap Bar Deadlifts":{muscles:"Quads, glutes, hamstrings, traps, grip",form:"Step inside bar, grip neutral handles. Hinge and grip, drive through floor. More quad-dominant than conventional.",tips:"Safer than conventional deadlifts for beginners. Neutral grip is easier on shoulders and biceps. Great for heavy pulling.",level:"intermediate"},
  "Ab Wheel Rollouts":{muscles:"Core, lats, shoulders",form:"Kneel on pad, grip wheel. Roll out slowly maintaining flat back. Pull back using abs. Don't let lower back arch.",tips:"Start from knees. Only advance to standing rollouts when you can do 15+ from knees with perfect form.",level:"intermediate"},
  "Hanging Leg Raises":{muscles:"Lower abs, hip flexors, grip",form:"Dead hang from pull-up bar. Raise legs to 90° or higher. Control the descent — no swinging.",tips:"Bend knees for easier version. Straight legs and toes-to-bar is the advanced version. Core must initiate the movement.",level:"intermediate"},
  "Incline Treadmill Walk (12-15%)":{muscles:"Glutes, hamstrings, calves, cardiovascular",form:"Set incline to 12-15%, speed 3.0-4.0 mph. Walk — don't hold the rails. Upright posture, swing arms naturally.",tips:"This is the secret weapon for fat loss. Low impact, high calorie burn, doesn't interfere with leg recovery. Hold a vest for extra load.",level:"beginner"},
  "Yoga Flow":{muscles:"Full body flexibility, mobility, balance",form:"Flow through poses — downward dog, warrior series, pigeon, child's pose. Hold each 5-10 breaths. Focus on breathing.",tips:"Not about flexibility — it's about controlled movement and breath. YouTube 'yoga for athletes' for great routines.",level:"beginner"},
  "Foam Rolling (Full Body)":{muscles:"Fascia release, all muscle groups",form:"Roll each muscle group for 30-60s. When you find a tender spot, hold for 10-15s. Don't roll directly on bones or joints.",tips:"Roll quads, hamstrings, IT band, calves, lats, upper back. Hurts at first but gets better. Daily rolling improves recovery.",level:"beginner"},
  "Arnold Press":{muscles:"All three delt heads, triceps",form:"Start with palms facing you at shoulder height. Press up while rotating palms to face forward at top. Reverse on the way down.",tips:"The rotation hits all three delt heads in one movement. Lighter weight than standard OHP. Great for shoulder development.",level:"intermediate"},
  "EZ Bar Curls":{muscles:"Biceps, forearms",form:"Grip the angled portions of the EZ bar. Curl to top, squeeze, slow negative. Keep elbows at sides.",tips:"The angled grip reduces wrist strain compared to straight bar. Perfect for heavy curl work.",level:"beginner"},
  "Skull Crushers":{muscles:"Triceps (all three heads)",form:"Lie on bench, lower EZ bar/DBs toward forehead. Elbows pointing up, not flaring. Extend to lockout.",tips:"Lower to forehead (not actually crushing your skull). Slight backward angle at the top increases stretch on the long head.",level:"intermediate"},
  "Bulgarian Split Squats":{muscles:"Quads, glutes, balance",form:"Rear foot elevated on bench. Lower until front thigh parallel. Drive through front heel. Keep torso upright.",tips:"Hard but incredibly effective. Hold DBs at sides for load. Further foot = more glute. Closer foot = more quad.",level:"intermediate"},
  "Close Grip Bench":{muscles:"Triceps, inner chest",form:"Hands shoulder-width or slightly narrower on barbell. Lower to lower chest. Elbows tucked. Press up to lockout.",tips:"Don't go too narrow — shoulder-width is plenty. This is a heavy tricep builder, not just an isolation exercise.",level:"intermediate"},
  "Cable Crunches":{muscles:"Rectus abdominis (six-pack)",form:"Kneel at cable with rope behind head. Crunch down bringing elbows toward knees. Squeeze abs hard at bottom. Slow return.",tips:"Don't pull with arms — they're just holding the rope. All movement should come from your abs contracting.",level:"beginner"},
  "Treadmill Sprints":{muscles:"Full body cardiovascular, quads, hamstrings",form:"Sprint for 20-30 seconds, then walk/rest for 40-60 seconds. Repeat 6-10 rounds.",tips:"Warm up for 5 minutes first. Start with longer rest periods and shorter sprints if you're new to HIIT.",level:"intermediate"},
  "Renegade Rows":{muscles:"Core, lats, biceps, shoulders",form:"Push-up position on DBs. Row one DB to hip while stabilizing on the other. Alternate sides. No hip rotation.",tips:"Feet wider = more stable. Lighter weights than normal rows — the anti-rotation core demand is high.",level:"intermediate"},
  "Ball Slams":{muscles:"Full body — lats, core, shoulders",form:"Lift medicine ball overhead, slam it into the ground as hard as possible. Catch on bounce, repeat.",tips:"Great stress reliever. Full extension overhead, then violent hip hinge to slam. Dead balls (no bounce) are harder.",level:"beginner"},
  "Step-ups":{muscles:"Quads, glutes, balance",form:"Step up onto box/bench with one foot. Drive through heel. Stand fully upright. Step down controlled. All reps one leg, then switch.",tips:"Don't push off the back foot — use the top leg to do the work. Higher box = more glute. Hold DBs for load.",level:"beginner"},
  "Dead Bug":{muscles:"Core, hip flexors",form:"Lie on back, arms up, knees 90°. Extend opposite arm and leg toward floor. Return. Alternate. Lower back stays flat on floor.",tips:"If your back arches off the floor, you've gone too far. Regress to just legs or just arms until you build strength.",level:"beginner"},
  "Barbell Complexes":{muscles:"Full body — clean, press, squat, row all in one set",form:"Without putting bar down: power clean → front press → front squat → barbell row. That's one rep.",tips:"Use lighter weight than your weakest lift. This is metabolic conditioning, not strength work. 6 reps of each movement.",level:"advanced"},
  "Thrusters":{muscles:"Quads, glutes, shoulders, triceps, core",form:"Front squat into overhead press in one fluid motion. Bar at shoulders, squat down, drive up and press overhead.",tips:"The most efficient total-body barbell movement. Uses momentum from the squat to help the press. Great for conditioning.",level:"intermediate"},
  "Sun Salutations":{muscles:"Full body flexibility, shoulders, hips, hamstrings",form:"Mountain pose → forward fold → half lift → plank → chaturanga → upward dog → downward dog → step forward → rise. Flow with breath.",tips:"One round = one breath per movement. Do 5-10 rounds as a warmup or mobility session. The foundation of all yoga practice.",level:"beginner"},
  "Pallof Press":{muscles:"Core (anti-rotation), obliques",form:"Stand sideways to cable. Hold handle at chest. Press out straight, hold 2-3 seconds. Return. Don't let cable pull you into rotation.",tips:"Resist rotation — that's the whole point. Harder versions: stand on one leg, or hold the press longer. Great for spine health.",level:"beginner"},
  "Lat Pulldowns":{muscles:"Lats, biceps, rear delts",form:"Grip wider than shoulders. Pull bar to upper chest, squeezing shoulder blades. Lean back slightly. Slow negative.",tips:"Think about pulling elbows down and back, not pulling with hands. Full stretch at top, full squeeze at bottom.",level:"beginner"},
  "Seated Calf Raises":{muscles:"Soleus (deep calf)",form:"Knees under pad, balls of feet on platform. Lower heels for full stretch, drive up for full contraction. Hold 2s at top.",tips:"Standing targets gastrocnemius, seated targets soleus. Both needed for complete calf development.",level:"beginner"},
  "Light Walk":{muscles:"Active recovery, cardiovascular",form:"Easy walking pace. Focus on breathing and posture. Can be outdoor or on treadmill.",tips:"10-20 minutes post-workout or on rest days. Aids recovery by promoting blood flow without adding stress.",level:"beginner"},
  "Straight Arm Pulldowns":{muscles:"Lats (isolation), teres major",form:"Stand at cable, arms straight. Push bar down to thighs in an arc. Feel lats stretch at top, squeeze at bottom.",tips:"Great mind-muscle connection exercise for lats. Light weight, feel every rep. Perfect for lat activation pre-pullups.",level:"beginner"},
  "Upright Rows (cable)":{muscles:"Lateral delts, traps, biceps",form:"Grip cable close, pull to chin height. Elbows lead — go up, not back. Keep bar close to body.",tips:"Cable version is easier on shoulders than barbell. Don't go above chin — higher increases impingement risk.",level:"intermediate"},
  "Single Arm DB Row":{muscles:"Lats, mid back, biceps, rear delts",form:"One hand on bench, opposite foot back. Pull DB to hip. Squeeze back at top. Full stretch at bottom.",tips:"Don't rotate torso. Let shoulder blade protract at bottom for full ROM, retract at top for full contraction.",level:"beginner"},
  "Incline Barbell Press":{muscles:"Upper chest, front delts, triceps",form:"Bench at 30-45°. Unrack, lower to upper chest, press to lockout. Same technique as flat bench with incline.",tips:"30° gives best upper chest activation without shifting to shoulders. Go slightly lighter than flat bench.",level:"intermediate"},
  "Reverse Flyes":{muscles:"Rear delts, mid traps, rhomboids",form:"Bent over or on incline bench. Arms slightly bent, raise to sides. Squeeze shoulder blades. Slow negative.",tips:"Critical for posture and shoulder health. Light weight, high reps. Do these every upper body session.",level:"beginner"},
  "Chest Supported DB Row":{muscles:"Mid back, lats, rear delts",form:"Lie face down on incline bench. Row DBs to hips. Squeeze back at top. No body english possible.",tips:"Eliminates cheating — pure back work. Great for people who tend to use momentum on rows.",level:"beginner"},
  "Rear Delt Machine":{muscles:"Rear delts, mid traps",form:"Handles at chest height. Open arms to sides, squeezing rear delts. Control the return.",tips:"Most people's weakest shoulder head. Building rear delts improves posture and shoulder health.",level:"beginner"},
  "Glute Kickbacks (cable)":{muscles:"Glutes (isolation)",form:"Ankle strap on cable. Kick leg straight back. Squeeze glute at top. Don't arch back.",tips:"Keep core braced. Small controlled movement. Feel the glute working, not the lower back.",level:"beginner"},
  "Lying Leg Curls":{muscles:"Hamstrings (isolation)",form:"Lie face down, pad behind ankles. Curl toward butt. Squeeze at top. Slow negative.",tips:"Don't let hips come off pad. Point toes for more hamstring, flex toes for more calf involvement.",level:"beginner"},
  "Push Press":{muscles:"Shoulders, triceps, legs (momentum)",form:"Like OHP but with a slight knee dip and drive to help the bar off shoulders. Lock out overhead.",tips:"Use leg drive to get past the sticking point. You can handle 10-20% more weight than strict press.",level:"intermediate"},
  "Machine Chest Press":{muscles:"Chest, front delts, triceps",form:"Set seat so handles are at mid-chest. Press forward, squeeze at top. Slow negative.",tips:"Great for beginners or end-of-workout when stabilizers are fatigued. Focus on the squeeze, not the weight.",level:"beginner"},
  "Front Raises (cable)":{muscles:"Front delts",form:"Cable behind you at low setting. Raise arm to shoulder height with slight elbow bend. Lower controlled.",tips:"Front delts get a lot of work from pressing. Only add front raises if you want extra front delt development.",level:"beginner"},
  "Wide Grip Pull-ups":{muscles:"Lats (width emphasis), biceps",form:"Grip 1.5x shoulder width. Pull chin over bar. Focus on pulling elbows down to sides.",tips:"Wider grip = more lat width focus. If too hard, use assisted machine or band.",level:"intermediate"},
  "Seated Cable Row (wide)":{muscles:"Mid back, rear delts, lats",form:"Wide grip attachment. Pull to lower chest. Squeeze shoulder blades. Sit upright, no leaning back.",tips:"Wide grip shifts emphasis from lats to mid-back and rear delts. Perfect complement to pull-ups.",level:"beginner"},
  "Wide Grip Lat Pulldown":{muscles:"Lats (width), biceps, teres major",form:"Grip outside shoulder marks. Pull to upper chest. Lean back slightly. Full stretch at top.",tips:"Wider grip isn't always better — if you can't feel your lats, go slightly narrower.",level:"beginner"},
  "Cable Lateral Raises":{muscles:"Lateral delts",form:"Cable at lowest setting, behind body. Raise to shoulder height. Constant tension throughout.",tips:"Cable version maintains tension at the bottom of the rep where DBs have zero resistance. Superior stimulus.",level:"beginner"},
  "DB Bench Press":{muscles:"Chest, front delts, triceps",form:"Same as barbell but with greater ROM. Lower DBs to chest, press up. Touch at top. Full stretch at bottom.",tips:"Greater range of motion than barbell. Better for shoulder health. Can't go as heavy but better muscle activation.",level:"beginner"},
  "Incline DB Curls":{muscles:"Biceps (long head emphasis)",form:"Set bench to 45-60°. Arms hanging straight down. Curl up without swinging. Full stretch at bottom.",tips:"The incline stretches the long head of the biceps — this builds the peak. Don't swing. Slow negatives.",level:"beginner"},
};
// Exercise alternatives for swapping
export const EXERCISE_ALTS={
  "Flat Barbell Bench Press":["DB Bench Press","Machine Chest Press","Push-ups","Floor Press"],
  "Incline DB Press":["Incline Barbell Press","Incline Machine Press","Landmine Press"],
  "Weighted Pull-ups":["Lat Pulldowns","Assisted Pull-ups","Inverted Rows","Band Pull-ups"],
  "Pull-ups":["Lat Pulldowns","Assisted Pull-ups","Inverted Rows"],
  "Conventional Deadlifts":["Trap Bar Deadlifts","Romanian Deadlifts","Sumo Deadlifts","Rack Pulls"],
  "Back Squats":["Goblet Squats","Leg Press","Front Squats","Hack Squat"],
  "Barbell Rows":["DB Rows","Cable Rows","Chest Supported DB Row","T-Bar Rows"],
  "Standing OHP":["Seated DB Press","Machine Shoulder Press","Arnold Press"],
  "Weighted Dips":["Close Grip Bench","Tricep Pushdowns","Machine Dip"],
  "Barbell Curls":["EZ Bar Curls","DB Curls","Cable Curls","Hammer Curls"],
  "Romanian Deadlifts":["Lying Leg Curls","Good Mornings","Cable Pull-throughs"],
  "Hip Thrusts":["Glute Bridges","Cable Kickbacks","Reverse Lunges"],
  "Walking Lunges":["Bulgarian Split Squats","Step-ups","Reverse Lunges"],
  "Skull Crushers":["Overhead Tricep Extension","Tricep Pushdowns","Close Grip Bench"],
  "Battle Ropes":["KB Swings","Burpees","Ball Slams","Jump Rope"],
  "Box Jumps":["Step-ups","Jump Squats","Broad Jumps"],
  "Sled Push":["Farmer Carries","Walking Lunges","Cycling Sprints"],
  "Treadmill Sprints":["Cycling Sprints","Rowing Sprints","Jump Rope Intervals"],
  "Ab Wheel Rollouts":["Plank Hold","Dead Bug","Cable Crunches"],
  "Incline Treadmill Walk (12-15%)":["Stair Climber","Outdoor Hill Walk","Stationary Bike"],
  "Trap Bar Deadlifts":["Conventional Deadlifts","Leg Press","Goblet Squats"],
  "Farmer Carries":["Suitcase Carries","Overhead Carries","Trap Bar Carries"],
  "Face Pulls":["Reverse Flyes","Band Pull-aparts","Rear Delt Machine"],
  "Lateral Raises":["Cable Lateral Raises","Machine Lateral Raises","Leaning Lateral Raises"],
  "Leg Press":["Back Squats","Goblet Squats","Hack Squat"],
  "Leg Extensions":["Sissy Squats","Wall Sits","Front Squats"],
  "Bulgarian Split Squats":["Walking Lunges","Reverse Lunges","Single Leg Press"],
};
export const getVideoUrl=(name)=>"https://www.youtube.com/results?search_query="+encodeURIComponent(name+" proper form tutorial");

