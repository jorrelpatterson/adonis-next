// src/protocols/money/income/data.js

export const INCOME_REWARDS = {
  perMonth: 250,
  months: 12,
  total: 3000,
  levels: [
    { level: 1, amount: 250, label: 'Direct' },
    { level: 2, amount: 125, label: 'Level 2' },
    { level: 3, amount: 60, label: 'Level 3' },
    { level: 4, amount: 30, label: 'Level 4' },
    { level: 5, amount: 15, label: 'Level 5' },
  ],
};

export const REFERRAL_VERTICALS = [
  {
    id: 'solar',
    name: 'Solar',
    icon: '\u2600\uFE0F',
    color: '#FBBF24',
    avgPayout: 2000,
    payoutRange: [500, 3000],
    closeRate: 0.15,
    qualRate: 0.4,
    cycleDays: 45,
    tips: [
      'Homeowners with $150+/mo electric bills are ideal',
      'Pair with roofing \u2014 new roof + solar = bigger payout',
      'Facebook lead forms targeting homeowners 35-65 convert well',
      'AI calling can pre-qualify leads before handoff',
    ],
    qualifying: [
      'Own home?',
      'Electric bill $150+/mo?',
      'Roof < 15 years old?',
      'Credit 650+?',
      'Good sun exposure?',
    ],
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: '\u{1F3E0}',
    color: '#F97316',
    avgPayout: 700,
    payoutRange: [300, 1500],
    closeRate: 0.25,
    qualRate: 0.5,
    cycleDays: 21,
    tips: [
      'After hailstorms, canvas affected neighborhoods immediately',
      'Insurance claims = free roof for homeowner, full payout for you',
      'Partner with 2-3 local roofers for best commission splits',
    ],
    qualifying: [
      'Own home?',
      'Roof age > 10 years?',
      'Any leaks or damage?',
      "Have homeowner's insurance?",
      'Recent storm damage?',
    ],
  },
  {
    id: 'telecom',
    name: 'Telecom / Fiber',
    icon: '\u{1F4E1}',
    color: '#3B82F6',
    avgPayout: 200,
    payoutRange: [100, 500],
    closeRate: 0.35,
    qualRate: 0.6,
    cycleDays: 14,
    tips: [
      'Bundle wireless + internet for higher per-deal payout',
      'Small businesses with 5+ lines = $500+ deals',
      'New construction / move-ins are highest-conversion targets',
    ],
    qualifying: [
      'Current provider?',
      'Monthly telecom spend?',
      'Number of lines?',
      'Contract expiration?',
    ],
  },
];

export const PARTNER_TYPES = [
  {
    id: 'referrer',
    name: 'Network Referrer',
    icon: '\u{1F91D}',
    desc: 'Refer people you know. Earn recurring monthly payments per install.',
    model: 'rewards',
    avgRefs: 3,
  },
  {
    id: 'business',
    name: 'Business Partner',
    icon: '\u{1F3E2}',
    desc: 'Refer your existing customers. Earn profit share per closed deal.',
    model: 'profit_share',
    profitPct: 0.3,
    avgRefs: 8,
  },
  {
    id: 'sales',
    name: 'Sales Pro',
    icon: '\u{1F4BC}',
    desc: 'Full pipeline \u2014 generate, qualify, close. Highest earning potential.',
    model: 'full_channel',
    marginPct: 0.7,
    avgMargin: 8000,
    avgEarning: 5600,
  },
];

export const LEAD_STAGES = [
  'referred',
  'contacted',
  'qualified',
  'appointment',
  'proposal',
  'closed',
  'installed',
  'paying',
  'completed',
  'lost',
];

export const LEAD_STAGE_COLORS = {
  referred: '#9CA3AF',
  contacted: '#60A5FA',
  qualified: '#A855F7',
  appointment: '#FBBF24',
  proposal: '#F97316',
  closed: '#34D399',
  installed: '#22C55E',
  paying: '#E8D5B7',
  completed: '#34D399',
  lost: '#EF4444',
};

export const LEAD_STAGE_LABELS = {
  referred: 'Referred',
  contacted: 'Contacted',
  qualified: 'Qualified',
  appointment: 'Appt Set',
  proposal: 'Proposal',
  closed: 'Closed',
  installed: 'Installed',
  paying: 'Paying',
  completed: 'Complete',
  lost: 'Lost',
};

