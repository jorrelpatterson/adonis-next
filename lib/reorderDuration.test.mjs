// Behavior tests for daysSupply. Run: node lib/reorderDuration.test.mjs
// No test framework — assertions throw on failure, exit code reflects outcome.

import { daysSupply } from './reorderDuration.js';
import { PEPTIDES } from './constants/peptides.js';

const cases = [
  { name: 'manual override',
    sku: 'RT10', row: { typical_days_supply: 35 }, qty: 1, expect: 35 },
  { name: 'manual override × qty',
    sku: 'RT10', row: { typical_days_supply: 35 }, qty: 2, expect: 70 },

  // RT10 (Retatrutide 10mg, dose 0.5-12mg/wk midpoint 6.25mg, weekly)
  // 10mg / 6.25mg per dose / 1 dose per week × 7 = 11.2 → 11 days
  { name: 'RT10 auto-compute',
    sku: 'RT10', row: { typical_days_supply: null }, qty: 1, expect: 11 },

  // BC5 (BPC-157 5mg, dose 250-500mcg/day midpoint 0.375mg, daily)
  // 5mg / 0.375mg / 7 doses per week × 7 = 13.33 → 13 days
  { name: 'BC5 auto-compute',
    sku: 'BC5', row: { typical_days_supply: null }, qty: 1, expect: 13 },

  // SM10 (Semaglutide 10mg, dose 0.25-2.4mg/wk midpoint 1.325mg, weekly)
  // 10 / 1.325 × 7 = 52.83 → 53 days
  { name: 'SM10 auto-compute',
    sku: 'SM10', row: { typical_days_supply: null }, qty: 1, expect: 53 },

  // P41 (PT-141, freq=as_needed) → null
  { name: 'PT-141 as_needed → null',
    sku: 'P41', row: { typical_days_supply: null }, qty: 1, expect: null },

  { name: 'unknown SKU → null',
    sku: 'NOPE-XX', row: { typical_days_supply: null }, qty: 1, expect: null },

  { name: 'invalid manual falls through',
    sku: 'RT10', row: { typical_days_supply: 0 }, qty: 1, expect: 11 },
  { name: 'negative manual falls through',
    sku: 'RT10', row: { typical_days_supply: -5 }, qty: 1, expect: 11 },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = daysSupply(c.sku, c.row, c.qty);
  const ok = got === c.expect;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${c.name} — got ${got} expected ${c.expect}`);
  ok ? pass++ : fail++;
}

let auto = 0, manual_needed = 0, freq_skip = 0;
for (const p of PEPTIDES) {
  if (!p.vendorSku) continue;
  const days = daysSupply(p.vendorSku, { typical_days_supply: null }, 1);
  if (days != null) auto++;
  else if (!['daily', '2x_week', 'weekly'].includes(p.freq)) freq_skip++;
  else manual_needed++;
}
console.log('---');
console.log(`Catalog coverage: ${auto} auto-compute, ${manual_needed} need manual, ${freq_skip} freq-skip`);
console.log(`Asserts: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
