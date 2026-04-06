import { NextResponse } from 'next/server';

// POST /api/stripe — Stripe webhook handler
// Set this URL in Stripe Dashboard → Webhooks → Endpoint URL
// https://your-domain.vercel.app/api/stripe

export async function POST(request) {
  const body = await request.text();
  
  // TODO: Verify Stripe webhook signature
  // const sig = request.headers.get('stripe-signature');
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  try {
    const event = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed':
        // Payment successful — mark order as confirmed
        // Update Supabase order status
        // Send confirmation email
        console.log('Payment completed:', event.data.object.id);
        break;

      case 'customer.subscription.created':
        // Pro/Elite subscription started
        console.log('Subscription created:', event.data.object.id);
        break;

      case 'customer.subscription.deleted':
        // Subscription cancelled
        console.log('Subscription cancelled:', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        // Payment failed — notify customer
        console.log('Payment failed:', event.data.object.id);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
