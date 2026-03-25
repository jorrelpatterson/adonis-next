// ─────────────────────────────────────────────────────────────────────────────
// Adonis Master Exercise Catalog — exercises.js
// v1.0 | Session 1 | 112 exercises | 65 with full instructions
//
// Usage in app.html:
//   <script src="/lib/exercises.js"></script>
//   Then reference: EXERCISES["bench-press"], EXERCISES["rdl"], etc.
//
// Each exercise:
//   id           — unique slug
//   name         — display name
//   muscles      — primary muscles worked
//   muscleGroup  — category for filtering (chest, back, quads, etc.)
//   category     — compound | isolation | core | cardio | mobility
//   swapGroup    — exercises in the same swapGroup are valid substitutes
//   equipment    — barbell | dumbbell | cable | machine | bodyweight | other
//   instructions — full how-to card (equipment, setup, execution, cues, mistakes)
//                  OR stub text where full instructions are not yet written
// ─────────────────────────────────────────────────────────────────────────────

const INSTRUCTIONS = {
  "bench-press":{
    equipment:"Barbell, flat bench, squat rack or bench press station",
    setup:"Set the bar at a height you can unrack with slightly bent arms. Lie flat with eyes directly under the bar. Plant feet flat on the floor. Grip the bar just outside shoulder-width — thumbs wrapped around the bar, not a false grip.",
    execution:["Unrack and hold the bar directly over your chest with arms locked","Take a breath in, brace your core and upper back hard","Lower the bar in a slight arc toward your lower chest — elbows at about 45° to your torso, not flared out","Touch the bar lightly to your chest — do not bounce","Drive the bar back up and slightly back toward the rack, exhaling as you push","Lock out at the top and repeat"],
    cues:["Squeeze the bar like you're trying to bend it — activates lats and keeps elbows stable","Drive your feet into the floor throughout the lift","Keep your shoulder blades pinched together and pulled down — do not let them roll forward","Bar path is a slight diagonal, not straight up"],
    mistakes:["Flaring elbows to 90° — puts enormous stress on shoulder joint","Bouncing the bar off chest — removes tension and risks injury","Lifting hips off bench — reduces stability and range of motion","Narrow grip that puts wrists in a bent position"],
  },
  "incline-db-press":{
    equipment:"Two dumbbells, adjustable bench set to 30–45 degrees",
    setup:"Set the bench to 30–45°. Sit at the bottom of the bench with dumbbells resting on your knees. Use a knee kick to pop each dumbbell up as you lie back. Dumbbells at chest level, palms facing forward, elbows at roughly 45°.",
    execution:["Press both dumbbells up and together until arms are almost locked — do not clank them at the top","Lower slowly over 2–3 seconds, allowing a full stretch at the bottom where you feel the upper chest load","Stop when elbows are roughly in line with your torso — do not drop below that","Press back up, squeezing the chest at the top"],
    cues:["Think about driving your elbows together rather than just pushing the weight up","Feel the stretch in your upper chest and front delt at the bottom","Keep wrists stacked directly over elbows throughout"],
    mistakes:["Bench angle too high — above 45° turns it into a shoulder press not chest","Going too heavy and losing the stretch at the bottom","Letting the dumbbells drift too wide on the descent"],
  },
  "cable-fly":{
    equipment:"Cable machine with D-handles, cables set at the lowest pulley position",
    setup:"Attach D-handles to both low pulleys. Stand in the center of the cable station, one foot slightly forward for balance. Hold both handles with a slight bend in elbows — maintain that bend throughout. Lean forward very slightly from the hips.",
    execution:["Start with hands low and wide, feeling a stretch in your chest","Bring both hands up and together in an arc — as if you're hugging a giant tree","Hands meet in front of your sternum at about chest height","Squeeze the chest hard at the peak for one second","Lower back slowly — feel the stretch as cables pull your arms apart"],
    cues:["Think of the motion as an arc not a press — elbows stay soft throughout","The squeeze at the top is where growth happens — don't rush through it","You should feel this exclusively in your chest, not your shoulders"],
    mistakes:["Straightening the arms fully — turns it into a pulldown","Letting the cables pull your arms back too far — risks shoulder injury","Going too heavy — this is a detail movement, not a strength move"],
  },
  "seated-db-press":{
    equipment:"Two dumbbells, adjustable bench set to upright (80–90 degrees)",
    setup:"Set the bench fully upright or just slightly reclined. Sit with feet flat. Use knee kicks to get the dumbbells to shoulder height, palms facing forward. Elbows directly below wrists.",
    execution:["Press both dumbbells up together, bringing them slightly toward each other at the top but not touching","Lower to where upper arms are roughly parallel to the floor — elbows at 90°","Do not go below parallel as it places excessive stress on the shoulder capsule","Press back up explosively, breathing out at the top"],
    cues:["Keep your lower back against the bench — do not arch aggressively","Think about pressing the ceiling rather than pressing inward","Wrists stay neutral — not cocked back or forward"],
    mistakes:["Pressing behind the head — extremely dangerous for rotator cuff","Arching the low back off the pad — reduces shoulder stability","Going too deep on the descent"],
  },
  "lat-raise-mon":{
    equipment:"Two light dumbbells — this is a detail movement, start lighter than you think",
    setup:"Stand with feet shoulder-width. Hold dumbbells at your sides with palms facing your thighs. Lean very slightly forward at the hips — about 10–15 degrees. Keep a soft bend in both elbows throughout.",
    execution:["Raise both dumbbells out to your sides in an arc — lead with your elbows, not your hands","Raise until your arms are roughly parallel to the floor or just above","At the top, think about pouring a glass of water — pinky side slightly higher than thumb","Hold briefly at the top, then lower slowly over 2–3 seconds"],
    cues:["The slight forward lean shifts emphasis to the lateral head of the delt — this is what creates width","If you feel this in your traps, lower the weight and reset","Slow eccentric is where most of the growth happens — do not drop the weight"],
    mistakes:["Swinging the torso — turns it into a trap shrug","Going too heavy — this is one of the most commonly ego-lifted exercises","Raising above parallel — shoulder impingement risk"],
  },
  "rear-delt-raise":{
    equipment:"Two light dumbbells",
    setup:"Hinge at the hips until your torso is parallel to the floor or at 45°. Let the dumbbells hang straight down from your shoulders with a soft elbow bend. Keep your neck neutral — look at a point on the floor a few feet in front of you.",
    execution:["Raise both arms out to the sides — think of your arms as wings opening","Raise until your arms are roughly parallel to the floor","Squeeze your shoulder blades together at the top — feel it in your rear delts and upper back","Lower slowly and repeat"],
    cues:["The movement comes from the rear delt and upper back — not from swinging or using momentum","Keep your chin tucked — do not crane your neck up","These muscles are often undertrained — prioritize feeling the muscle over moving weight"],
    mistakes:["Standing too upright — turns it into a lateral raise","Going too heavy and using momentum","Not squeezing at the top"],
  },
  "rope-pushdown":{
    equipment:"Cable machine with rope attachment, set to highest pulley",
    setup:"Attach the rope to the top pulley. Stand facing the machine. Grab the rope with both hands, thumbs up, elbows tucked at your sides. Step back slightly so there is cable tension at the start.",
    execution:["Push the rope down by extending your elbows — keep your upper arms completely still","At the bottom, spread the rope apart slightly by pulling your hands outward","Squeeze your triceps hard at full extension for one second","Allow elbows to bend back up — do not let your upper arms move"],
    cues:["Your elbows are the pivot point — they do not move from your sides","Spreading the rope at the bottom creates peak tricep contraction — do not skip this","Stand tall — do not lean into the machine"],
    mistakes:["Letting elbows flare out — removes tricep isolation","Leaning forward and using body weight","Not reaching full extension — cutting the range of motion short"],
  },
  "oh-ext":{
    equipment:"One heavy dumbbell",
    setup:"Sit on a bench or stand. Hold the dumbbell with both hands overlapping under the top plate. Raise it overhead with arms extended. Lower it behind your head by bending only at the elbows.",
    execution:["Start with the dumbbell directly overhead, arms nearly locked","Lower the dumbbell behind your head by bending at the elbows — go until you feel a deep stretch in the long head of the tricep","Upper arms stay pointing straight up — they do not move","Press back up to full extension by squeezing the tricep"],
    cues:["The long head of the tricep only fully stretches when the arm is overhead — this movement is irreplaceable for complete tricep development","Keep elbows close together — they naturally want to flare as you fatigue","Feel the stretch at the bottom — that loaded stretch is the growth stimulus"],
    mistakes:["Letting elbows flare wide","Not going deep enough — the stretch is the point","Using too much weight and losing control at the bottom"],
  },
  "hang-leg-mon":{
    equipment:"Pull-up bar or hanging handles",
    setup:"Hang from a pull-up bar with a shoulder-width grip. Let your body decompress fully. Engage your core before beginning any movement.",
    execution:["From a dead hang, bring your legs up by flexing at the hips — keep legs straight or slightly bent","Raise until your legs are parallel to the floor — advanced: raise until toes touch the bar","Lower slowly over 2–3 seconds — do not just drop","If swinging, pause and let the momentum stop before the next rep"],
    cues:["The movement should come from your abs pulling your hips up — not from momentum","Posterior pelvic tilt at the top — think about driving your pelvis toward your face","Squeeze your abs hard at the top of each rep"],
    mistakes:["Kipping or using momentum — completely removes ab involvement","Dropping quickly on the descent — eccentric is where you build strength","Holding breath — breathe out on the way up"],
  },
  "cable-crunch-mon":{
    equipment:"Cable machine with rope attachment set to highest pulley",
    setup:"Kneel facing the cable machine. Hold the rope handles beside your head — hands near your temples. Sit back on your heels slightly so there is tension in the cable from the start.",
    execution:["Curl your spine downward — think about bringing your elbows toward your knees","The movement is a spinal flexion — your hips should not move much","Stop when you feel full ab contraction — elbows near or touching the floor","Return to upright slowly — feel the stretch in your abs at the top"],
    cues:["This is not a hip hinge — your hips stay relatively still and your spine curls","Think about shortening the distance between your sternum and your pelvis","The resistance from the cable at the top is what makes this better than a regular crunch"],
    mistakes:["Pulling with your arms instead of crunching with abs","Moving your hips instead of your spine","Not returning fully to the top — cutting the range of motion"],
  },
  "plank-mon":{
    equipment:"Floor — no equipment needed",
    setup:"Position forearms on the floor, elbows directly under your shoulders. Extend legs behind you, feet together or hip-width. Rise up onto your toes and forearms only.",
    execution:["Hold your body in a perfectly straight line from head to heels","Squeeze your glutes hard — this protects your lower back","Pull your belly button toward your spine — active core engagement","Breathe steadily — do not hold your breath","Hold the full time, then lower with control"],
    cues:["A plank is an active hold not a passive one — every muscle should be working","If your hips are sagging, you have lost the point of the exercise","If your hips are piked up, you are making it too easy"],
    mistakes:["Passive holding with a sagging midsection","Looking up and straining the neck — gaze should be at the floor","Forgetting to squeeze the glutes"],
  },
  "deadlift":{
    equipment:"Barbell, weight plates, lifting belt for heavy sets (optional)",
    setup:"Stand with the bar over your mid-foot — about an inch from your shins. Feet hip-width, toes pointed slightly out. Hinge at the hips and bend knees until your hands reach the bar. Grip just outside your legs — double overhand or mixed grip. Pull your chest up, engage your lats by thinking about protecting your armpits, and take a big breath into your belly.",
    execution:["Before the bar leaves the floor, create tension throughout your entire body — this is called taking the slack out","Push the floor away from you — do not think about pulling the bar up","Keep the bar dragging up your shins and thighs — it should stay in contact with your body throughout","Lock hips and knees simultaneously at the top — stand tall without hyperextending your back","Lower by pushing your hips back first, then bending your knees once the bar passes your knees"],
    cues:["Think push not pull — your legs drive the floor down","The bar should leave a chalk or shin guard mark on your legs — it stays that close","At the top, squeeze your glutes and stand completely tall — do not lean back","Big breath before you pull — hold it until past the sticking point"],
    mistakes:["Bar drifting away from the body — exponentially increases lower back load","Rounding the lower back under load — injury waiting to happen","Jerking the bar off the floor instead of creating tension first","Hyperextending at lockout"],
  },
  "pull-up":{
    equipment:"Pull-up bar. For weighted: dip belt with plates or a weighted vest",
    setup:"Hang from the bar with hands shoulder-width, palms facing away from you. Let your body fully decompress. Engage your lats by thinking about pulling your shoulder blades into your back pockets — this should happen before you move.",
    execution:["Initiate the pull by depressing your shoulder blades — leading with your chest, not your chin","Pull until your chin is over the bar or your upper chest touches the bar","At the top, squeeze your lats and upper back hard","Lower slowly and with control until arms are fully extended — full dead hang at the bottom","Every rep starts and ends from a dead hang"],
    cues:["Think about driving your elbows down into your pockets — this activates your lats instead of your biceps","Your chest leads up — your chin is just the endpoint","The eccentric matters as much as the concentric — lower slowly"],
    mistakes:["Kipping — fine for CrossFit, useless for hypertrophy","Not reaching full extension at the bottom — you're only doing half a rep","Pulling with your arms instead of initiating with your back","Shrugging your shoulders up at the top"],
  },
  "bb-row":{
    equipment:"Barbell, weight plates",
    setup:"Stand with feet hip-width. Hinge at the hips until your torso is at roughly 45° — some lean to your preference. Bar starts on the floor or hanging. Grip just outside shoulder-width, overhand. Let the bar hang at arm's length.",
    execution:["Pull the bar toward your lower chest or upper abdomen — not your belly button","Drive your elbows back and up — think about trying to touch your elbows behind you","Squeeze your shoulder blades together at the top — hold briefly","Lower the bar with control — do not just drop it back down"],
    cues:["Row to your lower chest for more lat involvement, upper abdomen for more mid-back","Pull your elbows through the ceiling — not just backward","Keep your torso angle consistent throughout — do not stand up as you row"],
    mistakes:["Using too much body English — swinging the torso to move weight","Rowing to the belly button instead of lower chest","Not squeezing at the top — removing the contraction"],
  },
  "cable-row":{
    equipment:"Cable machine with V-bar (close grip) attachment, seated row station",
    setup:"Sit at the cable row machine with feet on the foot platform. Knees slightly bent. Grab the V-bar with both hands. Sit upright — do not lean back excessively. Start with arms extended and feel a stretch in your mid-back.",
    execution:["Pull the handle toward your belly button while sitting perfectly upright","Drive elbows back and squeeze shoulder blades together at full contraction","Hold the contraction for one second","Extend arms back out with control — lean forward slightly at the end to get a full stretch in the mid-back"],
    cues:["Two distinct positions: full stretch forward, full contraction back — hit both every rep","Avoid using body swing to move the weight — if you are swinging, drop the weight","Think about pinching a pencil between your shoulder blades at the top"],
    mistakes:["Leaning back excessively — turns it into a low-back exercise","Rounding the back during the stretch — risks disc injury","Short-stroking — not reaching full extension or full contraction"],
  },
  "db-shrug":{
    equipment:"Two heavy dumbbells",
    setup:"Stand with feet shoulder-width. Hold heavy dumbbells at your sides, palms facing your body. Arms completely relaxed and extended.",
    execution:["Shrug your shoulders straight up toward your ears — not forward, not in a circle","At the top, hold for a full 1–2 seconds — squeeze your traps hard","Lower slowly back to the fully stretched position — let your traps fully lengthen at the bottom","Repeat without bouncing or using momentum"],
    cues:["Straight up and straight down — no rolling movement","The hold at the top is what builds traps — do not skip it","You should feel a stretch at the bottom of each rep"],
    mistakes:["Rolling the shoulders forward or backward — no benefit and risks injury","Going too fast and using momentum","Not holding at the top — turning it into a bounce"],
  },
  "bb-curl":{
    equipment:"Barbell — straight or EZ bar",
    setup:"Stand with feet shoulder-width. Hold the bar with an underhand grip, hands shoulder-width or just outside. Arms fully extended, bar resting at thigh level. Pin your elbows to your sides.",
    execution:["Curl the bar up by bending only at the elbows — upper arms stay completely still","Raise until the bar is at shoulder height or your biceps are fully contracted","Squeeze the bicep hard at the top","Lower slowly over 2–3 seconds to full extension — feel the stretch"],
    cues:["Your elbows are the pivot — they do not move forward or backward","Supinate your wrists slightly at the top — turn pinkies out slightly to get the full bicep contraction","The slow lowering builds as much size as the curl up"],
    mistakes:["Swinging the body to get the weight up — turns into a back exercise","Letting elbows drift forward at the top — reduces bicep engagement","Cutting the range of motion short at the bottom"],
  },
  "hammer-curl":{
    equipment:"Two dumbbells",
    setup:"Stand or sit. Hold dumbbells with a neutral grip — palms facing each other, like holding hammers. Arms fully extended at your sides.",
    execution:["Curl one or both dumbbells upward, keeping palms facing each other throughout — do not rotate","Raise until forearm is vertical","Lower slowly back to full extension","Alternate arms or do both simultaneously — both work"],
    cues:["The neutral grip is the key — it shifts emphasis from bicep to brachialis, the muscle that pushes the bicep up and adds peak","Keep elbows pinned — they do not swing forward"],
    mistakes:["Rotating the wrist at the top — turns it into a regular curl and removes brachialis emphasis","Swinging for momentum","Not reaching full extension at the bottom"],
  },
  "wrist-curl":{
    equipment:"One or two light dumbbells, flat bench",
    setup:"Sit on the end of a bench. Rest your forearms on your thighs or the bench with your wrists hanging off the edge, palms facing up. Hold a dumbbell in each hand.",
    execution:["Lower the dumbbell by opening your fingers and letting it roll to your fingertips","Curl your fingers back around the dumbbell","Curl the wrists upward as high as possible — flex the forearm","Lower slowly back to the stretched position"],
    cues:["The finger roll at the bottom dramatically increases range of motion and forearm activation","Full range of motion is the key here — most people only do partial reps","Forearm training requires high reps — 15–20 minimum"],
    mistakes:["Skipping the finger roll at the bottom","Using too much weight and losing ROM","Going too fast"],
  },
  "rev-wrist-curl":{
    equipment:"One or two light dumbbells, flat bench",
    setup:"Same position as wrist curl but with palms facing down — overhand grip.",
    execution:["Lower the dumbbell by relaxing the wrist — let it drop toward the floor","Raise by curling the wrist upward — back of hand moves toward your forearm","Lower slowly","These are harder than regular wrist curls — use lighter weight"],
    cues:["This targets your forearm extensors — the muscles on the top of your forearm","Critical for preventing tennis elbow and forearm imbalances from heavy pulling","High reps, light weight, full range"],
    mistakes:["Using too much weight and losing control","Not going through full range — especially not reaching full extension at the bottom"],
  },
  "neck-tue":{
    equipment:"No equipment — manual resistance only",
    setup:"Sit upright. Place one hand firmly against your forehead, the back of your head, or the side of your head depending on the direction being trained.",
    execution:["Apply firm resistance with your hand","Attempt to move your head in the direction being trained while your hand resists the movement","This is an isometric contraction — your head may not move much, or you can allow a small range of motion","Hold each contraction for 2–3 seconds","Repeat for all 4 directions: front flexion, back extension, left lateral, right lateral"],
    cues:["The neck is a highly innervated area — start very light and build gradually","Never train neck to failure — you should finish the set feeling worked, not exhausted","This builds the neck thickness that frames the traps and makes the physique look complete"],
    mistakes:["Applying too much force too soon — neck injury is serious","Skipping this — it is one of the most overlooked but most visually impactful exercises","Jerking movements instead of smooth resistance"],
  },
  "back-squat":{
    equipment:"Barbell, squat rack, weight plates, squat shoes or heel plate (optional), lifting belt for heavy sets",
    setup:"Set the bar at upper chest height. Step under and position it across your upper traps — high bar sits at the top of your traps, low bar sits across your rear delts. Grip the bar narrower than you think. Unrack by stepping back with two small steps — feet shoulder-width to just outside, toes angled 15–30° out.",
    execution:["Take a big breath in and brace your entire core — 360 degrees of pressure, not just your abs","Initiate by breaking at the hips and knees simultaneously — do not lead with the knees alone","Descend until your hip crease is below your knees — this is a full squat","Keep your chest up, knees tracking over your toes throughout","Drive back up by pushing the floor apart — think about spreading the floor with your feet","Stand fully tall at the top — lock hips and knees"],
    cues:["Think knees out — push your knees in the direction your toes are pointing throughout the movement","Big breath, brace the abs, then descend — every single rep","The squat is a full body movement — your back, core, and legs are all working"],
    mistakes:["Butt wink at the bottom — usually from lack of mobility or going deeper than your current range allows","Knees caving inward — most common squat error, very dangerous","Rising on your toes — heel elevation means your ankles need work","Half squatting — hip crease must be below the knee"],
  },
  "bulgarian-ss":{
    equipment:"Two dumbbells, a flat bench",
    setup:"Stand about 2–3 feet in front of a bench. Place the top of one foot on the bench behind you — shoelaces down. Your front foot is far enough forward that when you descend your front shin stays roughly vertical.",
    execution:["Lower your body by bending the front knee — your back knee drops toward the floor","Descend until front thigh is roughly parallel to floor — feel a deep stretch in the hip flexor of the back leg","Keep your torso upright — do not lean forward excessively","Drive up through the heel of your front foot — squeeze the glute at the top"],
    cues:["This is a quad and glute exercise for the front leg — your back leg is just for balance","If you feel this mostly in your back hip flexor, you need to move your front foot further forward","The stretch at the bottom is the point — do not rush through it"],
    mistakes:["Front foot too close to the bench — puts the front knee too far forward","Leaning too far forward — reduces glute involvement","Using the back leg to push — it should contribute almost nothing"],
  },
  "leg-press":{
    equipment:"Leg press machine",
    setup:"Sit in the machine with your lower back and tailbone flat against the pad. Place feet on the platform shoulder-width or slightly wider, toes angled slightly outward. Mid-foot — not too high, not too low.",
    execution:["Release the safety handles","Lower the platform by bending your knees — keep them tracking in line with your toes","Descend until knees are at 90° or deeper — as far as you can go without your tailbone lifting off the pad","Press back up through your whole foot, exhaling — do not fully lock your knees at the top"],
    cues:["Never lock out completely at the top — keeps constant tension on the quads","Your lower back should stay flat against the pad throughout — if it rounds, you are going too deep for your current mobility","Wide foot placement works more inner quad and glutes — narrow works more outer quad"],
    mistakes:["Letting knees cave inward under load","Lower back rounding off the pad at the bottom","Locking out completely and resting at the top"],
  },
  "leg-ext":{
    equipment:"Leg extension machine",
    setup:"Sit with your back flat against the pad. Adjust the knee pad so it sits just above your ankles, not on your foot. The pivot point of the machine should align with your knee joint.",
    execution:["Extend both legs upward by contracting your quads","Lift until legs are straight — squeeze the quads hard at the top and hold for one second","Lower slowly over 3 seconds — resist the weight on the way down","Do not let the weight slam down at the bottom"],
    cues:["Point your toes slightly up toward you at the top — enhances quad contraction","The slow eccentric on this machine is where most of the hypertrophy occurs","This is a finishing movement — use moderate weight and feel every rep"],
    mistakes:["Going too fast and using momentum","Not squeezing at the top","Weight slamming down — you are losing most of the benefit"],
  },
  "hip-abd-wed":{
    equipment:"Hip abduction machine",
    setup:"Sit in the machine with your back flat against the pad. Adjust the pads so they rest against the outside of your knees. Feet on the platform. Sit upright — do not lean forward.",
    execution:["Push your knees outward against the pads — spread your legs apart","Pause at the fully open position for one second — squeeze the glute medius","Return slowly — resist the weight as your legs come back together","Do not slam the weight at the bottom"],
    cues:["This targets your glute medius — the side of your glute that gives the hip a 3D rounded appearance","Sitting upright keeps the emphasis on glute medius — leaning forward shifts it to TFL (hip flexor area)","This is one of those machines most men skip — do not skip it"],
    mistakes:["Leaning forward to move more weight","Going too fast — this needs slow controlled reps","Not pausing at the top"],
  },
  "seated-calf-wed":{
    equipment:"Seated calf raise machine — or a barbell across your knees on a bench with a plate under your feet",
    setup:"Sit in the machine with the pad resting just above your knees — on your lower thigh, not on your knee cap. Place the balls of your feet on the platform. Release the safety.",
    execution:["Lower your heels as far as possible — full stretch with a 1–2 second pause at the bottom","Rise up as high as possible onto the balls of your feet — full contraction","Hold at the top for one second","Lower slowly back to full stretch"],
    cues:["The pause at the bottom stretch is critical — calf muscles respond extremely well to loaded stretching","This machine targets the soleus specifically — the muscle underneath the gastrocnemius that adds width and thickness to the lower leg","High reps respond well to calves — 15–20 minimum"],
    mistakes:["Short range of motion — barely moving and wondering why calves do not grow","No pause at the bottom stretch","Going too fast"],
  },
  "ab-wheel":{
    equipment:"Ab wheel — or a barbell with plates of equal size as a substitute",
    setup:"Kneel on the floor with the ab wheel directly in front of you. Grip the handles firmly. Tuck your chin slightly.",
    execution:["Roll the wheel forward slowly — extend your arms and lower your torso toward the floor","Stop just before your lower back begins to arch — or when your torso is parallel to the floor","Hold for one second at the fully extended position","Pull back with your abs — dragging the wheel back toward your knees","Do not use your arms to push back — your abs do the work"],
    cues:["Think about keeping your spine in a neutral arc — do not let your lower back sag","The return motion should feel like a crunch — your abs are shortening to pull you back","As you get stronger, extend further toward full extension"],
    mistakes:["Lower back sagging at the extension — injury risk","Using your arms to push back — removes abs from the equation","Extending too far too soon before you have the strength"],
  },
  "decline-situp":{
    equipment:"Decline bench",
    setup:"Set the bench at a moderate decline. Hook your feet under the pads. Lie back with hands behind your head — do not lace your fingers, just touch your temples.",
    execution:["Rise up by curling your spine — chin to chest first, then continue up","Come all the way up until your torso is upright or past vertical","Lower slowly with control — feel your abs working as you descend","Do not fall back — control the entire descent"],
    cues:["The decline angle creates resistance at the top of the movement where flat sit-ups get easy","Do not pull on your neck — your hands just guide, your abs do the work","For added difficulty, hold a weight plate across your chest"],
    mistakes:["Using momentum to bounce up","Pulling your neck forward instead of using abs","Not going all the way up or down"],
  },
  "pallof-press":{
    equipment:"Cable machine with a D-handle, set to mid-chest height",
    setup:"Stand sideways to the cable machine. Grab the handle with both hands and position it at your chest. Stand far enough from the machine that there is significant tension. Feet shoulder-width, athletic stance.",
    execution:["Press the handle straight out from your chest — arms extending until fully straight","Hold the extended position for 2 seconds — resist the cable trying to rotate your torso","Pull the handle back to your chest","Your torso should not rotate at all — this is the entire point of the exercise","Complete all reps on one side, then face the other direction"],
    cues:["The exercise is entirely anti-rotational — your job is to prevent your body from turning toward the cable","Brace your core as hard as you can before pressing out — the tension will try to pull you sideways","This builds the deep core stability that protects your spine under heavy compound loads"],
    mistakes:["Letting your hips and torso rotate toward the cable — that means the weight is too heavy","Not bracing before pressing — losing the anti-rotation element","Rushing through the reps"],
  },
  "incline-bb":{
    equipment:"Barbell, incline bench set to 30–45 degrees, squat rack or spotter",
    setup:"Set the bench to 30–45°. Lie back with eyes under the bar. Grip slightly wider than shoulder-width — same setup as flat bench but slightly higher on the chest at the bottom.",
    execution:["Unrack the bar and hold directly above your upper chest","Lower in a slight arc to your upper chest — right at the clavicle/upper pec junction","Touch lightly and press back up explosively","Lock out and repeat"],
    cues:["This is the single most important chest exercise for building the upper pec shelf — do not skip it","The angle means the bar lands higher than on a flat bench — this is correct","Keep the same tight setup as flat bench — shoulder blades together and down"],
    mistakes:["Bench angle too steep — above 45° becomes a shoulder press","Bar path drifting down toward the lower chest — missing the upper pec"],
  },
  "flat-db-press":{
    equipment:"Two dumbbells, flat bench",
    setup:"Lie flat on the bench. Kick dumbbells up with your knees as you lie back. Dumbbells at chest level, palms forward, elbows at 45° to your torso.",
    execution:["Press both dumbbells up together, allowing them to come slightly inward at the top","Lower to where your chest gets a full stretch — elbows slightly below bench level","Press back up, squeeze chest at the top"],
    cues:["The advantage over barbell is the range of motion — go deeper than you could with a bar","Focus on feeling both sides equally — dumbbells expose strength imbalances","Control the weight throughout — do not use momentum"],
    mistakes:["Letting elbows flare to 90°","Bouncing the dumbbells off your chest","Drifting too wide on the descent"],
  },
  "db-fly":{
    equipment:"Two dumbbells — lighter than you think, flat bench",
    setup:"Lie flat. Hold dumbbells above your chest with a slight bend in elbows — maintain that bend throughout. Palms facing each other.",
    execution:["Lower both dumbbells out to the sides in a wide arc — feel your chest stretching","Lower until you feel maximum chest stretch — usually when elbows are in line with the bench","Bring both dumbbells back up and together in the same arc — squeezing the chest","Hands finish above your sternum"],
    cues:["Think of hugging a barrel — arms move in a wide arc, elbows stay soft","Feel the stretch — this is a muscle-building movement, not a strength movement","The squeeze at the top when hands come together is the money contraction"],
    mistakes:["Straightening the arms fully — turns into a press and risks shoulder injury","Going too heavy — you lose the arc and turn it into a press","Bouncing at the bottom of the stretch"],
  },
  "arnold-press":{
    equipment:"Two dumbbells, adjustable bench set to upright",
    setup:"Sit on an upright bench. Hold dumbbells in front of you at shoulder height, palms facing your body — as if you just completed a curl. Elbows in front of you.",
    execution:["As you press the dumbbells up, rotate your palms outward so they end facing forward at the top","At the top, hands are fully rotated outward — same as a regular overhead press endpoint","Lower while reversing the rotation — palms face you again at the bottom","This rotation recruits all three heads of the deltoid in one movement"],
    cues:["The rotation is the entire point — it hits front, side, and rear delt in one movement","Start light until you have the rotation pattern dialed in","Slow down the rotation on the way down — that eccentric stretch is valuable"],
    mistakes:["Pressing without the rotation — just a regular shoulder press","Going too heavy and losing the rotation pattern","Not going to full extension at the top"],
  },
  "front-raise":{
    equipment:"Two dumbbells",
    setup:"Stand with feet shoulder-width. Hold dumbbells at your sides or in front of your thighs, palms facing back or facing each other.",
    execution:["Raise one dumbbell straight in front of you — arm nearly parallel to floor or just above","Thumb slightly higher than pinky","Lower slowly and raise the other arm — alternate","Torso stays still — do not lean back"],
    cues:["Stop at or just above shoulder height — going higher involves traps and loses front delt isolation","Use lighter weight — this is a strict isolation movement","Slow eccentric as always"],
    mistakes:["Swinging the torso to get the weight up","Going too high — traps take over","Going too heavy"],
  },
  "lat-raise-thu":{
    equipment:"Two dumbbells",
    setup:"Same as Monday lateral raise setup.",
    execution:["Same execution as Monday — lead with elbows, raise to parallel, slow descent"],
    cues:["By Thursday your delts have been hit twice this week — you may need to reduce weight slightly","Focus on quality contraction over weight"],
    mistakes:["Same as Monday version — no swinging, no traps, no momentum"],
  },
  "skull-crusher":{
    equipment:"EZ bar or straight barbell, flat bench",
    setup:"Lie on a flat bench. Hold an EZ bar with a close grip — hands about 6–8 inches apart on the inner angled grips. Arms extended above your face with a slight lean back — bar directly above your eyes or slightly past your forehead.",
    execution:["Lower the bar toward your forehead by bending only at the elbows — upper arms do not move","Stop just before the bar touches your forehead","Extend back to the start by squeezing your triceps","Upper arms stay pointing straight up throughout"],
    cues:["The EZ bar is easier on wrists than a straight bar — use it if you have wrist issues","Keep elbows pointing straight up — they want to flare out as you fatigue","This is the best long-head tricep builder when done with proper ROM"],
    mistakes:["Letting elbows flare out wide","Moving your upper arms — they stay fixed, only elbows move","Going too heavy and losing control at the bottom"],
  },
  "cg-bench":{
    equipment:"EZ bar or straight barbell, flat bench — same bar from skull crushers",
    setup:"Stay on the bench from skull crushers. Keep the same grip. Position the bar above your lower chest.",
    execution:["Lower the bar to your lower chest — elbows tuck in close to your ribcage throughout","Press back up explosively — squeeze triceps at the top","The close grip means your elbows travel along your sides, not out at angles"],
    cues:["Do these immediately after skull crushers while the triceps are pre-exhausted — this is the point of the superset","The combination is more effective than either exercise alone","Keep elbows in — this is a tricep exercise, not a chest exercise"],
    mistakes:["Widening the grip — turns it into a chest exercise","Elbows flaring out — removes tricep emphasis"],
  },
  "cable-pushdown":{
    equipment:"Cable machine with straight bar attachment set to highest pulley",
    setup:"Stand facing the machine. Grip the straight bar with an overhand grip, hands shoulder-width. Elbows pinned at your sides. Step back slightly for constant tension.",
    execution:["Push the bar down by extending your elbows — upper arms stay completely still","Extend to full lockout — squeeze hard at the bottom","Slowly let the bar rise back up — controlled eccentric","Elbows do not move from your sides at any point"],
    cues:["Full lockout on every rep — the squeeze at the bottom creates maximum tricep activation","For variety, try a reverse grip — turns it into a reverse pushdown which hits the lateral head differently","This is the pump finisher for triceps — moderate weight, feel every rep"],
    mistakes:["Elbows drifting back — turns it into a dip motion","Not reaching full extension","Leaning into the machine to get more weight"],
  },
  "hang-knee":{
    equipment:"Pull-up bar",
    setup:"Same hanging setup as hanging leg raise. Hang with a shoulder-width grip.",
    execution:["From a dead hang, bring your knees up toward your chest by flexing at the hips","Pull knees as high as possible — ideally at or above hip level","Hold briefly, then lower slowly","Stop all swinging before each rep"],
    cues:["Easier than straight leg raises — use this to build up to straight leg raises","The higher you bring your knees, the more ab involvement","Posterior pelvic tilt at the top — aim to bring your knees above your hips"],
    mistakes:["Kipping or swinging","Dropping quickly on the descent","Not curling the hips — just bringing the knees forward without the hip curl"],
  },
  "oblique-crunch":{
    equipment:"Cable machine with rope attachment at top pulley",
    setup:"Kneel sideways to the cable machine. Hold one side of the rope next to your temple on the near side. Body upright.",
    execution:["Crunch your torso laterally — think about bringing your elbow toward your opposite hip","Feel the oblique on the near side contracting","Return to upright slowly","Complete all reps on one side before switching"],
    cues:["The rotation and lateral crunch together is what hits the obliques — not just bending sideways","Keep hips square — the rotation comes from your torso not your hips","Lower weight than cable crunch — obliques are strong but tire faster than rectus abdominus"],
    mistakes:["Using too much weight and using hip momentum","Not rotating — just bending sideways"],
  },
  "side-plank":{
    equipment:"Floor only",
    setup:"Lie on your side. Place your forearm on the floor with your elbow directly below your shoulder. Stack your feet or stagger them. Rise up onto your forearm and the side of your bottom foot.",
    execution:["Hold your body in a perfectly straight line — no sagging hips, no piked hips","Squeeze your obliques and glute on the top side","Breathe steadily throughout","Hold for the full time, then switch sides"],
    cues:["Your hips should not sag toward the floor — that is passive holding and does nothing","Rotate your top hip slightly forward — this increases oblique tension","For added difficulty, raise your top leg"],
    mistakes:["Hips sagging to the floor","Looking up and straining the neck","Going too quickly"],
  },
  "wide-pullup":{
    equipment:"Pull-up bar — wider grip than standard",
    setup:"Same as regular pull-up but grip wider than shoulder-width — hands approximately where the bar bends or slightly wider. The wider grip shifts more emphasis to the outer lat, which creates the V-taper.",
    execution:["Same execution as regular pull-up — dead hang to chin over bar","The wider grip shortens the range of motion slightly — this is normal","Focus on driving elbows down and out rather than just down"],
    cues:["The wide grip hits the teres major and outer lat — this is the width muscle","The V-taper comes from this exercise more than any other single movement","You will use less weight than close grip — this is expected"],
    mistakes:["Gripping so wide you cannot get chin over bar — find the width that allows full ROM","Kipping or using momentum","Short-stroking the reps"],
  },
  "lat-pulldown":{
    equipment:"Lat pulldown machine with wide grip bar",
    setup:"Sit at the machine. Adjust the knee pad so your legs are locked in. Grip the bar wide — outside the bends. Lean back slightly — about 10–15 degrees from vertical.",
    execution:["Pull the bar to your upper chest while leaning back slightly","Drive your elbows down and toward your hips — think about putting your elbows in your back pockets","Squeeze your lats hard when the bar reaches your chest","Control the bar back up to full extension — feel the lat stretch at the top"],
    cues:["The lat stretch at the top is as important as the contraction at the bottom","Chest proud — lead with your chest coming up to meet the bar, not your chin pulling down to the bar","Full extension at the top is non-negotiable — that is half the exercise"],
    mistakes:["Pulling the bar behind the neck — serious neck injury risk, never do this","Using too much momentum and swinging","Not reaching full extension at the top"],
  },
  "sa-row":{
    equipment:"One dumbbell, flat bench",
    setup:"Place one knee and same-side hand on the bench. Other foot on the floor. Your torso is parallel to the floor. Hold the dumbbell in the free hand, arm hanging straight down.",
    execution:["Pull the dumbbell up toward your hip — not your armpit","Drive your elbow up and back past your torso","At the top, squeeze your lat and mid-back — hold briefly","Lower slowly to full extension — full stretch at the bottom of every rep"],
    cues:["Row to your hip for maximum lat involvement — rowing to your armpit turns it into a rear delt exercise","The full stretch at the bottom is what makes this better than machine rows for developing the lat","You can go heavier than you think here — the support from the bench makes this very stable"],
    mistakes:["Rowing to the armpit instead of the hip","Rotating the torso to use momentum","Not reaching full arm extension at the bottom"],
  },
  "sa-pulldown":{
    equipment:"Cable machine with rope or straight bar, set to highest pulley",
    setup:"Stand facing the machine, arm's length away. Grip the attachment with both hands, arms raised overhead. Keep arms completely straight throughout.",
    execution:["Pull both arms straight down to your thighs — keeping arms completely rigid","At the bottom, squeeze your lats and feel them fully contracted","Return with control, arms rising overhead — feel the lat stretch at the top","Arms stay straight — this is not a pulldown with elbows bending"],
    cues:["This is pure lat isolation — no bicep involvement since arms are straight","The stretch at the top is enormous and is key to the effectiveness of this exercise","This teaches you how your lats are supposed to feel in pulldowns and rows"],
    mistakes:["Bending the elbows — turns it into a regular pulldown","Not reaching full extension overhead","Standing too far from the machine and losing tension"],
  },
  "face-pull":{
    equipment:"Cable machine with rope attachment set to approximately face height",
    setup:"Attach the rope to the pulley at roughly face height. Grip both ends of the rope with an overhand grip — thumbs down. Step back until there is significant cable tension. Feet shoulder-width.",
    execution:["Pull the rope toward your face — aiming for your forehead or just in front of your ears","As you pull, your hands split apart and your elbows go wide — like a double bicep pose","At full contraction, your hands are beside your ears, elbows at shoulder height or above","Rotate your wrists so pinkies point toward the ceiling at the end — external rotation","Return slowly — full stretch at the start"],
    cues:["The external rotation at the end is the health component — this exercise is the single best movement for shoulder health","Think elbows high, hands outside your head at the end of each rep","This is non-negotiable for anyone doing heavy pressing — it counterbalances the internal rotation from bench press"],
    mistakes:["Pulling to your neck or chin — not face level","Elbows dropping below shoulder height — removes rear delt and external rotation emphasis","Going too heavy and turning it into a row"],
  },
  "bb-shrug":{
    equipment:"Heavy barbell — can also use a trap bar for a more natural feel",
    setup:"Stand with feet hip-width. Hold the barbell at thigh level with an overhand grip shoulder-width. Arms fully extended.",
    execution:["Shrug straight up — as high as possible toward your ears","Hold the top position for a full 1–2 seconds — squeeze your traps maximally","Lower slowly back to the fully stretched position","Do not roll or roll your shoulders — straight up and straight down only"],
    cues:["The hold at the top is what builds thick traps — most people skip it entirely","You should feel your upper traps working from the top of your neck down to your shoulder","Straps are appropriate here — grip should not be the limiting factor"],
    mistakes:["Rolling shoulders forward or backward — no benefit, increased injury risk","Not holding at the top","Going too fast and using bounce"],
  },
  "incline-curl":{
    equipment:"Two dumbbells, adjustable bench set to 45–60 degrees",
    setup:"Lie back on an incline bench. Let your arms hang straight down — the stretch you feel immediately in your biceps is the entire point of this setup. Palms facing up.",
    execution:["Curl both dumbbells up by bending at the elbows — do not swing","At the top, supinate your wrists fully — pinky rotates outward","Squeeze the bicep hard at the top","Lower slowly to full extension — feel the deep stretch at the bottom"],
    cues:["The incline position stretches the long head of the bicep maximally at the bottom — this is what adds peak to the bicep","The stretch at the bottom is the key benefit over standing curls — do not cut it short","This is one of the best single exercises for bicep peak development"],
    mistakes:["Swinging the arms forward to initiate the curl — defeats the stretch","Cutting the ROM at the bottom","Going too heavy and losing the stretch"],
  },
  "cable-curl":{
    equipment:"Cable machine with straight bar attachment at lowest pulley",
    setup:"Stand facing the machine. Grip the straight bar underhand at shoulder-width. Step back slightly so there is constant tension even at the top of the curl.",
    execution:["Curl the bar up to shoulder height by bending at the elbows — keep elbows at your sides","At the top, squeeze hard — the cable maintains tension here unlike a dumbbell","Lower slowly to full extension — the cable also creates tension at the bottom"],
    cues:["The cable creates constant tension through the full range — unlike free weights that get lighter at certain points","Good as a finisher after free weight curls — the pump is exceptional","Keep your upper arms completely still throughout"],
    mistakes:["Elbows drifting forward","Not reaching full extension at the bottom","Using body momentum"],
  },
  "farmer-carry":{
    equipment:"Two heavy dumbbells — or a trap bar, or loaded buckets",
    setup:"Stand with two heavy dumbbells at your sides. Feet hip-width. Stand completely tall — chest up, shoulders back, chin level.",
    execution:["Walk forward at a normal pace for the designated distance","Maintain perfect posture throughout — do not let the weight pull you to either side","Take short, controlled steps","At the end, set the weights down with control — hinge at hips, do not round your back"],
    cues:["This is one of the most functional exercises in existence — grip, traps, core, posture all simultaneously","Keep your shoulder blades retracted and depressed throughout — do not let them elevate","Start with a weight that is challenging but allows perfect posture for the full distance"],
    mistakes:["Letting the shoulders elevate and shrug — turns it into a passive hang","Leaning to one side — indicates an imbalance that needs addressing","Speed walking — controlled steps only"],
  },
  "hang-leg-fri":{
    equipment:"Pull-up bar",
    setup:"Same dead hang setup. Engage your core before moving.",
    execution:["Keep legs completely straight — raise until parallel to the floor or until toes reach the bar for advanced","Full controlled descent","Pause any swing before next rep"],
    cues:["By Friday your grip and core are being worked twice this week — this is intentional","Straight legs are significantly harder than bent legs — if you cannot do straight, keep working toward it","Posterior pelvic tilt at the top — curl your pelvis up toward your face"],
    mistakes:["Bent knees making it too easy","Swinging for momentum","Dropping quickly"],
  },
  "dead-bug":{
    equipment:"Floor only",
    setup:"Lie on your back. Raise both arms straight up toward the ceiling. Raise both knees to 90° — knees above hips, shins parallel to floor. Press your lower back completely flat into the floor.",
    execution:["Simultaneously lower your right arm overhead and straighten your left leg — both moving toward the floor","Lower until your arm and leg are just above the floor — lower back stays flat","Return to start and repeat on the opposite side — left arm and right leg","Never let your lower back arch off the floor"],
    cues:["The lower back staying flat is the entire exercise — if it arches, you have gone too far","This trains the deep core stabilizers that protect your spine under heavy loads — squat and deadlift directly benefit","Breathe out as you extend — helps maintain the flat lower back"],
    mistakes:["Letting the lower back arch — the exercise becomes counterproductive","Moving your arms and legs simultaneously on the same side — that is not the movement pattern","Holding your breath"],
  },
  "landmine-fri":{
    equipment:"Barbell with one end wedged in a corner or a landmine attachment",
    setup:"Load the free end of the bar with a light plate. Stand facing the bar with feet shoulder-width. Grab the loaded end with both hands, arms extended in front of you at roughly chest height. Stand tall.",
    execution:["Rotate the bar to one side — keeping arms as straight as possible throughout","Rotate until the bar is at hip height on one side — feel the oblique on the opposite side working","Rotate back through center and to the other side","Control the weight — do not let it swing you"],
    cues:["The resistance comes from the lever arm of the bar — even a light plate is surprisingly heavy","Keep your core braced throughout — this is an anti-rotation exercise on the returning movement","Slow and controlled in both directions — the return is as important as the drive"],
    mistakes:["Bending the arms excessively — reduces the lever effect","Using too much weight and losing control","Going too fast"],
  },
  "rdl":{
    equipment:"Barbell, weight plates",
    setup:"Hold the barbell at thigh level with an overhand grip, shoulder-width. Feet hip-width. Start standing tall with soft knees — knees unlocked but not bent significantly.",
    execution:["Push your hips backward — think about reaching your glutes toward the wall behind you","As your hips move back, the bar lowers along the front of your legs — it should stay close to your thighs and shins throughout","Lower until you feel a significant hamstring stretch — typically bar at mid-shin or slightly lower depending on flexibility","Pull yourself back up by driving your hips forward — squeeze glutes at the top"],
    cues:["This is a hip hinge, not a squat — minimal knee bend throughout","The bar traveling close to your body is the key technical cue — if it drifts forward, your lower back takes the load","Feel the hamstrings loading as you descend — if you feel it in your lower back, reset and hinge more"],
    mistakes:["Squatting instead of hinging — bending the knees too much","Bar drifting away from the body","Rounding the lower back — particularly dangerous under load"],
  },
  "hip-thrust":{
    equipment:"Barbell, weight plates, flat bench, barbell pad or folded mat",
    setup:"Sit on the floor with your upper back against the bench — shoulder blades on the pad. Place the barbell across your hips with a pad for comfort. Plant feet flat, hip-width, toes slightly out. Weight on your heels.",
    execution:["Drive your hips up by squeezing your glutes — not by extending your back","Rise until your body forms a straight line from knees to shoulders","At the top, tuck your chin slightly and squeeze your glutes as hard as possible — hold 1–2 seconds","Lower slowly until your glutes touch the floor","Every rep is a full range of motion"],
    cues:["Your back should not hyperextend at the top — ribs stay down, chin tucked","The glute squeeze at the top is the entire point — if you are not squeezing maximally, you are leaving most of the benefit behind","This is the single most effective glute isolation exercise that exists"],
    mistakes:["Hyperextending the lower back at the top — back injury risk","Not squeezing the glutes — just going through the motion","Feet too close or too far — adjust until knees are at 90° at the top"],
  },
  "hack-squat":{
    equipment:"Hack squat machine",
    setup:"Step into the machine. Place shoulders under the pads. Feet low on the platform — approximately hip-width, slightly turned out. This foot position emphasizes quads more. Release the safety handles.",
    execution:["Lower by bending knees — descend as deep as possible, aiming for thighs below parallel","Keep lower back in contact with the pad throughout","Drive back up through your feet — push the platform away","Do not lock out completely at the top — keep tension on quads"],
    cues:["Low foot placement is the key setup cue for quad emphasis — feet high targets hamstrings and glutes more","This machine lets you go very heavy safely — good for progressive overload on quads","Go deep — the quad growth stimulus increases dramatically past parallel"],
    mistakes:["Feet too high on the platform — changes muscle emphasis","Not going deep enough","Knees caving inward under load"],
  },
  "seated-curl":{
    equipment:"Seated leg curl machine",
    setup:"Sit in the machine with the back of your ankles above the pad. Adjust the thigh pad so it locks your legs in. Sit upright.",
    execution:["Curl your legs down and under the seat — go as far as the machine allows","Squeeze the hamstrings hard at full contraction","Return slowly — control the ascent for 2–3 seconds","Do not let the weight slam up"],
    cues:["Seated leg curl provides a better hamstring stretch at the start of the movement than lying leg curl — this is why it is superior for hypertrophy","Plantarflex your foot at the top — pointing your toes down increases hamstring contraction","Slow eccentric is critical for hamstring development"],
    mistakes:["Letting the weight slam at the top — losing the eccentric","Not reaching full extension at the start","Hips lifting off the seat to get more weight"],
  },
  "cable-kickback":{
    equipment:"Cable machine with ankle strap attachment set to lowest pulley",
    setup:"Attach the ankle strap to your ankle. Face the machine and hold onto it for support. Lean forward slightly at the hips. Start with your foot forward, slight bend in the working leg.",
    execution:["Kick your leg straight back — squeezing the glute as you extend","Stop when your leg is straight or slightly past your hip — do not hyperextend","Squeeze the glute hard at the peak for one second","Return the leg forward slowly — feel the glute stretch at the front"],
    cues:["This is pure glute activation — keep your core braced and do not rotate your hip","The squeeze at the top is the entire exercise — spend time there","Use a moderate weight — this is an isolation finisher not a strength movement"],
    mistakes:["Rotating the hip to get more range — removes glute isolation","Going too heavy and using momentum","Not squeezing at the top"],
  },
  "hip-abd-sat":{
    equipment:"Hip abduction machine — same as Wednesday",
    setup:"Same as Wednesday setup.",
    execution:["Same execution — push knees out, hold 1 second, return slowly"],
    cues:["Second hit of this muscle this week — by now you should feel it more readily","Slight increase in weight from Wednesday if Wednesday felt too easy"],
    mistakes:["Same as Wednesday version"],
  },
  "standing-calf":{
    equipment:"Standing calf raise machine — or a Smith machine with a plate under your feet",
    setup:"Stand with shoulders under the pads. Place balls of feet on the step, heels hanging off. Legs straight or with very slight bend.",
    execution:["Lower heels as far as possible — full stretch, pause 1–2 seconds","Rise as high as possible on the balls of your feet — squeeze calves maximally","Hold at the top for one second","Lower slowly back to the stretch"],
    cues:["The gastrocnemius is the large muscle that creates the calf bump — this standing version targets it best","Pause at the bottom stretch — the calf responds exceptionally well to loaded stretch","Calves are stubborn and need high volume and high reps to grow"],
    mistakes:["Bouncing at the bottom — the most common calf training error","Short range of motion — barely moving","Not going all the way up"],
  },
  "seated-calf-sat":{
    equipment:"Seated calf raise machine",
    setup:"Same as Wednesday seated calf setup.",
    execution:["Same execution as Wednesday — full stretch, full contraction"],
    cues:["The soleus is a postural muscle — it responds well to higher reps and longer time under tension","Second hit this week — calves need frequent training to grow"],
    mistakes:["Same as Wednesday version"],
  },
  "cable-crunch-sat":{
    equipment:"Cable machine with rope attachment at top pulley",
    setup:"Same as Monday cable crunch setup.",
    execution:["Same execution — curl the spine down, hips stay still","By Saturday this is your 4th core session this week — this is intentional accumulation"],
    cues:["Add a slight twist at the bottom on alternate reps if you want to add oblique work here","Focus on quality contraction — do not rush through"],
    mistakes:["Same as Monday version"],
  },
  "landmine-sat":{
    equipment:"Barbell with one end in corner or landmine attachment",
    setup:"Same as Friday setup.",
    execution:["Same execution as Friday — controlled rotation both directions"],
    cues:["By Saturday this is your second landmine session — you should feel more comfortable with the movement"],
    mistakes:["Same as Friday version"],
  },
  "plank-dip":{
    equipment:"Floor only",
    setup:"Start in a standard forearm plank position. Full body tight.",
    execution:["While maintaining the plank, rotate your hips to the left — lowering them toward the floor until they almost touch","Return to center","Rotate to the right — lower hips toward the floor","Return to center — that is one complete rep","Hips move, core stays braced throughout"],
    cues:["This adds rotational oblique work to the standard plank","The key is controlled rotation — hips move deliberately, not dropped","Keep your upper body completely still — only the hips rotate"],
    mistakes:["Moving too fast — this should be slow and deliberate","Hips touching the floor — reduce the range if needed","Shoulders rotating — only hips move"],
  },
};

