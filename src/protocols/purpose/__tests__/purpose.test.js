import { describe, it, expect } from 'vitest';
import purposeProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('purpose protocol', () => {
  it('passes validation', () => { expect(validateProtocol(purposeProtocol)).toBe(true); });
  it('has correct identity', () => { expect(purposeProtocol.id).toBe('purpose'); expect(purposeProtocol.domain).toBe('purpose'); });
  it('canServe purpose goals', () => { expect(purposeProtocol.canServe({ domain: 'purpose' })).toBe(true); });
  it('getTasks returns intention daily', () => {
    const tasks = purposeProtocol.getTasks({}, {}, new Date('2026-04-06'));
    expect(tasks.some(t => t.id === 'purpose-intention')).toBe(true);
  });
  it('getTasks returns audit on Sunday', () => {
    const sunday = new Date('2026-04-05');
    const tasks = purposeProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'purpose-audit')).toBe(true);
  });
  it('getTasks no audit on Monday', () => {
    const monday = new Date('2026-04-06');
    const tasks = purposeProtocol.getTasks({}, {}, monday);
    expect(tasks.some(t => t.id === 'purpose-audit')).toBe(false);
  });
});
