// src/protocols/environment/data.js
// source: v2-revival-archive src/views/EnvironmentView.jsx — extracted per single-source rule, Phase 4 Task 1

// 6 areas, 6 items each = 36 total. Order matches the spec.
// `priorityKey` aligns with onboarding priorityArea values
// (sleep, workspace, air, digital — light & cleanliness have no direct match).
export const CHECKLIST = [
  {
    key: 'sleep',
    title: 'Sleep Environment',
    priorityKey: 'sleep',
    items: [
      'Bedroom under 67°F',
      'Blackout curtains drawn',
      'No screens 1 hour before bed',
      'White noise / silence',
      'Bed reserved for sleep',
      'Mattress under 8 years old',
    ],
  },
  {
    key: 'workspace',
    title: 'Workspace',
    priorityKey: 'workspace',
    items: [
      'Monitor at eye level',
      'Chair height correct (90° elbow)',
      'Standing desk used 1+ hr today',
      'Plant or natural element nearby',
      'Desk decluttered',
      'Wrist support neutral',
    ],
  },
  {
    key: 'air',
    title: 'Air Quality',
    priorityKey: 'air',
    items: [
      'HEPA air purifier on',
      'Plants in workspace',
      'Window opened 10+ min today',
      'No candles/incense indoors',
      'CO2 monitor checked',
      'Air filter <90 days old',
    ],
  },
  {
    key: 'light',
    title: 'Light Optimization',
    priorityKey: null,
    items: [
      'Sunlight exposure within 30 min of waking',
      'Bright light during work hours',
      'Warm light after sunset',
      'Blue blockers after 8pm',
      'Salt lamp / amber bulb evening',
      'Outdoor walk in afternoon',
    ],
  },
  {
    key: 'digital',
    title: 'Digital Environment',
    priorityKey: 'digital',
    items: [
      'Phone face-down during deep work',
      'Notifications silenced',
      'Social media app screen-time <60 min',
      'Inbox-zero attempted',
      'One-tab focus practiced',
      'Unsubscribed from at least one feed',
    ],
  },
  {
    key: 'cleanliness',
    title: 'Cleanliness',
    priorityKey: null,
    items: [
      'Bed made',
      'Dishes done',
      'Floors clear',
      'Surfaces wiped',
      'Trash emptied',
      'One thing decluttered',
    ],
  },
];

// Pretty labels for the living-situation card.
export const LIVING_LABELS = {
  apartment: 'Apartment',
  house: 'House',
  condo: 'Condo',
  shared: 'Shared housing',
  other: 'Other',
};
export const PRIORITY_LABELS = {
  sleep: 'Sleep environment',
  workspace: 'Workspace setup',
  air: 'Air quality',
  digital: 'Digital wellness',
  all: 'All areas',
};
