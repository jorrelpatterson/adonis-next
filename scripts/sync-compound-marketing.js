#!/usr/bin/env node
// Mirror docs/marketing/peptide-for-that-campaign.md into the compound_marketing
// Supabase table. Idempotent — re-runnable. The .md remains the human-editable
// source of truth.
//
// Run: node scripts/sync-compound-marketing.js

const fs = require('fs');
const path = require('path');

if (fs.existsSync('/tmp/advnce.env')) {
  for (const line of fs.readFileSync('/tmp/advnce.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' };

const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'marketing', 'peptide-for-that-campaign.md'), 'utf8');

// Parse category sections like "### Cognitive" and table rows beneath.
const rows = [];
const lines = md.split('\n');
let currentCategory = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const catMatch = line.match(/^### (.+?)(?: — IG-blocked.*)?$/);
  if (catMatch && !line.startsWith('### Compounds') && !line.startsWith('### Hook')) {
    currentCategory = catMatch[1].trim();
    continue;
  }
  // Table row: | Hook | Compound | Research angle | Citation | Mod risk |
  if (!currentCategory) continue;
  if (!line.startsWith('|') || line.startsWith('|---') || line.match(/\|\s*Hook\s*\|/)) continue;

  const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  if (cells.length < 2) continue;

  const hook = cells[0];
  const compoundName = cells[1];
  const researchAngle = cells[2] || '';
  const citationPrimary = cells[3] || '';
  const modRisk = cells[4] || '';

  if (!compoundName || compoundName === 'Compound') continue;

  // The weight-loss section uses a different table shape: | Hook | Compound | Channel |
  const isWeightLoss = currentCategory === 'Weight Loss';
  const igBlocked = isWeightLoss;

  // Slug: lowercase compound name, replace non-alphanumeric with -, collapse, trim.
  const slug = compoundName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  rows.push({
    compound_slug: slug,
    compound_name: compoundName,
    sku: null,                              // populated manually later — no SKU info in the .md
    category: currentCategory,
    subcategory: null,                      // optional refinement
    hook,
    research_angle: researchAngle,
    citation_primary: citationPrimary,
    mod_risk: modRisk || null,
    ig_blocked: igBlocked,
    product_url: null,                      // populated manually later
    updated_at: new Date().toISOString(),
  });
}

console.log(`Parsed ${rows.length} compound rows from peptide-for-that-campaign.md`);

// Deduplicate by compound_slug within a batch: same compound may appear under
// multiple hooks (e.g. BPC-157 for knees AND gut). Keep the last occurrence so
// we don't send two rows with the same slug in one POST — Supabase's
// ON CONFLICT DO UPDATE rejects intra-batch duplicates.
// We keep all rows but when multiple share a slug, concatenate their hooks.
const slugMap = new Map();
for (const row of rows) {
  if (slugMap.has(row.compound_slug)) {
    const existing = slugMap.get(row.compound_slug);
    // Merge hook (append if different)
    if (!existing.hook.includes(row.hook)) {
      existing.hook = existing.hook + ' / ' + row.hook;
    }
    // Keep first research_angle/citation unless empty
    if (!existing.research_angle && row.research_angle) existing.research_angle = row.research_angle;
    if (!existing.citation_primary && row.citation_primary) existing.citation_primary = row.citation_primary;
  } else {
    slugMap.set(row.compound_slug, { ...row });
  }
}
const deduped = Array.from(slugMap.values());
console.log(`  (${rows.length - deduped.length} duplicate slugs merged → ${deduped.length} unique rows)`);

(async () => {
  // Upsert in batches of 50.
  for (let i = 0; i < deduped.length; i += 50) {
    const batch = deduped.slice(i, i + 50);
    const res = await fetch(`${URL}/rest/v1/compound_marketing?on_conflict=compound_slug`, {
      method: 'POST', headers, body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error('Upsert failed:', res.status, await res.text());
      process.exit(1);
    }
    console.log(`  upserted ${i + batch.length}/${deduped.length}`);
  }
  console.log('Done.');
})();
