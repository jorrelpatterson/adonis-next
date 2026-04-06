# Adonis v2 — Protocol Engine Architecture

**Date:** 2026-04-05
**Status:** Draft
**Scope:** Full architectural redesign — protocol engine, goal system, routine assembler, monetization, and modular refactor from app.html monolith to Vite + React.

---

## 1. Problem Statement

Adonis is a health optimization OS spanning 9 domains (Body, Money, Travel, Mind, Image, Community, Environment, Purpose, Bucket List). The current implementation is a ~7,600-line minified single-file React app (`app.html`) with no build step.

**Core issues:**
- `buildRoutine()` is a 400+ line monolith with hardcoded per-domain if-statements. Adding a new protocol requires hacking into this function.
- No shared concept of what a "protocol" is. Peptide doses, workouts, skincare steps, and citizenship tasks are all ad-hoc routine items.
- No cross-domain goal coordination. A goal like "go to Egypt" can't activate protocols across Travel, Money, Image, and Body simultaneously.
- Monetization is disconnected from the protocol flow. Peptides are sold in a separate tab, not embedded in the daily tasks that need them.
- Feature injections into the minified file are fragile — multiple features have failed injection (swap engine, equipment selector).

**What we're building:** A modular protocol engine where every domain is a self-contained plugin, every task traces to a goal, every goal has a revenue path, and the system does as much as possible automatically.

**What we're preserving:** The entire UI/UX — dark luxury design system, animations, component styling, tab structure, and daily routine feel.

---

## 2. Architecture Overview

Three-layer pipeline:

```
Goals → Protocols → Routine
```

1. **Goals** — what the user wants ("lose 30lbs", "go to Egypt", "build credit to 750")
2. **Protocols** — modular engines that generate daily tasks toward a goal. A single goal can activate multiple protocols across multiple domains.
3. **Routine** — the daily planner that collects, prioritizes, schedules, and renders tasks from all active protocols.

Supporting systems:
- **Upsell Engine** — monitors protocol state and surfaces upgrade/product recommendations at optimal moments
- **Retention Protocol** — monitors engagement and intervenes to prevent churn
- **Automation Layer** — executes tasks without user involvement (Elite tier)

---

## 3. Technical Foundation

### Build System

Migrate from CDN-loaded single-file React to **Vite + React**:
- Standard `.jsx` files with ES module imports
- `npm run dev` for local development with hot reload
- `npm run build` outputs static bundle for Vercel
- Vercel auto-deploys from `main` branch (unchanged)
- Users see no difference — same URL, same app, same speed

### File Structure

```
src/
  app/
    App.jsx                        # shell: auth, navigation, layout
    main.jsx                       # entry point

  design/
    theme.js                       # color palette (P.bg, P.gW, etc.)
    styles.js                      # shared styles (s.card, s.btn, etc.)
    components/                    # GradText, H, Card, Button, etc.

  goals/
    GoalEngine.js                  # goal creation, decomposition, progress tracking
    GoalSetup.jsx                  # UI: menu, structured input, free text
    templates/                     # predefined goals per domain

  protocols/
    registry.js                    # collects all protocols, matches to goals
    protocol-interface.js          # the contract every protocol implements
    _system/
      retention/                   # engagement monitoring, churn prevention
    body/
      workout/                     # training programs, exercise catalog
      peptides/                    # 115 peptides, vendor data, recommendations
      supplements/                 # protein, creatine, bac water, syringes
      nutrition/                   # food database, meal planning
    money/
      credit/                      # card database, affiliate links, dispute engine
      income/                      # earnings tracking
      ambassador/                  # referral pipeline, content suggestions, commissions
    travel/
      citizenship/                 # passport acquisition, pathways, countries
      trips/                       # AI trip planning, booking
      visas/                       # visa requirements, applications
      travel-cards/                # travel card signup timing, affiliates
    image/
      skincare/                    # 7-day rotation, product recommendations
      grooming/                    # schedules, tools
      wardrobe/                    # capsule wardrobe
      products/                    # affiliate skincare/grooming products
    mind/                          # focus, meditation, nootropic stacks
    purpose/
      goals/                       # life goals, values
      bucketlist/                  # AI-powered goal decomposition
      PurposeView.jsx
    environment/                   # space optimization, sleep, ergonomics
    community/                     # accountability, masterminds

  routine/
    assembler.js                   # collect tasks from all active protocols
    prioritizer.js                 # load balancing, capacity management
    scheduler.js                   # time-slot assignment
    upsell-engine.js               # surfaces upsells at optimal moments
    RoutineView.jsx                # daily routine UI

  services/
    supabase.js                    # auth, database
    stripe.js                      # billing
    resend.js                      # email
    automations.js                 # background jobs
    affiliates.js                  # affiliate link tracking, commission reporting

  state/
    store.js                       # replaces localStorage state model
    sync.js                        # localStorage <-> Supabase sync
    migration.js                   # migrates adonis_v1 blob to new structure

public/
  index.html                       # landing page (unchanged)
  manifest.json

app/                               # admin panel (Next.js, unchanged)
```

