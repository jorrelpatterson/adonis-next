# Adonis v2 Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the intelligence layer — goal engine, routine assembler (collect → prioritize → schedule), upsell engine, and retention protocol — on top of the Plan 1 foundation.

**Architecture:** The Goal Engine creates/decomposes goals and activates protocols. The Routine Assembler collects tasks from all active protocols, prioritizes by capacity/energy/goal rank, and schedules into time blocks. The Upsell Engine monitors protocol state for upgrade/product triggers. The Retention Protocol monitors engagement and intervenes to prevent churn. All modules consume state from `src/state/store.jsx` and protocols from `src/protocols/registry.js`.

**Tech Stack:** React 18, Vitest (happy-dom), existing state store + protocol interface from Plan 1.

**Spec:** `docs/superpowers/specs/2026-04-05-adonis-v2-protocol-engine-design.md` — Sections 5, 6, 7, 10.

**Plan Sequence:** This is Plan 2 of 3. Plan 1 (Foundation) is complete. Plan 3 covers individual protocol migrations from app.html.

---

## File Structure

```
src/
  goals/
    goal-engine.js          — Goal creation, protocol matching, progress tracking
    goal-templates.js       — Predefined goal templates per domain
    __tests__/
      goal-engine.test.js
      goal-templates.test.js

  routine/
    assembler.js            — Step 1: Collect tasks from all active protocols
    prioritizer.js          — Step 2: Rank and filter to daily capacity
    scheduler.js            — Step 3: Assign time blocks
    upsell-engine.js        — Monitor protocol state, surface upsells
    pipeline.js             — Full pipeline: collect → prioritize → schedule → upsells → retention
    __tests__/
      assembler.test.js
      prioritizer.test.js
      scheduler.test.js
      upsell-engine.test.js
      pipeline.test.js

  protocols/
    _system/
      retention/
        index.js            — Engagement monitoring, churn intervention
      retention/__tests__/
        retention.test.js
```

---

## Task 1: Goal Templates

**Files:**
- Create: `src/goals/goal-templates.js`
- Create: `src/goals/__tests__/goal-templates.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/goals/__tests__/goal-templates.test.js
import { describe, it, expect } from 'vitest';
import { GOAL_TEMPLATES, getTemplatesForDomain } from '../goal-templates';

describe('goal-templates', () => {
  it('exports an array of templates', () => {
    expect(Array.isArray(GOAL_TEMPLATES)).toBe(true);
    expect(GOAL_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template has required fields', () => {
    for (const t of GOAL_TEMPLATES) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('domain');
      expect(t).toHaveProperty('type', 'template');
      expect(t).toHaveProperty('protocols');
      expect(Array.isArray(t.protocols)).toBe(true);
      expect(t.protocols.length).toBeGreaterThan(0);
      expect(t).toHaveProperty('setupQuestions');
      expect(Array.isArray(t.setupQuestions)).toBe(true);
    }
  });

  it('every template protocol entry has protocolId and domain', () => {
    for (const t of GOAL_TEMPLATES) {
      for (const p of t.protocols) {
        expect(p).toHaveProperty('protocolId');
        expect(p).toHaveProperty('domain');
      }
    }
  });

  it('getTemplatesForDomain filters by domain', () => {
    const bodyTemplates = getTemplatesForDomain('body');
    expect(bodyTemplates.length).toBeGreaterThan(0);
    expect(bodyTemplates.every(t => t.domain === 'body')).toBe(true);
  });

  it('getTemplatesForDomain returns empty for unknown domain', () => {
    expect(getTemplatesForDomain('nonexistent')).toEqual([]);
  });

  it('body domain has lose weight template with peptide protocol', () => {
    const loseWeight = GOAL_TEMPLATES.find(t => t.id === 'lose-weight');
    expect(loseWeight).toBeDefined();
    expect(loseWeight.domain).toBe('body');
    expect(loseWeight.protocols.some(p => p.protocolId === 'peptides')).toBe(true);
    expect(loseWeight.protocols.some(p => p.protocolId === 'fat-loss-workout')).toBe(true);
  });

  it('travel domain has trip template with cross-domain protocols', () => {
    const trip = GOAL_TEMPLATES.find(t => t.id === 'plan-trip');
    expect(trip).toBeDefined();
    expect(trip.domain).toBe('travel');
    const domains = new Set(trip.protocols.map(p => p.domain));
    expect(domains.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/goals/__tests__/goal-templates.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// src/goals/goal-templates.js
export const GOAL_TEMPLATES = [
  // === BODY ===
  {
    id: 'lose-weight',
    title: 'Lose Weight',
    domain: 'body',
    type: 'template',
    icon: '\u{1F3CB}\uFE0F',
    description: 'Fat loss with training + peptide protocol',
    protocols: [
      { protocolId: 'fat-loss-workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'weight',
      from: Number(answers.currentWeight),
      to: Number(answers.targetWeight),
      unit: 'lbs',
    }),
  },
  {
    id: 'build-muscle',
    title: 'Build Muscle',
    domain: 'body',
    type: 'template',
    icon: '\u{1F4AA}',
    description: 'Hypertrophy program with nutrition protocol',
    protocols: [
      { protocolId: 'muscle-gain-workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
      { protocolId: 'supplements', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'weight',
      from: Number(answers.currentWeight),
      to: Number(answers.targetWeight),
      unit: 'lbs',
    }),
  },
  {
    id: 'body-recomp',
    title: 'Body Recomposition',
    domain: 'body',
    type: 'template',
    icon: '\u{1F525}',
    description: 'Lose fat and build muscle simultaneously',
    protocols: [
      { protocolId: 'recomp-workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'body_composition',
      from: Number(answers.currentWeight),
      to: null,
      unit: 'lbs',
    }),
  },
  // === MONEY ===
  {
    id: 'build-credit',
    title: 'Build Credit Score',
    domain: 'money',
    type: 'template',
    icon: '\u{1F4B3}',
    description: 'Credit repair + card stacking strategy',
    protocols: [
      { protocolId: 'credit-repair', domain: 'money' },
      { protocolId: 'credit-cards', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'currentScore', label: 'Current credit score', type: 'number' },
      { key: 'targetScore', label: 'Target credit score', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'credit_score',
      from: Number(answers.currentScore),
      to: Number(answers.targetScore),
      unit: 'points',
    }),
  },
  {
    id: 'cc-stacking',
    title: 'Credit Card Stacking',
    domain: 'money',
    type: 'template',
    icon: '\u{1F4B0}',
    description: 'Maximize signup bonuses and rewards',
    protocols: [
      { protocolId: 'credit-cards', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'monthlySpend', label: 'Monthly spend ($)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'rewards_value',
      from: 0,
      to: null,
      unit: 'dollars',
    }),
  },
  {
    id: 'grow-income',
    title: 'Grow Ambassador Income',
    domain: 'money',
    type: 'template',
    icon: '\u{1F4C8}',
    description: 'Build your referral pipeline and commissions',
    protocols: [
      { protocolId: 'ambassador', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'targetMonthly', label: 'Monthly income target ($)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'monthly_income',
      from: 0,
      to: Number(answers.targetMonthly),
      unit: 'dollars',
    }),
  },
  // === TRAVEL ===
  {
    id: 'plan-trip',
    title: 'Plan a Trip',
    domain: 'travel',
    type: 'template',
    icon: '\u2708\uFE0F',
    description: 'Full trip planning with cards, visa, passport check',
    protocols: [
      { protocolId: 'trip-planning', domain: 'travel' },
      { protocolId: 'passport-check', domain: 'travel' },
      { protocolId: 'visa-check', domain: 'travel' },
      { protocolId: 'travel-cards', domain: 'money' },
      { protocolId: 'travel-savings', domain: 'money' },
      { protocolId: 'travel-wardrobe', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'destination', label: 'Destination', type: 'text' },
      { key: 'departureDate', label: 'Departure date', type: 'date' },
      { key: 'budget', label: 'Budget ($)', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'trip',
      destination: answers.destination,
      budget: Number(answers.budget),
      unit: 'dollars',
    }),
  },
  {
    id: 'second-passport',
    title: 'Get a Second Passport',
    domain: 'travel',
    type: 'template',
    icon: '\u{1F4D8}',
    description: 'Citizenship by descent, investment, or residency',
    protocols: [
      { protocolId: 'citizenship', domain: 'travel' },
    ],
    setupQuestions: [
      { key: 'country', label: 'Target country', type: 'text' },
      { key: 'pathway', label: 'Pathway', type: 'select', options: ['descent', 'investment', 'residency', 'unsure'] },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'passport',
      country: answers.country,
      pathway: answers.pathway,
    }),
  },
  // === IMAGE ===
  {
    id: 'skincare-protocol',
    title: 'Start Skincare Protocol',
    domain: 'image',
    type: 'template',
    icon: '\u2728',
    description: '7-day AM/PM skincare rotation',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'skinType', label: 'Skin type', type: 'select', options: ['oily', 'dry', 'combination', 'sensitive'] },
    ],
    buildTarget: (answers) => ({
      metric: 'routine_adherence',
      skinType: answers.skinType,
    }),
  },
  {
    id: 'level-up-image',
    title: 'Level Up Image',
    domain: 'image',
    type: 'template',
    icon: '\u{1F48E}',
    description: 'Skincare + grooming + wardrobe overhaul',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
      { protocolId: 'grooming', domain: 'image' },
      { protocolId: 'wardrobe', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'image_score',
      from: 0,
      to: null,
    }),
  },
  // === MIND ===
  {
    id: 'optimize-focus',
    title: 'Optimize Focus & Clarity',
    domain: 'mind',
    type: 'template',
    icon: '\u{1F9E0}',
    description: 'Nootropic stack + meditation + focus blocks',
    protocols: [
      { protocolId: 'nootropics', domain: 'mind' },
      { protocolId: 'meditation', domain: 'mind' },
    ],
    setupQuestions: [
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'focus_score',
      from: 0,
      to: null,
    }),
  },
  // === PURPOSE ===
  {
    id: 'bucket-list-item',
    title: 'Bucket List Goal',
    domain: 'purpose',
    type: 'template',
    icon: '\u{1F9ED}',
    description: 'AI decomposes your goal across all relevant domains',
    protocols: [
      { protocolId: 'bucket-list', domain: 'purpose' },
    ],
    setupQuestions: [
      { key: 'description', label: 'Describe your goal', type: 'text' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'bucket_list',
      description: answers.description,
    }),
  },
];

export function getTemplatesForDomain(domainId) {
  return GOAL_TEMPLATES.filter(t => t.domain === domainId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/goals/__tests__/goal-templates.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/goals/goal-templates.js src/goals/__tests__/goal-templates.test.js
git commit -m "feat: add goal templates for all domains"
```

