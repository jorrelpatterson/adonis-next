// src/state/defaults.js
export const DEFAULT_STATE = {
  profile: {
    name: '',
    age: '',
    gender: '',
    weight: '',
    goalW: '',
    hFt: '',
    hIn: '',
    activity: '',
    trainPref: 'morning',
    equipment: 'gym',
    domains: ['body'],
    tier: 'free',
  },
  goals: [],
  protocolState: {},
  logs: {
    checkins: {},
    weight: [],
    food: {},
    exercise: [],
    routine: {},
  },
  automations: {},
  revenue: {
    lifetime: 0,
    thisMonth: 0,
    byGoal: {},
    byType: { direct: 0, affiliate: 0 },
  },
  settings: {
    workSchedule: { enabled: false, mode: 'employee', schedule: {} },
    notifications: true,
    routineCapacity: 'normal',
  },
};
