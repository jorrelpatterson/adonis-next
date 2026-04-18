import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIT_VIALS = 10;

export async function POST(request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { po_id, receipts } = body || {};
  if (!UUID_RE.test(String(po_id || ''))) return NextResponse.json({ error: 'Invalid po_id' }, { status: 400 });
  if (!Array.isArray(receipts) || !receipts.length) return NextResponse.json({ error: 'receipts array required' }, { status: 400 });

  const headers = {
    'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  const poRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${po_id}&select=*,vendor:vendors(name),items:purchase_order_items(*)`, { headers });
  const [po] = await poRes.json();
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });
  if (!['submitted','partial'].includes(po.status)) return NextResponse.json({ error: `Cannot receive against ${po.status} PO` }, { status: 400 });

  for (const rcpt of receipts) {
    if (!UUID_RE.test(String(rcpt.item_id || ''))) return NextResponse.json({ error: 'Invalid item_id' }, { status: 400 });
    const recvNow = parseInt(rcpt.receive_now, 10);
    if (isNaN(recvNow) || recvNow < 0) return NextResponse.json({ error: 'Invalid receive_now' }, { status: 400 });
    if (recvNow === 0) continue;

    const line = po.items.find(i => i.id === rcpt.item_id);
    if (!line) return NextResponse.json({ error: `item_id ${rcpt.item_id} not in PO` }, { status: 400 });

    const newQtyReceived = (line.qty_received || 0) + recvNow;
    const unitCost = (typeof rcpt.unit_cost === 'number' && rcpt.unit_cost >= 0) ? rcpt.unit_cost : line.unit_cost;

    await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?id=eq.${line.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        qty_received: newQtyReceived,
        unit_cost: unitCost,
        received_at: line.received_at || new Date().toISOString(),
      }),
    });

    const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}&select=stock`, { headers });
    const [prod] = await prodRes.json();
    if (!prod) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${line.product_id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({
        stock: (prod.stock || 0) + recvNow * KIT_VIALS,
        cost: unitCost,
        vendor: po.vendor.name,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  const updatedLinesRes = await fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${po_id}&select=qty_ordered,qty_received`, { headers });
  const updatedLines = await updatedLinesRes.json();
  const allComplete = updatedLines.every(l => (l.qty_received || 0) >= l.qty_ordered);
  const newStatus = allComplete ? 'received' : 'partial';
  const patch = { status: newStatus };
  if (allComplete && !po.received_at) patch.received_at = new Date().toISOString();
  await fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${po_id}`, {
    method: 'PATCH', headers, body: JSON.stringify(patch),
  });

  return NextResponse.json({ success: true, status: newStatus });
}

export async function GET() {
  return NextResponse.json({ status: 'purchase-receive route is live' });
}