**Key principle:** Each protocol folder is self-contained — data, logic, and UI. Delete a protocol folder and nothing else breaks. Add a new one and register it without touching other code.

### Protocol Registration

```js
// registry.js — auto-discovers all protocols
import workout from './body/workout';
import peptides from './body/peptides';
import credit from './money/credit';
// ... all protocol imports

const ALL_PROTOCOLS = [workout, peptides, credit, ...];

// Find protocols that can serve a goal
export function matchProtocols(goal) {
  return ALL_PROTOCOLS.filter(p => p.canServe(goal));
}

// Get all protocols for a domain (for domain tab UI)
export function getByDomain(domainId) {
  return ALL_PROTOCOLS.filter(p => p.domain === domainId);
}
```

Adding a new protocol: create the folder, implement the interface, add one import line to `registry.js`.

---

## 4. Protocol Interface

Every protocol implements this contract:

```js
{
  // Identity
  id: "workout",                         // unique identifier
  domain: "body",                        // which domain this belongs to
  name: "Workout Program",              // display name
  icon: "...",                           // emoji or icon

  // Goal matching
  canServe: (goal) => boolean,
  // Called by GoalEngine to determine which protocols to activate for a goal.
  // "lose 30lbs" -> workout: true, peptides: true, skincare: false

  // State assessment
  getState: (profile, logs, goal) => ({
    phase: "hypertrophy",
    progress: 0.45,
    weekNumber: 7,
    nextMilestone: "Strength phase begins week 11",
    blockers: [],
  }),
  // Where is the user right now relative to their goal?
  // Called daily by the routine assembler.

  // Task generation
  getTasks: (state, profile, day) => Task[],
  // What should the user do today?
  // Returns tasks typed as "automated", "guided", or "manual".

  // Automation definitions
  getAutomations: (state, profile) => Automation[],
  // What can the system do without the user?
  // Elite tier only.

  // Monetization: product, consumable, affiliate, and service recommendations
  getRecommendations: (state, profile, goal) => Recommendation[],
  // Products, consumables, affiliate signups, and service referrals.
  // Each has a `type` field: "product" | "consumable" | "affiliate" | "service".
  // Embedded naturally in routine tasks.

  // Upsell triggers
  getUpsells: (state, profile, goal) => Upsell[],
  // Conditions that trigger tier upgrades or product suggestions.
  // Evaluated by the upsell engine after task assembly.

  // UI component
  View: ReactComponent,
  // The tab view for this protocol's domain.
}
```

### Task Types

| Type | Who acts | Example | Tier |
|------|----------|---------|------|
| **Automated** | System does it, user sees "Done" | Dispute letter sent, credit score pulled, reorder placed | Elite |
| **Guided** | User acts, system tells them exactly what/when/how | "Take 0.5mg Tirzepatide, 10 units, subcutaneous, belly fat" | Pro+ |
| **Manual** | User checks it off | Gratitude journal, apply SPF | All |

### Recommendation Types

