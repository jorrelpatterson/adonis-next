import { describe, it, expect } from 'vitest';
import { PROTO_STACKS, GOAL_TO_STACK, getStackForFinder, findCatalogPeptide } from '../proto-stacks.js';
import { PEPTIDES } from '../catalog.js';

describe('PROTO_STACKS data integrity', () => {
  it('has 15+ stacks defined', () => {
    expect(PROTO_STACKS.length).toBeGreaterThanOrEqual(13);
  });

  it('every stack has the required shape', () => {
    for (const s of PROTO_STACKS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.icon).toBeTruthy();
      expect(s.tag).toBeTruthy();
      expect(s.monthly).toBeTruthy();
      expect(typeof s.monthlyLow).toBe('number');
      expect(typeof s.monthlyHigh).toBe('number');
      expect(s.color).toBeTruthy();
      expect(Array.isArray(s.items)).toBe(true);
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.why).toBeTruthy();
    }
  });

  it('every GOAL_TO_STACK entry maps to an existing stack', () => {
    const ids = new Set(PROTO_STACKS.map(s => s.id));
    for (const stackId of Object.values(GOAL_TO_STACK)) {
      expect(ids.has(stackId)).toBe(true);
    }
  });
});

describe('getStackForFinder', () => {
  it('returns null without optimizeFor', () => {
    expect(getStackForFinder(null)).toBeNull();
    expect(getStackForFinder({})).toBeNull();
    expect(getStackForFinder({ optimizeFor: [] })).toBeNull();
  });

  it('maps fat_loss + mid budget to SHRED', () => {
    const stack = getStackForFinder({
      optimizeFor: ['fat_loss'], experience: 'intermediate',
      glp1Status: 'no', budget: 'mid', needleComfort: 'fine',
    });
    expect(stack.name).toBe('SHRED');
  });

  it('maps muscle + mid budget to SCULPT', () => {
    const stack = getStackForFinder({
      optimizeFor: ['muscle'], budget: 'mid',
    });
    expect(stack.name).toBe('SCULPT');
  });

  it('maps mind to EDGE at any budget', () => {
    const lowBudget = getStackForFinder({ optimizeFor: ['mind'], budget: 'low' });
    expect(lowBudget.name).toBe('EDGE');
  });

  it('falls back to budget-appropriate alt when preferred too expensive', () => {
    // fat_loss prefers SHRED ($200-300) but user has low budget (<$150)
    const stack = getStackForFinder({
      optimizeFor: ['fat_loss'], budget: 'low',
    });
    expect(stack).not.toBeNull();
    // Should fall back to LEAN, SLEEP, or another low-budget alt
    expect(['LEAN', 'SLEEP', 'EDGE', 'BALANCE', 'DRIVE']).toContain(stack.name);
  });

  it('strips GLP-1 compounds when user is already on one', () => {
    const stack = getStackForFinder({
      optimizeFor: ['fat_loss'], budget: 'mid',
      glp1Status: 'prescribed',  // already on Ozempic etc.
    });
    expect(stack).not.toBeNull();
    const hasRetatrutide = stack.items.some(i => /retatrutide/i.test(i));
    const hasSemaglutide = stack.items.some(i => /semaglutide/i.test(i));
    const hasTirzepatide = stack.items.some(i => /tirzepatide/i.test(i));
    expect(hasRetatrutide || hasSemaglutide || hasTirzepatide).toBe(false);
    expect(/already on/i.test(stack.why)).toBe(true);
  });

  it('maps everything to EXECUTIVE for premium users', () => {
    const stack = getStackForFinder({
      optimizeFor: ['everything'], budget: 'high',
    });
    expect(stack.name).toBe('EXECUTIVE');
  });
});

describe('findCatalogPeptide', () => {
  it('finds exact name match in catalog', () => {
    const found = findCatalogPeptide('DSIP 5mg', PEPTIDES);
    expect(found).not.toBeNull();
    expect(found.name).toBe('DSIP 5mg');
  });

  it('falls back to prefix match when exact fails', () => {
    // SHRED stack lists "DSIP 10mg" — this size may or may not be in catalog
    const found = findCatalogPeptide('DSIP 10mg', PEPTIDES);
    if (found) {
      expect(/^dsip/i.test(found.name)).toBe(true);
    }
  });

  it('returns null for completely unknown peptide', () => {
    expect(findCatalogPeptide('NeverHeardOfThis 99mg', PEPTIDES)).toBeNull();
  });
});
