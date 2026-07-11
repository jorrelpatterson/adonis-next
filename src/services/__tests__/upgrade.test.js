import { describe, it, expect } from 'vitest';
import { redirectToCheckout, STRIPE_LINKS, PAYMENTS_ENABLED } from '../upgrade.js';

describe('redirectToCheckout', () => {
  it('throws when payments disabled', () => {
    expect(() => redirectToCheckout('pro', { id: 'x', email: 'y' })).toThrow('Payments are not enabled');
  });

  it('STRIPE_LINKS.pro starts with https://buy.stripe.com/', () => {
    expect(STRIPE_LINKS.pro).toMatch(/^https:\/\/buy\.stripe\.com\//);
  });

  it('STRIPE_LINKS.elite starts with https://buy.stripe.com/', () => {
    expect(STRIPE_LINKS.elite).toMatch(/^https:\/\/buy\.stripe\.com\//);
  });
});
