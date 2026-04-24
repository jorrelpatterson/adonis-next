import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function apologyHtml({ firstName, productName, lineCents, reason }) {
  const fn = esc(firstName);
  const pn = esc(productName);
  const amount = (lineCents / 100).toFixed(2);
  const creditAmount = (lineCents * 1.1 / 100).toFixed(2);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">About your pre-order</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1;margin:0 0 20px">We can't fulfill your <span style="color:#00A0A8">${pn}</span> pre-order.</h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">Hi ${fn || 'there'}, we hit a supply issue on <strong>${pn}</strong> and won't be able to fulfill your pre-order of <strong>$${amount}</strong>.</p>
${reason ? `<p style="font-size:14px;color:#7A7D88;line-height:1.65;font-style:italic;margin:0 0 20px">${esc(reason)}</p>` : ''}
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px"><strong>You have two options — reply to this email with your choice:</strong></p>
<ul style="font-size:15px;line-height:1.8;color:#1A1C22;margin:0 0 24px;padding-left:24px">
  <li><strong>Full refund</strong> via Zelle back to the number you paid from — typically same-day once you confirm.</li>
  <li><strong>Store credit + 10% bonus</strong> ($${creditAmount}) to use on anything in the catalog, no expiration.</li>
</ul>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 28px">Sorry for the friction — we'll take care of it right away.</p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · orders@advncelabs.com · research use only</p>
</div>
</div></body></html>`;
}

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { sku, reason } = await request.json().catch(() => ({}));
  if (!sku || typeof sku !== 'string') {
    return NextResponse.json({ error: 'sku required' }, { status: 400 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,first_name,email,items&pre_sell_status=in.(queued,po_placed)`,
    { headers, cache: 'no-store' },
  );
  if (!listRes.ok) {
    return NextResponse.json({ error: await listRes.text() }, { status: 500 });
  }
  const allOpen = await listRes.json();

  const matches = allOpen.filter((o) =>
    (o.items || []).some((it) => it.pre_sell && it.sku === sku),
  );

  let emailed = 0;
  const cancelledOrderIds = [];

  if (matches.length) {
    const productName = matches[0].items.find((it) => it.sku === sku)?.name || sku;

    for (const o of matches) {
      const line = (o.items || []).find((it) => it.pre_sell && it.sku === sku);
      if (!line) continue;
      const lineCents = Math.round(line.price * (line.qty || 1) * 100);

      if (o.email) {
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
            body: JSON.stringify({
              from: 'advnce labs <orders@advncelabs.com>',
              to: o.email,
              subject: `About your ${productName} pre-order`,
              html: apologyHtml({
                firstName: o.first_name || '',
                productName,
                lineCents,
                reason: reason || '',
              }),
            }),
          });
          if (r.ok) emailed += 1;
        } catch (e) {
          console.error('apology email error:', e);
        }
      }
      cancelledOrderIds.push(o.order_id);
    }

    if (cancelledOrderIds.length) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/orders?order_id=in.(${cancelledOrderIds.map(encodeURIComponent).join(',')})`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ pre_sell_status: 'cancelled' }),
        },
      );
    }
  }

  // Disable pre-sell on this product going forward
  await fetch(`${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(sku)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ pre_sell_disabled: true }),
  });

  return NextResponse.json({ cancelled: cancelledOrderIds.length, emails: emailed, sku });
}
