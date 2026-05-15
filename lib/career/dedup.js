// lib/career/dedup.js
//
// Aggressive content-hash for collapsing the same job posted to multiple boards.
// hash = sha256(company | title | state-or-remote), truncated to 32 hex chars.
// Lifted from jorrel-os/lib/dedupe.ts and translated to JS.

import { createHash } from 'node:crypto';

const STATE_PATTERN = /\b([A-Z]{2})\b/;

function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractState(loc) {
  if (!loc) return '';
  const m = loc.match(STATE_PATTERN);
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {import('./types.js').RawJob} job
 * @returns {string} 32-char hex
 */
export function dedupHash(job) {
  const company = normalize(job.company);
  const title = normalize(job.title);
  const region = job.remote ? 'remote' : extractState(job.location);
  const key = `${company}|${title}|${region}`;
  return createHash('sha256').update(key).digest('hex').slice(0, 32);
}
