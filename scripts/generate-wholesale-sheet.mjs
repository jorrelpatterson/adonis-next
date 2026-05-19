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

function priceTiers(cost, retail) {
  const c = Number(cost) || 0;
  const r = Number(retail) || 0;

  // Raw formulas
  let a = c * 1.50;          // tier A: 50% margin
  let b = c * 1.30;          // tier B: 30% margin
  let cTier = c * 1.15;      // tier C: 15% margin
  let d = c + 4;             // tier D: $4 fixed markup

  // Floor: every tier must be at least cost + $2
  const floor = c + 2;
  a = Math.max(a, floor);
  b = Math.max(b, floor);
  cTier = Math.max(cTier, floor);
  d = Math.max(d, floor);

  // Cap: every tier must be at most retail × 0.95 (wholesale beats retail by 5%+)
  const cap = r * 0.95;
  if (cap > 0) {
    a = Math.min(a, cap);
    b = Math.min(b, cap);
    cTier = Math.min(cTier, cap);
    d = Math.min(d, cap);
  }

  // Enforce non-increasing order: A ≥ B ≥ C ≥ D
  // Walk D → A. If a tier is lower than the one to its right, bring it up.
  cTier = Math.max(cTier, d);
  b = Math.max(b, cTier);
  a = Math.max(a, b);

  // Viability check: if even the floor exceeds the cap, product can't be sold
  // profitably at >5% off retail. Mark as not viable (caller decides whether
  // to hide the row or just leave dashes).
  const viable = floor <= cap || cap === 0;

  return {
    a: Math.round(a),
    b: Math.round(b),
    cTier: Math.round(cTier),
    d: Math.round(d),
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
      nonViable.push({ name: g.displayName || g.displayKey, cost: g.cost, retail: g.retail, floor: (Number(g.cost) || 0) + 2, cap: (Number(g.retail) || 0) * 0.95 });
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
console.log(`\n✓ Wrote wholesale-pricing-template.html`);
console.log(`  ${visibleCount} products visible across ${orderedCats.length} categories`);
if (nonViable.length) {
  console.warn(`\n⚠ ${nonViable.length} products hidden — cost+$2 exceeds retail×0.95:`);
  for (const n of nonViable) {
    console.warn(`  ${n.name}: cost=$${n.cost}, retail=$${n.retail}, floor=$${n.floor.toFixed(2)}, cap=$${n.cap.toFixed(2)}`);
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

/**
 * Formats a category name as an italic display title.
 * The LAST word is wrapped in <em> for italic-emphasis.
 * Single-word titles are entirely italic.
 */
function formatCatTitle(name) {
  const words = name.split(' ');
  if (words.length === 1) {
    return `<em>${esc(name)}</em>`;
  }
  const last = words.pop();
  return `${esc(words.join(' '))} <em>${esc(last)}</em>`;
}

function renderHtml({ byCat, orderedCats, today }) {
  const categorySections = orderedCats.map((cat, idx) => {
    const catNum = String(idx + 1).padStart(2, '0');
    const products = byCat[cat];
    const rows = products.map((p) => {
      const t = priceTiers(p.cost, p.retail);
      return `
          <tr>
            <td class="prod-name">${esc(p.name)}</td>
            <td class="prod-size">${esc(p.size)}</td>
            <td class="price retail">${dollar(p.retail)}</td>
            <td class="price t1">${dollar(t.a)}</td>
            <td class="price t2">${dollar(t.b)}</td>
            <td class="price t3">${dollar(t.cTier)}</td>
            <td class="price t4">${dollar(t.d)}</td>
          </tr>`;
    }).join('');

    return `
    <div class="category-block${idx > 0 && idx % 2 === 0 ? ' page-break' : ''}">
      <div class="bgn">${catNum}</div>
      <div class="cat-eyebrow">Category ${catNum}</div>
      <h2 class="cat-title">${formatCatTitle(cat)}</h2>
      <table class="pricing-table">
        <thead>
          <tr>
            <th class="th-name">Product</th>
            <th class="th-size">Size</th>
            <th class="th-price">Retail</th>
            <th class="th-price">10–100</th>
            <th class="th-price">110–500</th>
            <th class="th-price">510–1000</th>
            <th class="th-price">1010+</th>
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
<title>advnce labs — Wholesale Pricing · ${esc(today)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Outfit:wght@200;300;500;700&display=swap" rel="stylesheet">
<style>
/* ─── Reset & Base ─────────────────────────────── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}

:root {
  --bg:    #050507;
  --tx:    #E8E4E0;
  --txd:   #5A5856;
  --gold:  #E8D5B7;
  --gold2: #C0B8A0;
  --fd:    'Cormorant Garamond', serif;
  --fn:    'Outfit', sans-serif;
  --border: rgba(232,213,183,.06);
}

html, body {
  background: var(--bg);
  color: var(--tx);
  font-family: var(--fn);
  font-weight: 300;
  font-size: 12pt;
  line-height: 1.6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}

/* Grain texture overlay — matches .gr on advncelabs.com */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.sheet {
  position: relative;
  z-index: 1;
  max-width: 9.5in;
  margin: 0 auto;
  padding: 0.35in 0;
}

/* ─── Header ────────────────────────────────────── */
.sheet-header {
  text-align: center;
  margin-bottom: 0.4in;
  padding-bottom: 22pt;
  border-bottom: 1px solid var(--border);
}

/* Wordmark — matches nav .logo on site (small, italic, gold) */
.wordmark {
  font-family: var(--fd);
  font-style: italic;
  font-weight: 300;
  font-size: 17pt;
  letter-spacing: .1em;
  color: var(--gold);
  display: block;
  margin-bottom: 7pt;
}

/* Sheet title eyebrow */
.sheet-eyebrow {
  font-family: var(--fn);
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 5pt;
}

.sheet-date {
  font-family: var(--fn);
  font-size: 8pt;
  font-weight: 300;
  color: var(--txd);
  letter-spacing: 1px;
}

/* ─── Per-Vial Banner ───────────────────────────── */
.pvial-banner {
  margin: 0 auto 0.35in;
  max-width: 6in;
  text-align: center;
  border-top: 1px solid rgba(232,213,183,.18);
  border-bottom: 1px solid rgba(232,213,183,.18);
  padding: 16pt 24pt;
}

.pvial-label {
  font-family: var(--fn);
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--txd);
  margin-bottom: 8pt;
}

.pvial-main {
  font-family: var(--fd);
  font-weight: 300;
  font-size: 28pt;
  line-height: 1.05;
  letter-spacing: -1px;
  color: var(--tx);
  margin-bottom: 10pt;
}

.pvial-main em {
  font-style: italic;
  font-weight: 400;
  color: var(--gold);
}

.pvial-rules {
  display: flex;
  flex-direction: column;
  gap: 4pt;
  align-items: center;
}

.pvial-rule {
  font-family: var(--fn);
  font-size: 9pt;
  font-weight: 300;
  color: var(--txd);
  letter-spacing: .3px;
}

.pvial-rule strong {
  font-weight: 500;
  color: var(--tx);
}

/* ─── Tier Legend Eyebrow ───────────────────────── */
.tier-legend {
  text-align: center;
  margin: 0 auto 0.3in;
  font-family: var(--fn);
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  line-height: 2;
  word-spacing: 1px;
}

.tl-buy {
  color: var(--gold);
}

.tl-sep {
  color: var(--txd);
}

.tl-tier {
  color: #E8D5B7;
  font-weight: 700;
}

.tl-range {
  color: var(--txd);
}

/* ─── Category Blocks ───────────────────────────── */
.category-block {
  position: relative;
  overflow: hidden;
  margin-bottom: 0.3in;
  padding: 20pt 0 16pt;
  border-top: 1px solid var(--border);
}

/* Faded background numeral — matches .split .bgn on site */
.bgn {
  font-family: var(--fd);
  font-style: italic;
  font-weight: 300;
  font-size: 180pt;
  color: rgba(232,213,183,0.03);
  position: absolute;
  right: -3%;
  bottom: -10%;
  line-height: .8;
  pointer-events: none;
  user-select: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Category eyebrow — matches .split .lbl on site */
.cat-eyebrow {
  font-family: var(--fn);
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 6pt;
}

/* Category title — matches .split h2 on site */
.cat-title {
  font-family: var(--fd);
  font-weight: 300;
  font-size: 34pt;
  line-height: 1.05;
  letter-spacing: -1px;
  color: var(--tx);
  margin-bottom: 16pt;
}

.cat-title em {
  font-style: italic;
  font-weight: 400;
}

/* ─── Pricing Table ─────────────────────────────── */
.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
  position: relative;
  z-index: 1;
}

.pricing-table thead tr {
  border-bottom: 1px solid rgba(232,213,183,.1);
}

.pricing-table th {
  font-family: var(--fn);
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--txd);
  padding: 0 0 8pt;
  text-align: left;
}

.pricing-table th.th-price {
  text-align: right;
}

.pricing-table tbody tr {
  border-bottom: 1px solid rgba(232,213,183,.04);
}

.pricing-table tbody tr:last-child {
  border-bottom: none;
}

.pricing-table td {
  padding: 7pt 0;
  color: var(--tx);
  vertical-align: middle;
}

.prod-name {
  font-family: var(--fd);
  font-size: 12pt;
  font-weight: 300;
  font-style: italic;
  color: var(--tx);
  padding-right: 8pt;
  width: 30%;
}

.prod-size {
  font-size: 9pt;
  font-weight: 300;
  color: var(--txd);
  width: 20%;
  padding-right: 8pt;
}

.price {
  text-align: right;
  font-family: var(--fn);
  font-size: 10pt;
  font-weight: 300;
  white-space: nowrap;
  padding-left: 6pt;
  width: 10%;
}

.price.retail {
  color: var(--txd);
  font-size: 9pt;
}

.price.t1 {
  color: var(--tx);
}

.price.t2, .price.t3 {
  color: var(--gold2);
}

.price.t4 {
  color: var(--gold);
  font-weight: 500;
}

/* ─── Footer ────────────────────────────────────── */
.sheet-footer {
  margin-top: 0.3in;
  padding-top: 16pt;
  border-top: 1px solid var(--border);
  text-align: center;
}

.footer-eyebrow {
  font-family: var(--fn);
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--txd);
  margin-bottom: 8pt;
  line-height: 2;
}

.footer-wordmark {
  font-family: var(--fd);
  font-style: italic;
  font-weight: 300;
  font-size: 13pt;
  letter-spacing: .1em;
  color: var(--gold);
  margin-bottom: 5pt;
  display: block;
}

.footer-email {
  font-family: var(--fn);
  font-size: 9pt;
  font-weight: 300;
  color: var(--txd);
  letter-spacing: .5px;
}

/* ─── Print ─────────────────────────────────────── */
@page {
  size: letter;
  margin: 0.5in 0.55in;
  background: #050507;
}

@media print {
  html, body {
    background: #050507 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  body::before {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .bgn {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
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
    <span class="wordmark">advnce labs</span>
    <div class="sheet-eyebrow">Wholesale Pricing &middot; Draft</div>
    <div class="sheet-date">${esc(today)}</div>
  </div>

  <!-- Prices Per Vial Banner -->
  <div class="pvial-banner">
    <div class="pvial-main">Prices Per <em>Vial</em></div>
    <div class="pvial-rules">
      <div class="pvial-rule">PRICES PER VIAL &nbsp;&middot;&nbsp; ORDERS IN 10-UNIT INCREMENTS &nbsp;&middot;&nbsp; MIN 10 PER SKU</div>
    </div>
  </div>

  <!-- Tier Legend Eyebrow -->
  <div class="tier-legend">
    <span class="tl-buy">HOW TO READ THE TIERS</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-tier">BUY A</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-range">10–100 VIALS PER SKU</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-tier">BUY B</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-range">110–500</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-tier">BUY C</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-range">510–1000</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-tier">BUY D</span>
    <span class="tl-sep">&nbsp;&middot;&nbsp;</span>
    <span class="tl-range">1010+</span>
  </div>

  <!-- Category Blocks -->
  ${categorySections}

  <!-- Footer -->
  <div class="sheet-footer">
    <div class="footer-eyebrow">
      Lead Time 7–14 Business Days &nbsp;&middot;&nbsp; Min 10 Units &nbsp;&middot;&nbsp; Research Use Only
    </div>
    <span class="footer-wordmark">advnce labs</span>
    <div class="footer-email">wholesale@advncelabs.com</div>
  </div>

</div>
</body>
</html>`;
}