export function buildIncomePlan(target, partnerType, verticals, leadHistory) {
  const pt = PARTNER_TYPES.find((p) => p.id === partnerType) || PARTNER_TYPES[0];
  if (pt.model === 'rewards') {
    const perMonth = INCOME_REWARDS.perMonth;
    const installsNeeded = Math.ceil(target / perMonth);
    const convRate = 0.15;
    const refsNeeded = Math.ceil(installsNeeded / convRate);
    const monthsToTarget = Math.min(12, Math.max(1, Math.ceil(installsNeeded / (pt.avgRefs || 2))));
    const weeklyRefs = Math.max(1, Math.ceil(refsNeeded / (monthsToTarget * 4.3)));
    const weeklyConvos = weeklyRefs * 5;
    const projection = [];
    for (let m = 1; m <= 12; m++) {
      const inst = Math.min(installsNeeded, Math.round(m * (installsNeeded / monthsToTarget)));
      projection.push({ month: m, installs: inst, monthly: inst * perMonth });
    }
    return {
      target,
      type: pt,
      installsNeeded,
      refsNeeded,
      weeklyRefs,
      weeklyConvos,
      monthsToTarget,
      steadyState: installsNeeded * perMonth,
      total12: installsNeeded * INCOME_REWARDS.total,
      projection,
    };
  }
  if (pt.model === 'profit_share') {
    const profitPerDeal = 8000 * pt.profitPct;
    const dealsNeeded = Math.ceil(target / profitPerDeal);
    return {
      target,
      type: pt,
      profitPerDeal,
      dealsNeeded,
      weeklyLeads: Math.max(1, Math.ceil((dealsNeeded / 4.3) * 5)),
      monthlyProj: dealsNeeded * profitPerDeal,
    };
  }
  if (pt.model === 'full_channel') {
    const perDeal = pt.avgEarning;
    const dealsNeeded = Math.ceil(target / perDeal);
    return {
      target,
      type: pt,
      perDeal,
      dealsNeeded,
      leadsNeeded: Math.ceil(dealsNeeded / 0.15),
      aptsNeeded: Math.ceil(dealsNeeded / 0.3),
    };
  }
  return { target, type: pt };
}

export function getIncomeActions(dayIdx, partnerType, weeklyRefs, weeklyConvos) {
  const actions = [];
  const pt = partnerType || 'referrer';
  if (pt === 'referrer') {
    if (dayIdx === 1) actions.push({ time: '10:00 AM', title: 'Network Outreach', sub: 'Reach out to ' + Math.ceil(weeklyConvos / 3) + ' people about referral program' });
    if (dayIdx === 3) actions.push({ time: '12:00 PM', title: 'Follow Up Leads', sub: 'Check in with interested prospects from this week' });
    if (dayIdx === 5) actions.push({ time: '11:00 AM', title: 'Weekend Conversations', sub: 'Talk to ' + Math.ceil(weeklyConvos / 3) + ' people \xB7 Share your referral link' });
  } else if (pt === 'business') {
    if (dayIdx === 1) actions.push({ time: '9:00 AM', title: 'Database Review', sub: 'Pull ' + Math.ceil(weeklyConvos / 2) + ' customer contacts to reach out' });
    if (dayIdx === 2) actions.push({ time: '10:00 AM', title: 'Customer Outreach', sub: 'Call/text customers from your database' });
    if (dayIdx === 4) actions.push({ time: '3:00 PM', title: 'On-Site Mentions', sub: "Mention referral program to today's customers" });
  } else if (pt === 'sales') {
    if (dayIdx === 1) actions.push({ time: '9:00 AM', title: 'Lead Gen \u2014 AI Calls', sub: 'Review overnight call results, pull qualified leads' });
    if (dayIdx === 2) actions.push({ time: '10:00 AM', title: 'Set Appointments', sub: 'Call qualified leads, schedule consultations' });
    if (dayIdx === 3) actions.push({ time: '1:00 PM', title: 'Run Presentations', sub: 'Deliver proposals to scheduled prospects' });
    if (dayIdx === 4) actions.push({ time: '9:00 AM', title: 'Close Follow-Ups', sub: 'Follow up on pending proposals' });
    if (dayIdx === 5) actions.push({ time: '10:00 AM', title: 'Pipeline Review', sub: 'Advance or close stale leads, plan next week' });
  }
  return actions;
}
