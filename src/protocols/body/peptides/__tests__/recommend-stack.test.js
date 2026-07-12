import { describe, it, expect } from 'vitest';
import { recommendStack } from '../recommend-stack.js';
import { PEPTIDES } from '../catalog.js';

describe('recommendStack', () => {
  it('returns empty when no Peptide Finder answers', () => {
    expect(recommendStack(null, PEPTIDES)).toEqual([]);
    expect(recommendStack({}, PEPTIDES)).toEqual([]);
    expect(recommendStack({ optimizeFor: [] }, PEPTIDES)).toEqual([]);
  });

  it('returns empty when catalog is empty', () => {
    expect(recommendStack({ optimizeFor: ['fat_loss'] }, [])).toEqual([]);
    expect(recommendStack({ optimizeFor: ['fat_loss'] }, null)).toEqual([]);
  });

  it('recommends fat-loss peptides for fat_loss goal', () => {
    const recs = recommendStack({
      optimizeFor: ['fat_loss'],
      experience: 'intermediate',
      glp1Status: 'no',
      budget: 'mid',
      needleComfort: 'fine',
    }, PEPTIDES);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3); // intermediate cap
    // At least one should be in Weight Management category
    const hasFatLoss = recs.some(r => r.matchedGoals.some(g => /fat|weight/i.test(g)));
    expect(hasFatLoss).toBe(true);
  });

  it('caps stack size by experience level', () => {
    const beginner = recommendStack({ optimizeFor: ['everything'], experience: 'beginner', budget: 'premium' }, PEPTIDES);
    const advanced = recommendStack({ optimizeFor: ['everything'], experience: 'advanced', budget: 'premium' }, PEPTIDES);
    expect(beginner.length).toBeLessThanOrEqual(2);
    expect(advanced.length).toBeLessThanOrEqual(5);
    expect(advanced.length).toBeGreaterThanOrEqual(beginner.length);
  });

  it('respects budget caps', () => {
    const lowBudget = recommendStack({
      optimizeFor: ['fat_loss', 'muscle'],
      experience: 'advanced',
      budget: 'low',  // cap = $150
    }, PEPTIDES);
    const totalCost = lowBudget.reduce((sum, r) => sum + (r.peptide.price || 0), 0);
    expect(totalCost).toBeLessThanOrEqual(150);
  });

  it('excludes additional GLP-1s if user is already on one', () => {
    const onGLP1 = recommendStack({
      optimizeFor: ['fat_loss'],
      experience: 'intermediate',
      glp1Status: 'prescribed',
      budget: 'high',
    }, PEPTIDES);
    const hasGLP1 = onGLP1.some(r =>
      /semaglutide|tirzepatide|retatrutide/i.test(r.peptide.name)
    );
    expect(hasGLP1).toBe(false);
  });

  it('still recommends GLP-1s when user is not on one', () => {
    const noGLP1 = recommendStack({
      optimizeFor: ['fat_loss'],
      experience: 'intermediate',
      glp1Status: 'no',
      budget: 'high',
    }, PEPTIDES);
    const hasGLP1 = noGLP1.some(r =>
      /semaglutide|tirzepatide|retatrutide/i.test(r.peptide.name)
    );
    expect(hasGLP1).toBe(true);
  });

  it('dedupes by base compound name (no Sema 5mg + Sema 10mg)', () => {
    const recs = recommendStack({
      optimizeFor: ['fat_loss'],
      experience: 'advanced',
      budget: 'premium',
    }, PEPTIDES);
    const baseNames = recs.map(r => r.peptide.name.replace(/\s+\d+mg$/i, '').toLowerCase());
    const unique = new Set(baseNames);
    expect(baseNames.length).toBe(unique.size);
  });

  it('reasons mention the matched goals', () => {
    const recs = recommendStack({
      optimizeFor: ['sleep'],
      experience: 'beginner',
      budget: 'mid',
    }, PEPTIDES);
    if (recs.length > 0) {
      expect(recs[0].reason).toMatch(/sleep/i);
    }
  });
});
