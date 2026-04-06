// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { registerProtocol, matchProtocols, getByDomain, getAllProtocols } from '../registry';
import { validateProtocol } from '../protocol-interface';

const mockProtocol = {
  id: 'test-workout',
  domain: 'body',
  name: 'Test Workout',
  icon: '\u{1F4AA}',
  canServe: (goal) => goal.domain === 'body' && goal.title.toLowerCase().includes('lose'),
  getState: () => ({ phase: 'foundation', progress: 0, weekNumber: 1 }),
  getTasks: () => [],
  getAutomations: () => [],
  getRecommendations: () => [],
  getUpsells: () => [],
  View: () => null,
};

describe('validateProtocol', () => {
  it('returns true for a valid protocol', () => {
    expect(validateProtocol(mockProtocol)).toBe(true);
  });

  it('returns false if id is missing', () => {
    const bad = { ...mockProtocol, id: undefined };
    expect(validateProtocol(bad)).toBe(false);
  });

  it('returns false if getTasks is missing', () => {
    const bad = { ...mockProtocol, getTasks: undefined };
    expect(validateProtocol(bad)).toBe(false);
  });
});

describe('registry', () => {
  it('registers and retrieves protocols', () => {
    registerProtocol(mockProtocol);
    const all = getAllProtocols();
    expect(all.find(p => p.id === 'test-workout')).toBeDefined();
  });

  it('matches protocols to goals', () => {
    registerProtocol(mockProtocol);
    const goal = { domain: 'body', title: 'Lose 30lbs' };
    const matches = matchProtocols(goal);
    expect(matches.find(p => p.id === 'test-workout')).toBeDefined();
  });

  it('does not match protocols to unrelated goals', () => {
    registerProtocol(mockProtocol);
    const goal = { domain: 'money', title: 'Build credit' };
    const matches = matchProtocols(goal);
    expect(matches.find(p => p.id === 'test-workout')).toBeUndefined();
  });

  it('gets protocols by domain', () => {
    registerProtocol(mockProtocol);
    const body = getByDomain('body');
    expect(body.find(p => p.id === 'test-workout')).toBeDefined();
    const money = getByDomain('money');
    expect(money.find(p => p.id === 'test-workout')).toBeUndefined();
  });
});
