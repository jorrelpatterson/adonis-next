// app/api/admin/news/candidates/[id]/flag/route.js
// Toggle flagged_for_curate on a news_candidates row. Body: { flagged: boolean }.
// Sunday curator picks flagged candidates FIRST, fills remaining slots normally.

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const body = await request.json().catch(() => ({}));
  const flagged = body.flagged === true;

  const patch = flagged
    ? { flagged_for_curate: true,  flagged_at: new Date().toISOString() }
    : { flagged_for_curate: false, flagged_at: null };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/news_candidates?id=eq.${params.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: 500 });
  }
  return NextResponse.json({ ok: true, flagged });
}
