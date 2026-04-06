// src/protocols/environment/data.js

export const ENV_AREAS = [
  {
    id: 'sleep',
    name: 'Sleep Environment',
    icon: '\u{1F6CF}\uFE0F',
    items: ['Blackout curtains/mask', 'Room temp 65-68F', 'White noise/fan', 'No screens 1hr before bed', 'Quality mattress & pillow', 'No pets in bed'],
    tips: 'Sleep quality determines recovery, hormone production, and next-day performance.',
  },
  {
    id: 'workspace',
    name: 'Workspace',
    icon: '\u{1F4BB}',
    items: ['Monitor at eye level', 'Chair supports lumbar', 'Keyboard at elbow height', 'Standing desk intervals', 'Good task lighting', 'Cable management'],
    tips: 'Your workspace directly affects focus duration and physical health.',
  },
  {
    id: 'air',
    name: 'Air Quality',
    icon: '\u{1F32C}\uFE0F',
    items: ['Air purifier running', 'Plants in main rooms', 'Open windows 15 min/day', 'Humidity 40-50%', 'No synthetic fragrances', 'Clean HVAC filters'],
    tips: 'Air quality impacts cognitive function, sleep quality, and immune health.',
  },
  {
    id: 'light',
    name: 'Light Optimization',
    icon: '\u{1F31E}',
    items: ['Bright light AM (10k lux)', 'Blue light glasses after sunset', 'Dim warm lights evening', 'Sunrise alarm clock', 'No overhead lights at night', 'Screen night mode on'],
    tips: 'Light exposure controls your circadian rhythm \u2014 the master clock for energy, sleep, and hormones.',
  },
  {
    id: 'digital',
    name: 'Digital Environment',
    icon: '\u{1F4F1}',
    items: ['Phone grayscale after 8PM', 'App time limits set', 'Notifications audited', 'No phone in bedroom', 'Weekly screen time review', 'Social media time-boxed'],
    tips: 'Your digital environment controls your attention. Guard it aggressively.',
  },
  {
    id: 'cleanliness',
    name: 'Cleanliness',
    icon: '\u{1F9F9}',
    items: ['Dishes done daily', 'Surfaces clear', 'Laundry current', 'Bathroom clean weekly', 'Fridge organized', 'Clutter-free zones'],
    tips: 'A clean space reduces cortisol and mental load. 10 minutes a day keeps chaos at bay.',
  },
];
