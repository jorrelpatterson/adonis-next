import { describe, it, expect } from 'vitest';
import mindProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('mind protocol', () => {
  it('passes protocol validation', () => {
    expect(validateProtocol(mindProtocol)).toBe(true);
  });

  it('has correct identity', () => {
    expect(mindProtocol.id).toBe('mind');
    expect(mindProtocol.domain).toBe('mind');
    expect(mindProtocol.name).toBe('Mind Protocol');
  });

  it('canServe mind goals', () => {
    expect(mindProtocol.canServe({ domain: 'mind' })).toBe(true);
  });

  it('does not serve non-mind goals', () => {
    expect(mindProtocol.canServe({ domain: 'body' })).toBe(false);
    expect(mindProtocol.canServe(null)).toBe(false);
  });

  it('getTasks returns daily gratitude task', () => {
    const monday = new Date('2026-04-07'); // Monday = dayIdx 1 (odd)
    const tasks = mindProtocol.getTasks({}, {}, monday);
    const gratitude = tasks.find(t => t.id === 'mind-gratitude');
    expect(gratitude).toBeDefined();
    expect(gratitude.category).toBe('mind');
    expect(gratitude.type).toBe('manual');
    expect(gratitude.skippable).toBe(true);
  });

  it('getTasks returns breathwork on even days', () => {
    const sunday = new Date('2026-04-06'); // Sunday = dayIdx 0 (even)
    const tasks = mindProtocol.getTasks({}, {}, sunday);
    const breathwork = tasks.find(t => t.id === 'mind-breathwork');
    expect(breathwork).toBeDefined();
    expect(breathwork.category).toBe('mind');
  });

  it('getTasks returns meditation on odd days', () => {
    const monday = new Date('2026-04-07'); // Monday = dayIdx 1 (odd)
    const tasks = mindProtocol.getTasks({}, {}, monday);
    const meditation = tasks.find(t => t.id === 'mind-meditation');
    expect(meditation).toBeDefined();
    expect(meditation.category).toBe('mind');
  });

  it('getTasks returns exactly 2 tasks each day', () => {
    const monday = new Date('2026-04-07');
    const tasks = mindProtocol.getTasks({}, {}, monday);
    expect(tasks).toHaveLength(2);
  });

  it('all tasks have priority 3', () => {
    const day = new Date('2026-04-07');
    const tasks = mindProtocol.getTasks({}, {}, day);
    tasks.forEach(t => expect(t.priority).toBe(3));
  });
});
