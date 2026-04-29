// lib/news/rss.js
// RSS fetcher + item normalizer. Wraps rss-parser; normalizes to the
// `news_candidates` row shape so the orchestrator can insert directly.

import Parser from 'rss-parser';
import crypto from 'node:crypto';

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'advnce-labs-news-bot/1.0 (+https://advncelabs.com)' },
});

export function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

// Some feeds (FierceBiotech wraps titles in <a href>...</a>; others use CDATA)
// surface non-string title fields. Recursively flatten and strip HTML so we
// always end up with plain text.
function coerceText(v) {
  if (typeof v === 'string') {
    return v.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  }
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(coerceText).filter(Boolean).join(' ');
  if (typeof v === 'object') {
    if (typeof v._ === 'string') return coerceText(v._);
    if (typeof v['#text'] === 'string') return coerceText(v['#text']);
    // Last resort: walk all values for any string-bearing leaf.
    const parts = Object.values(v).map(coerceText).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return '';
}

// Some feeds (e.g. FierceBiotech: "Apr 29, 2026 9:34am") use non-standard
// date strings that throw on .toISOString(). Return null on any parse failure.
function safeDateISO(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  try { return d.toISOString(); } catch { return null; }
}

export function normalizeItem(raw, source) {
  if (!raw) return null;
  const title = coerceText(raw.title).trim();
  const link = coerceText(raw.link).trim();
  if (!title || !link) return null;
  return {
    source_url: link,
    source_name: source.name,
    tier: source.tier,
    topic_tags: source.topic_tags || [],
    title,
    raw_content: coerceText(raw.contentSnippet || raw.content || '').slice(0, 2000),
    published_at: safeDateISO(raw.isoDate || raw.pubDate),
  };
}

export async function fetchRss(source) {
  const feed = await parser.parseURL(source.url);
  const items = (feed.items || [])
    .map((it) => normalizeItem(it, source))
    .filter(Boolean);
  return items;
}
