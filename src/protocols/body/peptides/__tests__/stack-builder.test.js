// Golden-parity test for the ported stack-builder engine.
//
// Provenance: the P factory, CATALOG, byGoal helper, and CASES below are
// copied verbatim from tests/golden/stacks.golden.test.js (the CASES live
// there, not in the fixture file — tests/golden/fixtures/stacks.json stores
// only [{label, output}] pairs). This test replays those same inputs through
// the production module (../stack-builder.js) and asserts the outputs match
// the frozen v1 fixture byte-for-byte. See docs/v1-feature-parity-ledger.md.
//
// Determinism notes (mirrored from the golden test — do not diverge):
// - buildStacks(recPeps) is pure: sorts by price desc, slices Essentials
//   (top 3) / Optimized (top 6) / Full Protocol (all), and prices tiers at
//   0.8 / 0.72 / 0.65 of retail sum (Math.round). No Date/Math.random.
// - Price ties in CATALOG (BPC-157/NAD+ at 49, Semaglutide/Semax at 55)
//   exercise Array.prototype.sort stability, deterministic in ES2019+.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { GOAL_MAP, buildStacks } from '../stack-builder.js';

// --- copied verbatim from tests/golden/stacks.golden.test.js ---

// Mock peptide factory matching the PEPTIDES item shape (app.html line 23).
const P = (id, name, cat, price, goals) => ({
  id,
  name,
  size: '10mg',
  cat,
  dose: 'Per protocol',
  timing: 'AM',
  dur: '8-12 wks',
  cycleDays: 56,
  freq: 'daily',
  tod: 'morning',
  premium: false,
  price,
  margin: Math.round(price * 0.85),
  desc: `${name} — test fixture`,
  goals,
  vendor: 'Eve',
  vendorSku: name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6),
  orderUrl: '#',
});

const CATALOG = [
  P(1, 'Semaglutide 10mg', 'Weight Management', 55, ['Fat Loss', 'Wellness']),
  P(2, 'Tesamorelin 10mg', 'Growth Hormone', 79, ['Fat Loss', 'Anti-Aging']),
  P(3, 'AOD-9604', 'Fat Loss', 65, ['Fat Loss']),
  P(4, 'BPC-157 10mg', 'Recovery', 49, ['Recovery', 'Wellness']),
  P(5, 'TB-500 10mg', 'Recovery', 89, ['Recovery']),
  P(6, 'Ipamorelin 10mg', 'Growth Hormone', 45, ['Muscle Gain', 'Anti-Aging']),
  P(7, 'NAD+ 500mg', 'Longevity', 49, ['Anti-Aging', 'Wellness']), // price tie with BPC-157 → sort stability
  P(8, 'GHK-Cu 100mg', 'Skin & Recovery', 39, ['Aesthetics', 'Recovery']),
  P(9, 'Semax 10mg', 'Cognitive', 55, ['Cognitive']), // price tie with Semaglutide
];

// How v1 relates GOAL_MAP to peptides: GOAL_MAP[goal] is a list of catalog
// categories (`cat`) relevant to that goal.
const byGoal = (goal) => CATALOG.filter((p) => GOAL_MAP[goal].includes(p.cat));

const CASES = [
  { label: 'GOAL_MAP constant (full characterization)', input: { goalMap: true } },
  { label: 'empty peptide list — all tiers empty, zero sums', input: { recPeps: [] } },
  { label: 'single peptide — ess=opt=full', input: { recPeps: [CATALOG[0]] } },
  { label: 'exactly three peptides — Essentials boundary', input: { recPeps: CATALOG.slice(0, 3) } },
  { label: 'six peptides — Optimized boundary (opt === full)', input: { recPeps: CATALOG.slice(0, 6) } },
  { label: 'nine peptides incl. price ties — ess 3 / opt 6 / full 9', input: { recPeps: CATALOG } },
  { label: 'Fat Loss goal via GOAL_MAP cat filter (4 matches)', input: { recPeps: byGoal('Fat Loss') } },
  { label: 'Cognitive goal via GOAL_MAP cat filter (3 matches)', input: { recPeps: byGoal('Cognitive') } },
];

// --- end verbatim copy ---

const FIXTURE_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'tests', 'golden', 'fixtures', 'stacks.json');

describe('buildStacks + GOAL_MAP (v1 golden port)', () => {
  it('fixture file exists', () => {
    expect(fs.existsSync(FIXTURE_PATH), `missing fixture at ${FIXTURE_PATH}`).toBe(true);
  });

  const fixture = fs.existsSync(FIXTURE_PATH) ? JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) : [];

  CASES.forEach((c, i) => {
    it(`reproduces golden fixture: ${c.label}`, () => {
      const expected = fixture[i];
      expect(expected, `no fixture entry at index ${i} for case "${c.label}"`).toBeDefined();
      expect(expected.label, `fixture/case label mismatch at index ${i}`).toBe(c.label);

      // Same JSON round-trip normalization the golden harness applies, so
      // undefined/etc. serialize identically to the frozen fixture.
      const result = c.input.goalMap ? GOAL_MAP : buildStacks(c.input.recPeps);
      const output = JSON.parse(JSON.stringify({ v: result })).v ?? null;

      expect(output, `output mismatch for case "${c.label}"`).toEqual(expected.output);
    });
  });
});
