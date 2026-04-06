import { describe, it, expect } from 'vitest';
import environmentProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('environment protocol', () => {
  it('passes validation', () => { expect(validateProtocol(environmentProtocol)).toBe(true); });
  it('has correct identity', () => { expect(environmentProtocol.id).toBe('environment'); expect(environmentProtocol.domain).toBe('environment'); });
  it('canServe environment goals', () => { expect(environmentProtocol.canServe({ domain: 'environment' })).toBe(true); });
  it('canServe rejects other domains', () => { expect(environmentProtocol.canServe({ domain: 'body' })).toBe(false); });

  it('getTasks returns make-bed every day', () => {
    const tasks = environmentProtocol.getTasks({}, {}, new Date('2026-04-06')); // Monday
    expect(tasks.some(t => t.id === 'env-make-bed')).toBe(true);
  });

  it('getTasks returns 10-min-reset every day', () => {
    const tasks = environmentProtocol.getTasks({}, {}, new Date('2026-04-08')); // Wednesday
    expect(tasks.some(t => t.id === 'env-10min-reset')).toBe(true);
  });

  it('getTasks returns workspace-prep on work days', () => {
    const monday = new Date('2026-04-06'); // Monday dayIdx=1
    const tasks = environmentProtocol.getTasks({}, {}, monday);
    expect(tasks.some(t => t.id === 'env-workspace-prep')).toBe(true);
  });

  it('getTasks does not return workspace-prep on Sunday', () => {
    const sunday = new Date('2026-04-05'); // Sunday dayIdx=0
    const tasks = environmentProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'env-workspace-prep')).toBe(false);
  });

  it('getTasks returns deep-clean on Sunday', () => {
    const sunday = new Date('2026-04-05'); // Sunday dayIdx=0
    const tasks = environmentProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'env-deep-clean')).toBe(true);
  });

  it('getTasks does not return deep-clean on weekdays', () => {
    const monday = new Date('2026-04-06'); // Monday dayIdx=1
    const tasks = environmentProtocol.getTasks({}, {}, monday);
    expect(tasks.some(t => t.id === 'env-deep-clean')).toBe(false);
  });

  it('make-bed is in morning category', () => {
    const tasks = environmentProtocol.getTasks({}, {}, new Date('2026-04-06'));
    const task = tasks.find(t => t.id === 'env-make-bed');
    expect(task.category).toBe('morning');
  });

  it('10-min-reset is in evening category', () => {
    const tasks = environmentProtocol.getTasks({}, {}, new Date('2026-04-06'));
    const task = tasks.find(t => t.id === 'env-10min-reset');
    expect(task.category).toBe('evening');
  });
});
