import { NextResponse } from 'next/server';

// POST /api/notify — sends order notification email to Jorrel
export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { orderId, customer, email, items, subtotal, discount, discountLabel, total, shipping } = await request.json();

    // Build item rows
    const itemRows = items.map(i => 
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E4E7EC;font-size:14px;color:#1C2028">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E4E7EC;font-size:14px;color:#6B7A94;text-align:center">${i.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E4E7EC;font-size:14px;color:#1C2028;text-align:right;font-weight:600">${i.price === 0 ? 'FREE' : '$' + (i.price * i.qty)}</td>
      </tr>`
    ).join('');

    const ship = shipping || {};

    const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <!-- Header -->
      <div style="background:#0F1928;padding:24px 32px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:2px">ADONIS</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:1px;margin-top:4px">NEW ORDER NOTIFICATION</div>
      </div>

      <div style="padding:32px">
        <!-- Order badge -->
        <div style="background:#ECFDF5;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#15803D">💰 New Order!</div>
          <div style="font-size:28px;font-weight:800;color:#0F1928;margin-top:4px">$${total}</div>
          <div style="font-size:12px;color:#6B7A94;margin-top:4px">${orderId}</div>
        </div>

        <!-- Customer -->
        <div style="margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#8C919E;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Customer</div>
          <div style="font-size:16px;font-weight:600;color:#0F1928">${customer}</div>
          ${email ? `<div style="font-size:13px;color:#6B7A94;margin-top:2px">${email}</div>` : ''}
        </div>

        <!-- Items -->
        <div style="margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#8C919E;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Items Ordered</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#F7F8FA">
                <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:600;color:#8C919E;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:10px;font-weight:600;color:#8C919E;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:10px;font-weight:600;color:#8C919E;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #E4E7EC">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          ${discount > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#FFFBEB;border-radius:6px;margin-top:8px">
            <span style="font-size:13px;font-weight:600;color:#A16207">${discountLabel || 'Discount'}</span>
            <span style="font-size:13px;font-weight:700;color:#A16207">-$${discount}</span>
          </div>` : ''}

          <div style="display:flex;justify-content:space-between;padding:12px;background:#F7F8FA;border-radius:6px;margin-top:8px">
            <span style="font-size:15px;font-weight:700;color:#0F1928">Total</span>
            <span style="font-size:18px;font-weight:800;color:#0F1928">$${total}</span>
          </div>
        </div>

        <!-- Shipping -->
        <div style="margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#8C919E;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Ship To</div>
          <div style="background:#F7F8FA;border:1px solid #E4E7EC;border-radius:8px;padding:16px;font-size:14px;color:#4A4F5C;line-height:1.7">
            ${ship.name || customer}<br>
            ${ship.address || 'No address provided'}<br>
            ${ship.city || ''}${ship.state ? ', ' + ship.state : ''} ${ship.zip || ''}
            ${ship.email ? '<br>' + ship.email : ''}
          </div>
        </div>

        <!-- Action buttons -->
        <div style="text-align:center;margin-top:24px">
          <a href="https://adonis-next-git-main-jorrelpattersons-projects.vercel.app/admin/orders" style="display:inline-block;padding:14px 32px;background:#0072B5;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:0.5px">View in Admin Panel →</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#F7F8FA;border-top:1px solid #E4E7EC;padding:20px 32px;text-align:center">
        <div style="font-size:11px;color:#8C919E">Adonis Protocol OS · Order Notification</div>
        <div style="font-size:10px;color:#B0B4BC;margin-top:4px">This is an automated notification. Do not reply.</div>
      </div>
    </div>`;

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Adonis Orders <onboarding@resend.dev>',
        to: ['jorrelpatterson@gmail.com'],
        subject: `🧪 New Order ${orderId} — $${total} from ${customer}`,
        html: html,
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
