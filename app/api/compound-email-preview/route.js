import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';
import { renderCompoundEmail } from '../../../lib/renderCompoundEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;
  const id = new URL(request.url).searchParams.get('id');
  if (!UUID_RE.test(String(id || ''))) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${id}&select=*&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  const [draft] = await r.json();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  const baseUrl = new URL(request.url).origin;
  const html = renderCompoundEmail(draft, 'preview@advncelabs.com', baseUrl);
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
