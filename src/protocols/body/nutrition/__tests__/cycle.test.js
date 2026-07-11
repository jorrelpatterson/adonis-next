// Golden-parity test for the ported cycle engine.
//
// Provenance: the CYCLE_CASES below are copied verbatim from
// tests/golden/metabolics.golden.test.js (the CASES live there, not in the
// fixture file — tests/golden/fixtures/getCycleInfo.json stores only
// [{label, output}] pairs). This test replays those same inputs through the
// production module (../cycle.js) and asserts the outputs match the frozen
// v1 fixture byte-for-byte. See docs/v1-feature-parity-ledger.md.
//
// Determinism notes (mirrored from the golden test — do not diverge):
// - TZ is pinned to UTC because getCycleInfo builds local-time Dates
//   ("T12:00:00" suffix) and returns a Date (nextPeriod) that we
//   JSON-serialize to an ISO string — without a pinned TZ the fixture would
//   depend on the machine's timezone / DST rules.
// - The system clock is pinned with vi.setSystemTime because getCycleInfo
//   falls back to `new Date()` when `today` is omitted (covered by one case).
process.env.TZ = 'UTC';

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getCycleInfo } from '../cycle.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});
afterAll(() => {
  vi.useRealTimers();
});

// Copied verbatim from tests/golden/metabolics.golden.test.js CYCLE_CASES.
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

const FIXTURE_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'tests', 'golden', 'fixtures', 'getCycleInfo.json');

describe('getCycleInfo (v1 golden port)', () => {
  it('fixture file exists', () => {
    expect(fs.existsSync(FIXTURE_PATH), `missing fixture at ${FIXTURE_PATH}`).toBe(true);
  });

  const fixture = fs.existsSync(FIXTURE_PATH) ? JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) : [];

  CYCLE_CASES.forEach((c, i) => {
    it(`reproduces golden fixture: ${c.label}`, () => {
      const expected = fixture[i];
      expect(expected, `no fixture entry at index ${i} for case "${c.label}"`).toBeDefined();
      expect(expected.label, `fixture/case label mismatch at index ${i}`).toBe(c.label);

      // Same JSON round-trip normalization the golden harness applies, so
      // Dates/undefined serialize identically to the frozen fixture.
      const output = JSON.parse(JSON.stringify({ v: getCycleInfo(...c.input) })).v ?? null;

      expect(output, `output mismatch for case "${c.label}"`).toEqual(expected.output);
    });
  });
});
