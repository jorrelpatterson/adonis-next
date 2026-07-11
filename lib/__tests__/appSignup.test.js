// lib/__tests__/appSignup.test.js
// Task 12 — subscribers upsert (lead capture). buildSubscriberRow is pure,
// no DOM needed, but the repo's vitest config runs happy-dom globally.
import { describe, it, expect } from 'vitest';
import { buildSubscriberRow } from '../appSignup.js';

describe('buildSubscriberRow', () => {
  it('builds a row with lowercased/trimmed email, source, and ISO subscribed_at', () => {
    const row = buildSubscriberRow('  Jordan@Example.com  ', 'Jordan');

    expect(row.email).toBe('jordan@example.com');
    expect(row.first_name).toBe('Jordan');
    expect(row.source).toBe('adonis-app');
    expect(row.subscribed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('defaults first_name to null when firstName is omitted', () => {
    const row = buildSubscriberRow('jordan@example.com');
    expect(row.first_name).toBeNull();
  });

  it('trims first_name and treats blank as null', () => {
    const row = buildSubscriberRow('jordan@example.com', '   ');
    expect(row.first_name).toBeNull();
  });

  it('throws on a garbage email', () => {
    expect(() => buildSubscriberRow('not-an-email', 'Jordan')).toThrow('valid email required');
  });

  it('throws when email is missing', () => {
    expect(() => buildSubscriberRow(undefined, 'Jordan')).toThrow('valid email required');
  });
});
