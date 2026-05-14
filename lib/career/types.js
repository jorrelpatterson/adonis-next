// lib/career/types.js
//
// JSDoc typedefs for the career module. Adonis-next is JS-only (per CLAUDE.md),
// so we lean on JSDoc for documentation and editor hints.

/**
 * @typedef {'greenhouse' | 'lever' | 'ashby' | 'workable' | 'adzuna' | 'jsearch'} JobSource
 */

/**
 * @typedef {Object} RawJob
 * @property {JobSource} source
 * @property {string} [source_id]
 * @property {string} url
 * @property {string} title
 * @property {string} company
 * @property {string|null} [location]
 * @property {boolean} [remote]
 * @property {number|null} [salary_min]
 * @property {number|null} [salary_max]
 * @property {string} [salary_currency]
 * @property {string|null} [description]
 * @property {string|null} [posted_at]  // ISO timestamp
 * @property {unknown} [raw]            // original payload for debugging
 */

/**
 * @typedef {Object} IngestSummary
 * @property {JobSource} source
 * @property {number} fetched
 * @property {number} inserted
 * @property {number} duplicates
 * @property {number} pre_filtered
 * @property {string[]} errors
 */

/**
 * Map a remote flag + location string to the canonical remote_type enum.
 * @param {boolean|undefined} remoteFlag
 * @param {string|null|undefined} location
 * @returns {'remote'|'hybrid'|'onsite'|null}
 */
export function deriveRemoteType(remoteFlag, location) {
  const loc = (location || '').toLowerCase();
  if (remoteFlag || /\bremote\b/.test(loc)) return 'remote';
  if (/\bhybrid\b/.test(loc)) return 'hybrid';
  if (loc.trim()) return 'onsite';
  return null;
}

export {};
