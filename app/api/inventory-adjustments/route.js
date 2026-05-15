import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku');
  const reason = searchParams.get('reason');
  const limit = Math.min(parseInt(searchParams.get('limit'), 10) || 200, 1000);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const parts = [`select=*,product:products(name,size,sku)`, `order=created_at.desc`, `limit=${limit}`];
  if (sku) parts.push(`sku=eq.${encodeURIComponent(sku)}`);
  if (reason) parts.push(`reason=eq.${encodeURIComponent(reason)}`);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/inventory_adjustments?${parts.join('&')}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  return NextResponse.json({ adjustments: await r.json() });
}
