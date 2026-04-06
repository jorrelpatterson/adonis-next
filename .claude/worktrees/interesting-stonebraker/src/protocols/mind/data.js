// src/protocols/mind/data.js
// Extracted from app.html

export const MIND_TECHNIQUES = [
  { id: 'meditation', name: 'Meditation', icon: '\u{1F9D8}', cat: 'calm', desc: 'Focused attention or open awareness practice', durations: [5, 10, 15, 20, 30] },
  { id: 'breathwork', name: 'Breathwork', icon: '\u{1F32C}\uFE0F', cat: 'calm', desc: 'Box breathing, Wim Hof, or 4-7-8 patterns', durations: [3, 5, 10] },
  { id: 'journaling', name: 'Journaling', icon: '\u{1F4DD}', cat: 'clarity', desc: 'Morning pages, gratitude, or stream of consciousness', durations: [10, 15, 20] },
  { id: 'visualization', name: 'Visualization', icon: '\u{1F3AF}', cat: 'performance', desc: 'Mental rehearsal of goals, outcomes, and processes', durations: [5, 10, 15] },
  { id: 'focus_block', name: 'Focus Block', icon: '\u26A1', cat: 'performance', desc: 'Deep work sprint \u2014 no distractions, one task', durations: [25, 50, 90] },
  { id: 'cold_exposure', name: 'Cold Exposure', icon: '\u{1F9CA}', cat: 'resilience', desc: 'Cold shower or ice bath for dopamine and resilience', durations: [2, 3, 5] },
  { id: 'nature_walk', name: 'Nature Walk', icon: '\u{1F33F}', cat: 'calm', desc: 'Unstructured outdoor time without devices', durations: [15, 30, 45] },
  { id: 'reading', name: 'Reading', icon: '\u{1F4D6}', cat: 'clarity', desc: 'Non-fiction or educational reading block', durations: [20, 30, 45] },
  { id: 'gratitude', name: 'Gratitude', icon: '\u{1F64F}', cat: 'clarity', desc: "List 3+ things you're grateful for today", durations: [3, 5] },
  { id: 'digital_detox', name: 'Digital Detox', icon: '\u{1F4F5}', cat: 'resilience', desc: 'No phone, no screens \u2014 scheduled disconnection', durations: [30, 60, 120] },
];

export const MIND_CATEGORIES = {
  calm: { name: 'Calm', color: '#8B5CF6', desc: 'Reduce stress, increase peace' },
  performance: { name: 'Performance', color: '#F59E0B', desc: 'Sharpen focus, boost output' },
  clarity: { name: 'Clarity', color: '#60A5FA', desc: 'Think clearly, gain perspective' },
  resilience: { name: 'Resilience', color: '#34D399', desc: 'Build mental toughness' },
};

export const BREATHING_PATTERNS = {
  box: { name: 'Box Breathing', desc: '4-4-4-4 \u2014 Navy SEAL calm', phases: [{ p: 'Inhale', d: 4 }, { p: 'Hold', d: 4 }, { p: 'Exhale', d: 4 }, { p: 'Hold', d: 4 }], rounds: 4 },
  '478': { name: '4-7-8 Breathing', desc: 'Dr. Weil \u2014 deep relaxation & sleep', phases: [{ p: 'Inhale', d: 4 }, { p: 'Hold', d: 7 }, { p: 'Exhale', d: 8 }], rounds: 4 },
  wim: { name: 'Wim Hof Round', desc: '30 power breaths \u2192 hold \u2192 recovery', phases: [{ p: 'Rapid Inhale', d: 2 }, { p: 'Rapid Exhale', d: 1 }], rounds: 30, holdAfter: true },
  calm: { name: 'Calm Breathing', desc: '5-5 \u2014 simple anxiety relief', phases: [{ p: 'Inhale', d: 5 }, { p: 'Exhale', d: 5 }], rounds: 6 },
  energize: { name: 'Energizing Breath', desc: 'Quick inhale, slow exhale \u2014 wakes you up', phases: [{ p: 'Inhale', d: 2 }, { p: 'Exhale', d: 6 }], rounds: 6 },
};

export const NOOTROPICS = [
  { id: 'caffeine_lt', name: 'Caffeine + L-Theanine', dose: '100mg + 200mg', timing: 'Morning', effect: 'Calm focus without jitters', cat: 'performance' },
  { id: 'lions_mane', name: "Lion's Mane", dose: '500-1000mg', timing: 'Morning', effect: 'Neurogenesis, memory support', cat: 'clarity' },
  { id: 'creatine', name: 'Creatine', dose: '5g', timing: 'Any', effect: 'Brain energy, cognitive reserve', cat: 'performance' },
  { id: 'magnesium', name: 'Magnesium L-Threonate', dose: '144mg elemental', timing: 'Evening', effect: 'Sleep quality, brain magnesium levels', cat: 'calm' },
  { id: 'omega3', name: 'Omega-3 (EPA/DHA)', dose: '2-3g', timing: 'With food', effect: 'Neuroprotection, mood regulation', cat: 'clarity' },
  { id: 'rhodiola', name: 'Rhodiola Rosea', dose: '200-400mg', timing: 'Morning', effect: 'Stress adaptation, fatigue reduction', cat: 'resilience' },
  { id: 'alpha_gpc', name: 'Alpha-GPC', dose: '300-600mg', timing: 'Morning', effect: 'Acetylcholine boost, memory', cat: 'performance' },
  { id: 'ashwagandha', name: 'Ashwagandha', dose: '300-600mg', timing: 'Evening', effect: 'Cortisol reduction, anxiety relief', cat: 'calm' },
];
