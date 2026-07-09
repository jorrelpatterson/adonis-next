// Golden characterization tests for the v1 routine engine (buildRoutine).
// Source of truth: tests/golden/v1/routine.js (verbatim extraction from
// public/app.html @ commit 3cf8214). See docs/v1-feature-parity-ledger.md.
//
// Determinism notes:
// - TZ pinned to UTC: buildRoutine mixes UTC date keys (ydKey via toISOString)
//   with local-time keys (the checkin "yesterday" key built from getFullYear/
//   getMonth/getDate) — they only agree under a fixed timezone.
// - Clock pinned to 2026-07-09T12:00:00 (a Thursday) with vi.setSystemTime:
//   buildRoutine reads Date.now()/new Date() for the "yesterday" intel keys,
//   grooming due-dates, dispute deadline math, and 5/24 window math. dayIdx is
//   an explicit argument and never derived from the clock, so cases may use
//   any day of the week.
// - No Math.random anywhere in the extracted code — no stub needed.
// - buildRoutine references wkWeek/wkLogs behind typeof guards; those are React
//   component state in v1, invisible at the module scope where buildRoutine is
//   defined, so the guards always fell back in v1 too. Identical here.
process.env.TZ = 'UTC';

import { beforeAll, afterAll, vi } from 'vitest';
import { goldenTest } from './harness.js';
import { buildRoutine, getCycleInfo } from './v1/routine.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});
afterAll(() => {
  vi.useRealTimers();
});

// Argument order (see call sites app.html:4071/4490):
// buildRoutine(dayIdx, prof, recPeps, isPremium, intensity, workSched,
//              cycleInfo, incomeData, suggestedPeps, disputes, tCal, intel)
// - prof mirrors the `prof` state default (app.html:3127)
// - recPeps/suggestedPeps entries mirror PEPTIDES stack items ({id, name, dose, freq, tod})
// - workSched mirrors the workSchedule state (app.html:3327)
// - intel mirrors routineIntel (app.html:4070): { exerciseLogs, checkins, weightLog,
//   creditScores, ccWallet, czApps, groomingLog, partners, foodLogs, checkedR }

const OFF_SCHED = { 0: null, 1: { s: '09:00', e: '17:00' }, 2: { s: '09:00', e: '17:00' }, 3: { s: '09:00', e: '17:00' }, 4: { s: '09:00', e: '17:00' }, 5: { s: '09:00', e: '17:00' }, 6: null };
const NO_WORK = { enabled: false, mode: 'employee', label: 'Work', schedule: OFF_SCHED };
const EMPTY_INTEL = { exerciseLogs: [], checkins: {}, weightLog: [], creditScores: [], ccWallet: [], czApps: [], groomingLog: {}, partners: [], foodLogs: {}, checkedR: {} };

