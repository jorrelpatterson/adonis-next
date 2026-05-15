import { describe, it, expect } from 'vitest';
import { CHECKIN_FIELDS } from '../checkin';

describe('CHECKIN_FIELDS', () => {
  it('has at least 5 fields', () => { expect(CHECKIN_FIELDS.length).toBeGreaterThanOrEqual(5); });
  it('each field has id and label', () => {
    for (const f of CHECKIN_FIELDS) {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('label');
    }
  });
  it('includes mood, energy, sleep', () => {
    expect(CHECKIN_FIELDS.find(f => f.id === 'mood')).toBeDefined();
    expect(CHECKIN_FIELDS.find(f => f.id === 'energy')).toBeDefined();
    expect(CHECKIN_FIELDS.find(f => f.id === 'sleep')).toBeDefined();
  });
});
