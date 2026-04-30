// Ported verbatim from public/app.html:194-203 (v1).
// 8 daily metrics, each rated 1-5 via emoji.
// `stress` is inverted — higher rating = LESS stress (more calm).
export const CHECKIN_FIELDS = [
  { id: 'mood',     label: 'Mood',           emoji: ['\u{1F61E}', '\u{1F615}', '\u{1F610}', '\u{1F642}', '\u{1F601}'], colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
  { id: 'energy',   label: 'Energy',         emoji: ['\u{1FAAB}', '\u{1F50B}', '⚡',     '\u{1F525}', '\u{1F4A5}'], colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
  { id: 'sleep',    label: 'Sleep Quality',  emoji: ['\u{1F634}', '\u{1F62A}', '\u{1F6CF}️', '\u{1F60C}', '\u{1F319}'], colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
  { id: 'stress',   label: 'Stress',         emoji: ['\u{1F631}', '\u{1F630}', '\u{1F624}', '\u{1F62E}‍\u{1F4A8}', '\u{1F60E}'], colors: ['#34D399', '#E8D5B7', '#D4C4AA', '#9CA3AF', '#6B7280'] },
  { id: 'appetite', label: 'Appetite',       emoji: ['\u{1F6AB}', '\u{1F4C9}', '\u{1F610}', '\u{1F4C8}', '\u{1F37D}️'], colors: ['#A8BCD0', '#A8BCD0', '#D4C4AA', '#FBBF24', '#FBBF24'] },
  { id: 'skin',     label: 'Skin Quality',   emoji: ['\u{1F623}', '\u{1F615}', '\u{1F610}', '\u{1F60A}', '✨'],     colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
  { id: 'focus',    label: 'Mental Clarity', emoji: ['\u{1F32B}️', '\u{1F636}‍\u{1F32B}️', '\u{1F914}', '\u{1F3AF}', '\u{1F9E0}'], colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
  { id: 'soreness', label: 'Soreness',       emoji: ['\u{1F635}', '\u{1F623}', '\u{1F62C}', '\u{1F44D}', '\u{1F4AA}'], colors: ['#6B7280', '#9CA3AF', '#D4C4AA', '#E8D5B7', '#34D399'] },
];
