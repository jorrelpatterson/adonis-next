import { describe, it, expect } from 'vitest';
import { isProfileIncomplete } from '../ProfileSetup.jsx';

describe('isProfileIncomplete', () => {
  it('returns true for null/undefined profile', () => {
    expect(isProfileIncomplete(null)).toBe(true);
    expect(isProfileIncomplete(undefined)).toBe(true);
  });

  it('returns true when any required field is missing', () => {
    const base = { name: 'Joe', age: 30, gender: 'male', weight: 180, hFt: 5, activity: 'moderate' };
    expect(isProfileIncomplete(base)).toBe(false);
    expect(isProfileIncomplete({ ...base, name: '' })).toBe(true);
    expect(isProfileIncomplete({ ...base, age: '' })).toBe(true);
    expect(isProfileIncomplete({ ...base, gender: '' })).toBe(true);
    expect(isProfileIncomplete({ ...base, weight: '' })).toBe(true);
    expect(isProfileIncomplete({ ...base, hFt: '' })).toBe(true);
    expect(isProfileIncomplete({ ...base, activity: '' })).toBe(true);
  });

  it('returns true for the empty default profile', () => {
    const defaultProfile = {
      name: '', age: '', gender: '', weight: '', goalW: '', hFt: '', hIn: '',
      activity: '', trainPref: 'morning', equipment: 'gym',
      targetDate: null, cycleData: null, domains: ['body'], tier: 'free',
    };
    expect(isProfileIncomplete(defaultProfile)).toBe(true);
  });

  it('returns false when all required fields are present (hIn optional)', () => {
    expect(isProfileIncomplete({
      name: 'Test', age: 30, gender: 'female', weight: 140, hFt: 5, activity: 'light',
    })).toBe(false);
  });

  it('treats null values as missing', () => {
    expect(isProfileIncomplete({
      name: 'Joe', age: null, gender: 'male', weight: 180, hFt: 5, activity: 'moderate',
    })).toBe(true);
  });
});
