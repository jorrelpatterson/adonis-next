// src/protocols/mind/data.js
// source: v2-revival-archive src/views/MindView.jsx — extracted per single-source rule, Phase 4 Task 1

// 5 breathwork patterns (parallel to mind protocol catalog).
export const BREATHWORK_PATTERNS = [
  { id: 'box', name: 'Box', emoji: '\u{1F532}', tag: 'calm',
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    desc: '4·4·4·4 — calm', cycles: 4 },
  { id: '478', name: '4-7-8', emoji: '\u{1F319}', tag: 'sleep',
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    desc: '4 inhale · 7 hold · 8 exhale — sleep', cycles: 4 },
  { id: 'wimhof', name: 'Wim Hof', emoji: '⚡', tag: 'energy',
    inhale: 2, hold1: 0, exhale: 2, hold2: 0,
    desc: '30 deep breaths · hold · recover — energy', cycles: 30,
    isWimHof: true },
  { id: 'calm', name: 'Calm', emoji: '\u{1F30A}', tag: 'anxiety',
    inhale: 5, hold1: 0, exhale: 5, hold2: 0,
    desc: '5·0·5 — anxiety relief', cycles: 6 },
  { id: 'energizing', name: 'Energizing', emoji: '✨', tag: 'alertness',
    inhale: 2, hold1: 0, exhale: 1, hold2: 0,
    desc: '2·0·1 — alertness', cycles: 10 },
];

// 8 nootropics (hardcoded from mind protocol catalog).
export const NOOTROPICS = [
  { id: 'caffeine-theanine', name: 'Caffeine + L-Theanine', dose: '100mg / 200mg', timing: 'morning',
    benefit: 'Focus boost' },
  { id: 'lions-mane', name: "Lion's Mane", dose: '500-1000mg', timing: 'morning',
    benefit: 'BDNF, neurogenesis' },
  { id: 'creatine', name: 'Creatine', dose: '5g', timing: 'any',
    benefit: 'Brain energy' },
  { id: 'mag-threonate', name: 'Magnesium-Threonate', dose: '2g', timing: 'evening',
    benefit: 'Sleep + memory' },
  { id: 'omega3', name: 'Omega-3 (DHA)', dose: '1-2g', timing: 'with food',
    benefit: 'Cognitive longevity' },
  { id: 'rhodiola', name: 'Rhodiola Rosea', dose: '200-400mg', timing: 'morning',
    benefit: 'Stress + endurance' },
  { id: 'alpha-gpc', name: 'Alpha-GPC', dose: '300-600mg', timing: 'morning',
    benefit: 'Acetylcholine precursor' },
  { id: 'ashwagandha', name: 'Ashwagandha (KSM-66)', dose: '600mg', timing: 'evening',
    benefit: 'Cortisol + sleep' },
];

// Focus area display map.
export const FOCUS_LABELS = {
  calm: { icon: '\u{1F30A}', label: 'Calm' },
  clarity: { icon: '\u{1F48E}', label: 'Clarity' },
  performance: { icon: '⚡', label: 'Performance' },
  resilience: { icon: '\u{1F6E1}️', label: 'Resilience' },
};
