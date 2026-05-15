// app/api/cron/news-scrape/route.js
// Daily scraper. Invoked by Vercel Cron (CRON_SECRET Bearer) or
// manually from /admin/marketing/news ("Run scrape now" button).

import { NextResponse } from 'next/server';
import { requireAdminOrCron } from '../../../../lib/requireAdminOrCron';
import { runScrape } from '../../../../lib/news/scrape';

export const maxDuration = 60; // RSS + PubMed needs > 10s default

export async function POST(request) {
  const guard = requireAdminOrCron(request);
  if (guard) return guard;
  try {
    const result = await runScrape();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

// Allow GET for cron (Vercel sends GET by default for crons)
export const GET = POST;
