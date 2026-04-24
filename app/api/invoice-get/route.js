import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const invoice = rows[0];

  invoice.image_url = invoice.invoice_image_path
    ? `${SUPABASE_URL}/storage/v1/object/public/invoices/${encodeURIComponent(invoice.invoice_image_path)}`
    : null;
  invoice.public_url = `https://www.advncelabs.com/invoice/${invoice.id.slice(0, 8)}`;

  return NextResponse.json({ invoice });
}
