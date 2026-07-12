// Golden-parity test for the ported insights engine.
//
// Provenance: the days/MID/GREAT/ROUGH/food-item helpers and CASES below are
// copied verbatim from tests/golden/insights.golden.test.js (the CASES live
// there, not in the fixture file — tests/golden/fixtures/insights.json stores
// only [{label, output}] pairs). This test replays those same inputs through
// the production module (../insights-engine.js) and asserts the outputs match
// the frozen v1 fixture byte-for-byte. See docs/v1-feature-parity-ledger.md.
//
// Determinism notes (mirrored from the golden test — do not diverge):
// - generateInsights(logs, checkins) is pure and deterministic (no Date,
//   no Math.random), so no clock/TZ pinning is required.
// - Object key order (insertion) is what slice(-7) operates on, matching
//   v1's date-keyed state objects.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { generateInsights } from '../insights-engine.js';

// --- copied verbatim from tests/golden/insights.golden.test.js ---

// Build { date: values } checkin maps. Object key order (insertion) is what
// slice(-7) operates on, matching v1's date-keyed state objects.
const days = (n, values) =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [
      `2026-07-${String(i + 1).padStart(2, '0')}`,
      typeof values === 'function' ? values(i) : { ...values },
    ])
  );

const MID = { mood: 3, energy: 3, sleep: 3, stress: 3, appetite: 3, skin: 3, focus: 3, soreness: 3 };
const GREAT = { mood: 5, energy: 5, sleep: 4, stress: 2, appetite: 3, skin: 4, focus: 4, soreness: 4 };
const ROUGH = { mood: 2, energy: 2, sleep: 2, stress: 4, appetite: 5, skin: 2, focus: 2, soreness: 2 };

const CHICKEN = { name: 'Chicken Breast (6oz)', cal: 280, p: 53, c: 0, f: 6 };
const RICE = { name: 'White Rice (1 cup cooked)', cal: 205, p: 4, c: 45, f: 0 };
const APPLE = { name: 'Apple (1 medium)', cal: 95, p: 0, c: 25, f: 0 };
const SALAD = { name: 'Mixed Greens Salad', cal: 20, p: 2, c: 3, f: 0 };

const CASES = [
  { label: 'empty checkins — early-return info prompt', input: { logs: {}, checkins: {} } },
  { label: 'two checkins only — still below 3-day threshold', input: { logs: {}, checkins: days(2, MID) } },
  {
    label: 'all metrics mid-range, no food logs — stable fallback',
    input: { logs: {}, checkins: days(5, MID) },
  },
  {
    label: 'rough week — every warning branch (energy/sleep/mood/stress/focus/appetite); 2 food days ignored',
    input: { logs: days(2, () => [APPLE, SALAD]), checkins: days(4, ROUGH) },
  },
  {
    label: 'dialed in — energy+mood success, ample food logs suppress food insights',
    input: { logs: days(4, () => [CHICKEN, CHICKEN, CHICKEN, RICE, RICE, APPLE]), checkins: days(7, GREAT) }, // 1345 cal / 167g protein per day — above both thresholds
  },
  {
    label: 'sparse checkins — only mood recorded (low), other averages null-skipped',
    input: { logs: {}, checkins: days(4, { mood: 2 }) },
  },
  {
    label: 'undereating — 3 food days low-cal AND low-protein, mid checkins',
    input: { logs: days(3, () => [APPLE, SALAD, RICE]), checkins: days(3, MID) },
  },
  {
    label: 'recency window — 3 rough days then 7 mid days: slice(-7) sees only mid',
    input: { logs: {}, checkins: days(10, (i) => (i < 3 ? { ...ROUGH } : { ...MID })) },
  },
];

// --- end verbatim copy ---

const FIXTURE_PATH = path.join(__dirname, '..', '..', '..', 'tests', 'golden', 'fixtures', 'insights.json');

describe('generateInsights (v1 golden port)', () => {
  it('fixture file exists', () => {
    expect(fs.existsSync(FIXTURE_PATH), `missing fixture at ${FIXTURE_PATH}`).toBe(true);
  });

  const fixture = fs.existsSync(FIXTURE_PATH) ? JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) : [];

  CASES.forEach((c, i) => {
    it(`reproduces golden fixture: ${c.label}`, () => {
      const expected = fixture[i];
      expect(expected, `no fixture entry at index ${i} for case "${c.label}"`).toBeDefined();
      expect(expected.label, `fixture/case label mismatch at index ${i}`).toBe(c.label);

      // Same JSON round-trip normalization the golden harness applies.
      const output = JSON.parse(JSON.stringify({ v: generateInsights(c.input.logs, c.input.checkins) })).v ?? null;

      expect(output, `output mismatch for case "${c.label}"`).toEqual(expected.output);
    });
  });
});
