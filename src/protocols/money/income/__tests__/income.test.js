import { describe, it, expect } from 'vitest';
import incomeProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';
import { INCOME_REWARDS, REFERRAL_VERTICALS, PARTNER_TYPES, getIncomeActions, buildIncomePlan } from '../data';

describe('income data', () => {
  it('INCOME_REWARDS has perMonth 250', () => { expect(INCOME_REWARDS.perMonth).toBe(250); });
  it('REFERRAL_VERTICALS has entries', () => { expect(REFERRAL_VERTICALS.length).toBeGreaterThan(0); });
  it('PARTNER_TYPES has 3 types', () => { expect(PARTNER_TYPES).toHaveLength(3); });
  it('getIncomeActions returns actions for referrer on Monday', () => {
    const actions = getIncomeActions(1, 'referrer', 2, 10);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0]).toHaveProperty('time');
    expect(actions[0]).toHaveProperty('title');
  });
  it('buildIncomePlan calculates for rewards model', () => {
    const plan = buildIncomePlan(2000, 'referrer', [], []);
    expect(plan).toHaveProperty('installsNeeded');
    expect(plan).toHaveProperty('weeklyRefs');
  });
});

describe('income protocol', () => {
  it('passes protocol validation', () => { expect(validateProtocol(incomeProtocol)).toBe(true); });
  it('has correct identity', () => { expect(incomeProtocol.id).toBe('income'); expect(incomeProtocol.domain).toBe('money'); });
  it('canServe money goals', () => { expect(incomeProtocol.canServe({ domain: 'money' })).toBe(true); });
  it('getTasks returns income actions on Monday', () => {
    const state = { partnerType: 'referrer', weeklyRefs: 2, weeklyConvos: 10 };
    const monday = new Date('2026-04-06');
    const tasks = incomeProtocol.getTasks(state, {}, monday);
    expect(tasks.some(t => t.category === 'income')).toBe(true);
  });
  it('getTasks returns empty on days with no actions', () => {
    const state = { partnerType: 'referrer', weeklyRefs: 2, weeklyConvos: 10 };
    const sunday = new Date('2026-04-05');
    const tasks = incomeProtocol.getTasks(state, {}, sunday);
    expect(tasks.filter(t => t.category === 'income')).toHaveLength(0);
  });
});
