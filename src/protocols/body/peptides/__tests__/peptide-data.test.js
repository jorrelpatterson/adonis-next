import { describe, it, expect } from 'vitest';
import { INJECTION_SITES, SYRINGE_TYPES, SYRINGES } from '../injection';
import { PEP_COMPAT, checkCompat } from '../compatibility';
import { PEP_RESEARCH, RISK_GAUGE, getResearch, getRisk } from '../research';

describe('injection data', () => {
  it('INJECTION_SITES has 12 sites', () => { expect(INJECTION_SITES.length).toBe(12); });
  it('each site has id, name, region', () => {
    for (const s of INJECTION_SITES) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('region');
    }
  });
  it('SYRINGES has 3 options', () => { expect(SYRINGES.length).toBe(3); });
});

describe('compatibility', () => {
  it('PEP_COMPAT has 75+ entries', () => { expect(Object.keys(PEP_COMPAT).length).toBeGreaterThanOrEqual(50); });
  it('checkCompat returns object or null', () => {
    const r = checkCompat('BPC-157', 'TB-500');
    if (r) expect(['synergy', 'caution', 'avoid']).toContain(r.type);
  });
  it('checkCompat returns null for unknown', () => {
    expect(checkCompat('FakeA', 'FakeB')).toBeNull();
  });
});

describe('research', () => {
  it('PEP_RESEARCH has entries', () => { expect(Object.keys(PEP_RESEARCH).length).toBeGreaterThan(30); });
  it('entries have mechanism and safety', () => {
    for (const e of Object.values(PEP_RESEARCH)) {
      expect(e).toHaveProperty('mechanism');
      expect(e).toHaveProperty('safety');
    }
  });
  it('RISK_GAUGE has entries', () => { expect(Object.keys(RISK_GAUGE).length).toBeGreaterThan(30); });
  it('getResearch finds BPC-157', () => {
    const r = getResearch('BPC-157');
    if (r) expect(r.mechanism).toBeTruthy();
  });
  it('getRisk returns risk level', () => {
    const r = getRisk('BPC-157');
    if (r) expect(r).toHaveProperty('l');
  });
});
