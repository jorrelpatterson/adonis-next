// src/goals/goal-templates.js
// Predefined goal templates for all Adonis domains.
// Each template maps to one or more protocol IDs that generate daily tasks.

export const GOAL_TEMPLATES = [
  // ── Body ──────────────────────────────────────────────────────────────────
  {
    id: 'lose-weight',
    title: 'Lose Weight',
    domain: 'body',
    type: 'template',
    icon: '🔥',
    description: 'Structured fat-loss protocol combining peptides, nutrition, and cardio-focused training.',
    protocols: [
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({
      metric: 'weight',
      start: Number(answers.currentWeight),
      end: Number(answers.targetWeight),
      deadline: answers.deadline,
    }),
  },
  {
    id: 'build-muscle',
    title: 'Build Muscle',
    domain: 'body',
    type: 'template',
    icon: '💪',
    description: 'Hypertrophy-focused program with progressive overload and protein optimization.',
    protocols: [
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'trainingAge', label: 'Years training', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'leanMass',
      start: Number(answers.currentWeight),
      end: Number(answers.targetWeight),
      trainingAge: Number(answers.trainingAge),
    }),
  },
  {
    id: 'body-recomp',
    title: 'Body Recomposition',
    domain: 'body',
    type: 'template',
    icon: '⚖️',
    description: 'Simultaneously lose fat and gain muscle with strategic cycling and TRT optimization.',
    protocols: [
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'bodyFatPercent', label: 'Estimated body fat %', type: 'number' },
      { key: 'goalBodyFat', label: 'Goal body fat %', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'bodyFat',
      start: Number(answers.bodyFatPercent),
      end: Number(answers.goalBodyFat),
    }),
  },

  // ── Money ─────────────────────────────────────────────────────────────────
  {
    id: 'build-credit',
    title: 'Build Credit Score',
    domain: 'money',
    type: 'template',
    icon: '📈',
    description: 'Systematic credit-building through utilization management and on-time payment habits.',
    protocols: [
      { protocolId: 'credit-repair', domain: 'money' },
      { protocolId: 'credit-repair', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'currentScore', label: 'Current credit score', type: 'number' },
      { key: 'targetScore', label: 'Target credit score', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'creditScore',
      start: Number(answers.currentScore),
      end: Number(answers.targetScore),
    }),
  },
  {
    id: 'cc-stacking',
    title: 'Credit Card Stacking',
    domain: 'money',
    type: 'template',
    icon: '💳',
    description: 'Maximize rewards, cashback, and travel points through strategic card selection and spending.',
    protocols: [
      { protocolId: 'credit-repair', domain: 'money' },
      { protocolId: 'credit-repair', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'monthlySpend', label: 'Monthly spend ($)', type: 'number' },
      { key: 'primaryGoal', label: 'Primary reward goal', type: 'select',
        options: ['Travel', 'Cashback', 'Points'] },
    ],
    buildTarget: (answers) => ({
      metric: 'annualRewards',
      monthlySpend: Number(answers.monthlySpend),
      primaryGoal: answers.primaryGoal,
    }),
  },
  {
    id: 'grow-income',
    title: 'Grow Income',
    domain: 'money',
    type: 'template',
    icon: '💰',
    description: 'Structured income growth through skill monetization, side income, and investment returns.',
    protocols: [
      { protocolId: 'income', domain: 'money' },
      { protocolId: 'income', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'currentMonthlyIncome', label: 'Current monthly income ($)', type: 'number' },
      { key: 'targetMonthlyIncome', label: 'Target monthly income ($)', type: 'number' },
      { key: 'timeline', label: 'Timeline (months)', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'monthlyIncome',
      start: Number(answers.currentMonthlyIncome),
      end: Number(answers.targetMonthlyIncome),
      timelineMonths: Number(answers.timeline),
    }),
  },

  // ── Travel ────────────────────────────────────────────────────────────────
  {
    id: 'plan-trip',
    title: 'Plan a Trip',
    domain: 'travel',
    type: 'template',
    icon: '✈️',
    description: 'Full trip planning across logistics, budget, appearance, and experience optimization.',
    protocols: [
      { protocolId: 'citizenship', domain: 'travel' },
      { protocolId: 'income', domain: 'money' },
      { protocolId: 'skincare', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'destination', label: 'Destination', type: 'text' },
      { key: 'departureDate', label: 'Departure date', type: 'date' },
      { key: 'returnDate', label: 'Return date', type: 'date' },
      { key: 'budget', label: 'Total budget ($)', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'tripComplete',
      destination: answers.destination,
      departureDate: answers.departureDate,
      returnDate: answers.returnDate,
      budget: Number(answers.budget),
    }),
  },
  {
    id: 'second-passport',
    title: 'Obtain Second Passport',
    domain: 'travel',
    type: 'template',
    icon: '🛂',
    description: 'Step-by-step roadmap to second citizenship or residency for maximum global mobility.',
    protocols: [
      { protocolId: 'citizenship', domain: 'travel' },
      { protocolId: 'citizenship', domain: 'travel' },
    ],
    setupQuestions: [
      { key: 'currentPassport', label: 'Current passport country', type: 'text' },
      { key: 'targetCountry', label: 'Target country', type: 'text' },
      { key: 'program', label: 'Program type', type: 'select',
        options: ['Ancestry', 'Investment', 'Naturalization', 'Digital Nomad Visa'] },
    ],
    buildTarget: (answers) => ({
      metric: 'passportObtained',
      currentPassport: answers.currentPassport,
      targetCountry: answers.targetCountry,
      program: answers.program,
    }),
  },

  // ── Image ─────────────────────────────────────────────────────────────────
  {
    id: 'skincare-protocol',
    title: 'Skincare Protocol',
    domain: 'image',
    type: 'template',
    icon: '✨',
    description: 'Evidence-based AM/PM skincare routine for clear, youthful, high-status skin.',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'skinType', label: 'Skin type', type: 'select',
        options: ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'] },
      { key: 'primaryConcern', label: 'Primary concern', type: 'select',
        options: ['Acne', 'Aging', 'Hyperpigmentation', 'Texture', 'Dullness'] },
    ],
    buildTarget: (answers) => ({
      metric: 'skincareConsistency',
      skinType: answers.skinType,
      primaryConcern: answers.primaryConcern,
    }),
  },
  {
    id: 'level-up-image',
    title: 'Level Up Image',
    domain: 'image',
    type: 'template',
    icon: '👔',
    description: 'Complete image overhaul: wardrobe, grooming, posture, and social presence.',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
      { protocolId: 'skincare', domain: 'image' },
      { protocolId: 'environment', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'styleGoal', label: 'Style goal', type: 'select',
        options: ['Business Professional', 'Smart Casual', 'Athletic/Lifestyle', 'High Fashion'] },
      { key: 'budget', label: 'Monthly style budget ($)', type: 'number' },
    ],
    buildTarget: (answers) => ({
      metric: 'imageScore',
      styleGoal: answers.styleGoal,
      monthlyBudget: Number(answers.budget),
    }),
  },

  // ── Mind ──────────────────────────────────────────────────────────────────
  {
    id: 'optimize-focus',
    title: 'Optimize Focus & Cognition',
    domain: 'mind',
    type: 'template',
    icon: '🧠',
    description: 'Biohack your mental performance through sleep, nootropics, and deep work protocols.',
    protocols: [
      { protocolId: 'mind', domain: 'mind' },
      { protocolId: 'environment', domain: 'body' },
      { protocolId: 'mind', domain: 'mind' },
    ],
    setupQuestions: [
      { key: 'currentSleepHours', label: 'Current avg sleep (hours)', type: 'number' },
      { key: 'focusGoal', label: 'Primary focus goal', type: 'select',
        options: ['Deep work blocks', 'Memory retention', 'Mental clarity', 'Stress reduction'] },
    ],
    buildTarget: (answers) => ({
      metric: 'focusScore',
      sleepHours: Number(answers.currentSleepHours),
      focusGoal: answers.focusGoal,
    }),
  },

  // ── Purpose ───────────────────────────────────────────────────────────────
  {
    id: 'bucket-list-item',
    title: 'Complete a Bucket List Item',
    domain: 'purpose',
    type: 'template',
    icon: '🎯',
    description: 'Turn a life goal into a concrete action plan with milestones and accountability.',
    protocols: [
      { protocolId: 'purpose', domain: 'purpose' },
      { protocolId: 'community', domain: 'purpose' },
    ],
    setupQuestions: [
      { key: 'item', label: 'What is the bucket list item?', type: 'text' },
      { key: 'deadline', label: 'Target completion date', type: 'date' },
      { key: 'why', label: 'Why does this matter to you?', type: 'textarea' },
    ],
    buildTarget: (answers) => ({
      metric: 'completed',
      item: answers.item,
      deadline: answers.deadline,
      why: answers.why,
    }),
  },
];

/**
 * Returns all templates that belong to the given domain.
 * @param {string} domainId
 * @returns {Array}
 */
export function getTemplatesForDomain(domainId) {
  return GOAL_TEMPLATES.filter(t => t.domain === domainId);
}
