import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirectToCheckout, STRIPE_LINKS } from '../upgrade.js';

describe('redirectToCheckout', () => {
  let originalLocation;

  beforeEach(() => {
    originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('throws on unknown tier', () => {
    expect(() => redirectToCheckout('basic', { id: 'u' })).toThrow(/unknown tier/i);
  });

  it('throws when no user given', () => {
    expect(() => redirectToCheckout('pro', null)).toThrow(/no authenticated user/i);
    expect(() => redirectToCheckout('pro', {})).toThrow(/no authenticated user/i);
  });

  it('redirects to Pro Stripe link with client_reference_id', () => {
    redirectToCheckout('pro', { id: 'user-abc-123' });
    expect(window.location.href).toContain(STRIPE_LINKS.pro);
    expect(window.location.href).toContain('client_reference_id=user-abc-123');
  });

  it('redirects to Elite link', () => {
    redirectToCheckout('elite', { id: 'user-abc' });
    expect(window.location.href).toContain(STRIPE_LINKS.elite);
    expect(window.location.href).toContain('client_reference_id=user-abc');
  });

  it('attaches prefilled_email when user has email', () => {
    redirectToCheckout('pro', { id: 'u1', email: 'test@example.com' });
    expect(window.location.href).toContain('prefilled_email=test%40example.com');
  });
});
