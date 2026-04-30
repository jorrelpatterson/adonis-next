// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateAccessCode } from '../access-codes';

describe('validateAccessCode', () => {
  it('returns founder entry for FOUNDER', () => {
    const result = validateAccessCode('FOUNDER');
    expect(result).toEqual({ tier: 'elite', name: 'Founder Access', expires: null });
  });

  it('is case insensitive', () => {
    const result = validateAccessCode('founder');
    expect(result).toEqual({ tier: 'elite', name: 'Founder Access', expires: null });
  });

  it('trims whitespace', () => {
    const result = validateAccessCode(' FOUNDER ');
    expect(result).toEqual({ tier: 'elite', name: 'Founder Access', expires: null });
  });

  it('returns pro tier for ADONIS2026', () => {
    const result = validateAccessCode('ADONIS2026');
    expect(result).not.toBeNull();
    expect(result.tier).toBe('pro');
    expect(result.name).toBe('Beta Tester');
  });

  it('returns null for invalid code', () => {
    expect(validateAccessCode('INVALID')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(validateAccessCode('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(validateAccessCode(null)).toBeNull();
  });
});
