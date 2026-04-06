// @vitest-environment node
import { describe, it, expect } from 'vitest';
import creditProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';
import { DISPUTE_TYPES, BUREAUS, CREDIT_FACTORS } from '../data';
import { generateLetterByType } from '../letters';

describe('credit data', () => {
  it('has 10 dispute types', () => { expect(DISPUTE_TYPES).toHaveLength(10); });
  it('has 3 bureaus', () => { expect(BUREAUS).toHaveLength(3); });
  it('has 5 credit factors', () => { expect(CREDIT_FACTORS).toHaveLength(5); });
  it('credit factors sum to 100', () => {
    expect(CREDIT_FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(100);
  });
});

describe('letter generation', () => {
  it('generates initial dispute letter', () => {
    const dispute = { creditor: 'Test Corp', bureau: 'experian', type: 'late_payment' };
    const prof = { name: 'John' };
    const letter = generateLetterByType('initial', dispute, prof);
    expect(letter).toContain('John');
    expect(letter).toContain('Test Corp');
    expect(letter).toContain('FCRA');
  });
  it('generates followup letter', () => {
    const letter = generateLetterByType('followup', { creditor: 'X', bureau: 'equifax', type: 'collection', dateOpened: '2026-01-01' }, { name: 'J' });
    expect(letter).toContain('SECOND NOTICE');
  });
});

describe('credit protocol', () => {
  it('passes protocol validation', () => { expect(validateProtocol(creditProtocol)).toBe(true); });
  it('has correct identity', () => { expect(creditProtocol.id).toBe('credit-repair'); expect(creditProtocol.domain).toBe('money'); });
  it('canServe money goals', () => { expect(creditProtocol.canServe({ domain: 'money' })).toBe(true); });
  it('getTasks returns dispute tasks when disputes pending', () => {
    const state = { disputes: [{ id: 1, creditor: 'X', status: 'pending', bureau: 'experian', type: 'late_payment' }], scores: [] };
    const monday = new Date('2026-04-06');
    const tasks = creditProtocol.getTasks(state, {}, monday);
    expect(tasks.some(t => t.category === 'credit')).toBe(true);
  });
  it('getTasks returns empty when no disputes', () => {
    const tasks = creditProtocol.getTasks({ disputes: [], scores: [] }, {}, new Date('2026-04-06'));
    const creditTasks = tasks.filter(t => t.title.includes('Dispute'));
    expect(creditTasks).toHaveLength(0);
  });
  it('getRecommendations returns credit monitoring for pro', () => {
    const recs = creditProtocol.getRecommendations({}, { tier: 'pro' }, { domain: 'money' });
    expect(recs.length).toBeGreaterThan(0);
  });
});