// ─── MASTER EXERCISE CATALOG ─────────────────────────────────────────────────
const EXERCISES = {

  // Flat Barbell Bench Press
  "flat-barbell-bench": {
    id: "flat-barbell-bench",
    name: "Flat Barbell Bench Press",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bench-press"],
  },
  // Incline Barbell Press
  "incline-barbell-bench": {
    id: "incline-barbell-bench",
    name: "Incline Barbell Press",
    muscles: "Upper Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "incline-push",
    equipment: "barbell",
    instructions: INSTRUCTIONS["incline-bb"],
  },
  // Flat DB Bench Press
  "flat-db-bench": {
    id: "flat-db-bench",
    name: "Flat DB Bench Press",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["flat-db-press"],
  },
  // Incline DB Press
  "incline-db-press": {
    id: "incline-db-press",
    name: "Incline DB Press",
    muscles: "Upper Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "incline-push",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["incline-db-press"],
  },
  // Flat Bench Press
  "flat-bench-press": {
    id: "flat-bench-press",
    name: "Flat Bench Press",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bench-press"],
  },
  // DB Bench Press
  "db-bench": {
    id: "db-bench",
    name: "DB Bench Press",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "dumbbell",
    instructions: { stub: "Set bench flat. Hold dumbbells at chest level, elbows at 45°. Press up and in, squeeze at top. Full stretch at the bottom." },
  },
  // Machine Chest Press
  "machine-chest-press": {
    id: "machine-chest-press",
    name: "Machine Chest Press",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "machine",
    instructions: { stub: "Adjust seat so handles are at mid-chest. Press forward to full extension, control the return. Keep chest up throughout." },
  },
  // Cable Flyes (low to high)
  "cable-flyes-low": {
    id: "cable-flyes-low",
    name: "Cable Flyes (low to high)",
    muscles: "Upper Chest, Inner Chest",
    muscleGroup: "chest",
    category: "isolation",
    swapGroup: "chest-fly",
    equipment: "cable",
    instructions: { stub: "Set cables at lowest position. With slight elbow bend, sweep arms up and together in an arc. Squeeze at the top. Return slowly." },
  },
  // Cable Flyes (mid)
  "cable-flyes-mid": {
    id: "cable-flyes-mid",
    name: "Cable Flyes (mid)",
    muscles: "Chest, Inner Chest",
    muscleGroup: "chest",
    category: "isolation",
    swapGroup: "chest-fly",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-fly"],
  },
  // DB Flyes
  "db-flyes": {
    id: "db-flyes",
    name: "DB Flyes",
    muscles: "Chest, Inner Chest",
    muscleGroup: "chest",
    category: "isolation",
    swapGroup: "chest-fly",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["db-fly"],
  },
  // Weighted Dips
  "weighted-dips": {
    id: "weighted-dips",
    name: "Weighted Dips",
    muscles: "Lower Chest, Triceps, Front Delts",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "dip",
    equipment: "bodyweight",
    instructions: { stub: "Lean forward slightly for chest emphasis. Lower until elbows at 90°, drive back up. Add weight via belt or hold dumbbell between feet." },
  },
  // Dips
  "dips": {
    id: "dips",
    name: "Dips",
    muscles: "Lower Chest, Triceps, Front Delts",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "dip",
    equipment: "bodyweight",
    instructions: { stub: "Lean slightly forward to bias chest. Lower controlled until elbows reach 90°. Press back up without locking out fully." },
  },
  // Push-ups
  "push-ups": {
    id: "push-ups",
    name: "Push-ups",
    muscles: "Chest, Front Delts, Triceps",
    muscleGroup: "chest",
    category: "compound",
    swapGroup: "horizontal-push",
    equipment: "bodyweight",
    instructions: { stub: "Hands slightly wider than shoulders. Lower chest to floor with elbows at 45°. Press back up to full extension. Keep body in a rigid plank throughout." },
  },
  // Seated DB Press
  "seated-db-press": {
    id: "seated-db-press",
    name: "Seated DB Press",
    muscles: "Front Delts, Side Delts, Triceps",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["seated-db-press"],
  },
  // Standing OHP
  "standing-ohp": {
    id: "standing-ohp",
    name: "Standing OHP",
    muscles: "Front Delts, Side Delts, Triceps, Core",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "barbell",
    instructions: { stub: "Grip just outside shoulder width. Brace core, press bar straight up, shrug at top. Lower to clavicle level. Keep ribs down." },
  },
  // Standing DB OHP
  "standing-db-ohp": {
    id: "standing-db-ohp",
    name: "Standing DB OHP",
    muscles: "Front Delts, Side Delts, Triceps, Core",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "dumbbell",
    instructions: { stub: "Stand feet shoulder-width. Press dumbbells overhead in a slight arc. Lower controlled to shoulder height." },
  },
  // Arnold Press
  "arnold-press": {
    id: "arnold-press",
    name: "Arnold Press",
    muscles: "Front Delts, Side Delts, Rear Delts, Triceps",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["arnold-press"],
  },
  // DB Arnold Press
  "db-arnold-press": {
    id: "db-arnold-press",
    name: "DB Arnold Press",
    muscles: "Front Delts, Side Delts, Rear Delts, Triceps",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["arnold-press"],
  },
  // Push Press
  "push-press": {
    id: "push-press",
    name: "Push Press",
    muscles: "Front Delts, Side Delts, Triceps, Legs",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "overhead-press",
    equipment: "barbell",
    instructions: { stub: "Use slight knee dip to generate momentum. Drive bar overhead explosively. Lower controlled back to shoulders. Keep core braced." },
  },
  // Lateral Raises
  "lateral-raises": {
    id: "lateral-raises",
    name: "Lateral Raises",
    muscles: "Side Delts",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "lateral-raise",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["lat-raise-mon"],
  },
  // Cable Lateral Raises
  "cable-lateral-raises": {
    id: "cable-lateral-raises",
    name: "Cable Lateral Raises",
    muscles: "Side Delts",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "lateral-raise",
    equipment: "cable",
    instructions: INSTRUCTIONS["lat-raise-thu"],
  },
  // Front Raises (cable)
  "front-raises-cable": {
    id: "front-raises-cable",
    name: "Front Raises (cable)",
    muscles: "Front Delts",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "front-raise",
    equipment: "cable",
    instructions: INSTRUCTIONS["front-raise"],
  },
  // Rear Delt Flyes
  "rear-delt-flyes": {
    id: "rear-delt-flyes",
    name: "Rear Delt Flyes",
    muscles: "Rear Delts, Upper Back",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "rear-delt",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["rear-delt-raise"],
  },
  // Rear Delt Machine
  "rear-delt-machine": {
    id: "rear-delt-machine",
    name: "Rear Delt Machine",
    muscles: "Rear Delts, Upper Back",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "rear-delt",
    equipment: "machine",
    instructions: { stub: "Set machine handles at shoulder height. With slight elbow bend, push handles back and out. Squeeze rear delts at full extension." },
  },
  // Reverse Flyes
  "reverse-flyes": {
    id: "reverse-flyes",
    name: "Reverse Flyes",
    muscles: "Rear Delts, Upper Back",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "rear-delt",
    equipment: "dumbbell",
    instructions: { stub: "Hinge at hips, back flat. With slight elbow bend, raise arms out to sides. Lead with elbows, squeeze rear delts at top." },
  },
  // Reverse Pec Deck
  "reverse-pec-deck": {
    id: "reverse-pec-deck",
    name: "Reverse Pec Deck",
    muscles: "Rear Delts, Upper Back",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "rear-delt",
    equipment: "machine",
    instructions: { stub: "Face the machine, grab handles. Push arms out and back in an arc. Control the return — don't let weight slam." },
  },
  // Face Pulls
  "face-pulls": {
    id: "face-pulls",
    name: "Face Pulls",
    muscles: "Rear Delts, External Rotators, Upper Back",
    muscleGroup: "shoulders",
    category: "isolation",
    swapGroup: "rear-delt",
    equipment: "cable",
    instructions: INSTRUCTIONS["face-pull"],
  },
  // Upright Rows (cable)
  "upright-rows-cable": {
    id: "upright-rows-cable",
    name: "Upright Rows (cable)",
    muscles: "Side Delts, Traps, Biceps",
    muscleGroup: "shoulders",
    category: "compound",
    swapGroup: "upright-row",
    equipment: "cable",
    instructions: { stub: "Grip cable narrow, pull up to chin with elbows leading. Keep bar close to body. Stop when elbows reach shoulder height." },
  },
  // Tricep Pushdowns
  "tricep-pushdowns": {
    id: "tricep-pushdowns",
    name: "Tricep Pushdowns",
    muscles: "Triceps (all heads)",
    muscleGroup: "triceps",
    category: "isolation",
    swapGroup: "tricep-pushdown",
    equipment: "cable",
    instructions: INSTRUCTIONS["rope-pushdown"],
  },
  // Cable Pushdowns
  "cable-pushdowns": {
    id: "cable-pushdowns",
    name: "Cable Pushdowns",
    muscles: "Triceps (all heads)",
    muscleGroup: "triceps",
    category: "isolation",
    swapGroup: "tricep-pushdown",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-pushdown"],
  },
  // Overhead Tricep Extension (rope)
  "overhead-tricep-ext-rope": {
    id: "overhead-tricep-ext-rope",
    name: "Overhead Tricep Extension (rope)",
    muscles: "Triceps Long Head",
    muscleGroup: "triceps",
    category: "isolation",
    swapGroup: "tricep-overhead",
    equipment: "cable",
    instructions: INSTRUCTIONS["oh-ext"],
  },
  // Overhead Tricep Extension
  "overhead-tricep-ext": {
    id: "overhead-tricep-ext",
    name: "Overhead Tricep Extension",
    muscles: "Triceps Long Head",
    muscleGroup: "triceps",
    category: "isolation",
    swapGroup: "tricep-overhead",
    equipment: "dumbbell",
    instructions: { stub: "Hold dumbbell overhead with both hands. Lower behind head by bending elbows only. Drive back up to full extension." },
  },
  // Skull Crushers
  "skull-crushers": {
    id: "skull-crushers",
    name: "Skull Crushers",
    muscles: "Triceps Long Head, Medial Head",
    muscleGroup: "triceps",
    category: "isolation",
    swapGroup: "tricep-overhead",
    equipment: "barbell",
    instructions: INSTRUCTIONS["skull-crusher"],
  },
  // Close Grip Bench
  "close-grip-bench": {
    id: "close-grip-bench",
    name: "Close Grip Bench",
    muscles: "Triceps, Inner Chest, Front Delts",
    muscleGroup: "triceps",
    category: "compound",
    swapGroup: "tricep-compound",
    equipment: "barbell",
    instructions: INSTRUCTIONS["cg-bench"],
  },
  // Conventional Deadlifts
  "conventional-deadlift": {
    id: "conventional-deadlift",
    name: "Conventional Deadlifts",
    muscles: "Full Posterior Chain — Hamstrings, Glutes, Erectors, Lats, Traps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "deadlift",
    equipment: "barbell",
    instructions: INSTRUCTIONS["deadlift"],
  },
  // Barbell Rows
  "barbell-rows": {
    id: "barbell-rows",
    name: "Barbell Rows",
    muscles: "Lats, Mid Back, Rear Delts, Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bb-row"],
  },
  // Heavy Barbell Rows
  "heavy-barbell-rows": {
    id: "heavy-barbell-rows",
    name: "Heavy Barbell Rows",
    muscles: "Lats, Mid Back, Rear Delts, Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bb-row"],
  },
  // Cable Rows
  "cable-rows": {
    id: "cable-rows",
    name: "Cable Rows",
    muscles: "Mid Back, Lats, Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-row"],
  },
  // Seated Cable Row (wide)
  "seated-cable-row-wide": {
    id: "seated-cable-row-wide",
    name: "Seated Cable Row (wide)",
    muscles: "Upper Back, Rear Delts, Lats",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "cable",
    instructions: { stub: "Use wide grip attachment. Pull to lower chest, flare elbows out to engage upper back. Squeeze shoulder blades at the end position." },
  },
  // Single Arm DB Row
  "single-arm-db-row": {
    id: "single-arm-db-row",
    name: "Single Arm DB Row",
    muscles: "Lats, Mid Back, Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["sa-row"],
  },
  // DB Rows
  "db-rows": {
    id: "db-rows",
    name: "DB Rows",
    muscles: "Lats, Mid Back, Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["sa-row"],
  },
  // Chest Supported DB Row
  "chest-supported-db-row": {
    id: "chest-supported-db-row",
    name: "Chest Supported DB Row",
    muscles: "Mid Back, Lats, Rear Delts",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "dumbbell",
    instructions: { stub: "Set incline bench to 30-45°. Lie chest-down, let arms hang. Row dumbbells to hips, squeeze shoulder blades. Full stretch at bottom." },
  },
  // Pull-ups
  "pull-ups": {
    id: "pull-ups",
    name: "Pull-ups",
    muscles: "Lats, Biceps, Rear Delts",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["pull-up"],
  },
  // Weighted Pull-ups
  "weighted-pull-ups": {
    id: "weighted-pull-ups",
    name: "Weighted Pull-ups",
    muscles: "Lats, Biceps, Rear Delts",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["pull-up"],
  },
  // Wide Grip Pull-ups
  "wide-grip-pull-ups": {
    id: "wide-grip-pull-ups",
    name: "Wide Grip Pull-ups",
    muscles: "Lats (outer), Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["wide-pullup"],
  },
  // Pull-ups (assisted if needed)
  "pull-ups-assisted": {
    id: "pull-ups-assisted",
    name: "Pull-ups (assisted if needed)",
    muscles: "Lats, Biceps, Rear Delts",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "machine",
    instructions: { stub: "Use assisted pull-up machine or resistance band. Same form as standard pull-up. Reduce assistance as you get stronger." },
  },
  // Lat Pulldowns
  "lat-pulldowns": {
    id: "lat-pulldowns",
    name: "Lat Pulldowns",
    muscles: "Lats, Biceps, Rear Delts",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "cable",
    instructions: INSTRUCTIONS["lat-pulldown"],
  },
  // Wide Grip Lat Pulldown
  "wide-grip-lat-pulldown": {
    id: "wide-grip-lat-pulldown",
    name: "Wide Grip Lat Pulldown",
    muscles: "Lats (outer), Biceps",
    muscleGroup: "back",
    category: "compound",
    swapGroup: "vertical-pull",
    equipment: "cable",
    instructions: INSTRUCTIONS["lat-pulldown"],
  },
  // Single Arm Pulldown
  "single-arm-pulldown": {
    id: "single-arm-pulldown",
    name: "Single Arm Pulldown",
    muscles: "Lats, Biceps",
    muscleGroup: "back",
    category: "isolation",
    swapGroup: "vertical-pull",
    equipment: "cable",
    instructions: INSTRUCTIONS["sa-pulldown"],
  },
  // Straight Arm Pulldowns
  "straight-arm-pulldowns": {
    id: "straight-arm-pulldowns",
    name: "Straight Arm Pulldowns",
    muscles: "Lats",
    muscleGroup: "back",
    category: "isolation",
    swapGroup: "lat-isolation",
    equipment: "cable",
    instructions: { stub: "Keep arms straight. Pull bar from overhead to hips in an arc. Focus entirely on lat contraction — no elbow bend." },
  },
  // DB Shrugs
  "db-shrugs": {
    id: "db-shrugs",
    name: "DB Shrugs",
    muscles: "Upper Traps",
    muscleGroup: "back",
    category: "isolation",
    swapGroup: "trap-shrug",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["db-shrug"],
  },
  // Barbell Shrugs
  "barbell-shrugs": {
    id: "barbell-shrugs",
    name: "Barbell Shrugs",
    muscles: "Upper Traps",
    muscleGroup: "back",
    category: "isolation",
    swapGroup: "trap-shrug",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bb-shrug"],
  },
  // Barbell Curls
  "barbell-curls": {
    id: "barbell-curls",
    name: "Barbell Curls",
    muscles: "Biceps (long and short head)",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "barbell",
    instructions: INSTRUCTIONS["bb-curl"],
  },
  // Hammer Curls
  "hammer-curls": {
    id: "hammer-curls",
    name: "Hammer Curls",
    muscles: "Brachialis, Biceps, Brachioradialis",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["hammer-curl"],
  },
  // Incline DB Curls
  "incline-db-curls": {
    id: "incline-db-curls",
    name: "Incline DB Curls",
    muscles: "Biceps Long Head",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["incline-curl"],
  },
  // Cable Curls
  "cable-curls": {
    id: "cable-curls",
    name: "Cable Curls",
    muscles: "Biceps",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-curl"],
  },
  // Seated DB Curls
  "seated-db-curls": {
    id: "seated-db-curls",
    name: "Seated DB Curls",
    muscles: "Biceps",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["seated-curl"],
  },
  // EZ Bar Curls
  "ez-bar-curls": {
    id: "ez-bar-curls",
    name: "EZ Bar Curls",
    muscles: "Biceps, Brachialis",
    muscleGroup: "biceps",
    category: "isolation",
    swapGroup: "bicep-curl",
    equipment: "barbell",
    instructions: { stub: "Use EZ bar to reduce wrist strain. Keep elbows pinned at sides. Curl to shoulder height, squeeze, lower controlled." },
  },
  // Wrist Curls
  "wrist-curls": {
    id: "wrist-curls",
    name: "Wrist Curls",
    muscles: "Forearm Flexors",
    muscleGroup: "forearms",
    category: "isolation",
    swapGroup: "forearm",
    equipment: "barbell",
    instructions: INSTRUCTIONS["wrist-curl"],
  },
  // Reverse Wrist Curls
  "reverse-wrist-curls": {
    id: "reverse-wrist-curls",
    name: "Reverse Wrist Curls",
    muscles: "Forearm Extensors",
    muscleGroup: "forearms",
    category: "isolation",
    swapGroup: "forearm",
    equipment: "barbell",
    instructions: INSTRUCTIONS["rev-wrist-curl"],
  },
  // Back Squats
  "back-squats": {
    id: "back-squats",
    name: "Back Squats",
    muscles: "Quads, Glutes, Hamstrings, Core",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "squat",
    equipment: "barbell",
    instructions: INSTRUCTIONS["back-squat"],
  },
  // Bulgarian Split Squats
  "bulgarian-split-squats": {
    id: "bulgarian-split-squats",
    name: "Bulgarian Split Squats",
    muscles: "Quads, Glutes, Hip Flexors",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "single-leg",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["bulgarian-ss"],
  },
  // Leg Press
  "leg-press": {
    id: "leg-press",
    name: "Leg Press",
    muscles: "Quads, Glutes",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "squat",
    equipment: "machine",
    instructions: INSTRUCTIONS["leg-press"],
  },
  // Hack Squat
  "hack-squat": {
    id: "hack-squat",
    name: "Hack Squat",
    muscles: "Quads, Glutes",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "squat",
    equipment: "machine",
    instructions: INSTRUCTIONS["hack-squat"],
  },
  // Goblet Squats
  "goblet-squats": {
    id: "goblet-squats",
    name: "Goblet Squats",
    muscles: "Quads, Glutes, Core",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "squat",
    equipment: "dumbbell",
    instructions: { stub: "Hold dumbbell at chest. Feet shoulder-width, toes slightly out. Squat deep — elbows track inside knees. Drive through heels to stand." },
  },
  // Leg Extensions
  "leg-extensions": {
    id: "leg-extensions",
    name: "Leg Extensions",
    muscles: "Quads",
    muscleGroup: "quads",
    category: "isolation",
    swapGroup: "quad-isolation",
    equipment: "machine",
    instructions: INSTRUCTIONS["leg-ext"],
  },
  // Walking Lunges
  "walking-lunges": {
    id: "walking-lunges",
    name: "Walking Lunges",
    muscles: "Quads, Glutes, Hamstrings",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "lunge",
    equipment: "bodyweight",
    instructions: { stub: "Step forward into lunge, back knee touches floor lightly. Drive through front heel into next step. Keep torso upright throughout." },
  },
  // Walking Lunges (DB)
  "walking-lunges-db": {
    id: "walking-lunges-db",
    name: "Walking Lunges (DB)",
    muscles: "Quads, Glutes, Hamstrings",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "lunge",
    equipment: "dumbbell",
    instructions: { stub: "Hold dumbbells at sides. Step into lunge, lower back knee near floor. Drive through front heel to step forward. Chest up." },
  },
  // DB Lunges
  "db-lunges": {
    id: "db-lunges",
    name: "DB Lunges",
    muscles: "Quads, Glutes, Hamstrings",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "lunge",
    equipment: "dumbbell",
    instructions: { stub: "Hold dumbbells at sides. Step forward into lunge. Lower back knee toward floor. Push back to start or alternate legs." },
  },
  // Step-ups (weighted)
  "step-ups-weighted": {
    id: "step-ups-weighted",
    name: "Step-ups (weighted)",
    muscles: "Quads, Glutes",
    muscleGroup: "quads",
    category: "compound",
    swapGroup: "single-leg",
    equipment: "dumbbell",
    instructions: { stub: "Hold dumbbells at sides. Step onto box, drive through heel to stand. Lower back controlled. Complete all reps one side then switch." },
  },
  // Balance Work (single leg)
  "balance-work": {
    id: "balance-work",
    name: "Balance Work (single leg)",
    muscles: "Glutes, Quads, Stabilizers",
    muscleGroup: "quads",
    category: "isolation",
    swapGroup: "single-leg",
    equipment: "bodyweight",
    instructions: { stub: "Stand on one leg. Hold for time or perform small movements. Progress to eyes closed or unstable surface. Builds joint stability." },
  },
  // Romanian Deadlifts
  "romanian-deadlifts": {
    id: "romanian-deadlifts",
    name: "Romanian Deadlifts",
    muscles: "Hamstrings, Glutes, Spinal Erectors",
    muscleGroup: "hamstrings",
    category: "compound",
    swapGroup: "hip-hinge",
    equipment: "barbell",
    instructions: INSTRUCTIONS["rdl"],
  },
  // Lying Leg Curls
  "lying-leg-curls": {
    id: "lying-leg-curls",
    name: "Lying Leg Curls",
    muscles: "Hamstrings",
    muscleGroup: "hamstrings",
    category: "isolation",
    swapGroup: "hamstring-curl",
    equipment: "machine",
    instructions: { stub: "Lie face down. Curl heels toward glutes, pause at top. Lower slowly. Keep hips pressed into pad — don't let them rise." },
  },
  // Hip Thrusts (barbell)
  "hip-thrusts-barbell": {
    id: "hip-thrusts-barbell",
    name: "Hip Thrusts (barbell)",
    muscles: "Glutes, Hamstrings",
    muscleGroup: "glutes",
    category: "compound",
    swapGroup: "hip-thrust",
    equipment: "barbell",
    instructions: INSTRUCTIONS["hip-thrust"],
  },
  // Hip Thrusts
  "hip-thrusts": {
    id: "hip-thrusts",
    name: "Hip Thrusts",
    muscles: "Glutes, Hamstrings",
    muscleGroup: "glutes",
    category: "compound",
    swapGroup: "hip-thrust",
    equipment: "dumbbell",
    instructions: { stub: "Upper back on bench. Drive hips up until body is flat, squeeze glutes hard at top. Lower controlled. Keep chin tucked." },
  },
  // Glute Kickbacks (cable)
  "glute-kickbacks": {
    id: "glute-kickbacks",
    name: "Glute Kickbacks (cable)",
    muscles: "Glutes",
    muscleGroup: "glutes",
    category: "isolation",
    swapGroup: "glute-isolation",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-kickback"],
  },
  // Hip Abduction
  "hip-abduction": {
    id: "hip-abduction",
    name: "Hip Abduction",
    muscles: "Glute Medius, Hip Abductors",
    muscleGroup: "glutes",
    category: "isolation",
    swapGroup: "glute-isolation",
    equipment: "machine",
    instructions: INSTRUCTIONS["hip-abd-wed"],
  },
  // Standing Calf Raises
  "standing-calf-raises": {
    id: "standing-calf-raises",
    name: "Standing Calf Raises",
    muscles: "Gastrocnemius",
    muscleGroup: "calves",
    category: "isolation",
    swapGroup: "calf-raise",
    equipment: "machine",
    instructions: INSTRUCTIONS["standing-calf"],
  },
  // Seated Calf Raises
  "seated-calf-raises": {
    id: "seated-calf-raises",
    name: "Seated Calf Raises",
    muscles: "Soleus",
    muscleGroup: "calves",
    category: "isolation",
    swapGroup: "calf-raise",
    equipment: "machine",
    instructions: INSTRUCTIONS["seated-calf-wed"],
  },
  // Calf Raises
  "calf-raises": {
    id: "calf-raises",
    name: "Calf Raises",
    muscles: "Gastrocnemius, Soleus",
    muscleGroup: "calves",
    category: "isolation",
    swapGroup: "calf-raise",
    equipment: "bodyweight",
    instructions: { stub: "Rise onto toes, pause at top, lower slowly below platform. Full range of motion. Add weight via dumbbell or machine." },
  },
  // Hanging Leg Raises
  "hanging-leg-raises": {
    id: "hanging-leg-raises",
    name: "Hanging Leg Raises",
    muscles: "Lower Abs, Hip Flexors",
    muscleGroup: "core",
    category: "core",
    swapGroup: "hanging-core",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["hang-leg-mon"],
  },
  // Cable Crunches
  "cable-crunches": {
    id: "cable-crunches",
    name: "Cable Crunches",
    muscles: "Upper Abs, Rectus Abdominis",
    muscleGroup: "core",
    category: "core",
    swapGroup: "weighted-core",
    equipment: "cable",
    instructions: INSTRUCTIONS["cable-crunch-mon"],
  },
  // Plank Hold
  "plank-hold": {
    id: "plank-hold",
    name: "Plank Hold",
    muscles: "Core, Transverse Abdominis, Shoulders",
    muscleGroup: "core",
    category: "core",
    swapGroup: "plank",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["plank-mon"],
  },
  // Plank to Push-up
  "plank-to-push-up": {
    id: "plank-to-push-up",
    name: "Plank to Push-up",
    muscles: "Core, Chest, Triceps",
    muscleGroup: "core",
    category: "core",
    swapGroup: "plank",
    equipment: "bodyweight",
    instructions: { stub: "Start in forearm plank. Press up to push-up position one arm at a time. Lower back to forearms. Keep hips level — don't rotate." },
  },
  // Ab Wheel Rollouts
  "ab-wheel-rollouts": {
    id: "ab-wheel-rollouts",
    name: "Ab Wheel Rollouts",
    muscles: "Core, Lats, Shoulders",
    muscleGroup: "core",
    category: "core",
    swapGroup: "weighted-core",
    equipment: "other",
    instructions: INSTRUCTIONS["ab-wheel"],
  },
  // Dead Bug
  "dead-bug": {
    id: "dead-bug",
    name: "Dead Bug",
    muscles: "Deep Core, Transverse Abdominis",
    muscleGroup: "core",
    category: "core",
    swapGroup: "anti-extension",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["dead-bug"],
  },
  // Pallof Press
  "pallof-press": {
    id: "pallof-press",
    name: "Pallof Press",
    muscles: "Core, Anti-Rotation Muscles",
    muscleGroup: "core",
    category: "core",
    swapGroup: "anti-rotation",
    equipment: "cable",
    instructions: INSTRUCTIONS["pallof-press"],
  },
  // Russian Twists
  "russian-twists": {
    id: "russian-twists",
    name: "Russian Twists",
    muscles: "Obliques, Rectus Abdominis",
    muscleGroup: "core",
    category: "core",
    swapGroup: "rotational-core",
    equipment: "bodyweight",
    instructions: { stub: "Sit with knees bent, lean back 45°. Rotate torso side to side. Add weight for more challenge. Keep feet elevated for harder variation." },
  },
  // Oblique Crunches
  "oblique-crunches": {
    id: "oblique-crunches",
    name: "Oblique Crunches",
    muscles: "Obliques",
    muscleGroup: "core",
    category: "core",
    swapGroup: "rotational-core",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["oblique-crunch"],
  },
  // Side Plank
  "side-plank": {
    id: "side-plank",
    name: "Side Plank",
    muscles: "Obliques, Glute Medius",
    muscleGroup: "core",
    category: "core",
    swapGroup: "plank",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["side-plank"],
  },
  // Decline Sit-ups
  "decline-sit-ups": {
    id: "decline-sit-ups",
    name: "Decline Sit-ups",
    muscles: "Rectus Abdominis, Hip Flexors",
    muscleGroup: "core",
    category: "core",
    swapGroup: "weighted-core",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["decline-situp"],
  },
  // Plank Hip Dips
  "plank-hip-dips": {
    id: "plank-hip-dips",
    name: "Plank Hip Dips",
    muscles: "Obliques, Core",
    muscleGroup: "core",
    category: "core",
    swapGroup: "plank",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["plank-dip"],
  },
  // Landmine Rotations
  "landmine-rotations": {
    id: "landmine-rotations",
    name: "Landmine Rotations",
    muscles: "Obliques, Shoulders, Core",
    muscleGroup: "core",
    category: "core",
    swapGroup: "rotational-core",
    equipment: "barbell",
    instructions: INSTRUCTIONS["landmine-fri"],
  },
  // Landmine Press
  "landmine-press": {
    id: "landmine-press",
    name: "Landmine Press",
    muscles: "Chest, Front Delt, Core",
    muscleGroup: "core",
    category: "compound",
    swapGroup: "rotational-core",
    equipment: "barbell",
    instructions: INSTRUCTIONS["landmine-sat"],
  },
  // Farmer Carries
  "farmer-carries": {
    id: "farmer-carries",
    name: "Farmer Carries",
    muscles: "Forearms, Traps, Core, Legs",
    muscleGroup: "core",
    category: "compound",
    swapGroup: "carry",
    equipment: "dumbbell",
    instructions: INSTRUCTIONS["farmer-carry"],
  },
  // Neck Training
  "neck-training": {
    id: "neck-training",
    name: "Neck Training",
    muscles: "Neck Flexors, Extensors, Lateral",
    muscleGroup: "core",
    category: "isolation",
    swapGroup: "neck",
    equipment: "bodyweight",
    instructions: INSTRUCTIONS["neck-tue"],
  },
  // Trap Bar Deadlifts
  "trap-bar-deadlifts": {
    id: "trap-bar-deadlifts",
    name: "Trap Bar Deadlifts",
    muscles: "Quads, Hamstrings, Glutes, Back, Traps",
    muscleGroup: "full-body",
    category: "compound",
    swapGroup: "deadlift",
    equipment: "barbell",
    instructions: { stub: "Stand inside hex bar, grip handles. Hinge and sit back like a squat-deadlift hybrid. Drive through floor, stand tall. Safer on lower back than conventional." },
  },
  // Renegade Rows
  "renegade-rows": {
    id: "renegade-rows",
    name: "Renegade Rows",
    muscles: "Back, Core, Shoulders",
    muscleGroup: "full-body",
    category: "compound",
    swapGroup: "horizontal-pull",
    equipment: "dumbbell",
    instructions: { stub: "In push-up position holding dumbbells. Row one dumbbell to hip while balancing. Keep hips square — don't rotate. Alternate sides." },
  },
  // Thrusters
  "thrusters": {
    id: "thrusters",
    name: "Thrusters",
    muscles: "Quads, Glutes, Shoulders, Core",
    muscleGroup: "full-body",
    category: "compound",
    swapGroup: "squat",
    equipment: "barbell",
    instructions: { stub: "Hold bar at shoulders. Squat deep, use momentum from standing to press bar overhead. One fluid movement." },
  },
  // Burpees
  "burpees": {
    id: "burpees",
    name: "Burpees",
    muscles: "Full Body",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "bodyweight",
    instructions: { stub: "Drop to floor, kick feet back, chest to ground, jump feet forward, explode up. Modify by stepping instead of jumping." },
  },
  // KB Swings
  "kb-swings": {
    id: "kb-swings",
    name: "KB Swings",
    muscles: "Glutes, Hamstrings, Core, Shoulders",
    muscleGroup: "cardio",
    category: "compound",
    swapGroup: "conditioning",
    equipment: "other",
    instructions: { stub: "Hinge at hips, swing KB back between legs. Drive hips forward explosively — hips drive the swing, not your arms. Float to chest height." },
  },
  // Mountain Climbers
  "mountain-climbers": {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    muscles: "Core, Hip Flexors, Shoulders",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "bodyweight",
    instructions: { stub: "In push-up position. Drive knees to chest alternating fast. Keep hips level, core tight. Don't let hips pike up." },
  },
  // Box Jumps
  "box-jumps": {
    id: "box-jumps",
    name: "Box Jumps",
    muscles: "Quads, Glutes, Calves",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "plyometric",
    equipment: "other",
    instructions: { stub: "Load into quarter squat, explode up onto box, land softly with knees bent. Step down — don't jump down. Full reset before each rep." },
  },
  // Battle Ropes
  "battle-ropes": {
    id: "battle-ropes",
    name: "Battle Ropes",
    muscles: "Shoulders, Core, Arms",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "other",
    instructions: { stub: "Hold rope ends, alternate or double-wave. Stay in athletic stance with slight knee bend. Keep waves going to the anchor. Vary: alternating, double, slam." },
  },
  // Sled Push
  "sled-push": {
    id: "sled-push",
    name: "Sled Push",
    muscles: "Quads, Glutes, Core, Calves",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "other",
    instructions: { stub: "Lean forward into sled at 45°. Drive through balls of feet with short powerful steps. Keep hips low. Load progressively." },
  },
  // Barbell Complexes
  "barbell-complexes": {
    id: "barbell-complexes",
    name: "Barbell Complexes",
    muscles: "Full Body",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "barbell",
    instructions: { stub: "Series of exercises done back-to-back without setting bar down. Common: deadlift → row → clean → press → squat. Use light weight." },
  },
  // Ball Slams
  "ball-slams": {
    id: "ball-slams",
    name: "Ball Slams",
    muscles: "Core, Shoulders, Lats",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "conditioning",
    equipment: "other",
    instructions: { stub: "Lift medicine ball overhead. Slam down as hard as possible, catch or pick up. Generate power from your whole body." },
  },
  // Incline Treadmill Walk (12-15%)
  "incline-treadmill-walk": {
    id: "incline-treadmill-walk",
    name: "Incline Treadmill Walk (12-15%)",
    muscles: "Glutes, Calves, Cardio",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "liss-cardio",
    equipment: "machine",
    instructions: { stub: "Set treadmill to 12-15% incline, 3.0-4.0 mph. Do not hold rails. Keep HR 130-150 bpm. 30-45 min Zone 2 steady state." },
  },
  // Treadmill Sprints
  "treadmill-sprints": {
    id: "treadmill-sprints",
    name: "Treadmill Sprints",
    muscles: "Full Body, Cardio",
    muscleGroup: "cardio",
    category: "cardio",
    swapGroup: "hiit-cardio",
    equipment: "machine",
    instructions: { stub: "Sprint intervals: 20-30s at max effort, 40-60s rest. 6-10 rounds." },
  },
  // Foam Rolling (Full Body)
  "foam-rolling": {
    id: "foam-rolling",
    name: "Foam Rolling (Full Body)",
    muscles: "Recovery",
    muscleGroup: "mobility",
    category: "mobility",
    swapGroup: "recovery",
    equipment: "other",
    instructions: { stub: "Spend 30-60s per muscle group. Roll slowly, pause on tight spots. Focus on quads, IT band, upper back, lats." },
  },
  // Yoga Flow
  "yoga-flow": {
    id: "yoga-flow",
    name: "Yoga Flow",
    muscles: "Full Body Mobility",
    muscleGroup: "mobility",
    category: "mobility",
    swapGroup: "recovery",
    equipment: "bodyweight",
    instructions: { stub: "Sun salutations, warrior poses, pigeon pose. Move with breath. Focus on hip flexors, thoracic spine, and hamstrings." },
  },
  // Light Walk
  "light-walk": {
    id: "light-walk",
    name: "Light Walk",
    muscles: "Recovery, Cardio",
    muscleGroup: "mobility",
    category: "mobility",
    swapGroup: "recovery",
    equipment: "bodyweight",
    instructions: { stub: "15-30 min easy walk. Active recovery — keeps blood moving without adding stress. Outdoors preferred." },
  },

};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Get all exercises in the same swap group (valid substitutes)
function getSwaps(exerciseId) {
  const ex = EXERCISES[exerciseId];
  if (!ex) return [];
  return Object.values(EXERCISES).filter(e => 
    e.swapGroup === ex.swapGroup && e.id !== exerciseId
  );
}

// Get all exercises for a muscle group
function getByMuscleGroup(group) {
  return Object.values(EXERCISES).filter(e => e.muscleGroup === group);
}

// Get exercises by equipment type
function getByEquipment(equip) {
  return Object.values(EXERCISES).filter(e => e.equipment === equip);
}

// Get compound exercises only
function getCompounds() {
  return Object.values(EXERCISES).filter(e => e.category === "compound");
}

// Check if exercise has full instructions or just a stub
function hasFullInstructions(exerciseId) {
  const ex = EXERCISES[exerciseId];
  return ex && ex.instructions && !ex.instructions.stub;
}

// All muscle groups in the catalog
const MUSCLE_GROUPS = [...new Set(Object.values(EXERCISES).map(e => e.muscleGroup))].sort();

// All swap groups (for building the swap engine)
const SWAP_GROUPS = [...new Set(Object.values(EXERCISES).map(e => e.swapGroup))].sort();
