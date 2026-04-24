import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('q');

  const parts = ['is_invoice=eq.true', 'order=created_at.desc', 'limit=200'];
  if (status && status !== 'all') parts.push(`status=eq.${encodeURIComponent(status)}`);
  const qs = parts.join('&') + '&select=id,invoice_id,first_name,last_name,email,phone,total,status,created_at,tracking_number,items,invoice_image_path';

  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?${qs}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  let rows = await r.json();

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((o) =>
      (`${o.first_name || ''} ${o.last_name || ''}`).toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q) ||
      (o.invoice_id || '').toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ invoices: rows });
}
