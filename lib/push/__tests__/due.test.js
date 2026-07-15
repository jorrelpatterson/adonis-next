// lib/push/__tests__/due.test.js
//
// selectDueTokens is pure — see due.js's header for why "due" means
// "hasn't been notified in the last 20h" and NOT "hasn't completed
// today's routine" (the server has no visibility into routine
// completion, which lives client-side in localStorage).

import { describe, it, expect } from 'vitest';
import { selectDueTokens } from '../due.js';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-07-15T16:00:00.000Z');

function row(overrides = {}) {
  return {
    user_id: 'user-1',
    token: 'tok-1',
    platform: 'ios',
    last_notified_at: null,
    ...overrides,
  };
}

describe('lib/push/due — selectDueTokens', () => {
  describe('the one-notification-per-~day guard', () => {
    it('a token never notified (last_notified_at null) is due', () => {
      const r = row();
      expect(selectDueTokens([r], NOW)).toEqual([r]);
    });

    it('a token notified 25h ago (past the 20h threshold) is due again', () => {
      const r = row({ last_notified_at: new Date(NOW.getTime() - 25 * HOUR).toISOString() });
      expect(selectDueTokens([r], NOW)).toEqual([r]);
    });

    it('a token notified 1h ago is NOT due', () => {
      const r = row({ last_notified_at: new Date(NOW.getTime() - 1 * HOUR).toISOString() });
      expect(selectDueTokens([r], NOW)).toEqual([]);
    });

    it('a token notified exactly 20h ago IS due (guard is >=, not >)', () => {
      const r = row({ last_notified_at: new Date(NOW.getTime() - 20 * HOUR).toISOString() });
      expect(selectDueTokens([r], NOW)).toEqual([r]);
    });

    it('a token notified 1 minute short of 20h ago is NOT due', () => {
      const r = row({ last_notified_at: new Date(NOW.getTime() - (20 * HOUR - 60_000)).toISOString() });
      expect(selectDueTokens([r], NOW)).toEqual([]);
    });

    it('an unparseable last_notified_at is treated as never-notified (due), not a crash', () => {
      const r = row({ last_notified_at: 'not-a-date' });
      expect(() => selectDueTokens([r], NOW)).not.toThrow();
      expect(selectDueTokens([r], NOW)).toEqual([r]);
    });
  });

  describe('dedup', () => {
    it('collapses identical (user_id, token) pairs, keeping the first occurrence', () => {
      const r = row();
      expect(selectDueTokens([r, row()], NOW)).toEqual([r]);
    });

    it('does NOT collapse different tokens for the same user (multi-device)', () => {
      const a = row({ token: 'tok-a' });
      const b = row({ token: 'tok-b' });
      expect(selectDueTokens([a, b], NOW)).toEqual([a, b]);
    });

    it('does NOT collapse the same token string across different users', () => {
      const a = row({ user_id: 'user-a', token: 'shared-tok' });
      const b = row({ user_id: 'user-b', token: 'shared-tok' });
      expect(selectDueTokens([a, b], NOW)).toEqual([a, b]);
    });
  });

  describe('platform filter', () => {
    it('includes platform "ios"', () => {
      const r = row({ platform: 'ios' });
      expect(selectDueTokens([r], NOW)).toEqual([r]);
    });

    it('excludes a non-ios platform (apns.js only speaks APNs)', () => {
      const r = row({ platform: 'android' });
      expect(selectDueTokens([r], NOW)).toEqual([]);
    });

    it('excludes a row with a missing platform rather than assuming ios', () => {
      const r = row({ platform: undefined });
      expect(selectDueTokens([r], NOW)).toEqual([]);
    });
  });

  describe('malformed input', () => {
    it('skips rows missing a token or a user_id, without throwing', () => {
      const rows = [row({ token: undefined }), row({ user_id: undefined })];
      expect(() => selectDueTokens(rows, NOW)).not.toThrow();
      expect(selectDueTokens(rows, NOW)).toEqual([]);
    });

    it('skips null/undefined entries in the list, without throwing', () => {
      const rows = [null, undefined, row()];
      expect(() => selectDueTokens(rows, NOW)).not.toThrow();
      expect(selectDueTokens(rows, NOW)).toEqual([row()]);
    });

    it('an empty list returns an empty list', () => {
      expect(selectDueTokens([], NOW)).toEqual([]);
    });

    it('a null/undefined token list returns an empty list without throwing', () => {
      expect(selectDueTokens(undefined, NOW)).toEqual([]);
      expect(selectDueTokens(null, NOW)).toEqual([]);
    });
  });

  it('defaults `now` to the current time when omitted', () => {
    const r = row();
    expect(selectDueTokens([r])).toEqual([r]);
  });
});
