// app/api/cron/career/ingest/route.js
//
// Daily cron — runs at 0 14 * * * UTC (6am PT).
// Pulls from all 6 sources in parallel, dedupes, applies pre-filter,
// upserts new rows into career_jobs.
//
// Auth: either Vercel cron user-agent OR Bearer CRON_SECRET header.

import { NextResponse } from 'next/server';
import { fetchGreenhouse } from '../../../../../lib/career/sources/greenhouse.js';
import { fetchLever } from '../../../../../lib/career/sources/lever.js';
import { fetchAshby } from '../../../../../lib/career/sources/ashby.js';
import { fetchWorkable } from '../../../../../lib/career/sources/workable.js';
import { fetchAdzuna } from '../../../../../lib/career/sources/adzuna.js';
import { fetchJSearch } from '../../../../../lib/career/sources/jsearch.js';
import { dedupHash } from '../../../../../lib/career/dedup.js';
import { shouldExcludeByTitle } from '../../../../../lib/career/pre-filter.js';
import { deriveRemoteType } from '../../../../../lib/career/types.js';
import { getCareerSupabaseAdmin } from '../../../../../lib/career/supabase.js';
import searchParams from '../../../../../config/career-search-params.json' with { type: 'json' };

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

const SOURCE_PRIORITY = {
  greenhouse: 4,
  lever: 3,
  ashby: 3,
  workable: 3,
  adzuna: 2,
  jsearch: 1,
};

export async function GET(req) {
  // Auth — fail closed: 401 unless Vercel cron user-agent OR valid Bearer token.
  // CRON_SECRET MUST be set for non-Vercel-cron callers to authenticate.
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron');
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  const validBearer = expected && auth === `Bearer ${expected}`;
  if (!isVercelCron && !validBearer) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const summaries = [];
  const allFetched = [];

  // 1. Fan out to all sources in parallel
  const sources = [
    ['greenhouse', fetchGreenhouse],
    ['lever', fetchLever],
    ['ashby', fetchAshby],
    ['workable', fetchWorkable],
    ['adzuna', fetchAdzuna],
    ['jsearch', fetchJSearch],
  ];
  const results = await Promise.allSettled(sources.map(([, fn]) => fn()));
  results.forEach((r, i) => {
    const [source] = sources[i];
    if (r.status === 'fulfilled') {
      allFetched.push(...r.value);
      summaries.push({ source, fetched: r.value.length, inserted: 0, duplicates: 0, pre_filtered: 0, errors: [] });
    } else {
      summaries.push({ source, fetched: 0, inserted: 0, duplicates: 0, pre_filtered: 0, errors: [String(r.reason)] });
    }
  });

  // 2. Pre-filter by title (exclude obvious mismatches)
  const excludeKeywords = searchParams.filters?.exclude_title_keywords ?? [];
  const postFilter = [];
  for (const job of allFetched) {
    if (!job.title || !job.company) continue;
    const { excluded } = shouldExcludeByTitle(job.title, excludeKeywords);
    if (excluded) {
      const s = summaries.find(x => x.source === job.source);
      if (s) s.pre_filtered += 1;
      continue;
    }
    postFilter.push(job);
  }

  // 3. Dedupe — same job from multiple sources collapses to one row, prefer ATS.
  const bestByHash = new Map();
  for (const job of postFilter) {
    const hash = dedupHash(job);
    const existing = bestByHash.get(hash);
    if (!existing || SOURCE_PRIORITY[job.source] > SOURCE_PRIORITY[existing.source]) {
      bestByHash.set(hash, job);
    }
  }

  // 4. Look up which hashes already exist in DB
  const sb = getCareerSupabaseAdmin();
  const hashes = Array.from(bestByHash.keys());
  let existingSet = new Set();
  if (hashes.length) {
    const { data: existingRows } = await sb
      .from('career_jobs')
      .select('dedup_hash')
      .in('dedup_hash', hashes);
    existingSet = new Set((existingRows ?? []).map(r => r.dedup_hash));
  }

  // 5. Build new-job rows for insert
  const newRows = [];
  for (const [hash, job] of bestByHash.entries()) {
    if (existingSet.has(hash)) {
      const s = summaries.find(x => x.source === job.source);
      if (s) s.duplicates += 1;
      continue;
    }
    newRows.push({
      source: job.source,
      source_id: job.source_id ?? null,
      url: job.url,
      title: job.title,
      company: job.company,
      location: job.location ?? null,
      remote_type: deriveRemoteType(job.remote, job.location),
      comp_min: job.salary_min != null ? Math.round(job.salary_min) : null,
      comp_max: job.salary_max != null ? Math.round(job.salary_max) : null,
      comp_currency: job.salary_currency ?? 'USD',
      description: job.description ?? null,
      posted_at: job.posted_at ?? null,
      dedup_hash: hash,
      raw: job.raw ?? null,
    });
  }

  console.log(`[career/ingest] ${allFetched.length} fetched → ${postFilter.length} post-filter → ${bestByHash.size} unique → ${newRows.length} new`);

  // 6. Upsert
  if (newRows.length) {
    const { error } = await sb.from('career_jobs').upsert(newRows, {
      onConflict: 'dedup_hash',
      ignoreDuplicates: true,
    });
    if (error) {
      console.error('[career/ingest] insert failed:', error);
      return NextResponse.json({ ok: false, error: error.message, summaries }, { status: 500 });
    }
    for (const row of newRows) {
      const s = summaries.find(x => x.source === row.source);
      if (s) s.inserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    summaries,
    totals: {
      fetched: allFetched.length,
      post_filter: postFilter.length,
      unique: bestByHash.size,
      new: newRows.length,
    },
    timestamp: new Date().toISOString(),
  });
}
