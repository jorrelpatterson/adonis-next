import { describe, it, expect } from 'vitest';
import communityProtocol from '../index';
import { validateProtocol } from '../../protocol-interface';

describe('community protocol', () => {
  it('passes validation', () => { expect(validateProtocol(communityProtocol)).toBe(true); });
  it('has correct identity', () => { expect(communityProtocol.id).toBe('community'); expect(communityProtocol.domain).toBe('community'); });
  it('canServe community goals', () => { expect(communityProtocol.canServe({ domain: 'community' })).toBe(true); });
  it('canServe rejects other domains', () => { expect(communityProtocol.canServe({ domain: 'body' })).toBe(false); });

  it('getTasks returns weekly check-in on Sunday', () => {
    const sunday = new Date('2026-04-05'); // Sunday dayIdx=0
    const tasks = communityProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'community-weekly-checkin')).toBe(true);
  });

  it('getTasks returns midweek pulse on Wednesday', () => {
    const wednesday = new Date('2026-04-08'); // Wednesday dayIdx=3
    const tasks = communityProtocol.getTasks({}, {}, wednesday);
    expect(tasks.some(t => t.id === 'community-midweek-pulse')).toBe(true);
  });

  it('getTasks returns empty on other days', () => {
    const tuesday = new Date('2026-04-07'); // Tuesday dayIdx=2
    const tasks = communityProtocol.getTasks({}, {}, tuesday);
    expect(tasks).toHaveLength(0);
  });

  it('getTasks does not return check-in on Wednesday', () => {
    const wednesday = new Date('2026-04-08');
    const tasks = communityProtocol.getTasks({}, {}, wednesday);
    expect(tasks.some(t => t.id === 'community-weekly-checkin')).toBe(false);
  });

  it('getTasks does not return pulse on Sunday', () => {
    const sunday = new Date('2026-04-05');
    const tasks = communityProtocol.getTasks({}, {}, sunday);
    expect(tasks.some(t => t.id === 'community-midweek-pulse')).toBe(false);
  });

  it('weekly check-in is in purpose category', () => {
    const sunday = new Date('2026-04-05');
    const tasks = communityProtocol.getTasks({}, {}, sunday);
    const task = tasks.find(t => t.id === 'community-weekly-checkin');
    expect(task.category).toBe('purpose');
  });

  it('midweek pulse is in purpose category', () => {
    const wednesday = new Date('2026-04-08');
    const tasks = communityProtocol.getTasks({}, {}, wednesday);
    const task = tasks.find(t => t.id === 'community-midweek-pulse');
    expect(task.category).toBe('purpose');
  });
});
