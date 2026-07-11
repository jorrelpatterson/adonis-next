import { describe, it, expect } from 'vitest';
import checkinProtocol from '../index.js';

describe('checkinProtocol', () => {
  it('exposes the expected shape', () => {
    expect(checkinProtocol.id).toBe('checkin');
    expect(checkinProtocol.domain).toBe('_system');
    expect(typeof checkinProtocol.canServe).toBe('function');
    expect(typeof checkinProtocol.getState).toBe('function');
    expect(typeof checkinProtocol.getTasks).toBe('function');
  });

  it('canServe returns true universally (every user gets check-ins)', () => {
    expect(checkinProtocol.canServe()).toBe(true);
    expect(checkinProtocol.canServe({ domain: 'body' })).toBe(true);
  });

  describe('getState', () => {
    it('reports submittedToday=false when no check-in today', () => {
      // Mock today by calling with logs that have no today entry
      // Note: getState uses internal Date.now via toISOString(), so we test that
      // it correctly reads from logs.checkins
      const state = checkinProtocol.getState({}, { checkins: {} });
      expect(state.submittedToday).toBe(false);
    });

    it('reports submittedToday=true when today has an entry', () => {
      const today = new Date().toISOString().slice(0, 10);
      const state = checkinProtocol.getState({}, {
        checkins: { [today]: { mood: 4, energy: 4 } },
      });
      expect(state.submittedToday).toBe(true);
    });
  });

  describe('getTasks', () => {
    it('emits a single check-in task when not submitted yet', () => {
      const day = new Date('2026-04-29T08:00:00Z');
      const tasks = checkinProtocol.getTasks({ submittedToday: false }, {}, day);
      expect(tasks).toHaveLength(1);
      const t = tasks[0];
      expect(t.type).toBe('check-in');
      expect(t.priority).toBe(1);
      expect(t.skippable).toBe(true);
      expect(t.id).toContain('2026-04-29');
      expect(t.title).toContain('Daily Check-in');
    });

    it('emits no tasks once submitted', () => {
      const day = new Date('2026-04-29T08:00:00Z');
      const tasks = checkinProtocol.getTasks({ submittedToday: true }, {}, day);
      expect(tasks).toEqual([]);
    });
  });

  describe('integration with selectors', () => {
    it('getState uses today\'s key from current date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      // Yesterday-only entry shouldn\'t count as submittedToday
      const stateY = checkinProtocol.getState({}, {
        checkins: { [yesterday]: { mood: 3 } },
      });
      expect(stateY.submittedToday).toBe(false);

      // Today entry counts
      const stateT = checkinProtocol.getState({}, {
        checkins: { [today]: { mood: 3 } },
      });
      expect(stateT.submittedToday).toBe(true);
    });
  });
});
