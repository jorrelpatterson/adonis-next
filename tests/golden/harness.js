// Golden-test harness for v1 characterization fixtures.
// See docs/v1-feature-parity-ledger.md ("Golden-test procedure") and the
// 2026-07-09 Verification addendum in the v2 MVP spec.
//
// Usage in a *.golden.test.js file:
//   goldenTest('calcMacros', CASES, (input) => calcMacros(...input))
//
// Fixtures live in tests/golden/fixtures/<name>.json.
// Regenerate deliberately with: UPDATE_GOLDEN=1 npx vitest run tests/golden
// A missing fixture fails the test rather than silently passing.
import fs from 'node:fs';
import path from 'node:path';
import { it, expect } from 'vitest';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

export function goldenTest(name, cases, run) {
  const file = path.join(FIXTURE_DIR, `${name}.json`);
  it(`${name} reproduces v1 golden fixtures`, () => {
    const results = cases.map((c) => ({
      label: c.label,
      // JSON round-trip normalizes undefined/Date/etc. the same way the fixture file does
      output: JSON.parse(JSON.stringify({ v: run(c.input) })).v ?? null,
    }));
    if (process.env.UPDATE_GOLDEN) {
      fs.mkdirSync(FIXTURE_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n');
    }
    expect(
      fs.existsSync(file),
      `missing fixture ${name}.json — generate with UPDATE_GOLDEN=1 npx vitest run tests/golden`
    ).toBe(true);
    const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(results).toEqual(expected);
  });
}
