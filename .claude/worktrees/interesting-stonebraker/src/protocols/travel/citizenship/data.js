// src/protocols/travel/citizenship/data.js

export const CZ_PATHWAYS = [
  { id: 'descent', name: 'By Descent', icon: '🧬', desc: 'Claim through ancestry', avgTime: '12-48 mo' },
  { id: 'investment', name: 'By Investment', icon: '💎', desc: 'Golden visas & economic citizenship', avgTime: '3-24 mo' },
  { id: 'residency', name: 'By Residency', icon: '🏠', desc: 'Naturalize after living abroad', avgTime: '24-84 mo' },
  { id: 'renewal', name: 'Passport Renewal', icon: '📋', desc: 'Renew or get first passport', avgTime: '1-3 mo' },
];

export const CZ_COUNTRIES = [
  {
    id: 'italy',
    name: 'Italy',
    flag: '🇮🇹',
    pathway: 'descent',
    eligible: 'Italian ancestor who emigrated after 1861, unbroken citizenship line',
    timeline: '24-48 mo (consulate) / 12-24 mo (court)',
    cost: '$500-15,000',
    visaFree: 191,
    docs: [
      'Birth certs (full lineage)',
      'Marriage certs (full lineage)',
      'Death certs (deceased)',
      'USCIS naturalization search',
      'Italian ancestor BC from Comune',
      'Apostille all US docs',
      'Certified Italian translations',
      'Consulate appointment',
    ],
    tips: [
      'USCIS searches take 6-12 months — file FIRST',
      'Book consulate appointment NOW, 2+ year waits',
      'Join Italian Citizenship Facebook groups for alerts',
      '1948 court case faster for maternal line but costs $5-15K',
    ],
    benefits: [
      'EU citizenship — live/work anywhere in EU',
      '191 visa-free countries',
      'EU healthcare access',
      'Pass to children automatically',
    ],
  },
  {
    id: 'ireland',
    name: 'Ireland',
    flag: '🇮🇪',
    pathway: 'descent',
    eligible: 'Irish-born grandparent (or parent born in Ireland)',
    timeline: '12-18 mo',
    cost: '$300-500',
    visaFree: 190,
    docs: [
      'Your birth certificate',
      "Parent's birth certificate",
      "Irish grandparent's birth certificate",
      'Marriage certificates in lineage',
      'Photo ID + proof of address',
      'Foreign Birth Registration form',
    ],
    tips: [
      'One of the easiest descent claims',
      'Processing ~12-18 months due to backlog',
      'Irish passport = full EU citizenship',
      'Common Travel Area with UK',
    ],
    benefits: [
      'EU citizenship',
      'Common Travel Area with UK',
      '190 visa-free countries',
      'Pass to children',
    ],
  },
  {
    id: 'poland',
    name: 'Poland',
    flag: '🇵🇱',
    pathway: 'descent',
    eligible: 'Polish ancestor — no generational limit, back to 1920',
    timeline: '6-18 mo',
    cost: '$500-3,000',
    visaFree: 188,
    docs: [
      'Polish ancestor documents (birth/passport/military)',
      'Full lineage documentation',
      'Naturalization records check',
      'Sworn Polish translations',
      'Application to Voivode',
    ],
    tips: [
      'No generational limit — great-great-grandparents work',
      'Polish archives survived WWII well',
      'Polish attorney can handle remotely ($1-3K)',
    ],
    benefits: [
      'EU citizenship',
      'Schengen zone',
      'Growing economy',
      'No wealth tax',
    ],
  },
  {
    id: 'germany',
    name: 'Germany',
    flag: '🇩🇪',
    pathway: 'descent',
    eligible: 'German ancestor, especially persecution victims (Article 116)',
    timeline: '12-36 mo',
    cost: '$200-2,000',
    visaFree: 190,
    docs: [
      "Proof of ancestor's German citizenship",
      'Persecution proof (if Article 116)',
      'Complete lineage documentation',
      'BVA application form',
    ],
    tips: [
      'Article 116 is very generous — covers Jewish, political persecution',
      '2021 law changes expanded eligibility',
      'Free application for Article 116 cases',
    ],
    benefits: [
      'EU citizenship',
      'Top 5 passport globally',
      'Free university education',
      'Excellent healthcare',
    ],
  },
  {
    id: 'portugal_gv',
    name: 'Portugal Golden Visa',
    flag: '🇵🇹',
    pathway: 'investment',
    eligible: '€500K+ fund investment',
    timeline: '5-6 years to passport',
    cost: '€500,000+',
    visaFree: 191,
    docs: [
      'Proof of qualifying investment',
      'Criminal background check',
      'Portuguese health insurance',
      'NIF (tax number)',
      'A2 Portuguese language cert',
    ],
    tips: [
      'Fund investments most popular — hands-off',
      'Only 7 days/year in Portugal required',
      'Real estate route eliminated in 2024',
      'A2 language test is easy — 3 months study',
    ],
    benefits: [
      'EU citizenship',
      'Low residency requirement',
      'NHR tax regime',
      'Excellent quality of life',
    ],
  },
  {
    id: 'caribbean',
    name: 'Caribbean CBI',
    flag: '🏝️',
    pathway: 'investment',
    eligible: 'Donation or investment from $100K',
    timeline: '3-6 months',
    cost: '$100K-250K',
    visaFree: 157,
    docs: [
      'CBI application form',
      'Proof of funds',
      'Enhanced due diligence',
      'Medical examination',
      'Bank reference letter',
    ],
    tips: [
      'Fastest path to second passport',
      'No residency requirement',
      'Grenada has US E-2 treaty access',
      'Dominica cheapest at $100K',
    ],
    benefits: [
      '3-6 month processing',
      'No residency required',
      'Tax advantages',
      'Geographic diversification',
    ],
    subOptions: [
      { name: 'Dominica', cost: '$100K', visaFree: 146 },
      { name: 'Grenada', cost: '$150K', visaFree: 148 },
      { name: 'St. Kitts', cost: '$250K', visaFree: 157 },
      { name: 'Antigua', cost: '$230K', visaFree: 151 },
    ],
  },
  {
    id: 'malta',
    name: 'Malta',
    flag: '🇲🇹',
    pathway: 'investment',
    eligible: '€690K+ contribution + property',
    timeline: '12-36 months',
    cost: '€690,000+',
    visaFree: 190,
    docs: [
      'National contribution (€600-750K)',
      'Property purchase/rental',
      'Philanthropic donation (€10K+)',
      'Four-tier due diligence',
    ],
    tips: [
      'Most expensive EU CBI but fastest EU passport',
      'Very strict due diligence',
      'English-speaking',
    ],
    benefits: [
      'EU citizenship',
      'Top passport globally',
      'English-speaking',
      'Favorable tax regime',
    ],
  },
  {
    id: 'mexico',
    name: 'Mexico',
    flag: '🇲🇽',
    pathway: 'residency',
    eligible: '4 years residency',
    timeline: '4-5 years',
    cost: '$1,000-3,000',
    visaFree: 161,
    docs: [
      'Temporary resident visa',
      'Proof of income/savings',
      'Background check',
      'Spanish proficiency test',
      'Mexican history exam',
    ],
    tips: [
      'Temporary → Permanent → Naturalize',
      'Spanish proficiency required',
      'Culture/history exam is easy with study',
    ],
    benefits: [
      '161 visa-free countries',
      'Low cost of living',
      'No worldwide income tax (with planning)',
    ],
  },
  {
    id: 'panama',
    name: 'Panama',
    flag: '🇵🇦',
    pathway: 'residency',
    eligible: '5 years residency',
    timeline: '5-6 years',
    cost: '$2,000-5,000',
    visaFree: 143,
    docs: [
      'Friendly Nations Visa application',
      'Bank account with $5K+',
      'Background check',
      'Health certificate',
    ],
    tips: [
      'Friendly Nations Visa easy for US citizens',
      'No language requirement',
      'USD is legal tender',
    ],
    benefits: [
      'Territorial tax system',
      'USD economy',
      'Strategic location',
      'No language requirement',
    ],
  },
  {
    id: 'argentina',
    name: 'Argentina',
    flag: '🇦🇷',
    pathway: 'residency',
    eligible: '2 years residency',
    timeline: '2-3 years',
    cost: '$500-2,000',
    visaFree: 171,
    docs: [
      'Residency visa application',
      'Background check (FBI apostilled)',
      'Proof of income',
      '2 years residency proof',
    ],
    tips: [
      'One of fastest naturalizations globally',
      'Spanish helpful but not required',
      'Strong passport (171 visa-free)',
    ],
    benefits: [
      'Fast naturalization (2 years)',
      '171 visa-free countries',
      'Rich culture',
      'Low cost of living',
    ],
  },
  {
    id: 'paraguay',
    name: 'Paraguay',
    flag: '🇵🇾',
    pathway: 'residency',
    eligible: '3 years residency',
    timeline: '3-4 years',
    cost: '$1,000-3,000',
    visaFree: 142,
    docs: [
      'Permanent residency application',
      'Bank deposit ($5K+)',
      'Background check',
      'Paraguayan ID (cedula)',
    ],
    tips: [
      "Doesn't require physical presence full-time",
      'Very low cost of living',
      'Easy residency process',
    ],
    benefits: [
      'Territorial tax system',
      'Low enforcement of presence',
      'Low cost of living',
    ],
  },
];