| Type | Revenue Model | Example |
|------|--------------|---------|
| **product** | Direct sale (margin) | Tirzepatide 30mg via Advnce Labs |
| **consumable** | Direct or affiliate | Bacteriostatic water, SPF moisturizer |
| **affiliate** | Commission per signup/purchase | Chase Sapphire Preferred card |
| **service** | Referral fee | Immigration attorney, telemedicine consult |

Every recommendation includes: `reason` (why the protocol suggests it), `timing` (when in the goal journey), `urgency` (none/low/high), `cta` (button text), and `revenue` (model + amount).

---

## 5. Goal Engine

### Goal Structure

```js
{
  id: "goal_abc123",
  title: "Lose 30lbs by August",
  domain: "body",
  type: "template",                    // "template" | "structured" | "ai-generated"
  status: "active",                    // "active" | "paused" | "completed" | "abandoned"
  priority: 1,                         // user-ranked, determines routine real estate

  target: { metric: "weight", from: 210, to: 180, unit: "lbs" },
  deadline: "2026-08-01",

  activeProtocols: [
    { protocolId: "fat-loss-workout", domain: "body" },
    { protocolId: "peptides", domain: "body" },
    { protocolId: "nutrition", domain: "body" },
  ],

  progress: {
    percent: 33,
    current: 200,
    trend: "on_track",                 // "ahead" | "on_track" | "behind" | "stalled"
    projectedCompletion: "2026-07-15",
  },

  revenue: {
    total: 198,
    items: [
      { product: "Tirzepatide 30mg", amount: 99, date: "2026-04-01" },
      { product: "Tirzepatide 30mg", amount: 99, date: "2026-05-01" },
    ]
  },

  createdAt: "2026-04-01",
}
```

### Three Goal Types

**Template goals** (curated by Jorrel): User picks from a menu. Protocol mapping is predefined. These are the primary money-makers because the product pipeline is controlled.

> User taps "Lose Weight" -> system asks how much, by when -> activates fat-loss workout + peptide recommendation + nutrition protocol.

**Structured goals** (guided input): User picks a domain, answers specific questions. System determines protocols.

> User picks Travel -> Trip -> Egypt -> December 2026 -> $5,000 budget -> activates trip-planning + passport-check + travel-cards + savings protocols.

**AI-generated goals** (free text, Elite tier): User describes what they want. AI decomposes into sub-goals, maps to protocols.

> "I want to look like a Greek god by summer" -> AI: body recomp + GH peptide stack + skincare + wardrobe upgrade.

### Cross-Domain Goal Decomposition

A single goal can activate protocols across multiple domains. Example:

```
Goal: "Trip to Egypt — December 2026"
|
+-- Travel/Trips          -> research, book flights/hotels
+-- Travel/Visas          -> check requirements, apply
+-- Travel/Passport       -> check expiry, renew if needed
+-- Money/Travel-Cards    -> apply for travel card (AFFILIATE REVENUE)
+-- Money/Savings         -> weekly savings check-in
+-- Image/Wardrobe        -> travel wardrobe checklist (1 month before)
+-- Body/Jet Lag          -> light exposure + melatonin (3 days before)
```

The goal engine handles timing. Passport check happens now. Flight booking in 3 months. Wardrobe 1 month before. Jet lag protocol 3 days before departure. Tasks surface in the routine when they're relevant, not all at once.

---

## 6. Routine Assembler

Replaces `buildRoutine()`. Three-step pipeline: **collect -> prioritize -> schedule**.

### Step 1: Collect

Every active protocol is asked for today's tasks:

```js
function collectTasks(activeGoals, protocols, profile, day) {
  const allTasks = [];
  for (const goal of activeGoals) {
    for (const proto of goal.activeProtocols) {
      const state = proto.getState(profile, logs, goal);
      const tasks = proto.getTasks(state, profile, day);
      const recs = proto.getRecommendations(state, profile, goal);
      tasks.forEach(t => {
        t.goalId = goal.id;
        t.goalTitle = goal.title;
        t.protocolId = proto.id;
      });
      allTasks.push(...tasks, ...recs);
    }
  }
  return allTasks;
}
```

A user with 3 goals and 3 protocols each might generate 30-50 raw tasks.

### Step 2: Prioritize

