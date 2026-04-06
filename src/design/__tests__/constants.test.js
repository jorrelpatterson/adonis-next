// src/design/__tests__/constants.test.js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { DOMAINS, DAYS, DS, CAT_COLORS, CAT_ICONS, TAB_VIBES, SUB_TIERS } from '../constants';

describe('DOMAINS', () => {
  it('has 8 domains', () => {
    expect(DOMAINS).toHaveLength(8);
  });

  it('includes travel domain (not citizenship)', () => {
    const travel = DOMAINS.find(d => d.id === 'travel');
    expect(travel).toBeDefined();
    expect(travel.name).toBe('Travel');
    const citizenship = DOMAINS.find(d => d.id === 'citizenship');
    expect(citizenship).toBeUndefined();
  });

  it('each domain has id, icon, name, sub, desc', () => {
    for (const d of DOMAINS) {
      expect(d.id).toBeDefined();
      expect(d.icon).toBeDefined();
      expect(d.name).toBeDefined();
      expect(d.sub).toBeDefined();
      expect(d.desc).toBeDefined();
    }
  });
});

describe('DAYS', () => {
  it('has 7 full day names starting with Sunday', () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0]).toBe('Sunday');
    expect(DAYS[6]).toBe('Saturday');
  });
});

describe('DS (short days)', () => {
  it('has 7 single-letter abbreviations', () => {
    expect(DS).toHaveLength(7);
    expect(DS[0]).toBe('S');
    expect(DS[1]).toBe('M');
  });
});

describe('SUB_TIERS', () => {
  it('has free, pro, elite tiers with price and features', () => {
    expect(SUB_TIERS.free).toBeDefined();
    expect(SUB_TIERS.pro.price).toBe(14.99);
    expect(SUB_TIERS.elite.price).toBe(29.99);
    expect(SUB_TIERS.pro.features.length).toBeGreaterThan(0);
  });
});
