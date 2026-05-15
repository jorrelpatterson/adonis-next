// lib/career/pre-filter.js
//
// Drop obvious-mismatch listings before they reach the scorer.
// Scoring is the expensive step; pre-filter saves ~45% on the firehose per
// jorrel-os doc pattern #7.

/**
 * @param {string|null|undefined} title
 * @param {string[]} excludeKeywords  — case-insensitive substring match
 * @returns {{excluded: boolean, matchedKeyword: string|null}}
 */
export function shouldExcludeByTitle(title, excludeKeywords) {
  if (!title) return { excluded: true, matchedKeyword: '(empty title)' };
  const lower = title.toLowerCase();
  for (const kw of excludeKeywords || []) {
    if (!kw) continue;
    if (lower.includes(kw.toLowerCase())) {
      return { excluded: true, matchedKeyword: kw };
    }
  }
  return { excluded: false, matchedKeyword: null };
}
