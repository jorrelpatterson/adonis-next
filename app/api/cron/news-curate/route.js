// app/api/cron/news-curate/route.js
// Weekly curator. Runs Sunday 8pm PT (cron) or manual admin trigger.
// After picks are inserted, kicks off render for each new draft.

import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { runCurator } from '../../../../lib/news/curator';
import { renderDraft } from '../../../../lib/news/render';

export const maxDuration = 300; // curator + 3 renders can take time

export async function POST(request) {
  const guard = requireAdminOrCron(request);
  if (guard) return guard;
  try {
    const result = await runCurator();
    // Auto-render each new draft (non-blocking would be nicer, but Vercel
    // doesn't reliably support background work — render serially)
    const renderResults = [];
    for (const id of (result.draft_ids || [])) {
      try {
        await renderDraft(id);
        renderResults.push({ id, ok: true });
      } catch (e) {
        renderResults.push({ id, ok: false, error: String(e.message || e) });
      }
    }
    return NextResponse.json({ ok: true, ...result, renders: renderResults });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

export const GET = POST;
