import { describe, it, expect } from 'vitest';
import mindProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('mind protocol', () => {
  it('passes validation', () => { expect(validateProtocol(mindProtocol)).toBe(true); });
  it('has correct identity', () => { expect(mindProtocol.id).toBe('mind'); expect(mindProtocol.domain).toBe('mind'); });
  it('canServe mind goals', () => { expect(mindProtocol.canServe({ domain: 'mind' })).toBe(true); });
  it('canServe rejects other domains', () => { expect(mindProtocol.canServe({ domain: 'body' })).toBe(false); });
  it('getTasks returns gratitude daily', () => {
    const tasks = mindProtocol.getTasks({}, {}, new Date('2026-04-06'));
    expect(tasks.some(t => t.id === 'mind-gratitude')).toBe(true);
  });
  it('getTasks returns breathwork on even days', () => {
    const sunday = new Date('2026-04-05'); // getDay()=0, even
    const tasks = mindProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'mind-breathwork')).toBe(true);
  });
  it('getTasks returns meditation on odd days', () => {
    const monday = new Date('2026-04-06'); // getDay()=1, odd
    const tasks = mindProtocol.getTasks({}, {}, monday);
    expect(tasks.some(t => t.id === 'mind-meditation')).toBe(true);
  });
});