---

## Task 2: Goal Engine

**Files:**
- Create: `src/goals/goal-engine.js`
- Create: `src/goals/__tests__/goal-engine.test.js`

The Goal Engine creates goals from templates or structured input, matches protocols, and tracks progress.

- [ ] **Step 1: Write the failing test**

```js
// src/goals/__tests__/goal-engine.test.js
import { describe, it, expect } from 'vitest';
import {
  createGoalFromTemplate,
  createGoalFromInput,
  updateGoalProgress,
  activateProtocolsForGoal,
  decomposeGoal,
} from '../goal-engine';
import { GOAL_TEMPLATES } from '../goal-templates';

describe('goal-engine', () => {
  describe('createGoalFromTemplate', () => {
    it('creates a goal from a template with user answers', () => {
      const template = GOAL_TEMPLATES.find(t => t.id === 'lose-weight');
      const answers = { currentWeight: '210', targetWeight: '180', deadline: '2026-08-01' };
      const goal = createGoalFromTemplate(template, answers);

      expect(goal.id).toMatch(/^goal_/);
      expect(goal.title).toBe('Lose Weight');
      expect(goal.domain).toBe('body');
      expect(goal.type).toBe('template');
      expect(goal.templateId).toBe('lose-weight');
      expect(goal.status).toBe('active');
      expect(goal.target.metric).toBe('weight');
      expect(goal.target.from).toBe(210);
      expect(goal.target.to).toBe(180);
      expect(goal.deadline).toBe('2026-08-01');
      expect(goal.activeProtocols).toEqual(template.protocols);
      expect(goal.progress.percent).toBe(0);
      expect(goal.progress.trend).toBe('on_track');
      expect(goal.revenue).toEqual({ total: 0, items: [] });
      expect(goal.createdAt).toBeDefined();
    });

    it('generates unique IDs for each goal', () => {
      const template = GOAL_TEMPLATES.find(t => t.id === 'lose-weight');
      const answers = { currentWeight: '210', targetWeight: '180', deadline: '2026-08-01' };
      const goal1 = createGoalFromTemplate(template, answers);
      const goal2 = createGoalFromTemplate(template, answers);
      expect(goal1.id).not.toBe(goal2.id);
    });
  });

  describe('createGoalFromInput', () => {
    it('creates a structured goal from user input', () => {
      const input = {
        title: 'Trip to Egypt',
        domain: 'travel',
        target: { metric: 'trip', destination: 'Egypt', budget: 5000 },
        deadline: '2026-12-01',
        protocols: [
          { protocolId: 'trip-planning', domain: 'travel' },
          { protocolId: 'travel-cards', domain: 'money' },
        ],
      };
      const goal = createGoalFromInput(input);

      expect(goal.id).toMatch(/^goal_/);
      expect(goal.title).toBe('Trip to Egypt');
      expect(goal.type).toBe('structured');
      expect(goal.domain).toBe('travel');
      expect(goal.target.destination).toBe('Egypt');
      expect(goal.activeProtocols).toEqual(input.protocols);
      expect(goal.status).toBe('active');
    });
  });

  describe('updateGoalProgress', () => {
    it('calculates percent progress for weight goals', () => {
      const goal = { target: { metric: 'weight', from: 210, to: 180, unit: 'lbs' } };
      const progress = updateGoalProgress(goal, 200);
      expect(progress.percent).toBe(33);
      expect(progress.current).toBe(200);
    });

    it('returns 0 percent when no progress', () => {
      const goal = { target: { metric: 'weight', from: 210, to: 180, unit: 'lbs' } };
      const progress = updateGoalProgress(goal, 210);
      expect(progress.percent).toBe(0);
    });

    it('caps at 100 percent', () => {
      const goal = { target: { metric: 'weight', from: 210, to: 180, unit: 'lbs' } };
      const progress = updateGoalProgress(goal, 170);
      expect(progress.percent).toBe(100);
    });

    it('calculates progress for credit_score goals', () => {
      const goal = { target: { metric: 'credit_score', from: 580, to: 750, unit: 'points' } };
      const progress = updateGoalProgress(goal, 665);
      expect(progress.percent).toBe(50);
    });

    it('determines trend based on deadline', () => {
      const goal = {
        target: { metric: 'weight', from: 210, to: 180, unit: 'lbs' },
        deadline: '2026-08-01',
        createdAt: '2026-04-01',
      };
      const progress = updateGoalProgress(goal, 200, '2026-04-06');
      expect(progress.trend).toBe('ahead');
    });

    it('returns on_track when no deadline', () => {
      const goal = { target: { metric: 'weight', from: 210, to: 180, unit: 'lbs' } };
      const progress = updateGoalProgress(goal, 200);
      expect(progress.trend).toBe('on_track');
    });
  });

  describe('activateProtocolsForGoal', () => {
    it('returns protocol list from template', () => {
      const template = GOAL_TEMPLATES.find(t => t.id === 'lose-weight');
      const result = activateProtocolsForGoal(template);
      expect(result).toEqual(template.protocols);
    });
  });

  describe('decomposeGoal', () => {
    it('returns the template protocols for template goals', () => {
      const template = GOAL_TEMPLATES.find(t => t.id === 'plan-trip');
      const answers = { destination: 'Egypt', departureDate: '2026-12-01', budget: '5000' };
      const goal = createGoalFromTemplate(template, answers);
      const protocols = decomposeGoal(goal);
      expect(protocols).toEqual(template.protocols);
    });

    it('returns activeProtocols for structured goals', () => {
      const goal = {
        type: 'structured',
        activeProtocols: [{ protocolId: 'trip-planning', domain: 'travel' }],
      };
      const protocols = decomposeGoal(goal);
      expect(protocols).toEqual(goal.activeProtocols);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/goals/__tests__/goal-engine.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// src/goals/goal-engine.js
let idCounter = 0;

function generateId() {
  idCounter++;
  return 'goal_' + Date.now().toString(36) + '_' + idCounter.toString(36);
}

export function createGoalFromTemplate(template, answers) {
  return {
    id: generateId(),
    title: template.title,
    domain: template.domain,
    type: 'template',
    templateId: template.id,
    status: 'active',
    priority: 1,
    target: template.buildTarget(answers),
    deadline: answers.deadline || null,
    activeProtocols: [...template.protocols],
    progress: { percent: 0, current: null, trend: 'on_track', projectedCompletion: null },
    revenue: { total: 0, items: [] },
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function createGoalFromInput(input) {
  return {
    id: generateId(),
    title: input.title,
    domain: input.domain,
    type: 'structured',
    templateId: null,
    status: 'active',
    priority: 1,
    target: input.target,
    deadline: input.deadline || null,
    activeProtocols: input.protocols || [],
    progress: { percent: 0, current: null, trend: 'on_track', projectedCompletion: null },
    revenue: { total: 0, items: [] },
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function updateGoalProgress(goal, currentValue, today) {
  const { target, deadline, createdAt } = goal;
  let percent = 0;

  if (target.from != null && target.to != null) {
    const totalDistance = Math.abs(target.from - target.to);
    if (totalDistance === 0) {
      percent = 100;
    } else {
      const currentDistance = Math.abs(target.from - currentValue);
      percent = Math.round((currentDistance / totalDistance) * 100);
      percent = Math.max(0, Math.min(100, percent));
    }
  }

  let trend = 'on_track';
  if (deadline && createdAt && today) {
    const start = new Date(createdAt).getTime();
    const end = new Date(deadline).getTime();
    const now = new Date(today).getTime();
    const totalDuration = end - start;
    if (totalDuration > 0) {
      const elapsed = now - start;
      const timePercent = (elapsed / totalDuration) * 100;
      if (percent > timePercent + 10) trend = 'ahead';
      else if (percent < timePercent - 10) trend = 'behind';
      else trend = 'on_track';
    }
  }

  return { percent, current: currentValue, trend, projectedCompletion: null };
}

export function activateProtocolsForGoal(template) {
  return [...template.protocols];
}

export function decomposeGoal(goal) {
  return goal.activeProtocols || [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/goals/__tests__/goal-engine.test.js`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/goals/goal-engine.js src/goals/__tests__/goal-engine.test.js
