import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function GET(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = 'select=*&order=created_at.desc&limit=200';
  if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
    query += `&status=eq.${status}`;
  }

  const r = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?${query}`, {
    headers: sbHeaders(),
    cache: 'no-store',
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  const tickets = await r.json();
  return NextResponse.json({ tickets });
}

export async function PATCH(request) {
  const unauth = requireAdmin(request); if (unauth) return unauth;

  const body = await request.json().catch(() => ({}));
  const { id, status, admin_notes } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch = { updated_at: new Date().toISOString() };
  if (status && ['open', 'in_progress', 'resolved'].includes(status)) patch.status = status;
  if (typeof admin_notes === 'string') patch.admin_notes = admin_notes;

  const r = await fetch(`${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  });
  if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 });
  return NextResponse.json({ success: true });
}