Reduce to a manageable daily routine (15-25 items):

1. Automated tasks always run (zero user cost)
2. Time-locked tasks always show (peptide doses, work schedule)
3. Critical tasks from highest-priority goal come next
4. Fill remaining capacity from other goals by priority rank
5. Nice-to-have tasks only if there's room
6. Revenue-generating tasks get a slight priority boost (not dominant, but present)
7. Deferred tasks pushed to tomorrow or later this week

**Capacity model:** The system learns from check-in data:
- Low energy/high stress yesterday -> lighter routine, more deferrals
- Rest day from training -> more admin tasks fill the space
- Packed work schedule -> only critical items outside work hours
- User can set preference: "light" | "normal" | "packed"

### Step 3: Schedule

Assign time slots within day blocks:

| Block | Timing | Task types |
|-------|--------|------------|
| Morning routine | Wake -> work/training | Mind (gratitude, breathwork), AM peptides, skincare AM |
| Training | Based on trainPref | Workout, post-workout nutrition |
| Work | Work schedule hours | Work-related, income tasks |
| Midday | Lunch window | Midday peptide doses, food logging |
| Afternoon | Post-work | Admin tasks (credit apps, document gathering, applications) |
| Evening | Wind-down | PM peptides, skincare PM, reflection, sleep prep |

Scheduler places time-locked tasks first, then fills blocks with prioritized tasks. Groups related tasks (all skincare together, all mind together). Inserts product recommendations adjacent to the task they support.

### Routine UI

Visually unchanged from current — daily timeline with:
- Day selector (Su-Sa)
- Streak counter + progress bar
- "Next Up" indicator
- Checkable items with time, title, subtitle
- Rest timer for workouts

New additions:
- **Goal badges** on tasks — small tag showing which goal a task serves
- **Automated task display** — shows as completed with "System did this" label
- **Deferred tasks** — collapsed section: "3 tasks moved to tomorrow"
- **Goal progress summary** at top: progress bars for each active goal
- **Embedded recommendations** — product/service CTAs inline with tasks that need them

---

## 7. Monetization Architecture

### Revenue Streams

| Stream | Mechanism | Example |
|--------|-----------|---------|
| Subscriptions | Stripe (Pro $14.99, Elite $29.99) | Monthly recurring |
| Direct product sales | Advnce Labs peptide orders | Tirzepatide 30mg = $99, ~$90 margin |
| Product consumables | Direct or affiliate | Bac water, syringes, supplements, skincare |
| Affiliate commissions | Credit cards, services | Chase Sapphire signup = commission |
| Service referrals | High-ticket partners | Immigration attorney = $150-500 referral |
| Ambassador channel | 20% commission to ambassadors, 80% retained | Ambassador sells $500/mo = $400 to you |
| Protocol marketplace (future) | 30% platform fee on expert-created protocols | Trainer sells $9.99/mo protocol = $3/mo to you |

### How Monetization Surfaces

Recommendations are never ads. They appear as part of the protocol:

- **In-task:** Peptide dose task includes "Running low -> Reorder $99" when supply is low
- **Protocol setup:** "Your fat loss protocol includes Tirzepatide. Add to your stack?" during goal creation
- **Timed affiliate:** "Apply for Chase Sapphire Preferred now — 3 months to hit $4k spend before your Egypt trip" at the right moment
- **Service referral:** "Your Italian descent application needs apostilled documents. An attorney reduces rejection risk by 80%" when the citizenship protocol reaches document-gathering phase

### Upsell Engine

Runs after task assembly. Checks all active protocols for triggered upsells:

**Tier upgrade triggers:**
- Free user with 20%+ progress -> "Pro unlocks peptide protocols that accelerate results 3x"
- Pro user skipping 8+ manual tasks/week -> "Elite automates 60% of these"

**Product triggers:**
- Progress plateau detected -> "Users who add GH peptides at this stage break plateaus 40% faster"
- Supply running low (<=5 days) -> push notification with one-tap reorder
- Goal milestone reached -> "You've lost 15lbs. Advanced stack accelerates the next phase"

