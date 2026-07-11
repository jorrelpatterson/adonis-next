// Golden DIVERGENCE test — checks main's live nutrition engine
// (src/protocols/body/nutrition/calorie-engine.js) against the v1 golden
// fixtures, and records every place the two engines are allowed to differ.
//
// Context: main's calcBMR/calcTDEE/calcMacros are a spec "duplicate pair"
// with v1's — they are NOT reconciled to be byte-identical, they round
// their outputs (v1 returns raw floats), and calcTDEE's unknown-activity
// fallback multiplier is 1.2 in main vs 1.3 in v1. This test pins down
// exactly which fixtures are "exact after Math.round" vs the one
// documented fallback divergence, and asserts calcMacros stays fully
// v1-identical (no rounding delta possible there — v1's calcMacros already
// rounds every field).
//
// CASES below (BMR_CASES/TDEE_CASES/MACRO_CASES) are copied VERBATIM from
// tests/golden/metabolics.golden.test.js, which itself sources them against
// tests/golden/v1/metabolics.js (verbatim extraction from public/app.html @
// commit 3cf8214). See docs/v1-feature-parity-ledger.md. Do not hand-edit
// these arrays without also updating the v1 file — they are inputs, not
// behavior under test.
//
// Determinism/normalization: pin TZ the same way metabolics.golden.test.js
// does (harmless here — none of these functions touch dates) and run every
// result through the same JSON round-trip the fixture harness uses, so
// undefined/NaN/etc. normalize identically to how the fixtures were
// generated.
process.env.TZ = 'UTC';

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { calcBMR, calcTDEE, calcMacros } from '../../src/protocols/body/nutrition/calorie-engine.js';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf8'));
}

function normalize(value) {
  // Same normalization the golden harness applies before writing fixtures.
  return JSON.parse(JSON.stringify({ v: value })).v ?? null;
}

// --- copied verbatim from tests/golden/metabolics.golden.test.js ---

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

// calcTDEE(bmr, activity) — multiplier lookup with || 1.3 fallback (v1).
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

// --- end verbatim copy ---

describe('main nutrition engine vs v1 golden fixtures', () => {
  it('calcMacros reproduces v1 golden fixtures EXACTLY (no divergence allowed)', () => {
    const fixture = loadFixture('calcMacros');
    const results = MACRO_CASES.map((c) => ({
      label: c.label,
      output: normalize(calcMacros(...c.input)),
    }));
    expect(results).toEqual(fixture);
  });

  it('calcBMR matches v1 after Math.round — v1 returns raw floats, main rounds', () => {
    const fixture = loadFixture('calcBMR');
    BMR_CASES.forEach((c, i) => {
      expect(fixture[i].label).toBe(c.label);
      const mainResult = normalize(calcBMR(...c.input));
      const v1Rounded = Math.round(fixture[i].output);
      expect(mainResult).toBe(v1Rounded);
    });
  });

  it('calcTDEE matches v1 after Math.round for every known activity key', () => {
    const fixture = loadFixture('calcTDEE');
    const knownCases = TDEE_CASES.filter((c) => c.label !== 'unknown activity falls back to 1.3');
    knownCases.forEach((c) => {
      const i = TDEE_CASES.indexOf(c);
      expect(fixture[i].label).toBe(c.label);
      const mainResult = normalize(calcTDEE(...c.input));
      const v1Rounded = Math.round(fixture[i].output);
      expect(mainResult).toBe(v1Rounded);
    });
  });

  it('calcTDEE unknown-activity fallback: DOCUMENTED DIVERGENCE from v1 (||1.3)', () => {
    // v1's calcTDEE falls back to a 1.3 multiplier for unrecognized activity
    // strings. main's calcTDEE (untouched — spec duplicate-pair ruling)
    // falls back to 1.2 instead, which happens to equal the desk/sedentary
    // multiplier. This is the ONE case, beyond rounding, where main's
    // engine output does not converge with v1's for these fixtures.
    const fixture = loadFixture('calcTDEE');
    const caseIndex = TDEE_CASES.findIndex((c) => c.label === 'unknown activity falls back to 1.3');
    const c = TDEE_CASES[caseIndex];
    const v1Rounded = Math.round(fixture[caseIndex].output); // 2340 (1800 * 1.3)

    // DOCUMENTED DIVERGENCE from v1 (||1.3): spec duplicate-pair ruling keeps main's engine
    const mainResult = normalize(calcTDEE(...c.input));
    expect(mainResult).toBe(Math.round(c.input[0] * 1.2)); // main's actual (||1.2) behavior: 2160
    expect(mainResult).not.toBe(v1Rounded);
  });
});
