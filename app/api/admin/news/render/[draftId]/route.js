// app/api/admin/news/render/[draftId]/route.js
// Manually trigger render for a draft (admin retry button).

import { NextResponse } from 'next/server';
import { requireRole } from '../../../../../../lib/requireAdmin';
import { renderDraft } from '../../../../../../lib/news/render';

export const maxDuration = 120;

export async function POST(request, { params }) {
  const guard = requireRole(request, 'admin', 'va');
  if (guard) return guard;
  try {
    const result = await renderDraft(params.draftId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
