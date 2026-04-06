// src/routine/__tests__/upsell-engine.test.js
import { describe, it, expect } from 'vitest';
import { checkUpsells, countSkippedTasks } from '../upsell-engine.js';

// Shared helpers
const eliteProfile = { tier: 'elite' };
const freeProfile = { tier: 'free' };
const proProfile = { tier: 'pro' };

describe('checkUpsells', () => {
  it('returns empty array when nothing triggers (tier: elite)', () => {
    const goals = [{ id: 'g1', percent: 50 }];
    const protocolStates = [{ protocolId: 'trt', supplyDaysLeft: 10, activeProduct: 'Testosterone' }];
    const result = checkUpsells(goals, protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });

  it('suggests pro upgrade for free user with >20% progress', () => {
    const goals = [{ id: 'g1', percent: 25 }];
    const result = checkUpsells(goals, [], freeProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tier_upgrade');
    expect(result[0].target).toBe('pro');
  });

  it('does not suggest pro upgrade for free user with <=20% progress', () => {
    const goals = [{ id: 'g1', percent: 20 }];
    const result = checkUpsells(goals, [], freeProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });

  it('suggests elite upgrade for pro user skipping 8+ tasks (via skippedThisWeek param)', () => {
    const result = checkUpsells([], [], proProfile, {}, 8, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tier_upgrade');
    expect(result[0].target).toBe('elite');
  });

  it('suggests reorder with urgency high when supply <=2 days', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 2, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('reorder');
    expect(result[0].urgency).toBe('high');
    expect(result[0].product).toBe('Testosterone Cypionate');
  });

  it('suggests reorder with urgency low for 4-5 days supply', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 4, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('reorder');
    expect(result[0].urgency).toBe('low');
  });

  it('does not suggest reorder when supply >5 days', () => {
    const protocolStates = [
      { protocolId: 'trt', supplyDaysLeft: 6, activeProduct: 'Testosterone Cypionate' },
    ];
    const result = checkUpsells([], protocolStates, eliteProfile, {}, undefined, undefined);
    expect(result).toEqual([]);
  });
});
