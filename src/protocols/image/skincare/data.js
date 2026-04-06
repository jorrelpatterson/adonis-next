// src/protocols/image/skincare/data.js

// Day-specific AM actives (index 0=Sun, 1=Mon, ..., 6=Sat)
// null means no active for that day (Sunday rest)
export const SKIN_AM = [
  null,
  'Vitamin C Serum (20%)',
  'Niacinamide (10%)',
  'Vitamin C Serum (20%)',
  'Niacinamide (10%)',
  'Vitamin C Serum (20%)',
  'Antioxidant Serum'
];

// Day-specific PM actives (index 0=Sun, 1=Mon, ..., 6=Sat)
export const SKIN_PM = [
  'Hydrating Mask',
  'Retinol (0.5-1%)',
  'Hydrating Mask',
  'Exfoliating Acid (BHA/AHA)',
  'Retinol (0.5-1%)',
  'Hydrating Serum',
  'Exfoliating Acid (BHA/AHA)'
];

// Base AM routine steps (applied every day)
export const SKIN_AM_BASE = [
  'Gentle Cleanser',
  'Hyaluronic Acid',
  'Moisturizer',
  'SPF 50'
];

// Base PM routine steps (applied every day)
export const SKIN_PM_BASE = [
  'Oil Cleanser',
  'Foaming Cleanser',
  'Night Cream'
];

// Grooming tasks with frequency tracking
export const GROOMING_ITEMS = [
  {
    id: 'haircut',
    name: 'Haircut',
    icon: '✂️',
    freqDays: 21,
    freqLabel: 'Every 3 weeks',
    tip: 'Book next appointment before leaving. Tuesday/Wednesday = less wait.'
  },
  {
    id: 'beard',
    name: 'Beard Trim/Shape',
    icon: '🧔',
    freqDays: 7,
    freqLabel: 'Weekly',
    tip: "Trim neckline 2 fingers above Adam's apple. Shape cheek line naturally."
  },
  {
    id: 'nails',
    name: 'Nail Care',
    icon: '💅',
    freqDays: 10,
    freqLabel: 'Every 10 days',
    tip: "File, don't clip. Push cuticles after shower. Clean under nails daily."
  },
  {
    id: 'dental',
    name: 'Dental Whitening',
    icon: '🦷',
    freqDays: 90,
    freqLabel: 'Every 3 months',
    tip: 'Professional cleaning 2x/year. Whitening strips max 2 weeks on, 2 months off.'
  },
  {
    id: 'brows',
    name: 'Brow Grooming',
    icon: '👁️',
    freqDays: 14,
    freqLabel: 'Every 2 weeks',
    tip: "Remove strays only. Don't over-thin. Follow natural arch."
  },
  {
    id: 'nose_ear',
    name: 'Nose/Ear Hair',
    icon: '👃',
    freqDays: 14,
    freqLabel: 'Every 2 weeks',
    tip: "Trim, don't pluck. Use dedicated trimmer."
  }
];
