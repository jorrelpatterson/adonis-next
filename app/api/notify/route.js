import { NextResponse } from 'next/server';

// POST /api/notify — sends order notification email to admin.
// Internal-only, triggered from the Stripe webhook / admin order flow.
export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }
  const adminEmail = process.env.ADMIN_EMAIL;

  try {
    const { orderId, customer, email, items, subtotal, discount, discountLabel, total, shipping } = await request.json();

    const itemRows = items.map(i =>
      `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-size:13px;color:#1A1C22">${i.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:12px;color:#7A7D88;text-align:center">${i.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4E7EC;font-family:'JetBrains Mono',monospace;font-size:13px;color:#1A1C22;text-align:right;font-weight:700">${i.price === 0 ? 'FREE' : '$' + (i.price * i.qty)}</td>
      </tr>`
    ).join('');

    const ship = shipping || {};
    const logo = '<svg viewBox="0 0 48 28" width="36" height="21" fill="none" style="vertical-align:middle;display:inline-block"><path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="32" cy="9" r="2" fill="#00A0A8"/><circle cx="38" cy="12" r="2" fill="#E07C24"/><circle cx="46" cy="3" r="2.5" fill="#E07C24"/></svg>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <title>New Order ${orderId}</title>
</head>
<body style="margin:0;padding:0;background:#E8E6E2;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <div style="background:#F4F2EE;border-bottom:1px solid #E4E7EC;padding:20px 32px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:10px">
    ${logo}
    <span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:300;letter-spacing:3px;color:#1A1C22;text-transform:lowercase">advnce <span style="color:#7A7D88;font-weight:300">labs</span></span>
    <span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase">Order notification</span>
  </div>

  <div style="background:#F4F2EE;padding:40px 32px">

    <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:24px;margin-bottom:28px;text-align:center">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px">New order</div>
      <div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:42px;font-weight:900;color:#00A0A8;letter-spacing:-1px;line-height:1;margin:4px 0">$${total}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#7A7D88;letter-spacing:1px;margin-top:6px">${orderId}</div>
    </div>

    <div style="margin-bottom:24px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Customer</div>
      <div style="font-size:16px;font-weight:700;color:#1A1C22">${customer}</div>
      ${email ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#7A7D88;margin-top:4px">${email}</div>` : ''}
    </div>

    <div style="margin-bottom:24px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Items</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E4E7EC;border-radius:4px;overflow:hidden">
        <thead><tr style="background:#FAFBFC">
          <th style="padding:10px 12px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Item</th>
          <th style="padding:10px 12px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid #E4E7EC">Price</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#FFFBEB;border-radius:3px;margin-top:10px"><span style="font-size:13px;font-weight:700;color:#A16207">${discountLabel || 'Discount'}</span><span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:#A16207">-$${discount}</span></div>` : ''}

      <div style="display:flex;justify-content:space-between;padding:14px 12px;background:#FAFBFC;border-radius:3px;margin-top:10px;border:1px solid #E4E7EC"><span style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:15px;font-weight:700;color:#1A1C22;letter-spacing:1px;text-transform:uppercase">Total</span><span style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:900;color:#00A0A8">$${total}</span></div>
    </div>

    <div style="margin-bottom:24px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Ship to</div>
      <div style="border:1px solid #E4E7EC;background:#FAFBFC;border-radius:4px;padding:14px 18px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#1A1C22;line-height:1.8">
        ${ship.name || customer}<br>
        ${ship.address || 'No address provided'}<br>
        ${ship.city || ''}${ship.state ? ', ' + ship.state : ''} ${ship.zip || ''}
        ${ship.email ? '<br>' + ship.email : ''}
      </div>
    </div>

    <div style="text-align:center;margin-top:28px">
      <a href="https://adonis.pro/admin/orders" style="display:inline-block;background:#00A0A8;color:#F4F2EE;font-family:'Barlow Condensed',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:3px">View in admin &rarr;</a>
    </div>

  </div>

  <div style="background:#1A1C22;padding:18px 32px;border-radius:0 0 6px 6px;text-align:center">
    <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(244,242,238,0.35);letter-spacing:1.5px;line-height:2;margin:0;text-transform:uppercase">Adonis Admin &middot; advncelabs.com<br>Automated notification &middot; Do not reply</p>
  </div>

</div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'advnce labs <orders@advncelabs.com>',
        to: [adminEmail],
        subject: `New order ${orderId} — $${total} from ${customer}`,
        html,
      }),
    });

    const result = await res.json();

    if (res.ok) {
      return NextResponse.json({ success: true, emailId: result.id });
    } else {
      console.error('Resend error:', result);
      return NextResponse.json({ error: result.message || 'Email send failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('Notify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
