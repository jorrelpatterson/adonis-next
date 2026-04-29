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

export function normalizeItem(raw, source) {
  if (!raw || !raw.title || !raw.link) return null;
  const published = raw.isoDate || raw.pubDate;
  return {
    source_url: raw.link,
    source_name: source.name,
    tier: source.tier,
    topic_tags: source.topic_tags || [],
    title: raw.title.trim(),
    raw_content: (raw.contentSnippet || raw.content || '').slice(0, 2000),
    published_at: published ? new Date(published).toISOString() : null,
  };
}

export async function fetchRss(source) {
  const feed = await parser.parseURL(source.url);
  const items = (feed.items || [])
    .map((it) => normalizeItem(it, source))
    .filter(Boolean);
  return items;
}
