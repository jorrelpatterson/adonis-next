import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

// Valid forward transitions. Cancelled is allowed from any pre-delivery state.
const VALID_NEXT = {
  sent:      ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shippedEmailHtml({ firstName, invoiceId, carrier, trackingNumber, publicUrl }) {
  const trackingBlock = trackingNumber
    ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${esc((carrier || '').toUpperCase())} ${esc(trackingNumber)}</strong></p>`
    : '';
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">Shipping update</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:32px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1;margin:0 0 20px">Your order is <span style="color:#00A0A8">on the way.</span></h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">${esc(firstName) ? 'Hi ' + esc(firstName) + ', ' : ''}your advnce labs order ${esc(invoiceId)} just left our warehouse.</p>
${trackingBlock}
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:20px 0 28px"><a href="${esc(publicUrl)}" style="color:#00A0A8">View your invoice →</a></p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · research use only · not for human consumption</p>
</div>
</div></body></html>`;
}

function cancelEmailHtml({ firstName, invoiceId, totalCents }) {
  const amount = (totalCents / 100).toFixed(2);
  const creditAmount = (totalCents * 1.1 / 100).toFixed(2);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#E8E6E2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#F4F2EE;padding:40px 32px;border-radius:6px">
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7A7D88;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px">About your order</div>
<h1 style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;font-weight:900;color:#1A1C22;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1;margin:0 0 20px">We've cancelled invoice ${esc(invoiceId)}.</h1>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px">Hi ${esc(firstName) || 'there'}, we had to cancel this order.</p>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 16px"><strong>Reply with your preference:</strong></p>
<ul style="font-size:15px;line-height:1.8;color:#1A1C22;margin:0 0 24px;padding-left:24px">
  <li><strong>Full refund</strong> via Zelle ($${amount}) back to the number you paid from.</li>
  <li><strong>Store credit + 10%</strong> ($${creditAmount}) usable on anything.</li>
</ul>
<p style="font-size:15px;line-height:1.65;color:#1A1C22;margin:0 0 28px">Sorry for the friction.</p>
<div style="border-top:1px solid #E4E7EC;padding-top:20px">
<p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#7A7D88;letter-spacing:2px;line-height:1.8;margin:0;text-transform:uppercase">advncelabs.com · orders@advncelabs.com</p>
</div>
</div></body></html>`;
}

export async function POST(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { id, status, tracking_number, tracking_carrier } = body;
  if (!id || !status) return NextResponse.json({ error: 'id + status required' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Load current invoice
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&is_invoice=eq.true&select=*&limit=1`,
    { headers, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const inv = rows[0];

  const allowed = VALID_NEXT[inv.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `cannot transition ${inv.status} → ${status}` }, { status: 400 });
  }

  const patch = { status };
  if (status === 'shipped') {
    patch.shipped_at = new Date().toISOString();
    if (tracking_number) patch.tracking_number = tracking_number;
    if (tracking_carrier) patch.tracking_carrier = tracking_carrier;
  }
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();

  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(patch) },
  );
  if (!pr.ok) return NextResponse.json({ error: await pr.text() }, { status: 500 });

  // Inventory sync
  const items = inv.items || [];
  if (status === 'paid') {
    for (const it of items) {
      const sr = await fetch(
        `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=stock`,
        { headers, cache: 'no-store' },
      );
      const srd = sr.ok ? await sr.json() : [];
      if (!srd.length) continue;
      const newStock = Math.max(0, (Number(srd[0].stock) || 0) - (it.qty || 1));
      await fetch(
        `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ stock: newStock }),
        },
      );
    }
  }
  if (status === 'cancelled' && ['paid', 'shipped'].includes(inv.status)) {
    for (const it of items) {
      const sr = await fetch(
        `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}&select=stock`,
        { headers, cache: 'no-store' },
      );
      const srd = sr.ok ? await sr.json() : [];
      if (!srd.length) continue;
      const newStock = (Number(srd[0].stock) || 0) + (it.qty || 1);
      await fetch(
        `${SUPABASE_URL}/rest/v1/products?sku=eq.${encodeURIComponent(it.sku)}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ stock: newStock }),
        },
      );
    }
  }

  // Customer emails — skip if email is a placeholder (invoice had no real customer email)
  const hasRealEmail = inv.email && !inv.email.endsWith('@invoice.local');
  const publicUrl = `https://www.advncelabs.com/invoice/${inv.id.slice(0, 8)}`;
  if (status === 'shipped' && hasRealEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: inv.email,
          subject: `Your advnce labs order has shipped.`,
          html: shippedEmailHtml({
            firstName: inv.first_name || '',
            invoiceId: inv.invoice_id,
            carrier: tracking_carrier || inv.tracking_carrier,
            trackingNumber: tracking_number || inv.tracking_number,
            publicUrl,
          }),
        }),
      });
    } catch (e) {
      console.error('ship email error:', e);
    }
  }
  if (status === 'cancelled' && hasRealEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND}` },
        body: JSON.stringify({
          from: 'advnce labs <orders@advncelabs.com>',
          to: inv.email,
          subject: `About your advnce labs order ${inv.invoice_id}`,
          html: cancelEmailHtml({
            firstName: inv.first_name || '',
            invoiceId: inv.invoice_id,
            totalCents: Math.round((inv.total || 0) * 100),
          }),
        }),
      });
    } catch (e) {
      console.error('cancel email error:', e);
    }
  }

  return NextResponse.json({ ok: true, status, id });
}
