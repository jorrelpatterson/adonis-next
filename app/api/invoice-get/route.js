import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const ambassadorCode = searchParams.get('ambassador_code');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Auth: either an admin cookie, or an ambassador_code query param. If an
  // ambassador code is supplied, validate it and only return the invoice when
  // its ref_code matches — prevents one ambassador from peeking at another's.
  let scopedAmbassadorCode = null;
  if (ambassadorCode) {
    const codeClean = String(ambassadorCode).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(codeClean)) {
      return NextResponse.json({ error: 'invalid ambassador_code' }, { status: 400 });
    }
    const ar = await fetch(
      `${SUPABASE_URL}/rest/v1/ambassadors?code=eq.${encodeURIComponent(codeClean)}&select=code,status&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
    );
    if (!ar.ok) return NextResponse.json({ error: 'ambassador lookup failed' }, { status: 500 });
    const arows = await ar.json();
    if (!arows.length) return NextResponse.json({ error: 'unknown ambassador code' }, { status: 401 });
    if (arows[0].status && arows[0].status !== 'active') {
      return NextResponse.json({ error: `ambassador is ${arows[0].status}` }, { status: 403 });
    }
    scopedAmbassadorCode = arows[0].code;
  } else {
    const unauth = requireAdmin(request); if (unauth) return unauth;
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const rows = await r.json();
  if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const invoice = rows[0];

  if (scopedAmbassadorCode && invoice.ref_code !== scopedAmbassadorCode) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  invoice.image_url = invoice.invoice_image_path
    ? `${SUPABASE_URL}/storage/v1/object/public/invoices/${encodeURIComponent(invoice.invoice_image_path)}`
    : null;

  // Public URL format: /invoice/<seq>-<uuid-short>
  // Parses seq from invoice_id ("AVL-INV-0001" → "0001"). Unguessable thanks
  // to the UUID suffix; readable thanks to the sequence number prefix.
  const seq = invoice.invoice_id ? invoice.invoice_id.split('-').pop() : invoice.id.slice(0, 4);
  const uuidShort = invoice.id.slice(0, 8);
  invoice.public_url = `https://www.advncelabs.com/invoice/${seq}-${uuidShort}`;

  return NextResponse.json({ invoice });
}
