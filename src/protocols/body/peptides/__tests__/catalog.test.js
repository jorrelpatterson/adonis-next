import { describe, it, expect } from 'vitest';
import { PEPTIDES, PEP_DB, getPeptideById, getPeptidesByGoal, getPeptidesByCategory } from '../catalog.js';

describe('PEPTIDES array', () => {
  it('has 100+ entries', () => {
    expect(PEPTIDES.length).toBeGreaterThanOrEqual(100);
  });

  it('every peptide has required fields: id, name, cat, price, vendor', () => {
    PEPTIDES.forEach((p, i) => {
      expect(p, `peptide at index ${i}`).toHaveProperty('id');
      expect(p, `peptide at index ${i}`).toHaveProperty('name');
      expect(p, `peptide at index ${i}`).toHaveProperty('cat');
      expect(p, `peptide at index ${i}`).toHaveProperty('price');
      expect(p, `peptide at index ${i}`).toHaveProperty('vendor');
    });
  });
});

describe('getPeptideById', () => {
  it('returns the correct peptide for id 1', () => {
    const peptide = getPeptideById(1);
    expect(peptide).toBeDefined();
    expect(peptide.id).toBe(1);
    expect(peptide.name).toBe('Semaglutide 5mg');
  });

  it('returns undefined for a non-existent id', () => {
    expect(getPeptideById(99999)).toBeUndefined();
  });
});

describe('getPeptidesByGoal', () => {
  it("returns matching peptides for 'Fat Loss'", () => {
    const results = getPeptidesByGoal('Fat Loss');
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p, i) => {
      expect(p.goals, `peptide at index ${i} (${p.name})`).toContain('Fat Loss');
    });
  });
});

describe('getPeptidesByCategory', () => {
  it("returns matching peptides for 'Weight Management'", () => {
    const results = getPeptidesByCategory('Weight Management');
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p, i) => {
      expect(p.cat, `peptide at index ${i} (${p.name})`).toBe('Weight Management');
    });
  });
});

describe('PEP_DB array', () => {
  it('has entries', () => {
    expect(PEP_DB.length).toBeGreaterThan(0);
  });

  it('every entry has a name field', () => {
    PEP_DB.forEach((entry, i) => {
      expect(entry, `PEP_DB entry at index ${i}`).toHaveProperty('name');
    });
  });
});
