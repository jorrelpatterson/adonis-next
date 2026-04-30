// Stripe upgrade redirect — sends user to the right Payment Link with
// their Adonis user_id attached so the webhook can credit them.
//
// We use the existing v1 Payment Links (already configured in Jorrel's
// Stripe account). No new Stripe products needed.

const STRIPE_LINKS = {
  pro: 'https://buy.stripe.com/bJe8wQ2pX7X97uX3eM6Na03',
  elite: 'https://buy.stripe.com/bJe00kfcJ1yL02v3eM6Na04',
};

/**
 * Redirects to Stripe Checkout for the chosen tier.
 * Stripe will return the user to wherever you set as success URL on the
 * Payment Link in the Stripe dashboard (currently the legacy app URL —
 * update Payment Link settings when v2 is on a real domain).
 *
 * @param {'pro'|'elite'} tier
 * @param {object} user - Supabase auth user object (must have id + optionally email)
 */
export function redirectToCheckout(tier, user) {
  if (!tier || !STRIPE_LINKS[tier]) {
    throw new Error(`Unknown tier: ${tier}`);
  }
  if (!user?.id) {
    throw new Error('Cannot upgrade: no authenticated user');
  }

  const url = new URL(STRIPE_LINKS[tier]);
  url.searchParams.set('client_reference_id', user.id);
  if (user.email) url.searchParams.set('prefilled_email', user.email);

  if (typeof window !== 'undefined') {
    window.location.href = url.toString();
  }
}

export { STRIPE_LINKS };
