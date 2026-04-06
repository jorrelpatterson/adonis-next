import { describe, it, expect } from 'vitest';
import { ENV_AREAS } from '../data.js';

describe('ENV_AREAS', () => {
  it('has 6 areas', () => {
    expect(ENV_AREAS).toHaveLength(6);
  });

  it('each area has exactly 6 items', () => {
    ENV_AREAS.forEach((a, i) => {
      expect(a.items, `area ${i} (${a.id})`).toHaveLength(6);
    });
  });

  it('each area has id, name, icon, items, tips', () => {
    ENV_AREAS.forEach((a, i) => {
      expect(a, `area ${i}`).toHaveProperty('id');
      expect(a, `area ${i}`).toHaveProperty('name');
      expect(a, `area ${i}`).toHaveProperty('icon');
      expect(a, `area ${i}`).toHaveProperty('items');
      expect(a, `area ${i}`).toHaveProperty('tips');
    });
  });

  it('contains sleep, workspace, air, light, digital, cleanliness ids', () => {
    const ids = ENV_AREAS.map(a => a.id);
    expect(ids).toContain('sleep');
    expect(ids).toContain('workspace');
    expect(ids).toContain('air');
    expect(ids).toContain('light');
    expect(ids).toContain('digital');
    expect(ids).toContain('cleanliness');
  });

  it('sleep area first item is Blackout curtains/mask', () => {
    const sleep = ENV_AREAS.find(a => a.id === 'sleep');
    expect(sleep.items[0]).toBe('Blackout curtains/mask');
  });

  it('each area tips is a non-empty string', () => {
    ENV_AREAS.forEach((a, i) => {
      expect(typeof a.tips, `area ${i} tips`).toBe('string');
      expect(a.tips.length, `area ${i} tips`).toBeGreaterThan(0);
    });
  });
});
