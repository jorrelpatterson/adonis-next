// app/api/admin/news/update-caption/[draftId]/route.js
// PATCH inline caption edit from the admin UI.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function PATCH(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const body = await request.json();
  if (typeof body.caption !== 'string') {
    return NextResponse.json({ error: 'caption required' }, { status: 400 });
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ caption: body.caption }),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
  return NextResponse.json({ ok: true });
}
