import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function emailHtml({ firstName, productName }) {
  const fn = esc(firstName);
  const pn = esc(productName);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">Pre-order update</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.02;margin:0 0 20px">Your <span style="color:#00A0A8">${pn}</span> is on the way to us.</h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${fn ? 'Hi ' + fn + ', ' : ''}we've just placed the purchase order with our vendor. Your ${pn} will ship to our warehouse over the next ~10 days, then out to you the same day it arrives.</p>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 28px">You'll get tracking as soon as it leaves. Thanks for being patient.</p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · orders@advncelabs.com · research use only · not for human consumption</p>
</div>
</div></body></html>`;
}

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { sku } = await request.json().catch(() => ({}));
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
    `${SUPABASE_URL}/rest/v1/orders?select=order_id,first_name,email,items&pre_sell_status=eq.queued`,
    { headers, cache: 'no-store' },
  );
  if (!listRes.ok) {
    return NextResponse.json({ error: await listRes.text() }, { status: 500 });
  }
  const allQueued = await listRes.json();

  const matches = allQueued.filter((o) =>
    (o.items || []).some((it) => it.pre_sell && it.sku === sku),
  );
  if (!matches.length) return NextResponse.json({ updated: 0, emails: 0 });

  const productName = matches[0].items.find((it) => it.sku === sku)?.name || sku;

  const orderIds = matches.map((o) => o.order_id);
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?order_id=in.(${orderIds.map(encodeURIComponent).join(',')})`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ pre_sell_status: 'po_placed' }),
    },
  );
  if (!patchRes.ok) {
    return NextResponse.json({ error: await patchRes.text() }, { status: 500 });
  }

  let emailed = 0;
  for (const o of matches) {
    if (!o.email) continue;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: o.email,
          subject: `Your ${productName} is on the way.`,
          html: emailHtml({ firstName: o.first_name || '', productName }),
        }),
      });
      if (r.ok) emailed += 1;
    } catch (e) {
      console.error('email send error:', e);
    }
  }

  return NextResponse.json({ updated: orderIds.length, emails: emailed, sku, productName });
}