export const CZ_QUESTIONS = [
  {
    id: 'ancestry',
    q: 'Do you have ancestry from any of these countries?',
    type: 'multi',
    opts: [
      { id: 'italy', l: '🇮🇹 Italy' },
      { id: 'ireland', l: '🇮🇪 Ireland' },
      { id: 'poland', l: '🇵🇱 Poland' },
      { id: 'germany', l: '🇩🇪 Germany' },
      { id: 'none', l: 'None / Not sure' },
    ],
  },
  {
    id: 'budget',
    q: "What's your budget?",
    type: 'single',
    opts: [
      { id: 'free', l: 'Minimal ($0-500)', tier: 0 },
      { id: 'low', l: 'Low ($500-5K)', tier: 1 },
      { id: 'mid', l: 'Medium ($5K-50K)', tier: 2 },
      { id: 'high', l: 'High ($50K-250K)', tier: 3 },
      { id: 'premium', l: 'Premium ($250K+)', tier: 4 },
    ],
  },
  {
    id: 'timeline',
    q: 'How fast do you need this?',
    type: 'single',
    opts: [
      { id: 'asap', l: 'ASAP (3-6 months)' },
      { id: 'soon', l: '1-2 years' },
      { id: 'medium', l: '3-5 years' },
      { id: 'no_rush', l: 'No rush' },
    ],
  },
  {
    id: 'relocate',
    q: 'Would you live abroad?',
    type: 'single',
    opts: [
      { id: 'yes', l: 'Yes, full-time' },
      { id: 'part', l: 'Part-time / split' },
      { id: 'minimal', l: 'Minimal visits' },
      { id: 'no', l: 'No relocation' },
    ],
  },
  {
    id: 'purpose',
    q: 'Why do you want a second passport?',
    type: 'multi',
    opts: [
      { id: 'travel', l: '🌍 Travel access' },
      { id: 'eu', l: '🇪🇺 EU access' },
      { id: 'planb', l: '🛡️ Plan B / safety' },
      { id: 'tax', l: '💰 Tax optimization' },
      { id: 'children', l: '👶 Pass to children' },
      { id: 'business', l: '💼 Business' },
    ],
  },
  {
    id: 'languages',
    q: 'Do you speak any of these?',
    type: 'multi',
    opts: [
      { id: 'spanish', l: '🇪🇸 Spanish' },
      { id: 'portuguese', l: '🇵🇹 Portuguese' },
      { id: 'italian', l: '🇮🇹 Italian' },
      { id: 'german', l: '🇩🇪 German' },
      { id: 'none', l: 'English only' },
    ],
  },
];