const CASES = [
  {
    // Onboarding-default profile: no name, no weight (100oz hydration fallback),
    // empty goals (-> "Wellness" fallback), tCal 0 (-> em-dash running total).
    label: 'free tier / body only / Wednesday / low intensity / empty profile+intel',
    input: [
      3,
      { name: '', age: '', gender: 'male', hFt: '', hIn: '', weight: '', goalW: '', activity: '', goals: [], primary: '', targetDate: '', domains: ['body'], trainPref: 'morning' },
      [], false, 'low', NO_WORK, null, null, [], [], 0,
      EMPTY_INTEL,
    ],
  },
  {
    // Monday employee 9-5: work bookends, weekly/2x-week/as-needed peptide
    // frequencies, morning+evening suggested peptides, referrer income actions,
    // yesterday summary (workout+cals+mood), grooming due, checkin alerts
    // (low sleep / high stress / soreness), in_review dispute -> Monday weekly
    // credit check, citizenship submitted + Monday check-in, environment items.
    label: 'premium / multi-domain / Monday / employee 9-5 / peptides + rich intel',
    input: [
      1,
      { name: 'Marcus Reid', age: '32', gender: 'male', hFt: '5', hIn: '11', weight: '165', goalW: '180', activity: 'moderate', goals: ['Muscle Gain'], primary: 'Muscle Gain', targetDate: '2026-10-01', domains: ['body', 'mind', 'image', 'money', 'environment', 'relationships', 'citizenship'], trainPref: 'evening' },
      [
        { id: 1, name: 'Semaglutide 5mg', dose: '0.25-2.4mg/wk', freq: 'weekly', tod: 'morning' },
        { id: 60, name: 'CJC/Ipa Blend', dose: '100mcg each before bed', freq: 'daily', tod: 'evening' },
        { id: 71, name: 'TB-500', dose: '2-5mg 2x/wk', freq: '2x/week', tod: 'morning' },
        { id: 96, name: 'PT-141', dose: '1-2mg PRN', freq: 'as_needed', tod: 'evening' },
      ],
      true, 'high',
      { enabled: true, mode: 'employee', label: 'Office', schedule: OFF_SCHED },
      null,
      { partnerType: 'referrer', weeklyRefs: 2, weeklyConvos: 10 },
      [
        { id: 29, name: 'AOD-9604', dose: '300mcg/day', freq: 'daily', tod: 'morning' },
        { id: 61, name: 'DSIP', dose: '100-200mcg/bed', freq: 'daily', tod: 'evening' },
      ],
      [{ id: 11, creditor: 'Synchrony Bank', bureau: 'experian', status: 'in_review', dateOpened: '2026-06-20' }],
      2900,
      {
        exerciseLogs: [
          { date: '2026-07-08', exercise: 'Barbell Rows', sets: [{ weight: '185', reps: '8' }, { weight: '185', reps: '8' }] },
          { date: '2026-07-01', exercise: 'Barbell Rows', sets: [{ weight: '180', reps: '8' }] },
        ],
        checkins: { '2026-07-08': { mood: 4, energy: 3, sleep: 2, stress: 4, soreness: 2 } },
        weightLog: [{ date: '2026-07-05', weight: 164.5 }, { date: '2026-07-08', weight: 165.2 }],
        creditScores: [],
        ccWallet: [],
        czApps: [{ country: 'Poland', status: 'submitted' }],
        groomingLog: { haircut: '2026-06-01', beard: '2026-07-05' },
        partners: [{ name: 'Alex' }],
        foodLogs: { '2026-07-08': [{ cal: 1850, p: 160, c: 170, f: 60 }] },
        checkedR: { '0-1': true, '0-2': true },
      },
    ],
  },
  {
    // Sunday: weekly meal prep, weekly life audit, weekly deep clean, reading
    // block; EOD peptide shows on day 0; Custom Peptide exercises the premixed
    // dose-info branch (PEP_DB mcg=0); progressive-overload "all reps hit"
    // note (+5 compound) on Flat DB Bench Press; "First time!" on the rest.
    // Extreme intensity on a training day: EXTREME label, sets+1, HIIT finisher
    // (reps are untouched by extreme, so the allHit branch still fires).
    label: 'Sunday / wellness / extreme intensity / purpose+environment / EOD + premixed custom peptide',
    input: [
      0,
      { name: 'Jo', age: '41', gender: 'male', hFt: '6', hIn: '0', weight: '200', goalW: '', activity: 'light', goals: ['Wellness'], primary: 'Wellness', targetDate: '', domains: ['body', 'mind', 'purpose', 'environment'], trainPref: 'morning' },
      [
        { id: 40, name: 'BPC-157', dose: '250-500mcg/day', freq: 'EOD', tod: 'morning' },
        { id: 130, name: 'Custom Peptide', dose: '1mg/day', freq: 'daily', tod: 'evening' },
      ],
      false, 'extreme', NO_WORK, null, null, [], [], 2200,
      {
        ...EMPTY_INTEL,
        exerciseLogs: [
          { date: '2026-07-05', exercise: 'Flat DB Bench Press', sets: [{ weight: '60', reps: '10' }, { weight: '60', reps: '10' }, { weight: '60', reps: '10' }] },
        ],
      },
    ],
  },
  {
    // Follicular phase (day 7 of cycle) -> intensityMod "high" upgrades normal
    // intensity: +2 reps, HIIT finisher, cycle header item, cycle-phase evening
    // supplements. Image domain: AM/PM skincare + grooming due + single
    // weigh-in "Current:" message.
    label: 'female / follicular cycle day 7 / Tuesday / image domain / skincare+grooming',
    input: [
      2,
      { name: 'Dana', age: '29', gender: 'female', hFt: '5', hIn: '5', weight: '140', goalW: '130', activity: 'moderate', goals: ['Fat Loss'], primary: 'Fat Loss', targetDate: '2026-09-01', domains: ['body', 'image'], trainPref: 'morning' },
      [], true, 'normal', NO_WORK,
      getCycleInfo({ enabled: true, lastPeriod: '2026-07-03', cycleLength: 28, periodLogs: [] }, '2026-07-09'),
      null, [], [], 1650,
      {
        ...EMPTY_INTEL,
        weightLog: [{ date: '2026-07-08', weight: 141 }],
        groomingLog: { beard: '2026-06-25' },
      },
    ],
  },
  {
    // Wednesday money/credit day: pending + near-deadline (day 28) + overdue
    // (day 41) + resolved disputes; score jump (683->706) + 5/24 slots open on
    // dayIdx 3 -> card application window; sales income actions; citizenship
    // gathering_docs + submitted; midweek pulse; visualization.
    label: 'premium / money+credit+citizenship / Wednesday / sales partner / disputes ladder',
    input: [
      3,
      { name: 'Rico', age: '35', gender: 'male', hFt: '5', hIn: '10', weight: '190', goalW: '185', activity: 'desk', goals: ['Cognitive'], primary: 'Cognitive', targetDate: '', domains: ['body', 'money', 'mind', 'relationships', 'citizenship'], trainPref: 'morning' },
      [{ id: 77, name: 'Semax', dose: '200-600mcg/day', freq: '2-3x/week', tod: 'morning' }],
      true, 'normal', NO_WORK, null,
      { partnerType: 'sales', weeklyRefs: 3, weeklyConvos: 15 },
      [],
      [
        { id: 1, creditor: 'Midland Funding', bureau: 'equifax', status: 'pending', dateOpened: '2026-07-01' },
        { id: 2, creditor: 'LVNV Funding', bureau: 'experian', status: 'sent', dateOpened: '2026-06-12' },
        { id: 3, creditor: 'Portfolio Recovery', bureau: 'transunion', status: 'sent', dateOpened: '2026-05-30' },
        { id: 4, creditor: 'Capital One', bureau: 'equifax', status: 'resolved', dateOpened: '2026-05-01' },
      ],
      2400,
      {
        ...EMPTY_INTEL,
        creditScores: [{ date: '2026-06-01', score: 683 }, { date: '2026-07-01', score: 706 }],
        ccWallet: [
          { name: 'Chase Sapphire Preferred', opened: '2025-11-15' },
          { name: 'Chase Freedom Unlimited', opened: '2023-03-10' },
        ],
        czApps: [{ country: 'Italy', status: 'gathering_docs' }, { country: 'Ireland', status: 'submitted' }],
        partners: [{ name: 'Sam' }],
      },
    ],
  },
  {
    // Saturday entrepreneur 8-4 (8h -> Strategy Hour appears). Recomposition
    // Saturday is "Rest" (dur 0) -> no training block on a work+extreme day.
    // Weight telemetry: 7-day log trending up vs losing goal + within 2lbs of
    // goal ("Almost There"); peak-day checkin (energy 5 / sleep 4).
    label: 'entrepreneur Saturday 8-4 / extreme intensity / rest workout / weight telemetry + peak day',
    input: [
      6,
      { name: 'Vic', age: '38', gender: 'male', hFt: '5', hIn: '9', weight: '180', goalW: '178', activity: 'active', goals: ['Recomposition'], primary: 'Recomposition', targetDate: '2026-08-15', domains: ['body', 'mind'], trainPref: 'morning' },
      [], true, 'extreme',
      { enabled: true, mode: 'entrepreneur', label: 'Build', schedule: { 0: null, 1: { s: '08:00', e: '16:00' }, 2: { s: '08:00', e: '16:00' }, 3: { s: '08:00', e: '16:00' }, 4: { s: '08:00', e: '16:00' }, 5: { s: '08:00', e: '16:00' }, 6: { s: '08:00', e: '16:00' } } },
      null, null, [], [], 2500,
      {
        ...EMPTY_INTEL,
        exerciseLogs: [{ date: '2026-07-08', exercise: 'Squat', sets: [{ weight: '225', reps: '8' }, { weight: '225', reps: '8' }, { weight: '225', reps: '8' }] }],
        checkins: { '2026-07-08': { mood: 5, energy: 5, sleep: 4, stress: 2, soreness: 4 } },
        weightLog: [
          { date: '2026-07-02', weight: 178.6 }, { date: '2026-07-03', weight: 179.0 }, { date: '2026-07-04', weight: 178.8 },
          { date: '2026-07-05', weight: 179.2 }, { date: '2026-07-06', weight: 179.0 }, { date: '2026-07-07', weight: 179.3 },
          { date: '2026-07-08', weight: 179.5 },
        ],
        foodLogs: { '2026-07-08': [{ cal: 2300, p: 190, c: 200, f: 80 }] },
      },
    ],
  },
  {
    // Thursday, recovery intensity (sets-1, RECOVERY label). 5/24 completely
    // full -> "Slot Opening Soon" (oldest card falls off in 19 days); single
    // credit score (no jump); business-partner income action on day 4;
    // evening train preference on a non-work day (5 PM session).
    label: 'money only / Thursday / recovery intensity / 5-24 full wallet / business partner',
    input: [
      4,
      { name: '', age: '27', gender: 'female', hFt: '5', hIn: '6', weight: '150', goalW: '', activity: 'desk', goals: ['Fat Loss'], primary: 'Fat Loss', targetDate: '', domains: ['body', 'money'], trainPref: 'evening' },
      [], false, 'recovery', NO_WORK, null,
      { partnerType: 'business', weeklyRefs: 2, weeklyConvos: 10 },
      [], [], 1700,
      {
        ...EMPTY_INTEL,
        creditScores: [{ date: '2026-07-01', score: 712 }],
        ccWallet: [
          { name: 'Card A', opened: '2024-07-28' },
          { name: 'Card B', opened: '2024-09-01' },
          { name: 'Card C', opened: '2025-01-15' },
          { name: 'Card D', opened: '2025-06-10' },
          { name: 'Card E', opened: '2026-02-20' },
        ],
      },
    ],
  },
];

goldenTest('buildRoutine', CASES, (input) => {
  const items = buildRoutine(...input);
  // buildRoutine returns an Array with a `_blocks` property bolted on; JSON
  // serialization drops array expando properties, so capture both explicitly.
  return { blocks: items._blocks, items: Array.from(items) };
});