**Cross-sell triggers:**
- User adds body goal but no skincare -> "Users with body + image protocols report 2x satisfaction"
- Travel goal created -> travel card recommendation (affiliate)

### Ambassador Protocol

The ambassador program becomes a first-class protocol under Money domain:

- Goal: "Grow my Adonis income"
- **Guided tasks:** "Share this peptide education post" (system generates content/topics), "Follow up with 3 leads"
- **Automated:** Commission tracking, payout calculations
- **Revenue multiplier:** Every active ambassador is a sales channel. The better the protocol helps them sell, the more you earn.

---

## 8. Tier Structure

### Free
**Hook them. Show the vision.**

- 1 active goal (Body domain only)
- Basic workout protocol (guided tasks)
- Food logging + weight tracking
- Daily routine with manual tasks only
- Can see all domains greyed out with previews
- Peptide recommendations visible but locked: "Upgrade to order"

### Pro — $14.99/mo
**The system works for you.**

- Unlimited goals across all domains
- All protocols unlocked
- Guided tasks (system tells you what to do, when, how)
- Product recommendations with one-tap ordering
- Affiliate-linked actions (credit cards, services)
- Cross-domain goal coordination
- Smart load balancing
- Goal progress tracking + trend analysis
- AI goal setup (structured input)
- Ambassador protocol access

### Elite — $29.99/mo
**The system works without you.**

- Everything in Pro
- Automated actions (dispute letters, credit monitoring, reorders)
- AI-generated goals (free text -> full protocol)
- Premium peptide protocols (advanced stacks)
- Adaptive intensity engine (routine adjusts to check-in data)
- Cross-domain synergy tips
- Bucket list AI (one sentence -> multi-domain plan)
- Priority support + early access to new protocols

---

## 9. State & Data Model

### State Structure

```js
{
  profile: {
    name, age, gender, weight, goalW, hFt, hIn,
    activity, trainPref, equipment,
    domains: ["body", "money", "travel", "image"],
    tier: "pro",
  },

  goals: [
    {
      id, title, domain, type, status, priority,
      target: { metric, from, to, unit },
      deadline,
      activeProtocols: [{ protocolId, domain }],
      progress: { percent, current, trend, projectedCompletion },
      revenue: { total, items: [] },
      createdAt,
    }
  ],

  protocolState: {
    "fat-loss-workout": { phase, weekNumber, lastWorkout },
    "peptides": { activePeptides: [], nextReorder },
    "travel-cards": { pendingApplications: [] },
    "passport-check": { passportExpiry, valid },
    // Each protocol owns its own state shape
  },

  logs: {
    checkins: { "YYYY-MM-DD": { mood, energy, sleep, stress, ... } },
    weight: [{ date, weight }],
    food: { "YYYY-MM-DD": [{ name, cal, p, c, f }] },
    exercise: [{ date, exercise, sets: [] }],
    routine: { "YYYY-MM-DD": ["task_id", ...] },
  },

  automations: {
    "credit-dispute-auto": { lastRun, nextRun, status },
    "peptide-reorder-alert": { triggered, threshold },
  },

  revenue: {
    lifetime, thisMonth,
    byGoal: {},
    byType: { direct, affiliate },
  },

  settings: {
    workSchedule: { enabled, mode, schedule },
    notifications: true,
    routineCapacity: "normal",
  },
}
```

### Storage

- **localStorage** — source of truth for speed, offline-first
- **Supabase** — persistent backup, cross-device sync
- 500ms debounce on writes (same as current)
- One-time migration function maps `adonis_v1` blob to new structure

### Migration Map

| Current (`adonis_v1`) | New location |
|---|---|
| `prof.*` | `profile.*` |
| `wkLogs`, `wkPRs` | `logs.exercise`, `protocolState[workout]` |
| `foodLogs` | `logs.food` |
| `weightLog` | `logs.weight` |
| `checkins` | `logs.checkins` |
| `activePeps` | `protocolState.peptides.activePeptides` |
| `checkedR` | `logs.routine` |
| `prof.domains` | `profile.domains` |
| `subTier` | `profile.tier` |

---

## 10. Retention Protocol

