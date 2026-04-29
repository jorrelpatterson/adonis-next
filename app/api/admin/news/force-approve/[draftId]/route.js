// app/api/admin/news/force-approve/[draftId]/route.js
// Move a draft from needs_legal_review → ready_for_review.
// Renders if not yet rendered.

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

  await sb(`/post_drafts?id=eq.${params.draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'rendering',
      needs_legal_review: false,
      image_urls: null,
    }),
  });
  await renderDraft(params.draftId);
  return NextResponse.json({ ok: true });
}
