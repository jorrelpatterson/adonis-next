// scripts/generate-wholesale-sheet.mjs
// Regenerates wholesale-pricing-template.html from the live Supabase products table.
// Run: node scripts/generate-wholesale-sheet.mjs
// Output: wholesale-pricing-template.html (gitignored)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load .env.local manually (no dotenv dep needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const envText = readFileSync(join(ROOT, '.env.local'), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ''); // strip optional quotes
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('Fetching products from Supabase...');
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/products?select=name,size,cat,cost,retail,sku&active=eq.true&order=cat,name`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
);
if (!res.ok) {
  console.error(`Supabase fetch failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}
const products = await res.json();
console.log(`  Fetched ${products.length} active products`);

// Group by name+size, pick lowest-cost SKU per group
const groups = new Map();
for (const p of products) {
  if (!p.retail || Number(p.retail) <= 0) continue;
  const key = `${p.name} · ${p.size}`;
  const existing = groups.get(key);
  if (!existing || (Number(p.cost) || Infinity) < (Number(existing.cost) || Infinity)) {
    groups.set(key, { ...p, displayKey: key });
  }
}

// Group those by category
const byCat = {};
for (const g of groups.values()) {
  (byCat[g.cat] ||= []).push(g);
}
for (const cat of Object.keys(byCat)) {
  byCat[cat].sort((a, b) => a.displayKey.localeCompare(b.displayKey));
}

// ─── Six-tier pricing cascade ─────────────────────────────────────────────────
// Tiers: A 10–90 · B 100–190 · C 200–290 · D 300–390 · E 400–490 · F 500+
// Retail-anchored discount ladder: A 50% off → F cost+$4
function priceTiers(cost, retail) {
  const c = (Number(cost) || 0) / 10;  // DB stores cost per 10-pack; convert to per-vial
  const r = Number(retail) || 0;

  // Raw formulas — accelerating % off retail ladder
  let a = r * 0.50;          // 50% off retail
  let b = r * 0.40;          // 60% off retail
  let cTier = r * 0.35;      // 65% off retail
  let d = r * 0.25;          // 75% off retail
  let e = r * 0.20;          // 80% off retail
  let f = r * 0.10;          // 90% off retail

  // Floor: every tier >= cost + $4
  const floor = c + 4;
  a = Math.max(a, floor);
  b = Math.max(b, floor);
  cTier = Math.max(cTier, floor);
  d = Math.max(d, floor);
  e = Math.max(e, floor);
  f = Math.max(f, floor);

  // Cap: every tier <= retail x 0.95
  const cap = r * 0.95;
  if (cap > 0) {
    a = Math.min(a, cap);
    b = Math.min(b, cap);
    cTier = Math.min(cTier, cap);
    d = Math.min(d, cap);
    e = Math.min(e, cap);
    f = Math.min(f, cap);
  }

  // Enforce non-increasing order: A >= B >= C >= D >= E >= F
  // Walk F -> A. If a tier is lower than the one to its right, bring it up.
  e = Math.max(e, f);
  d = Math.max(d, e);
  cTier = Math.max(cTier, d);
  b = Math.max(b, cTier);
  a = Math.max(a, b);

  // Viability: drop products where floor > cap (can't sell >=5% off retail)
  const viable = floor <= cap || cap === 0;

  return {
    a: Math.round(a),
    b: Math.round(b),
    c: Math.round(cTier),
    d: Math.round(d),
    e: Math.round(e),
    f: Math.round(f),
    viable,
  };
}

// Order categories — put highest-volume first
const CAT_ORDER = [
  'Weight Loss', 'GH', 'Longevity', 'Recovery', 'Immune',
  'Cognitive', 'Sexual Health', 'Sleep', 'Skin', 'Cosmetic',
  'Peptide Blend', 'Pharma', 'Supplies',
];
const orderedCats = [
  ...CAT_ORDER.filter((c) => byCat[c]),
  ...Object.keys(byCat).filter((c) => !CAT_ORDER.includes(c)).sort(),
];