System-level protocol (not user-facing in domain picker) that monitors engagement and intervenes to protect revenue.

**Triggers:**

| Signal | Condition | Response |
|--------|-----------|----------|
| Streak broken | 3+ missed days | Push: "Your 14-day streak is on pause. One check-in brings it back." |
| Peptide gap | Days since dose > protocol max gap | Alert: "2-week gap in protocol. Consistency drives results. Reorder?" |
| Low engagement pre-renewal | Renewal in <=7 days + <30% weekly completion | Highlight: "You've lost 8lbs since starting. Here's what weeks 9-16 look like." |
| Goal stalled | No progress change in 14+ days | Suggestion: protocol adjustment options |
| Free user engaged | >20% goal progress on free tier | Upsell: "Pro unlocks protocols that accelerate 3x" |
| Pro user skipping | 8+ skipped manual tasks/week | Upsell: "Elite automates 60% of these" |

Tone is always encouraging, never guilt. Frame as opportunity, not failure.

---

## 11. Design System (Preserved)

The entire visual language ports directly to the new component structure:

```js
// theme.js — unchanged values
P.bg    = "#060709"
P.bgH   = "#0E1018"
P.bd    = "rgba(232,213,183,0.06)"
P.gW    = "#E8D5B7"
P.txS   = "#C8C4BE"
P.txM   = "#9A9590"
P.txD   = "#5A5650"
P.ok    = "#34D399"
P.err   = "#EF4444"
P.warn  = "#F59E0B"
P.info  = "#60A5FA"

FN = "-apple-system, BlinkMacSystemFont, sans-serif"
FD = "Georgia, serif"
FM = "SF Mono, Monaco, monospace"
```

Shared styles (`s.card`, `s.btn`, `s.pri`, `s.out`, `s.inp`), gradient definitions, ambient orbs, parallax effects, tab vibes, noise overlay, particle system, and all animations move to `design/` and are imported by components that need them.

---

## 12. Future-Ready: Protocol Marketplace

The protocol interface is designed so external protocols can plug in without architecture changes. When marketplace launches:

- Protocol store UI (browse, preview, subscribe)
- External protocol loader (fetches configs, implements same interface)
- Revenue split: 70% creator / 30% Adonis
- Expert-created protocols: trainer builds "Competition Prep," dermatologist builds "Acne Recovery," immigration consultant builds "Portugal Golden Visa"

No marketplace code is built now. The interface supports it by design.

---

## 13. Domains (Final List)

| ID | Name | Icon | Description | Protocols |
|---|---|---|---|---|
| body | Body | gym emoji | Peptides, fitness, nutrition, longevity | workout, peptides, supplements, nutrition |
| money | Money | money emoji | Credit, income, investing, ambassador | credit, income, ambassador |
| travel | Travel | globe emoji | Passports, trips, visas, global access | citizenship, trips, visas, travel-cards |
| mind | Mind | brain emoji | Focus, clarity, nootropics, mental health | focus, meditation, nootropics |
| image | Image | sparkles emoji | Skincare, grooming, wardrobe, presence | skincare, grooming, wardrobe |
| community | Community | handshake emoji | Accountability, masterminds | matching, accountability |
| environment | Environment | house emoji | Space, ergonomics, digital life, sleep | space, sleep, ergonomics |
| purpose | Purpose | compass emoji | Meaning, growth, bucket list, experiences | goals, bucket-list, education |

Note: Bucket List lives under Purpose (`protocols/purpose/bucketlist/`). While bucket list goals can activate protocols across other domains (an Egypt trip spans Travel, Money, Image, Body), the bucket list protocol itself — where goals are created and tracked — belongs to Purpose. Travel handles trips/citizenship/visas. Ambassador lives under Money.

---

## 14. What's NOT in Scope

- Specific API integrations (Plaid, SendGrid, Lob, USDA, OpenWeather) — these plug into protocols later
- AI model selection or prompt engineering for AI-generated goals — deferred to implementation
- Admin panel changes — admin stays as-is (Next.js)
- Advnce Labs website changes — separate project
- Push notification infrastructure — deferred
- Protocol marketplace implementation — interface supports it, no code now
