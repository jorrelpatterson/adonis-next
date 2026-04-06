import { describe, it, expect } from 'vitest';
import purposeProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('purpose protocol', () => {
  it('passes protocol validation', () => {
    expect(validateProtocol(purposeProtocol)).toBe(true);
  });

  it('has correct identity', () => {
    expect(purposeProtocol.id).toBe('purpose');
    expect(purposeProtocol.domain).toBe('purpose');
    expect(purposeProtocol.name).toBe('Purpose Protocol');
  });

  it('canServe purpose goals', () => {
    expect(purposeProtocol.canServe({ domain: 'purpose' })).toBe(true);
  });

  it('does not serve non-purpose goals', () => {
    expect(purposeProtocol.canServe({ domain: 'mind' })).toBe(false);
    expect(purposeProtocol.canServe(null)).toBe(false);
  });

  it('getTasks returns daily morning intention task', () => {
    const monday = new Date('2026-04-07'); // Tuesday (dayIdx 2)
    const tasks = purposeProtocol.getTasks({}, {}, monday);
    const intention = tasks.find(t => t.id === 'purpose-morning-intention');
    expect(intention).toBeDefined();
    expect(intention.category).toBe('purpose');
    expect(intention.type).toBe('manual');
    expect(intention.skippable).toBe(true);
    expect(intention.priority).toBe(3);
  });

  it('getTasks returns weekly audit on Sunday (dayIdx 0)', () => {
    const sunday = new Date('2026-04-06'); // Sunday = dayIdx 0
    const tasks = purposeProtocol.getTasks({}, {}, sunday);
    const audit = tasks.find(t => t.id === 'purpose-weekly-audit');
    expect(audit).toBeDefined();
    expect(audit.category).toBe('purpose');
    expect(audit.type).toBe('manual');
    expect(audit.skippable).toBe(true);
  });

  it('getTasks does NOT return weekly audit on non-Sunday', () => {
    const tuesday = new Date('2026-04-07'); // Tuesday = dayIdx 2
    const tasks = purposeProtocol.getTasks({}, {}, tuesday);
    const audit = tasks.find(t => t.id === 'purpose-weekly-audit');
    expect(audit).toBeUndefined();
  });

  it('getTasks returns 1 task on weekdays', () => {
    const tuesday = new Date('2026-04-07'); // Tuesday = dayIdx 2
    const tasks = purposeProtocol.getTasks({}, {}, tuesday);
    expect(tasks).toHaveLength(1);
  });

  it('getTasks returns 2 tasks on Sunday', () => {
    const sunday = new Date('2026-04-06'); // Sunday = dayIdx 0
    const tasks = purposeProtocol.getTasks({}, {}, sunday);
    expect(tasks).toHaveLength(2);
  });
});
