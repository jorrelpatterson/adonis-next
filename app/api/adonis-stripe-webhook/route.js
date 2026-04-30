// Adonis subscription webhook — receives Stripe events for Adonis Pro/Elite
// subscriptions and syncs the subscription state into adonis_profiles.
//
// EVENTS HANDLED
// - checkout.session.completed   → initial subscription created
// - customer.subscription.updated → renewal, plan change, past_due, etc.
// - customer.subscription.deleted → user canceled (downgrade to free)
//
// HOW THE USER IS IDENTIFIED
// We require Adonis upgrade flows to pass the Adonis user id as
// `client_reference_id` when redirecting to the Stripe Payment Link.
// Stripe surfaces this on the resulting Checkout Session, then on the
// subscription (via metadata we set on creation).
//
// REQUIRED ENV VARS
// - STRIPE_SECRET_KEY                  (already exists)
// - STRIPE_ADONIS_WEBHOOK_SECRET       (NEW — paste from Stripe webhook config)
// - STRIPE_ADONIS_PRO_PRICE_ID         (NEW — find in Stripe Products → Pro plan)
// - STRIPE_ADONIS_ELITE_PRICE_ID       (NEW — find in Stripe Products → Elite plan)
// - SUPABASE_SERVICE_KEY               (already exists)
// - NEXT_PUBLIC_SUPABASE_URL           (already exists)

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Next.js App Router: request.text() returns the raw body, which is what
// Stripe needs for signature verification — no opt-out config needed.
export const runtime = 'nodejs';

function tierFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_ADONIS_PRO_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_ADONIS_ELITE_PRICE_ID) return 'elite';
  return null;
}

async function patchProfile(userId, patch) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase server config missing');
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/adonis_profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Profile update failed: ${detail}`);
  }
}

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_ADONIS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Server config missing: STRIPE_ADONIS_WEBHOOK_SECRET' },
      { status: 500 },
    );
  }

  const sig = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${e.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // We only care about subscription mode (recurring). One-time payments
        // (e.g. advnce labs orders) skip this handler.
        if (session.mode !== 'subscription') {
          return NextResponse.json({ skipped: 'not a subscription' });
        }

        const userId = session.client_reference_id;
        if (!userId) {
          // No Adonis user id attached → not from Adonis upgrade flow. Skip.
          return NextResponse.json({ skipped: 'no client_reference_id' });
        }

        // Pull the subscription to find the price ID (= tier)
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId);

        if (!tier) {
          return NextResponse.json(
            { error: `Unknown price id: ${priceId}. Set STRIPE_ADONIS_PRO_PRICE_ID and STRIPE_ADONIS_ELITE_PRICE_ID env vars.` },
            { status: 400 },
          );
        }

        await patchProfile(userId, {
          tier,
          stripe_customer_id: session.customer,
          subscription_id: session.subscription,
          subscription_status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });

        // Tag the subscription with the user_id so future events can find it
        // even when client_reference_id isn't in the payload.
        await stripe.subscriptions.update(session.subscription, {
          metadata: { adonis_user_id: userId },
        });

        return NextResponse.json({ success: true, action: 'tier_set', tier });
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.adonis_user_id;
        if (!userId) return NextResponse.json({ skipped: 'no adonis_user_id metadata' });

        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId);

        // status: active | past_due | canceled | incomplete | incomplete_expired | trialing | unpaid
        // If the subscription is canceled or expired → drop to free.
        const isActive = ['active', 'trialing'].includes(sub.status);
        const effectiveTier = isActive && tier ? tier : 'free';

        await patchProfile(userId, {
          tier: effectiveTier,
          subscription_status: sub.status,
          subscription_id: sub.id,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        });
        return NextResponse.json({ success: true, action: 'tier_synced', tier: effectiveTier });
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.adonis_user_id;
        if (!userId) return NextResponse.json({ skipped: 'no adonis_user_id metadata' });

        await patchProfile(userId, {
          tier: 'free',
          subscription_status: 'canceled',
          current_period_end: null,
        });
        return NextResponse.json({ success: true, action: 'downgraded_to_free' });
      }

      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'adonis-stripe-webhook is live' });
}
