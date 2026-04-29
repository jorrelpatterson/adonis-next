// lib/news/scrape.js
// Orchestrator: pull all RSS sources + PubMed, dedupe by URL,
// upsert into news_candidates, update source_health.

import { RSS_SOURCES, PUBMED_QUERY } from './sources.js';
import { fetchRss } from './rss.js';
import { fetchPubmed } from './pubmed.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
      ...(init.headers || {}),
    },
  });
}

async function recordHealth(name, ok, error) {
  const now = new Date().toISOString();
  // Read current row
  const cur = await sb(`/source_health?source_name=eq.${encodeURIComponent(name)}&select=consecutive_failures`);
  const rows = await cur.json();
  const prev = (rows && rows[0] && rows[0].consecutive_failures) || 0;
  const body = ok
    ? { source_name: name, last_success_at: now, consecutive_failures: 0,
        last_error_at: null, last_error_message: null }
    : { source_name: name, last_error_at: now, last_error_message: String(error).slice(0, 500),
        consecutive_failures: prev + 1 };
  await sb(`/source_health`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(body),
  });
}

async function insertCandidates(items) {
  if (items.length === 0) return 0;
  // Filter to status=new defaults (DB enforces source_url unique → on conflict do nothing)
  const res = await sb(`/news_candidates`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(items.map((it) => ({ ...it, scraped_at: new Date().toISOString() }))),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`insert candidates failed: ${res.status} ${t}`);
  }
  const inserted = await res.json();
  return Array.isArray(inserted) ? inserted.length : 0;
}

async function maybeAlertAllATierDown() {
  const res = await sb(`/source_health?select=source_name,consecutive_failures&consecutive_failures=gte.3`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return;
  // Only A-tier names matter; cross-reference with the roster
  const aTierNames = new Set([...RSS_SOURCES, PUBMED_QUERY].filter((s) => s.tier === 'A').map((s) => s.name));
  const downA = rows.filter((r) => aTierNames.has(r.source_name));
  if (downA.length < aTierNames.size) return; // some A-tier still working
  // All A-tier down — send email
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'advnce news <news@advncelabs.com>',
      to: process.env.ADMIN_EMAIL,
      subject: '[advnce news] All A-tier sources are down',
      text: `All A-tier news sources have failed 3+ times in a row.\n\nDown sources:\n${downA.map((r) => '- ' + r.source_name).join('\n')}\n\nCheck /admin/marketing/news for source-health detail.`,
    }),
  });
}

export async function runScrape() {
  let totalInserted = 0;
  const errors = [];

  // RSS sources
  for (const src of RSS_SOURCES) {
    try {
      const items = await fetchRss(src);
      const n = await insertCandidates(items);
      await recordHealth(src.name, true);
      totalInserted += n;
    } catch (e) {
      errors.push({ source: src.name, error: String(e.message || e) });
      await recordHealth(src.name, false, e);
    }
  }

  // PubMed
  try {
    const items = await fetchPubmed(PUBMED_QUERY);
    const enriched = items.map((it) => ({ ...it, topic_tags: PUBMED_QUERY.topic_tags }));
    const n = await insertCandidates(enriched);
    await recordHealth(PUBMED_QUERY.name, true);
    totalInserted += n;
  } catch (e) {
    errors.push({ source: PUBMED_QUERY.name, error: String(e.message || e) });
    await recordHealth(PUBMED_QUERY.name, false, e);
  }

  await maybeAlertAllATierDown();
  return { inserted: totalInserted, errors };
}
