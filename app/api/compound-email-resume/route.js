import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headers() { return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }; }

export async function POST(request) {
  const unauth = requireRole(request, 'admin');
  if (unauth) return unauth;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { draft_id } = body || {};
  if (!UUID_RE.test(String(draft_id || ''))) return NextResponse.json({ error: 'Invalid draft_id' }, { status: 400 });

  const r1 = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_recipients?draft_id=eq.${draft_id}&status=eq.failed`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'pending', error: null }),
  });
  if (!r1.ok) return NextResponse.json({ error: 'Re-queue failed' }, { status: 500 });

  await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${draft_id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'sending' }),
  });

  return NextResponse.json({ success: true });
}
