import { NextResponse } from 'next/server';

// POST /api/checkout
// Creates a Stripe Checkout Session with dynamic pricing from cart items
export async function POST(request) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const { items, shipping, discount, discountLabel } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Build line items dynamically from cart
    const line_items = items
      .filter(item => item.price > 0) // Skip free items (bac water with stack)
      .map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `${item.size || ''} · ${item.cat || 'Research Peptide'}`,
            metadata: {
              sku: item.sku || '',
              vendor: item.vendor || '',
            },
          },
          unit_amount: Math.round(item.price * 100), // Stripe uses cents
        },
        quantity: item.qty,
      }));

    // Add free items as $0 line items so they appear on receipt
    const freeItems = items.filter(item => item.price === 0);
    freeItems.forEach(item => {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `🎁 ${item.name} — FREE with stack`,
          },
          unit_amount: 0,
        },
        quantity: item.qty,
      });
    });

    // Build session config
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/app.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/app.html?checkout=cancelled`,
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      metadata: {
        source: 'adonis_app',
        discount_amount: String(discount || 0),
        discount_label: discountLabel || '',
        items_json: JSON.stringify(items.map(i => ({ name: i.name, qty: i.qty, price: i.price }))),
      },
    };

    // Apply discount as a coupon if applicable
    if (discount && discount > 0) {
      // Create a one-time coupon for this order
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discount * 100),
        currency: 'usd',
        duration: 'once',
        name: discountLabel || 'Protocol Discount',
      });
      sessionConfig.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
