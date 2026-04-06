// src/state/defaults.js
export const DEFAULT_STATE = {
  profile: {
    name: '', age: '', gender: '', weight: '', goalW: '', hFt: '', hIn: '',
    activity: '', trainPref: 'morning', equipment: 'gym',
    targetDate: null,
    cycleData: null,
    domains: ['body'],
    tier: 'free',
  },
  goals: [],
  protocolState: {
    workout: { wkWeek: 1, wkViewDay: null, wkLogs: {}, wkPRs: {} },
    peptides: { activeCycles: [], supplyInv: [], injectionLog: [], pepCart: [], orderHistory: [], shippingInfo: {} },
    credit: { creditScores: [], disputes: [], disputeQueue: [], repairAuto: true, creditFactors: { payment: 90, utilization: 25, ageYears: 3, accounts: 5, inquiries: 2 }, ccWallet: [] },
    income: { incomeTarget: 2000, incomePartnerType: 'referrer', incomeVerticals: ['solar', 'roofing', 'telecom'], incomeLeads: [], incomeEarnings: [], incomeSetupDone: false },
    citizenship: { czApps: [], czPassports: [{ country: 'us', visaFree: 186 }], czSetupDone: false, czAnswers: {}, czResults: null },
    image: { skinType: null, skinConcerns: [], groomingLog: {}, fragranceCollection: [], wardrobeItems: {}, styleArchetype: null },
    mind: { mindSessions: [], mindStreak: 0, mindStack: [], gratitudeEntries: [] },
    purpose: { bucketList: [], coreValues: [], lifeScores: {}, yearlyGoals: [] },
    environment: { envScores: { sleep: 0, workspace: 0, air: 0, light: 0, digital: 0, cleanliness: 0 }, envChecklist: {} },
    community: { socialProfile: { optedIn: false, displayName: '', shareGoals: true, shareStreak: true }, partners: [] },
  },
  logs: {
    checkins: {}, weight: [], food: {}, exercise: [], routine: {}, bodyMeasurements: [],
  },
  automations: {},
  revenue: { lifetime: 0, thisMonth: 0, byGoal: {}, byType: { direct: 0, affiliate: 0 } },
  settings: {
    workSchedule: { enabled: false, mode: 'employee', schedule: {} },
    notifications: true, routineCapacity: 'normal',
  },
};
