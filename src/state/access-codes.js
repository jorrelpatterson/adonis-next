// src/state/access-codes.js
const ACCESS_CODES = {
  'FOUNDER': { tier: 'elite', name: 'Founder Access', expires: null },
  'ADONIS2026': { tier: 'pro', name: 'Beta Tester', expires: '2026-12-31' },
};

/**
 * Validate an access code and return the tier it grants.
 * Returns null if invalid or expired.
 */
export function validateAccessCode(code) {
  const entry = ACCESS_CODES[(code || '').toUpperCase().trim()];
  if (!entry) return null;
  if (entry.expires && new Date(entry.expires) < new Date()) return null;
  return entry;
}
