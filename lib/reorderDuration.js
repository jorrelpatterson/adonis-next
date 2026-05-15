// Single source of truth for "how many days does this SKU last?"
//
// Resolution order:
//   1. products.typical_days_supply (manual override) — return verbatim × qty
//   2. lib/constants/peptides.js auto-compute via dose × frequency math
//   3. null  — caller must skip this SKU (no reminder scheduled)
//
// The parser is intentionally conservative: ambiguous dose strings
// ("Per protocol", "as needed", ranges with non-numeric units) return null.
//
// All math is mg-based internally; mcg is converted on parse.

import { PEPTIDES } from './constants/peptides.js';

const DOSES_PER_WEEK = {
  daily: 7,
  '2x_week': 2,
  weekly: 1,
};

const PEPTIDES_BY_SKU = (() => {
  const map = {};
  for (const p of PEPTIDES) {
    if (p.vendorSku) map[p.vendorSku] = p;
  }
  return map;
})();

function parseSizeMg(sizeStr) {
  if (!sizeStr) return null;
  const m = String(sizeStr).match(/(\d+(?:\.\d+)?)\s*(mg|mcg|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = m[2].toLowerCase();
  if (unit === 'mg') return n;
  if (unit === 'mcg') return n / 1000;
  if (unit === 'g') return n * 1000;
  return null;
}

function parseDoseMidpointMg(doseStr) {
  if (!doseStr) return null;
  const m = String(doseStr).match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(mg|mcg)\b/i);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  const mid = (lo + hi) / 2;
  const unit = m[3].toLowerCase();
  return unit === 'mcg' ? mid / 1000 : mid;
}

export function daysSupply(sku, productRow, qty = 1) {
  const q = Math.max(1, Number(qty) || 1);

  const manual = productRow?.typical_days_supply;
  if (manual != null && Number.isFinite(Number(manual)) && Number(manual) > 0) {
    return Math.round(Number(manual) * q);
  }

  const p = PEPTIDES_BY_SKU[sku];
  if (!p) return null;

  const dosesPerWeek = DOSES_PER_WEEK[p.freq];
  if (!dosesPerWeek) return null;

  const vialMg = parseSizeMg(p.size);
  const doseMg = parseDoseMidpointMg(p.dose);
  if (!vialMg || !doseMg || doseMg <= 0) return null;

  const weeklyMg = doseMg * dosesPerWeek;
  if (weeklyMg <= 0) return null;
  const days = (vialMg / weeklyMg) * 7;
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.round(days * q);
}
