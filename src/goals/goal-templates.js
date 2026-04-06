export const GOAL_TEMPLATES = [
  {
    id: 'lose-weight', title: 'Lose Weight', domain: 'body', type: 'template',
    icon: '\u{1F3CB}\uFE0F',
    description: 'Fat loss with training + peptide protocol',
    protocols: [
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'weight', from: Number(answers.currentWeight), to: Number(answers.targetWeight), unit: 'lbs' }),
  },
  {
    id: 'build-muscle', title: 'Build Muscle', domain: 'body', type: 'template',
    icon: '\u{1F4AA}',
    description: 'Hypertrophy program with nutrition + peptides',
    protocols: [
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'targetWeight', label: 'Target weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'weight', from: Number(answers.currentWeight), to: Number(answers.targetWeight), unit: 'lbs' }),
  },
  {
    id: 'body-recomp', title: 'Body Recomposition', domain: 'body', type: 'template',
    icon: '\u{1F525}',
    description: 'Lose fat and build muscle simultaneously',
    protocols: [
      { protocolId: 'workout', domain: 'body' },
      { protocolId: 'peptides', domain: 'body' },
      { protocolId: 'nutrition', domain: 'body' },
    ],
    setupQuestions: [
      { key: 'currentWeight', label: 'Current weight (lbs)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'body_composition', from: Number(answers.currentWeight), to: null, unit: 'lbs' }),
  },
  {
    id: 'build-credit', title: 'Build Credit Score', domain: 'money', type: 'template',
    icon: '\u{1F4B3}',
    description: 'Credit repair + dispute strategy',
    protocols: [
      { protocolId: 'credit-repair', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'currentScore', label: 'Current credit score', type: 'number' },
      { key: 'targetScore', label: 'Target credit score', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'credit_score', from: Number(answers.currentScore), to: Number(answers.targetScore), unit: 'points' }),
  },
  {
    id: 'cc-stacking', title: 'Credit Card Stacking', domain: 'money', type: 'template',
    icon: '\u{1F4B0}',
    description: 'Maximize signup bonuses and rewards',
    protocols: [
      { protocolId: 'credit-repair', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'monthlySpend', label: 'Monthly spend ($)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'rewards_value', from: 0, to: null, unit: 'dollars' }),
  },
  {
    id: 'grow-income', title: 'Grow Income', domain: 'money', type: 'template',
    icon: '\u{1F4C8}',
    description: 'Build your referral pipeline and commissions',
    protocols: [
      { protocolId: 'income', domain: 'money' },
    ],
    setupQuestions: [
      { key: 'targetMonthly', label: 'Monthly income target ($)', type: 'number' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'monthly_income', from: 0, to: Number(answers.targetMonthly), unit: 'dollars' }),
  },
  {
    id: 'plan-trip', title: 'Plan a Trip', domain: 'travel', type: 'template',
    icon: '\u2708\uFE0F',
    description: 'Full trip planning with travel cards + visa check',
    protocols: [
      { protocolId: 'citizenship', domain: 'travel' },
      { protocolId: 'credit-repair', domain: 'money' },
      { protocolId: 'skincare', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'destination', label: 'Destination', type: 'text' },
      { key: 'departureDate', label: 'Departure date', type: 'date' },
      { key: 'budget', label: 'Budget ($)', type: 'number' },
    ],
    buildTarget: (answers) => ({ metric: 'trip', destination: answers.destination, budget: Number(answers.budget), unit: 'dollars' }),
  },
  {
    id: 'second-passport', title: 'Get a Second Passport', domain: 'travel', type: 'template',
    icon: '\u{1F4D8}',
    description: 'Citizenship by descent, investment, or residency',
    protocols: [
      { protocolId: 'citizenship', domain: 'travel' },
    ],
    setupQuestions: [
      { key: 'country', label: 'Target country', type: 'text' },
      { key: 'pathway', label: 'Pathway', type: 'select', options: ['Descent', 'Investment', 'Residency', 'Unsure'] },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'passport', country: answers.country, pathway: answers.pathway }),
  },
  {
    id: 'skincare-protocol', title: 'Start Skincare Protocol', domain: 'image', type: 'template',
    icon: '\u2728',
    description: '7-day AM/PM skincare rotation',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'skinType', label: 'Skin type', type: 'select', options: ['Oily', 'Dry', 'Combination', 'Sensitive'] },
    ],
    buildTarget: (answers) => ({ metric: 'routine_adherence', skinType: answers.skinType }),
  },
  {
    id: 'level-up-image', title: 'Level Up Image', domain: 'image', type: 'template',
    icon: '\u{1F48E}',
    description: 'Skincare + grooming + wardrobe overhaul',
    protocols: [
      { protocolId: 'skincare', domain: 'image' },
    ],
    setupQuestions: [
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'image_score', from: 0, to: null }),
  },
  {
    id: 'optimize-focus', title: 'Optimize Focus & Clarity', domain: 'mind', type: 'template',
    icon: '\u{1F9E0}',
    description: 'Meditation + breathwork + focus blocks',
    protocols: [
      { protocolId: 'mind', domain: 'mind' },
    ],
    setupQuestions: [
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'focus_score', from: 0, to: null }),
  },
  {
    id: 'bucket-list-item', title: 'Bucket List Goal', domain: 'purpose', type: 'template',
    icon: '\u{1F9ED}',
    description: 'Track a life goal across all relevant domains',
    protocols: [
      { protocolId: 'purpose', domain: 'purpose' },
    ],
    setupQuestions: [
      { key: 'description', label: 'Describe your goal', type: 'text' },
      { key: 'deadline', label: 'Target date', type: 'date' },
    ],
    buildTarget: (answers) => ({ metric: 'bucket_list', description: answers.description }),
  },
];

export function getTemplatesForDomain(domainId) {
  return GOAL_TEMPLATES.filter(t => t.domain === domainId);
}
