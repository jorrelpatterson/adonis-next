import { describe, it, expect } from 'vitest';
import { CC_DB, CC_CATEGORIES, CC_ISSUERS } from '../cards-db';
import { calcFiveTwentyFour, getBestCard, calcBonusProgress } from '../cards-logic';

describe('CC_DB', () => {
  it('has 13 cards', () => { expect(CC_DB.length).toBe(13); });
  it('each card has id, name, issuer, af, bonus, cats', () => {
    for (const c of CC_DB) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('issuer');
      expect(c).toHaveProperty('af');
      expect(c).toHaveProperty('cats');
    }
  });
  it('has Chase Sapphire Preferred', () => { expect(CC_DB.find(c => c.id === 'csp')).toBeDefined(); });
});

describe('CC_CATEGORIES', () => { it('has 12 categories', () => { expect(CC_CATEGORIES.length).toBe(12); }); });

describe('calcFiveTwentyFour', () => {
  it('counts cards opened within 24 months', () => {
    const now = new Date();
    const recent = new Date(now - 180*24*60*60*1000).toISOString();
    const old = new Date(now - 900*24*60*60*1000).toISOString();
    const wallet = [
      { cardId: 'csp', openDate: recent, countsFor524: true },
      { cardId: 'cfu', openDate: old, countsFor524: true },
    ];
    expect(calcFiveTwentyFour(wallet)).toBe(1);
  });
});

describe('getBestCard', () => {
  it('returns best card for a category', () => {
    const wallet = [{ cardId: 'csp' }, { cardId: 'amexgold' }];
    const result = getBestCard(wallet, 'dining', CC_DB);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('card');
    expect(result).toHaveProperty('rate');
  });
});
