// app/api/admin/news/flip-color/[draftId]/route.js
// Toggle accent_color (teal ↔ amber), re-render the cover slide only.
// To keep the implementation simple in v1, re-render ALL 4 slides.
// (Cover slide is the only one affected, but render.js does all 4 atomically.)

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { renderDraft } from '../../../../../../lib/news/render';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 120;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=accent_color`);
  const rows = await dRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const next = rows[0].accent_color === 'teal' ? 'amber' : 'teal';
  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ accent_color: next, status: 'rendering', image_urls: null }),
  });
  await renderDraft(params.draftId);
  return NextResponse.json({ ok: true, accent_color: next });
}
