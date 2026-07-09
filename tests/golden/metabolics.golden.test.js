// Golden characterization tests for v1 metabolics engine functions.
// Source of truth: tests/golden/v1/metabolics.js (verbatim extraction from
// public/app.html @ commit 3cf8214). See docs/v1-feature-parity-ledger.md.
//
// Determinism notes:
// - TZ is pinned to UTC below because getCycleInfo builds local-time Dates
//   ("T12:00:00" suffix) and returns a Date (nextPeriod) that the harness
//   JSON-serializes to an ISO string — without a pinned TZ the fixture would
//   depend on the machine's timezone / DST rules.
// - The system clock is pinned with vi.setSystemTime because getCycleInfo
//   falls back to `new Date()` when `today` is omitted (covered by one case).
process.env.TZ = 'UTC';

import { beforeAll, afterAll, vi } from 'vitest';
import { goldenTest } from './harness.js';
import { calcBMR, calcTDEE, calcMacros, getCycleInfo } from './v1/metabolics.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});
afterAll(() => {
  vi.useRealTimers();
});

// calcBMR(weightLbs, heightInches, age, gender) — Mifflin-St Jeor with
// lb→kg and in→cm conversion. Branches: gender === 'male' (+5) vs else (-161).
const BMR_CASES = [
  { label: 'male typical (180lb, 70in, 30y)', input: [180, 70, 30, 'male'] },
  { label: 'female typical (140lb, 65in, 28y)', input: [140, 65, 28, 'female'] },
  { label: 'male older heavier (220lb, 74in, 55y)', input: [220, 74, 55, 'male'] },
  { label: 'female lighter younger (115lb, 62in, 21y)', input: [115, 62, 21, 'female'] },
  { label: 'non-male gender string falls into female branch', input: [180, 70, 30, 'other'] },
  { label: 'zero-ish edge (0lb, 0in, 0y, male)', input: [0, 0, 0, 'male'] },
];

// calcTDEE(bmr, activity) — multiplier lookup with || 1.3 fallback.
// One case per map key plus the fallback.
const TDEE_CASES = [
  { label: 'desk (1.2)', input: [1800, 'desk'] },
  { label: 'moderate (1.4)', input: [1800, 'moderate'] },
  { label: 'physical (1.6)', input: [1800, 'physical'] },
  { label: 'sedentary (1.2)', input: [1800, 'sedentary'] },
  { label: 'light (1.375)', input: [1800, 'light'] },
  { label: 'active (1.725)', input: [1800, 'active'] },
  { label: 'very_active (1.9)', input: [1800, 'very_active'] },
  { label: 'unknown activity falls back to 1.3', input: [1800, 'astronaut'] },
];

// calcMacros(calories, goal) — ratio lookup per goal with fallback [0.3,0.4,0.3].
const MACRO_CASES = [
  { label: 'Fat Loss @ 2000 cal', input: [2000, 'Fat Loss'] },
  { label: 'Muscle Gain @ 2800 cal', input: [2800, 'Muscle Gain'] },
  { label: 'Recomposition @ 2200 cal', input: [2200, 'Recomposition'] },
  { label: 'Aesthetics @ 1800 cal', input: [1800, 'Aesthetics'] },
  { label: 'unknown goal falls back to 30/40/30', input: [2000, 'Longevity'] },
  { label: 'odd calories exercise rounding (1777, Fat Loss)', input: [1777, 'Fat Loss'] },
];

// getCycleInfo(cycleData, today) — phases from CYCLE_PHASES scaled to cycle
// length; guard branch, all four phases, late-luteal flag, wraparound modulo,
// non-28-day scale, and the `new Date()` fallback (clock pinned to 2026-07-09).
const CYCLE_CASES = [
  { label: 'null cycleData returns null', input: [null, '2026-07-09'] },
  { label: 'enabled but missing lastPeriod returns null', input: [{ enabled: true }, '2026-07-09'] },
  { label: 'disabled with lastPeriod returns null', input: [{ enabled: false, lastPeriod: '2026-07-05' }, '2026-07-09'] },
  { label: 'menstrual phase day 3', input: [{ enabled: true, lastPeriod: '2026-07-05' }, '2026-07-07'] },
  { label: 'follicular phase day 8', input: [{ enabled: true, lastPeriod: '2026-07-05' }, '2026-07-12'] },
  { label: 'ovulatory phase day 15', input: [{ enabled: true, lastPeriod: '2026-06-25' }, '2026-07-09'] },
  { label: 'early luteal day 18 (waterRetention, not late)', input: [{ enabled: true, lastPeriod: '2026-06-22' }, '2026-07-09'] },
  { label: 'late luteal day 26 (isLateLuteal true)', input: [{ enabled: true, lastPeriod: '2026-06-14' }, '2026-07-09'] },
  { label: '35-day cycle wraparound day 35, today omitted (pinned clock)', input: [{ enabled: true, lastPeriod: '2026-05-01', cycleLength: 35 }, undefined] },
];

goldenTest('calcBMR', BMR_CASES, (input) => calcBMR(...input));
goldenTest('calcTDEE', TDEE_CASES, (input) => calcTDEE(...input));
goldenTest('calcMacros', MACRO_CASES, (input) => calcMacros(...input));
goldenTest('getCycleInfo', CYCLE_CASES, (input) => getCycleInfo(...input));
