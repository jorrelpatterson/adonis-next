import { describe, it, expect } from 'vitest';
import skincareProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';
import { SKIN_AM, SKIN_PM, SKIN_AM_BASE, SKIN_PM_BASE, GROOMING_ITEMS } from '../data';

describe('skincare data', () => {
  it('SKIN_AM has 7 entries', () => { expect(SKIN_AM).toHaveLength(7); });
  it('SKIN_PM has 7 entries', () => { expect(SKIN_PM).toHaveLength(7); });
  it('SKIN_AM_BASE has 4 steps', () => { expect(SKIN_AM_BASE).toHaveLength(4); });
  it('SKIN_PM_BASE has 3 steps', () => { expect(SKIN_PM_BASE).toHaveLength(3); });
  it('GROOMING_ITEMS has entries', () => { expect(GROOMING_ITEMS.length).toBeGreaterThan(0); });
});

describe('skincare protocol', () => {
  it('passes protocol validation', () => { expect(validateProtocol(skincareProtocol)).toBe(true); });
  it('has correct identity', () => { expect(skincareProtocol.id).toBe('skincare'); expect(skincareProtocol.domain).toBe('image'); });
  it('canServe image goals', () => { expect(skincareProtocol.canServe({ domain: 'image' })).toBe(true); });
  it('getTasks returns AM and PM skincare tasks', () => {
    const state = {};
    const monday = new Date('2026-04-06');
    const tasks = skincareProtocol.getTasks(state, {}, monday);
    const skinTasks = tasks.filter(t => t.category === 'skincare');
    expect(skinTasks.length).toBeGreaterThanOrEqual(7); // 4 AM base + active + 3 PM base + active
  });
  it('getTasks includes day-specific actives', () => {
    const monday = new Date('2026-04-06'); // Monday
    const tasks = skincareProtocol.getTasks({}, {}, monday);
    // Should have day-specific AM and PM actives
    const titles = tasks.map(t => t.title);
    expect(titles.some(t => t.includes('Active'))).toBe(true);
  });
});
