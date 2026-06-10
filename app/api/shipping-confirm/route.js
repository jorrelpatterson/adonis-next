import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function shippedEmailHtml({ first_name, order_id, items, total, tracking_number, carrier, ship_address, ship_city, ship_state, ship_zip, est_delivery }) {
  const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

  const itemsHtml = (items || []).map((i) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1A1C22">${esc(i.name)} &mdash; ${esc(i.size)} &times; ${i.qty}</td><td style="text-align:right;padding:10px 0;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1A1C22">$${(i.price * i.qty).toFixed(2)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>Your order ${esc(order_id)} has shipped.</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
    ${logo}
    <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
  </div>

  <div style="background:#F4F2EE;padding:48px 40px">

    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px">Order update</div>
    <h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:40px;font-weight:900;color:#1A1C22;line-height:1.02;letter-spacing:-0.5px;text-transform:uppercase;margin:0 0 18px">Your order<br>has <span style="color:#00A0A8">shipped.</span></h1>
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:18px;font-weight:300;color:#1A1C22;line-height:1.75;margin:0 0 32px">${esc(first_name)}, your research compounds are on the way.</p>

    <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:22px;margin-bottom:14px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px">Order ID</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:16px;color:#00A0A8;letter-spacing:2px">${esc(order_id)}</div>
    </div>

    ${tracking_number ? `<div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:22px;margin-bottom:14px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:6px">${esc(carrier || 'Tracking')} number</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#00A0A8;letter-spacing:1.5px;word-break:break-all">${esc(tracking_number)}</div>
      ${est_delivery ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;margin-top:8px">Estimated delivery: ${esc(est_delivery)}</div>` : ''}
    </div>` : ''}

    <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px">Items shipped</div>
    <table style="width:100%;border-collapse:collapse">${itemsHtml}
      <tr><td style="padding:16px 0 0;font-family:'Barlow Condensed',Arial,sans-serif;font-size:14px;font-weight:700;color:#1A1C22;letter-spacing:1px;text-transform:uppercase">Total</td><td style="padding:16px 0 0;text-align:right;font-family:'JetBrains Mono',monospace;font-size:17px;color:#00A0A8;font-weight:700">$${parseFloat(total || 0).toFixed(2)}</td></tr>
    </table>

    <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Shipping to</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#1A1C22;line-height:1.9">${esc(ship_address)}<br>${esc(ship_city)}, ${esc(ship_state)} ${esc(ship_zip)}</div>

    <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:18px;margin-top:28px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">Storage instructions</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.7">Store at 2&ndash;8&deg;C upon arrival. Keep away from direct light. Cold-pack included.</div>
    </div>

    <div style="height:1px;background:#E4E7EC;margin:28px 0"></div>

    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7A7D88;line-height:1.8;margin:0">Questions about your shipment? Reply to this email with your order ID.</p>

  </div>

  <div style="background:#1A1C22;padding:20px 32px;border-radius:0 0 6px 6px;text-align:center">
    <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2.2;margin:0;text-transform:uppercase">advncelabs.com &middot; orders@advncelabs.com<br>All products for research use only &middot; Not for human consumption &middot; Not evaluated by the FDA</p>
  </div>

</div>
</body>
</html>`;
}

// POST /api/shipping-confirm — admin marks an order shipped: saves the tracking
// number to the order (service key) and emails the customer a shipped notice.
export async function POST(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const { order } = await request.json().catch(() => ({}));
  if (!order || !order.email || !order.order_id) {
    return NextResponse.json({ error: 'order with email and order_id required' }, { status: 400 });
  }

  // Best-effort: persist the tracking number + carrier + shipped timestamp on the order.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (SUPABASE_URL && SERVICE_KEY && order.tracking_number) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${encodeURIComponent(order.order_id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          tracking_number: order.tracking_number,
          tracking_carrier: order.carrier || 'USPS',
          shipped_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('shipping-confirm: tracking persist failed (continuing to email):', e);
    }
  }

  // Send the shipped-confirmation email (this is the action the button is for).
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: order.email,
        subject: `Your order ${order.order_id} has shipped.`,
        html: shippedEmailHtml(order),
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      return NextResponse.json({ success: true, emailId: result.id });
    }
    console.error('shipping-confirm Resend error:', result);
    return NextResponse.json({ error: result.message || 'Email send failed' }, { status: 502 });
  } catch (err) {
    console.error('shipping-confirm error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
