// src/app/__tests__/tier-gate.test.js
import { describe, it, expect } from 'vitest';
import { isDomainLocked } from '../tier-gate';

describe('isDomainLocked', () => {
  it('body is never locked, regardless of tier', () => {
    expect(isDomainLocked('body', 'free')).toBe(false);
    expect(isDomainLocked('body', 'pro')).toBe(false);
    expect(isDomainLocked('body', 'elite')).toBe(false);
    expect(isDomainLocked('body', undefined)).toBe(false);
  });

  it('every other domain is locked on free tier', () => {
    expect(isDomainLocked('money', 'free')).toBe(true);
    expect(isDomainLocked('travel', 'free')).toBe(true);
    expect(isDomainLocked('mind', undefined)).toBe(true);
  });

  it('every other domain is unlocked on pro or elite tier', () => {
    expect(isDomainLocked('money', 'pro')).toBe(false);
    expect(isDomainLocked('travel', 'elite')).toBe(false);
  });
});