// Filter non-viable products (floor > cap — can't sell at meaningful discount)
const nonViable = [];
for (const cat of orderedCats) {
  byCat[cat] = byCat[cat].filter((g) => {
    const t = priceTiers(g.cost, g.retail);
    if (!t.viable) {
      const cPer = (Number(g.cost) || 0) / 10;  // per-vial cost
      nonViable.push({ name: g.displayName || g.displayKey, cost: g.cost, costPer: cPer, retail: g.retail, floor: cPer + 2, cap: (Number(g.retail) || 0) * 0.95 });
      return false;
    }
    return true;
  });
}

// Render HTML and write
const today = new Date().toISOString().slice(0, 10);
const html = renderHtml({ byCat, orderedCats, today });
writeFileSync(join(ROOT, 'wholesale-pricing-template.html'), html);

const visibleCount = orderedCats.reduce((sum, cat) => sum + byCat[cat].length, 0);
console.log(`\n  Wrote wholesale-pricing-template.html`);
console.log(`  ${visibleCount} products visible across ${orderedCats.length} categories`);
if (nonViable.length) {
  console.warn(`\n  ${nonViable.length} products hidden -- cost+$2 exceeds retail x 0.95:`);
  for (const n of nonViable) {
    console.warn(`  ${n.name}: cost=$${n.costPer.toFixed(2)}/vial (DB pack: $${n.cost}), retail=$${n.retail}, floor=$${n.floor.toFixed(2)}, cap=$${n.cap.toFixed(2)}`);
  }
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dollar(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

function renderHtml({ byCat, orderedCats, today }) {
  const categorySections = orderedCats.map((cat, idx) => {
    const catNum = String(idx + 1).padStart(2, '0');
    const products = byCat[cat];
    const rows = products.map((p, rowIdx) => {
      const t = priceTiers(p.cost, p.retail);
      const evenRow = rowIdx % 2 === 0;
      return `
          <tr class="${evenRow ? 'row-even' : ''}">
            <td class="prod-name">${esc(p.name)}</td>
            <td class="prod-size">${esc(p.size)}</td>
            <td class="price retail">${dollar(p.retail)}</td>
            <td class="price ta">${dollar(t.a)}</td>
            <td class="price tb">${dollar(t.b)}</td>
            <td class="price tc">${dollar(t.c)}</td>
            <td class="price td">${dollar(t.d)}</td>
            <td class="price te">${dollar(t.e)}</td>
            <td class="price tf">${dollar(t.f)}</td>
          </tr>`;
    }).join('');

    return `
    <div class="category-block">
      <div class="cat-eyebrow">
        <span class="eyebrow-num">${catNum}</span>
        <span class="eyebrow-sep"> &mdash; </span>
        <span class="eyebrow-name">${esc(cat.toUpperCase())}</span>
      </div>
      <div class="cat-rule"></div>
      <table class="pricing-table">
        <thead>
          <tr>
            <th class="th-name">Product</th>
            <th class="th-size">Size</th>
            <th class="th-price">Retail</th>
            <th class="th-price">A</th>
            <th class="th-price">B</th>
            <th class="th-price">C</th>
            <th class="th-price">D</th>
            <th class="th-price">E</th>
            <th class="th-price tf-head">F</th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>advnce labs &mdash; Wholesale Pricing &middot; ${esc(today)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
/* ─── Reset & Base ─────────────────────────────── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}

:root {
  --cream:  #F4F2EE;
  --ink:    #1A1C22;
  --cyan:   #00A0A8;
  --amber:  #E07C24;
  --dim:    #7A7D88;
  --border: #E4E7EC;
  --ghost:  rgba(0,0,0,0.03);

  --fn: 'Barlow Condensed', Arial, sans-serif;
  --fd: 'Cormorant Garamond', Georgia, serif;
  --fm: 'JetBrains Mono', monospace;
}

html, body {
  background: var(--cream);
  color: var(--ink);
  font-family: var(--fn);
  font-size: 12pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}

.sheet {
  max-width: 9.5in;
  margin: 0 auto;
  padding: 0.45in 0.1in 0.35in;
}

/* ─── Header ────────────────────────────────────── */
.sheet-header {
  text-align: center;
  margin-bottom: 0.4in;
  padding-bottom: 24pt;
}

.logo-lockup {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12pt;
}

.logo-wordmark {
  font-family: var(--fn);
  font-weight: 300;
  font-size: 14pt;
  letter-spacing: 3px;
  color: var(--ink);
  text-transform: lowercase;
  line-height: 1;
}

.logo-wordmark .labs {
  color: var(--dim);
}

.header-rule {
  display: block;
  width: 60px;
  height: 1px;
  background: var(--cyan);
  margin: 0 auto 12pt;
}

.sheet-subhead {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--dim);
  display: inline;
}

.draft-label {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--amber);
  border-bottom: 1px solid var(--amber);
  display: inline;
  margin-left: 8px;
}

/* ─── Per-Vial Banner ───────────────────────────── */
.pvial-banner {
  margin: 0 auto 0.35in;
  max-width: 5.5in;
  text-align: center;
  border: 1px solid var(--border);
  border-left: 3px solid var(--amber);
  padding: 16pt 28pt;
}

.pvial-title {
  font-family: var(--fn);
  font-size: 16pt;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--ink);
  margin-bottom: 8pt;
}

.pvial-sub {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  color: var(--dim);
  line-height: 1.7;
}

/* ─── Tier Legend ───────────────────────────────── */
.tier-legend {
  text-align: center;
  margin: 0 auto 0.35in;
  font-size: 0;
  line-height: 2;
}

.tl-label {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--dim);
  display: block;
  margin-bottom: 6pt;
}

.tl-item {
  display: inline-block;
  margin: 0 10pt;
  white-space: nowrap;
}

.tl-letter {
  font-family: var(--fn);
  font-size: 11pt;
  font-weight: 700;
  color: var(--cyan);
  letter-spacing: 1px;
}

.tl-dot {
  font-family: var(--fm);
  font-size: 9pt;
  color: var(--dim);
  margin: 0 3px;
}

.tl-range {
  font-family: var(--fm);
  font-size: 9pt;
  color: var(--dim);
}

/* ─── Divider ───────────────────────────────────── */
.section-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 0.35in;
}

/* ─── Category Blocks ───────────────────────────── */
.category-block {
  margin-bottom: 0.32in;
  padding-top: 18pt;
  border-top: 1px solid var(--border);
  page-break-inside: avoid;
}

.cat-eyebrow {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 6pt;
  line-height: 1;
}

.eyebrow-num {
  color: var(--amber);
}

.eyebrow-sep {
  color: var(--dim);
}

.eyebrow-name {
  color: var(--ink);
}

.cat-rule {
  width: 40px;
  height: 1px;
  background: var(--cyan);
  margin-bottom: 14pt;
}

/* ─── Pricing Table ─────────────────────────────── */
.pricing-table {
  width: 100%;
  border-collapse: collapse;
  position: relative;
}

.pricing-table thead tr {
  border-bottom: 1px solid var(--border);
}

.pricing-table th {
  font-family: var(--fm);
  font-size: 9pt;
  font-weight: 400;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--dim);
  padding: 0 0 8pt;
  text-align: left;
}

.pricing-table th.th-size,
.pricing-table th.th-price {
  text-align: right;
}

.pricing-table th.tf-head {
  color: var(--cyan);
  font-weight: 400;
}

.pricing-table tbody tr {
  border-bottom: 1px solid var(--border);
}

.pricing-table tbody tr.row-even {
  background: var(--ghost);
}

.pricing-table tbody tr:last-child {
  border-bottom: none;
}

.pricing-table td {
  padding: 7pt 0;
  vertical-align: middle;
}

.prod-name {
  font-family: var(--fn);
  font-size: 11pt;
  font-weight: 400;
  color: var(--ink);
  padding-right: 10pt;
  width: 28%;
}

.prod-size {
  font-family: var(--fm);
  font-size: 9pt;
  font-weight: 400;
  color: var(--dim);
  text-align: right;
  width: 10%;
  padding-right: 10pt;
}

.price {
  font-family: var(--fm);
  font-size: 10pt;
  font-weight: 400;
  text-align: right;
  white-space: nowrap;
  padding-left: 6pt;
  width: 8%;
}

.price.retail {
  color: var(--dim);
  font-size: 9pt;
}

.price.ta,
.price.tb,
.price.tc,
.price.td,
.price.te {
  color: var(--ink);
}

.price.tf {
  color: var(--cyan);
  font-weight: 400;
  font-size: 11pt;
}

/* ─── Footer ────────────────────────────────────── */
.sheet-footer {
  margin-top: 0.4in;
  padding-top: 16pt;
  border-top: 1px solid var(--cyan);
  text-align: center;
}

.footer-lines {
  font-family: var(--fm);
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 2.5px;
  color: var(--dim);
  line-height: 2.2;
}

.footer-email {
  font-family: var(--fm);
  font-size: 9pt;
  letter-spacing: 2px;
  color: var(--cyan);
  text-transform: lowercase;
  margin-top: 6pt;
  display: block;
}

/* ─── Print ─────────────────────────────────────── */
@page {
  size: letter;
  margin: 0.6in 0.7in;
  background: var(--cream);
}

@media print {
  body {
    background: var(--cream) !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  .category-block { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
  .no-print { display: none; }
}
</style>
</head>
<body>
<div class="sheet">

  <!-- Header -->
  <div class="sheet-header">
    <div class="logo-lockup">
      <svg viewBox="0 0 48 28" fill="none" width="48" height="28" style="display:inline-block;vertical-align:middle">
        <path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3"
              stroke="#00A0A8" stroke-width="1.8"
              stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="32" cy="9"  r="2"   fill="#00A0A8"/>
        <circle cx="38" cy="12" r="2"   fill="#E07C24"/>
        <circle cx="46" cy="3"  r="2.5" fill="#E07C24"/>
      </svg>
      <span class="logo-wordmark">advnce <span class="labs">labs</span></span>
    </div>
    <span class="header-rule"></span>
    <div>
      <span class="sheet-subhead">Wholesale Pricing &nbsp;&middot;&nbsp; ${esc(today)}</span>
      <span class="draft-label">Draft</span>
    </div>
  </div>

  <!-- Prices Per Vial Banner -->
  <div class="pvial-banner">
    <div class="pvial-title">Prices Per Vial</div>
    <div class="pvial-sub">Orders in 10-unit increments &nbsp;&middot;&nbsp; Minimum 10 vials per SKU</div>
  </div>

  <!-- Tier Legend -->
  <div class="tier-legend">
    <span class="tl-label">How to read the tiers</span>
    <span class="tl-item"><span class="tl-letter">A</span><span class="tl-dot">&middot;</span><span class="tl-range">10&ndash;90</span></span>
    <span class="tl-item"><span class="tl-letter">B</span><span class="tl-dot">&middot;</span><span class="tl-range">100&ndash;190</span></span>
    <span class="tl-item"><span class="tl-letter">C</span><span class="tl-dot">&middot;</span><span class="tl-range">200&ndash;290</span></span>
    <span class="tl-item"><span class="tl-letter">D</span><span class="tl-dot">&middot;</span><span class="tl-range">300&ndash;390</span></span>
    <span class="tl-item"><span class="tl-letter">E</span><span class="tl-dot">&middot;</span><span class="tl-range">400&ndash;490</span></span>
    <span class="tl-item"><span class="tl-letter">F</span><span class="tl-dot">&middot;</span><span class="tl-range">500+</span></span>
  </div>

  <div class="section-divider"></div>

  <!-- Category Blocks -->
  ${categorySections}

  <!-- Footer -->
  <div class="sheet-footer">
    <div class="footer-lines">
      Lead Time 7&ndash;14 Business Days &nbsp;&middot;&nbsp; Min 10 Units Per SKU<br>
      Research Use Only &nbsp;&middot;&nbsp; Not for Human Consumption &nbsp;&middot;&nbsp; Not Evaluated by the FDA
    </div>
    <span class="footer-email">wholesale@advncelabs.com</span>
  </div>

</div>
</body>
</html>`;
}