git commit -m "feat: add goal engine — creation, progress tracking, decomposition"
```

---

## Task 3: Routine Assembler (Collect)

**Files:**
- Create: `src/routine/assembler.js`
- Create: `src/routine/__tests__/assembler.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/routine/__tests__/assembler.test.js
import { describe, it, expect } from 'vitest';
import { collectTasks } from '../assembler';

function makeProtocol(id, domain, tasks, recommendations) {
  return {
    id, domain, name: id, icon: '',
    canServe: () => true,
    getState: () => ({ phase: 'active', progress: 0.5 }),
    getTasks: () => tasks || [],
    getAutomations: () => [],
    getRecommendations: () => recommendations || [],
    getUpsells: () => [],
  };
}

describe('assembler - collectTasks', () => {
  it('returns empty array when no goals', () => {
    expect(collectTasks([], {}, {}, new Date())).toEqual([]);
  });

  it('collects tasks from all protocols of all goals', () => {
    const workoutProto = makeProtocol('workout', 'body', [
      { id: 'task-1', title: 'Push Day', type: 'guided', time: '06:00', priority: 2 },
    ]);
    const peptideProto = makeProtocol('peptides', 'body', [
      { id: 'task-2', title: 'Tirzepatide Dose', type: 'guided', time: '07:30', priority: 1 },
    ]);
    const goals = [{
      id: 'goal_1', title: 'Lose Weight',
      activeProtocols: [
        { protocolId: 'workout', domain: 'body' },
        { protocolId: 'peptides', domain: 'body' },
      ],
    }];
    const protocolMap = { workout: workoutProto, peptides: peptideProto };
    const result = collectTasks(goals, protocolMap, {}, new Date());

    expect(result).toHaveLength(2);
    expect(result[0].goalId).toBe('goal_1');
    expect(result[0].protocolId).toBe('workout');
    expect(result[1].protocolId).toBe('peptides');
  });

  it('includes recommendations as tasks', () => {
    const peptideProto = makeProtocol('peptides', 'body', [
      { id: 'task-1', title: 'Take dose', type: 'guided', time: '07:30', priority: 1 },
    ], [
      { id: 'rec-1', title: 'Reorder Tirzepatide', type: 'recommendation', urgency: 'low', price: 99 },
    ]);
    const goals = [{
      id: 'goal_1', title: 'Lose Weight',
      activeProtocols: [{ protocolId: 'peptides', domain: 'body' }],
    }];
    const result = collectTasks(goals, { peptides: peptideProto }, {}, new Date());
    expect(result).toHaveLength(2);
    expect(result.find(t => t.type === 'recommendation')).toBeDefined();
  });

  it('skips protocols not found in protocolMap', () => {
    const goals = [{
      id: 'goal_1', title: 'Test',
      activeProtocols: [{ protocolId: 'nonexistent', domain: 'body' }],
    }];
    expect(collectTasks(goals, {}, {}, new Date())).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routine/__tests__/assembler.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```js
// src/routine/assembler.js
export function collectTasks(goals, protocolMap, profile, day) {
  const allTasks = [];

  for (const goal of goals) {
    if (!goal.activeProtocols) continue;

    for (const protoRef of goal.activeProtocols) {
      const proto = protocolMap[protoRef.protocolId];
      if (!proto) continue;

      const state = proto.getState(profile, {}, goal);
      const tasks = proto.getTasks(state, profile, day);
      const recs = proto.getRecommendations(state, profile, goal);

      for (const task of tasks) {
        allTasks.push({ ...task, goalId: goal.id, goalTitle: goal.title, protocolId: proto.id });
      }
      for (const rec of recs) {
        allTasks.push({ ...rec, goalId: goal.id, goalTitle: goal.title, protocolId: proto.id });
      }
    }
  }

  return allTasks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routine/__tests__/assembler.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routine/assembler.js src/routine/__tests__/assembler.test.js
git commit -m "feat: add routine assembler — collect tasks from all active protocols"
```

---

## Task 4: Routine Prioritizer

**Files:**
- Create: `src/routine/prioritizer.js`
- Create: `src/routine/__tests__/prioritizer.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/routine/__tests__/prioritizer.test.js
import { describe, it, expect } from 'vitest';
import { prioritizeTasks } from '../prioritizer';

function makeTask(overrides) {
  return {
    id: 'task_' + Math.random().toString(36).slice(2, 6),
    title: 'Test Task', type: 'guided', time: '09:00', priority: 3,
    goalId: 'goal_1', goalTitle: 'Test Goal', protocolId: 'test', skippable: true,
    ...overrides,
  };
}

describe('prioritizer', () => {
  it('returns empty when no tasks', () => {
    const { scheduled, deferred } = prioritizeTasks([], {}, {});
    expect(scheduled).toEqual([]);
    expect(deferred).toEqual([]);
  });

  it('automated tasks always make it through', () => {
    const tasks = [
      makeTask({ id: 'auto-1', type: 'automated', priority: 3 }),
      makeTask({ id: 'manual-1', type: 'manual', priority: 3 }),
    ];
    const { scheduled } = prioritizeTasks(tasks, {}, {});
    expect(scheduled.find(t => t.id === 'auto-1')).toBeDefined();
  });

  it('time-locked tasks (priority 1) always make it through', () => {
    const tasks = [
      makeTask({ id: 'locked-1', priority: 1, title: 'Peptide dose' }),
      ...Array.from({ length: 30 }, (_, i) => makeTask({ id: 'filler-' + i, priority: 3 })),
    ];
    const { scheduled } = prioritizeTasks(tasks, {}, {});
    expect(scheduled.find(t => t.id === 'locked-1')).toBeDefined();
  });

  it('respects goal priority ordering', () => {
    const tasks = [
      makeTask({ id: 'low-goal', priority: 2, goalId: 'goal_2' }),
      makeTask({ id: 'high-goal', priority: 2, goalId: 'goal_1' }),
    ];
    const { scheduled } = prioritizeTasks(tasks, { goal_1: 1, goal_2: 2 }, {});
    const idx1 = scheduled.findIndex(t => t.id === 'high-goal');
    const idx2 = scheduled.findIndex(t => t.id === 'low-goal');
    expect(idx1).toBeLessThan(idx2);
  });

  it('caps scheduled tasks based on capacity', () => {
    const tasks = Array.from({ length: 40 }, (_, i) => makeTask({ id: 'task-' + i, priority: 3 }));
    const { scheduled, deferred } = prioritizeTasks(tasks, {}, { routineCapacity: 'light' });
    expect(scheduled.length).toBeLessThanOrEqual(15);
    expect(deferred.length).toBeGreaterThan(0);
  });

  it('gives revenue-generating recommendations a slight boost', () => {
    const tasks = [
      makeTask({ id: 'normal', priority: 3, type: 'manual' }),
      makeTask({ id: 'revenue', priority: 3, type: 'recommendation', revenue: { model: 'affiliate', commission: 50 } }),
    ];
    const { scheduled } = prioritizeTasks(tasks, {}, {});
    const idxR = scheduled.findIndex(t => t.id === 'revenue');
    const idxN = scheduled.findIndex(t => t.id === 'normal');
    expect(idxR).toBeLessThan(idxN);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routine/__tests__/prioritizer.test.js`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/routine/prioritizer.js
const CAPACITY_LIMITS = { light: 15, normal: 25, packed: 35 };

export function prioritizeTasks(tasks, goalPriorities, settings) {
  if (tasks.length === 0) return { scheduled: [], deferred: [] };

  const capacity = CAPACITY_LIMITS[settings.routineCapacity] || CAPACITY_LIMITS.normal;

  const scored = tasks.map(task => ({ task, score: computeScore(task, goalPriorities) }));
  scored.sort((a, b) => b.score - a.score);

  const scheduled = [];
  const deferred = [];

  for (const { task } of scored) {
    const mustInclude = task.type === 'automated' || task.priority === 1 || !task.skippable;
    if (mustInclude || scheduled.length < capacity) {
      scheduled.push(task);
    } else {
      deferred.push(task);
    }
  }

  return { scheduled, deferred };
}

function computeScore(task, goalPriorities) {
  let score = 0;
  if (task.type === 'automated') score += 1000;
  score += (4 - (task.priority || 3)) * 100;
  const goalRank = goalPriorities[task.goalId] || 5;
  score += Math.max(0, (6 - goalRank) * 10);
  if (task.type === 'recommendation' || task.revenue) score += 25;
  if (!task.skippable) score += 50;
  return score;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routine/__tests__/prioritizer.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routine/prioritizer.js src/routine/__tests__/prioritizer.test.js
git commit -m "feat: add routine prioritizer — capacity-based task filtering and ranking"
```

---

## Task 5: Routine Scheduler

**Files:**
- Create: `src/routine/scheduler.js`
- Create: `src/routine/__tests__/scheduler.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/routine/__tests__/scheduler.test.js
import { describe, it, expect } from 'vitest';
import { scheduleTasks, TIME_BLOCKS } from '../scheduler';

function makeTask(overrides) {
  return { id: 'task_' + Math.random().toString(36).slice(2, 6), title: 'Test', type: 'guided', time: null, priority: 2, category: 'morning', goalId: 'goal_1', ...overrides };
}

describe('scheduler', () => {
  it('defines all time blocks in order', () => {
    expect(TIME_BLOCKS).toHaveLength(6);
    expect(TIME_BLOCKS[0].id).toBe('morning');
    expect(TIME_BLOCKS[5].id).toBe('evening');
  });

  it('returns empty for no tasks', () => {
    expect(scheduleTasks([], {})).toEqual([]);
  });

  it('preserves explicit time and sorts chronologically', () => {
    const tasks = [
      makeTask({ id: 't1', time: '07:30', category: 'peptide' }),
      makeTask({ id: 't2', time: '06:00', category: 'morning' }),
    ];
    const result = scheduleTasks(tasks, {});
    expect(result[0].id).toBe('t2');
    expect(result[1].id).toBe('t1');
  });

  it('assigns time blocks to tasks without explicit time', () => {
    const tasks = [
      makeTask({ id: 't1', time: null, category: 'training' }),
      makeTask({ id: 't2', time: null, category: 'morning' }),
      makeTask({ id: 't3', time: null, category: 'evening' }),
    ];
    const result = scheduleTasks(tasks, {});
    expect(result[0].id).toBe('t2');
    expect(result[2].id).toBe('t3');
    expect(result[0].scheduledBlock).toBe('morning');
  });

  it('uses trainPref to determine training block', () => {
    const tasks = [makeTask({ id: 'train', time: null, category: 'training' })];
    const morning = scheduleTasks(tasks, { trainPref: 'morning' });
    const evening = scheduleTasks(tasks, { trainPref: 'evening' });
    expect(morning[0].scheduledBlock).toBe('morning');
    expect(evening[0].scheduledBlock).toBe('evening');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routine/__tests__/scheduler.test.js`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/routine/scheduler.js
export const TIME_BLOCKS = [
  { id: 'morning',   label: 'Morning',   startHour: 5,  endHour: 9  },
  { id: 'training',  label: 'Training',  startHour: 6,  endHour: 10 },
  { id: 'work',      label: 'Work',      startHour: 9,  endHour: 17 },
  { id: 'midday',    label: 'Midday',    startHour: 11, endHour: 14 },
  { id: 'afternoon', label: 'Afternoon', startHour: 14, endHour: 18 },
  { id: 'evening',   label: 'Evening',   startHour: 18, endHour: 23 },
];

const CATEGORY_TO_BLOCK = {
  morning: 'morning', peptide: 'morning', peptide_rec: 'morning', skincare: 'morning',
  nutrition: 'midday', supplement: 'morning', training: 'training', work: 'work',
  income: 'afternoon', credit: 'afternoon', travel: 'afternoon',
  mind: 'morning', purpose: 'morning', evening: 'evening', cycle: 'evening',
};

const BLOCK_ORDER = { morning: 0, training: 1, work: 2, midday: 3, afternoon: 4, evening: 5 };

export function scheduleTasks(tasks, profile) {
  if (tasks.length === 0) return [];

  const trainPref = profile.trainPref || 'morning';

  const assigned = tasks.map(task => {
    let block;
    if (task.category === 'training') {
      block = trainPref === 'evening' ? 'evening' : 'morning';
    } else {
      block = CATEGORY_TO_BLOCK[task.category] || 'afternoon';
    }
    return { ...task, scheduledBlock: task.scheduledBlock || block };
  });

  assigned.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    const blockDiff = (BLOCK_ORDER[a.scheduledBlock] || 0) - (BLOCK_ORDER[b.scheduledBlock] || 0);
    if (blockDiff !== 0) return blockDiff;
    const catA = a.category || '';
    const catB = b.category || '';
    if (catA !== catB) return catA.localeCompare(catB);
    return (a.priority || 3) - (b.priority || 3);
  });

  return assigned;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routine/__tests__/scheduler.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routine/scheduler.js src/routine/__tests__/scheduler.test.js
git commit -m "feat: add routine scheduler — time block assignment and daily ordering"
```

---

## Task 6: Upsell Engine

**Files:**
- Create: `src/routine/upsell-engine.js`
- Create: `src/routine/__tests__/upsell-engine.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/routine/__tests__/upsell-engine.test.js
import { describe, it, expect } from 'vitest';
import { checkUpsells } from '../upsell-engine';

describe('upsell-engine', () => {
  it('returns empty when nothing triggers', () => {
    expect(checkUpsells([], {}, { tier: 'elite' }, {})).toEqual([]);
  });

  it('suggests pro upgrade for free user with progress', () => {
    const goals = [{ id: 'g1', progress: { percent: 25 } }];
    const result = checkUpsells(goals, {}, { tier: 'free' }, {});
    expect(result.find(u => u.type === 'tier_upgrade' && u.target === 'pro')).toBeDefined();
  });

  it('no pro upgrade for free user with low progress', () => {
    const goals = [{ id: 'g1', progress: { percent: 5 } }];
    const result = checkUpsells(goals, {}, { tier: 'free' }, {});
    expect(result.find(u => u.type === 'tier_upgrade' && u.target === 'pro')).toBeUndefined();
  });

  it('suggests elite upgrade for pro user skipping many tasks', () => {
    const result = checkUpsells([], {}, { tier: 'pro' }, {}, 10);
    expect(result.find(u => u.type === 'tier_upgrade' && u.target === 'elite')).toBeDefined();
  });

  it('suggests reorder when supply is low', () => {
    const states = { peptides: { supplyDaysLeft: 3, activeProduct: { name: 'Tirzepatide 30mg', price: 99 } } };
    const result = checkUpsells([], states, { tier: 'pro' }, {});
    const reorder = result.find(u => u.type === 'reorder');
    expect(reorder).toBeDefined();
    expect(reorder.urgency).toBe('high');
  });

  it('low urgency reorder for 4-5 days supply', () => {
    const states = { peptides: { supplyDaysLeft: 5, activeProduct: { name: 'Sema', price: 79 } } };
    const reorder = checkUpsells([], states, { tier: 'pro' }, {}).find(u => u.type === 'reorder');
    expect(reorder.urgency).toBe('low');
  });

  it('no reorder when supply is sufficient', () => {
    const states = { peptides: { supplyDaysLeft: 20, activeProduct: { name: 'X' } } };
    expect(checkUpsells([], states, { tier: 'pro' }, {}).find(u => u.type === 'reorder')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routine/__tests__/upsell-engine.test.js`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/routine/upsell-engine.js
const FREE_PROGRESS_THRESHOLD = 20;
const SUPPLY_LOW_THRESHOLD = 5;
const SUPPLY_CRITICAL_THRESHOLD = 2;
const SKIPPED_TASKS_THRESHOLD = 8;

export function checkUpsells(goals, protocolStates, profile, logs, skippedThisWeek, protocolMap) {
  const upsells = [];

  if (profile.tier === 'free') {
    const hasProgress = goals.some(g => g.progress && g.progress.percent > FREE_PROGRESS_THRESHOLD);
    if (hasProgress) {
      upsells.push({
        type: 'tier_upgrade', target: 'pro',
        message: 'You\'re making real progress. Pro unlocks peptide protocols that accelerate results 3x.',
        placement: 'after_milestone',
      });
    }
  }

  if (profile.tier === 'pro') {
    const skipped = skippedThisWeek != null ? skippedThisWeek : countSkippedTasks(logs);
    if (skipped >= SKIPPED_TASKS_THRESHOLD) {
      upsells.push({
        type: 'tier_upgrade', target: 'elite',
        message: 'You skipped ' + skipped + ' tasks this week. Elite automates ' + Math.floor(skipped * 0.6) + ' of them.',
        placement: 'weekly_summary',
      });
    }
  }

  for (const [id, state] of Object.entries(protocolStates || {})) {
    if (state.supplyDaysLeft != null && state.supplyDaysLeft <= SUPPLY_LOW_THRESHOLD && state.activeProduct) {
      upsells.push({
        type: 'reorder', protocolId: id,
        urgency: state.supplyDaysLeft <= SUPPLY_CRITICAL_THRESHOLD ? 'high' : 'low',
        message: state.supplyDaysLeft + ' days of supply left',
        product: state.activeProduct,
        placement: state.supplyDaysLeft <= SUPPLY_CRITICAL_THRESHOLD ? 'push_notification' : 'routine_inline',
      });
    }
  }

  if (protocolMap) {
    for (const goal of goals) {
      if (!goal.activeProtocols) continue;
      for (const protoRef of goal.activeProtocols) {
        const proto = protocolMap[protoRef.protocolId];
        if (!proto || !proto.getUpsells) continue;
        const protoState = (protocolStates || {})[protoRef.protocolId] || {};
        for (const upsell of proto.getUpsells(protoState, profile, goal)) {
          if (typeof upsell.condition === 'function' && upsell.condition(protoState)) {
            upsells.push(upsell);
          }
        }
      }
    }
  }

  return upsells;
}

function countSkippedTasks(logs) {
  if (!logs || !logs.routine) return 0;
  const dates = Object.keys(logs.routine).sort().slice(-7);
  let total = 0;
  for (const date of dates) {
    const completed = logs.routine[date];
    if (Array.isArray(completed) && completed.length < 3) total += (3 - completed.length);
  }
  return total;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routine/__tests__/upsell-engine.test.js`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routine/upsell-engine.js src/routine/__tests__/upsell-engine.test.js
git commit -m "feat: add upsell engine — tier upgrades, reorder alerts, protocol triggers"
```

---

## Task 7: Retention Protocol

**Files:**
- Create: `src/protocols/_system/retention/index.js`
- Create: `src/protocols/_system/retention/__tests__/retention.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/_system/retention/__tests__/retention.test.js
import { describe, it, expect } from 'vitest';
import { checkRetention } from '../index';

describe('retention protocol', () => {
  it('returns empty when no triggers fire', () => {
    const result = checkRetention(
      { tier: 'pro' },
      { routine: { '2026-04-05': ['t1', 't2', 't3'] } },
      [{ id: 'g1', progress: { trend: 'on_track' } }],
      {},
      '2026-04-06'
    );
    expect(result).toEqual([]);
  });

  it('detects broken streak (3+ missed days)', () => {
    const logs = { routine: { '2026-04-01': ['t1'], '2026-04-02': [], '2026-04-03': [], '2026-04-04': [] } };
    const result = checkRetention({ tier: 'pro' }, logs, [], {}, '2026-04-06');
    const streak = result.find(r => r.signal === 'streak_broken');
    expect(streak).toBeDefined();
    expect(streak.response.tone).toBe('encouraging');
  });

  it('detects peptide gap', () => {
    const states = { peptides: { lastDoseDate: '2026-03-20', maxGapDays: 10 } };
    const result = checkRetention({ tier: 'pro' }, { routine: {} }, [], states, '2026-04-06');
    expect(result.find(r => r.signal === 'peptide_gap')).toBeDefined();
  });

  it('detects stalled goal', () => {
    const goals = [{ id: 'g1', progress: { trend: 'stalled' }, lastProgressDate: '2026-03-20' }];
    const result = checkRetention({ tier: 'pro' }, { routine: {} }, goals, {}, '2026-04-06');
    expect(result.find(r => r.signal === 'goal_stalled')).toBeDefined();
  });

  it('does not fire stalled if progress is recent', () => {
    const goals = [{ id: 'g1', progress: { trend: 'stalled' }, lastProgressDate: '2026-04-04' }];
    const result = checkRetention({ tier: 'pro' }, { routine: {} }, goals, {}, '2026-04-06');
    expect(result.find(r => r.signal === 'goal_stalled')).toBeUndefined();
  });

  it('detects low engagement before renewal', () => {
    const profile = { tier: 'pro', renewalDate: '2026-04-10' };
    const logs = { routine: { '2026-04-01': [], '2026-04-02': [], '2026-04-03': ['t1'], '2026-04-04': [], '2026-04-05': [] } };
    const goals = [{ id: 'g1', progress: { percent: 35 } }];
    const result = checkRetention(profile, logs, goals, {}, '2026-04-06');
    expect(result.find(r => r.signal === 'low_engagement_pre_renewal')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/protocols/_system/retention/__tests__/retention.test.js`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/protocols/_system/retention/index.js
const STREAK_BROKEN_THRESHOLD = 3;
const GOAL_STALLED_DAYS = 14;
const RENEWAL_WINDOW_DAYS = 7;

export function checkRetention(profile, logs, goals, protocolStates, today) {
  const interventions = [];
  const todayDate = new Date(today);

  // Streak broken
  const missedDays = countConsecutiveMissedDays(logs.routine || {}, today);
  if (missedDays >= STREAK_BROKEN_THRESHOLD) {
    interventions.push({
      signal: 'streak_broken',
      response: { type: 'push_notification', message: 'Your streak is on pause. One check-in brings it back.', tone: 'encouraging' },
    });
  }

  // Peptide gap
  const pepState = protocolStates.peptides;
  if (pepState && pepState.lastDoseDate && pepState.maxGapDays) {
    const daysSince = Math.floor((todayDate - new Date(pepState.lastDoseDate)) / (1000 * 60 * 60 * 24));
    if (daysSince > pepState.maxGapDays) {
      interventions.push({
        signal: 'peptide_gap',
        response: { type: 'routine_alert', message: daysSince + '-day gap in your peptide protocol. Consistency drives results. Reorder?', cta: { text: 'Reorder Now', action: 'navigate:reorder' } },
      });
    }
  }

  // Goal stalled
  for (const goal of goals) {
    if (goal.progress && goal.progress.trend === 'stalled' && goal.lastProgressDate) {
      const daysSince = Math.floor((todayDate - new Date(goal.lastProgressDate)) / (1000 * 60 * 60 * 24));
      if (daysSince >= GOAL_STALLED_DAYS) {
        interventions.push({
          signal: 'goal_stalled', goalId: goal.id,
          response: { type: 'routine_suggestion', message: 'Your progress has stalled. Want to adjust your protocol?', options: ['Adjust peptide dose', 'Switch workout program focus', 'Add a new supporting protocol'] },
        });
      }
    }
  }

  // Low engagement pre-renewal
  if (profile.renewalDate) {
    const daysToRenewal = Math.floor((new Date(profile.renewalDate) - todayDate) / (1000 * 60 * 60 * 24));
    if (daysToRenewal <= RENEWAL_WINDOW_DAYS && daysToRenewal >= 0) {
      const weeklyRate = getWeeklyCompletionRate(logs.routine || {}, today);
      if (weeklyRate < 0.3) {
        const bestProgress = goals.reduce((best, g) => Math.max(best, (g.progress && g.progress.percent) || 0), 0);
        interventions.push({
          signal: 'low_engagement_pre_renewal',
          response: { type: 'routine_highlight', message: 'You\'ve made ' + bestProgress + '% progress on your goal. Here\'s what the next phase looks like.', showProgressChart: true },
        });
      }
    }
  }

  return interventions;
}

function countConsecutiveMissedDays(routineLogs, today) {
  let missed = 0;
  const date = new Date(today);
  for (let i = 1; i <= 14; i++) {
    date.setDate(date.getDate() - 1);
    const key = date.toISOString().slice(0, 10);
    const entries = routineLogs[key];
    if (!entries || (Array.isArray(entries) && entries.length === 0)) missed++;
    else break;
  }
  return missed;
}

function getWeeklyCompletionRate(routineLogs, today) {
  const date = new Date(today);
  let active = 0;
  for (let i = 1; i <= 7; i++) {
    date.setDate(date.getDate() - 1);
    const key = date.toISOString().slice(0, 10);
    const entries = routineLogs[key];
    if (entries && Array.isArray(entries) && entries.length > 0) active++;
  }
  return active / 7;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/protocols/_system/retention/__tests__/retention.test.js`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/protocols/_system/retention/index.js src/protocols/_system/retention/__tests__/retention.test.js
git commit -m "feat: add retention protocol — streak, peptide gap, stall, and churn detection"
```

---

## Task 8: Full Pipeline Integration

**Files:**
- Create: `src/routine/pipeline.js`
- Create: `src/routine/__tests__/pipeline.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/routine/__tests__/pipeline.test.js
import { describe, it, expect } from 'vitest';
import { buildDailyRoutine } from '../pipeline';

function makeProtocol(id, domain, tasks, recs) {
  return {
    id, domain, name: id, icon: '',
    canServe: () => true,
    getState: () => ({ phase: 'active', progress: 0.5 }),
    getTasks: () => tasks || [],
    getAutomations: () => [],
    getRecommendations: () => recs || [],
    getUpsells: () => [],
  };
}

describe('pipeline - buildDailyRoutine', () => {
  it('returns structured output with all sections', () => {
    const result = buildDailyRoutine({
      goals: [], protocolMap: {},
      profile: { tier: 'pro', trainPref: 'morning' },
      protocolStates: {}, logs: { routine: {} },
      settings: { routineCapacity: 'normal' },
      day: new Date('2026-04-06'), today: '2026-04-06',
    });
    expect(result).toHaveProperty('scheduled');
    expect(result).toHaveProperty('deferred');
    expect(result).toHaveProperty('upsells');
    expect(result).toHaveProperty('retention');
  });

  it('full pipeline: goals to scheduled tasks', () => {
    const workoutProto = makeProtocol('workout', 'body', [
      { id: 'push-day', title: 'Push Day', type: 'guided', time: '06:00', priority: 2, category: 'training', skippable: false },
    ]);
    const peptideProto = makeProtocol('peptides', 'body', [
      { id: 'dose', title: 'Tirzepatide', type: 'guided', time: '07:30', priority: 1, category: 'peptide', skippable: false },
    ], [
      { id: 'rec-1', title: 'Reorder Tirzepatide', type: 'recommendation', priority: 3, category: 'peptide_rec', skippable: true },
    ]);
    const goals = [{
      id: 'g1', title: 'Lose 30lbs',
      activeProtocols: [
        { protocolId: 'workout', domain: 'body' },
        { protocolId: 'peptides', domain: 'body' },
      ],
      progress: { percent: 33, trend: 'on_track' },
    }];
    const result = buildDailyRoutine({
      goals, protocolMap: { workout: workoutProto, peptides: peptideProto },
      profile: { tier: 'pro', trainPref: 'morning' },
      protocolStates: {}, logs: { routine: {} },
      settings: { routineCapacity: 'normal' },
      day: new Date('2026-04-06'), today: '2026-04-06',
    });
    expect(result.scheduled.length).toBe(3);
    expect(result.scheduled[0].id).toBe('push-day');
    expect(result.scheduled[1].id).toBe('dose');
    expect(result.scheduled[0].goalId).toBe('g1');
  });

  it('cross-domain goal generates tasks from multiple domains', () => {
    const tripProto = makeProtocol('trip-planning', 'travel', [
      { id: 'flight', title: 'Research flights', type: 'manual', category: 'travel', priority: 3, skippable: true },
    ]);
    const cardProto = makeProtocol('travel-cards', 'money', [
      { id: 'card', title: 'Apply for Chase Sapphire', type: 'guided', category: 'credit', priority: 2, skippable: true },
    ]);
    const goals = [{
      id: 'g2', title: 'Trip to Egypt',
      activeProtocols: [
        { protocolId: 'trip-planning', domain: 'travel' },
        { protocolId: 'travel-cards', domain: 'money' },
      ],
      progress: { percent: 10, trend: 'on_track' },
    }];
    const result = buildDailyRoutine({
      goals, protocolMap: { 'trip-planning': tripProto, 'travel-cards': cardProto },
      profile: { tier: 'pro', trainPref: 'morning' },
      protocolStates: {}, logs: { routine: {} },
      settings: { routineCapacity: 'normal' },
      day: new Date('2026-04-06'), today: '2026-04-06',
    });
    expect(result.scheduled.length).toBe(2);
    const protocols = new Set(result.scheduled.map(t => t.protocolId));
    expect(protocols.has('trip-planning')).toBe(true);
    expect(protocols.has('travel-cards')).toBe(true);
  });

  it('includes upsells when triggered', () => {
    const result = buildDailyRoutine({
      goals: [{ id: 'g1', progress: { percent: 30 }, activeProtocols: [] }],
      protocolMap: {}, profile: { tier: 'free' },
      protocolStates: {}, logs: { routine: {} },
      settings: { routineCapacity: 'normal' },
      day: new Date('2026-04-06'), today: '2026-04-06',
    });
    expect(result.upsells.length).toBeGreaterThan(0);
    expect(result.upsells[0].type).toBe('tier_upgrade');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routine/__tests__/pipeline.test.js`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```js
// src/routine/pipeline.js
import { collectTasks } from './assembler';
import { prioritizeTasks } from './prioritizer';
import { scheduleTasks } from './scheduler';
import { checkUpsells } from './upsell-engine';
import { checkRetention } from '../protocols/_system/retention/index';

export function buildDailyRoutine({
  goals = [], protocolMap = {}, profile = {}, protocolStates = {},
  logs = {}, settings = {}, day = new Date(),
  today = new Date().toISOString().slice(0, 10),
}) {
  const allTasks = collectTasks(goals, protocolMap, profile, day);

  const goalPriorities = {};
  for (const goal of goals) {
    goalPriorities[goal.id] = goal.priority || goals.indexOf(goal) + 1;
  }

  const { scheduled: prioritized, deferred } = prioritizeTasks(allTasks, goalPriorities, settings);
  const scheduled = scheduleTasks(prioritized, profile);
  const upsells = checkUpsells(goals, protocolStates, profile, logs, undefined, protocolMap);
  const retention = checkRetention(profile, logs, goals, protocolStates, today);

  return { scheduled, deferred, upsells, retention };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routine/__tests__/pipeline.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/routine/pipeline.js src/routine/__tests__/pipeline.test.js
git commit -m "feat: add full routine pipeline — collect, prioritize, schedule, upsell, retain"
```

---

## Task 9: Wire Engine into App Shell

**Files:**
- Modify: `src/app/App.jsx`

- [ ] **Step 1: Update App.jsx to use goal engine and routine pipeline**

Replace the entire contents of `src/app/App.jsx` with:

```jsx
// src/app/App.jsx
import React, { useMemo } from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { buildDailyRoutine } from '../routine/pipeline';
import { getAllProtocols } from '../protocols/registry';

export default function App() {
  const { state } = useAppState();
  const { profile, goals, protocolState: protocolStates, logs, settings } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const protocolMap = useMemo(() => {
    const map = {};
    for (const p of getAllProtocols()) map[p.id] = p;
    return map;
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const routine = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'active');
    return buildDailyRoutine({
      goals: activeGoals, protocolMap, profile, protocolStates, logs, settings, day: new Date(), today,
    });
  }, [goals, protocolMap, profile, protocolStates, logs, settings, today]);

  return (
    <div className="adn-noise" style={{ fontFamily: FN, background: P.bg, color: P.tx, position: "fixed", inset: 0, overflowY: "auto" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(14,16,22,0.7)", border: "1px solid rgba(232,213,183,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: "italic" }}><GradText>A</GradText></span>
          </div>
          <div>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, fontStyle: "italic" }}>Adonis</span>
            <div style={{ fontSize: 7, color: P.gW, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700, opacity: 0.7 }}>Protocol OS</div>
          </div>
        </div>

        <H t="Engine Active" sub={profile.name || 'New User'} />

        {goals.filter(g => g.status === 'active').length > 0 && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ ...s.lab }}>Active Goals</div>
            {goals.filter(g => g.status === 'active').map(g => (
              <div key={g.id} style={{ padding: "8px 0", borderBottom: "1px solid " + P.bd }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: P.gW }}>{g.progress ? g.progress.percent + '%' : '0%'}</div>
                </div>
                {g.progress && (
                  <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: "rgba(232,213,183,0.08)" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, " + P.gW + ", " + P.ok + ")", width: (g.progress.percent || 0) + '%', transition: "width 0.3s ease" }} />
                  </div>
                )}
                <div style={{ fontSize: 10, color: P.txD, marginTop: 4 }}>
                  {g.domain} {'\u00B7'} {g.activeProtocols ? g.activeProtocols.length : 0} protocols {'\u00B7'} {g.progress ? g.progress.trend : 'on_track'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Today's Routine</div>
          {routine.scheduled.length === 0 ? (
            <p style={{ color: P.txD, fontSize: 12, margin: 0 }}>No tasks yet. Add a goal to activate protocols.</p>
          ) : routine.scheduled.map(task => (
            <div key={task.id} style={{ padding: "8px 0", borderBottom: "1px solid " + P.bd, opacity: task.type === 'recommendation' ? 0.7 : 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {task.time && <span style={{ fontSize: 10, color: P.txD, fontFamily: "SF Mono, Monaco, monospace", minWidth: 40 }}>{task.time}</span>}
                <span style={{ fontSize: 13, color: P.txS }}>{task.title}</span>
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2, paddingLeft: task.time ? 48 : 0 }}>{task.goalTitle} {'\u00B7'} {task.type}</div>
            </div>
          ))}
          {routine.deferred.length > 0 && (
            <div style={{ fontSize: 11, color: P.txD, marginTop: 8, fontStyle: "italic" }}>{routine.deferred.length} tasks deferred to tomorrow</div>
          )}
        </div>

        {routine.upsells.length > 0 && (
          <div style={{ ...s.card, marginBottom: 16, borderColor: "rgba(232,213,183,0.12)" }}>
            <div style={{ ...s.lab }}><GradText>Recommendations</GradText></div>
            {routine.upsells.map((upsell, i) => <div key={i} style={{ padding: "6px 0", fontSize: 12, color: P.txM }}>{upsell.message}</div>)}
          </div>
        )}

        {routine.retention.length > 0 && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ ...s.lab }}>Insights</div>
            {routine.retention.map((r, i) => <div key={i} style={{ padding: "6px 0", fontSize: 12, color: P.txM }}>{r.response.message}</div>)}
          </div>
        )}

        <div style={{ ...s.card }}>
          <div style={{ ...s.lab }}>System Status</div>
          <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.8 }}>
            Engine: active<br />Protocols registered: {getAllProtocols().length}<br />
            Goals: {goals.length} ({goals.filter(g => g.status === 'active').length} active)<br />
            Routine: {routine.scheduled.length} tasks, {routine.deferred.length} deferred<br />
            Upsells: {routine.upsells.length} active<br />Tier: {tierInfo.name}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `npx vite build`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add src/app/App.jsx
git commit -m "feat: wire goal engine and routine pipeline into app shell"
```

---

## Task 10: Run All Tests + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (~70 total)

- [ ] **Step 2: Run production build**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: resolve test/build issues from engine integration"
```