export const CZ_APP_STATUS = [
  'researching',
  'gathering_docs',
  'apostille',
  'translation',
  'waiting_appt',
  'submitted',
  'processing',
  'approved',
  'completed',
  'denied',
];

export const CZ_STATUS_COLORS = {
  researching: '#9CA3AF',
  gathering_docs: '#60A5FA',
  apostille: '#A855F7',
  translation: '#8B5CF6',
  waiting_appt: '#FBBF24',
  submitted: '#F97316',
  processing: '#EC4899',
  approved: '#34D399',
  completed: '#22C55E',
  denied: '#EF4444',
};

export const CZ_STATUS_LABELS = {
  researching: 'Researching',
  gathering_docs: 'Gathering Docs',
  apostille: 'Apostille',
  translation: 'Translating',
  waiting_appt: 'Waiting Appt',
  submitted: 'Submitted',
  processing: 'Processing',
  approved: 'Approved!',
  completed: 'Passport ✓',
  denied: 'Denied',
};

export const CZ_DOC_STATUS = ['pending', 'ordered', 'in_progress', 'complete'];

export function scoreCitizenshipPaths(answers) {
  return CZ_COUNTRIES.map((c) => {
    let score = 0;
    const reasons = [];

    if (c.pathway === 'descent' && answers.ancestry?.includes(c.id)) {
      score += 40;
      reasons.push('Ancestry match');
    } else if (
      c.pathway === 'descent' &&
      !answers.ancestry?.includes(c.id) &&
      !answers.ancestry?.includes('none')
    ) {
      score -= 30;
    } else if (c.pathway === 'descent' && answers.ancestry?.includes('none')) {
      score -= 40;
    }

    const budgetTier = CZ_QUESTIONS[1].opts.find((o) => o.id === answers.budget)?.tier ?? 1;
    if (c.pathway === 'descent') {
      score += budgetTier >= 0 ? 20 : 10;
    } else if (c.pathway === 'investment') {
      if (c.id === 'caribbean' && budgetTier >= 3) {
        score += 20;
        reasons.push('Within budget');
      } else if (c.id === 'portugal_gv' && budgetTier >= 4) {
        score += 20;
        reasons.push('Within budget');
      } else if (c.id === 'malta' && budgetTier >= 4) {
        score += 15;
        reasons.push('Within budget');
      } else {
        score -= 20;
      }
    } else if (c.pathway === 'residency') {
      score += budgetTier >= 1 ? 18 : 10;
    }

    const tl = answers.timeline;
    if (tl === 'asap') {
      if (c.id === 'caribbean') score += 20;
      else if (c.pathway === 'residency') score -= 10;
      else if (c.pathway === 'descent') score += 5;
    } else if (tl === 'soon') {
      if (c.pathway === 'descent') score += 15;
      else if (c.id === 'caribbean') score += 15;
      else score += 8;
    } else if (tl === 'medium') {
      score += 15;
    } else {
      score += 18;
    }

    const rel = answers.relocate;
    if (c.pathway === 'residency') {
      if (rel === 'yes' || rel === 'part') score += 10;
      else if (rel === 'minimal') score += c.id === 'paraguay' ? 8 : 3;
      else score -= 5;
    } else if (c.pathway === 'investment') {
      score += rel === 'no' ? 10 : 8;
    } else {
      score += 10;
    }

    const purp = answers.purpose || [];
    if (purp.includes('eu') && c.visaFree >= 188) score += 10;
    if (purp.includes('travel') && c.visaFree >= 170) score += 8;
    if (purp.includes('planb')) score += 5;
    if (purp.includes('tax') && ['panama', 'paraguay', 'caribbean'].includes(c.id)) score += 8;
    if (purp.includes('children') && c.pathway === 'descent') score += 8;

    const langs = answers.languages || [];
    if (c.id === 'mexico' && langs.includes('spanish')) {
      score += 5;
      reasons.push('Speaks Spanish');
    }
    if (c.id === 'argentina' && langs.includes('spanish')) {
      score += 5;
      reasons.push('Speaks Spanish');
    }
    if (c.id === 'portugal_gv' && langs.includes('portuguese')) {
      score += 5;
      reasons.push('Speaks Portuguese');
    }
    if (c.id === 'italy' && langs.includes('italian')) {
      score += 5;
      reasons.push('Speaks Italian');
    }
    if (c.id === 'germany' && langs.includes('german')) {
      score += 5;
      reasons.push('Speaks German');
    }

    return { ...c, score: Math.max(0, Math.min(100, score)), reasons };
  }).sort((a, b) => b.score - a.score);
}
