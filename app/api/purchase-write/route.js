import { NextResponse } from 'next/server';
import { renderPoEmail } from '../../../lib/po-email-template.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function nextPoNumber(SUPABASE_URL, headers) {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?po_number=like.${prefix}*&select=po_number&order=po_number.desc&limit=1`, { headers });
  const rows = await r.json();
  let next = 1;
  if (Array.isArray(rows) && rows.length) {
    const seq = parseInt(rows[0].po_number.slice(prefix.length), 10);
    if (!isNaN(seq)) next = seq + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function sendPoEmail({ po, vendor, items, RESEND, SHIPPING_ADDRESS }) {
  if (!vendor.contact_email) throw new Error(`Vendor "${vendor.name}" has no contact_email`);
  if (!RESEND) throw new Error('RESEND_API_KEY missing');
  const html = renderPoEmail({ po, vendor, items, shipping_address: SHIPPING_ADDRESS });
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND}` },
    body: JSON.stringify({
      from: 'advnce labs <orders@advncelabs.com>',
      to: vendor.contact_email,
      bcc: 'jorrelpatterson@gmail.com',
      reply_to: 'orders@advncelabs.com',
      subject: `Purchase Order ${po.po_number} — advnce labs`,
      html,
    }),
  });
  if (!r.ok) throw new Error('Resend error: ' + await r.text());
}

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND = process.env.RESEND_API_KEY;
  const SHIPPING_ADDRESS = process.env.SHIPPING_ADDRESS;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, id, vendor_id, items, notes } = body || {};
  if (!['create','update','submit','resend','cancel','close'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  // CREATE — draft PO + line items
  if (action === 'create') {
    if (!UUID_RE.test(String(vendor_id || ''))) return NextResponse.json({ error: 'Invalid vendor_id' }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items array required' }, { status: 400 });
    if (items.length > 100) return NextResponse.json({ error: 'Max 100 line items' }, { status: 400 });

    const total = items.reduce((s, i) => s + Number(i.qty_ordered) * Number(i.unit_cost), 0);
    const draftNumber = `DRAFT-${Date.now()}`;
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ po_number: draftNumber, vendor_id, status: 'draft', total_cost: total, notes: notes || null }),
    });
    if (!poRes.ok) return NextResponse.json({ error: 'PO create failed', detail: await poRes.text() }, { status: 500 });
    const [po] = await poRes.json();

    const lines = items.map(i => ({
      po_id: po.id, product_id: parseInt(i.product_id, 10),
      qty_ordered: parseInt(i.qty_ordered, 10), unit_cost: Number(i.unit_cost),
    }));
    const linesRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items`, {
      method: 'POST', headers, body: JSON.stringify(lines),
    });
    if (!linesRes.ok) return NextResponse.json({ error: 'Line items failed', detail: await linesRes.text() }, { status: 500 });

    return NextResponse.json({ success: true, po });
  }

  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  // UPDATE — only allowed while draft. Replaces line items wholesale.
  if (action === 'update') {
    const poUrl = `${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*`;
    const poRes = await fetch(poUrl, { headers });
    const [existing] = await poRes.json();
    if (!existing) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (existing.status !== 'draft') return NextResponse.json({ error: 'Can only edit draft POs' }, { status: 400 });

    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items array required' }, { status: 400 });
    const total = items.reduce((s, i) => s + Number(i.qty_ordered) * Number(i.unit_cost), 0);

    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${id}`, { method: 'DELETE', headers });
    const lines = items.map(i => ({
      po_id: id, product_id: parseInt(i.product_id, 10),
      qty_ordered: parseInt(i.qty_ordered, 10), unit_cost: Number(i.unit_cost),
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items`, { method: 'POST', headers, body: JSON.stringify(lines) });
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ vendor_id: vendor_id || existing.vendor_id, total_cost: total, notes: notes ?? existing.notes }),
    });
    return NextResponse.json({ success: true });
  }

  // SUBMIT — assign po_number, update status, send email; rollback on email failure
  if (action === 'submit') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(*),items:purchase_order_items(*,product:products(sku,name,size))`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (po.status !== 'draft') return NextResponse.json({ error: 'Only draft POs can be submitted' }, { status: 400 });
    let poNumber;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        poNumber = await nextPoNumber(SUPABASE_URL, headers);
        const now = new Date().toISOString();
        const upd = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ po_number: poNumber, status: 'submitted', submitted_at: now, last_emailed_at: now }),
        });
        if (upd.ok) break;
        if (attempt === 1) return NextResponse.json({ error: 'PO number conflict' }, { status: 500 });
      } catch (e) {
        if (attempt === 1) return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (po.vendor?.contact_email) {
      try {
        await sendPoEmail({
          po: { ...po, po_number: poNumber },
          vendor: po.vendor,
          items: po.items.map(i => ({ ...i.product, qty_ordered: i.qty_ordered, unit_cost: i.unit_cost })),
          RESEND, SHIPPING_ADDRESS,
        });
      } catch (e) {
        await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ status: 'draft', submitted_at: null, last_emailed_at: null }),
        });
        return NextResponse.json({ error: 'Email failed (PO reverted to draft): ' + e.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, po_number: poNumber, emailed: true });
    }

    // No email on file — vendor uses WhatsApp/other. Mark submitted but return whatsapp_only flag.
    return NextResponse.json({ success: true, po_number: poNumber, emailed: false, whatsapp_only: true });
  }

  // RESEND email (only for submitted/partial)
  if (action === 'resend') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(*),items:purchase_order_items(*,product:products(sku,name,size))`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (!['submitted','partial'].includes(po.status)) return NextResponse.json({ error: 'Cannot resend in current status' }, { status: 400 });
    if (!po.vendor?.contact_email) return NextResponse.json({ error: 'Vendor has no email — use the Copy as WhatsApp button instead.' }, { status: 400 });
    try {
      await sendPoEmail({
        po, vendor: po.vendor,
        items: po.items.map(i => ({ ...i.product, qty_ordered: i.qty_ordered, unit_cost: i.unit_cost })),
        RESEND, SHIPPING_ADDRESS,
      });
      await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ last_emailed_at: new Date().toISOString() }),
      });
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json({ error: 'Resend failed: ' + e.message }, { status: 500 });
    }
  }

  // CANCEL — works on draft or submitted (not received)
  if (action === 'cancel') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=status`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (['received','cancelled'].includes(po.status)) return NextResponse.json({ error: `Cannot cancel ${po.status} PO` }, { status: 400 });
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'cancelled' }),
    });
    return NextResponse.json({ success: true });
  }

  // CLOSE — force partial → received (vendor short-shipped permanently)
  if (action === 'close') {
    const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=status`, { headers });
    const [po] = await poRes.json();
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    if (po.status !== 'partial') return NextResponse.json({ error: 'Can only close partial POs' }, { status: 400 });
    const now = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'received', received_at: now, closed_at: now }),
    });
    return NextResponse.json({ success: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'purchase-write route is live' });
}
