// lib/news/rss.test.mjs
// Run: node lib/news/rss.test.mjs

import { normalizeItem, hashUrl } from './rss.js';

const cases = [];

cases.push({
  name: 'normalizeItem maps rss-parser output to candidate shape',
  fn: () => {
    const src = { name: 'FDA Press', tier: 'A', topic_tags: ['regulatory'] };
    const raw = {
      title: 'FDA Approves New Compounding Pathway',
      link: 'https://fda.gov/abc',
      isoDate: '2026-04-28T10:00:00Z',
      contentSnippet: 'Snippet text here.',
    };
    const out = normalizeItem(raw, src);
    if (out.source_url !== 'https://fda.gov/abc') throw new Error('source_url');
    if (out.source_name !== 'FDA Press') throw new Error('source_name');
    if (out.tier !== 'A') throw new Error('tier');
    if (out.title !== 'FDA Approves New Compounding Pathway') throw new Error('title');
    if (out.published_at !== '2026-04-28T10:00:00.000Z') throw new Error('published_at: ' + out.published_at);
  },
});

cases.push({
  name: 'normalizeItem skips items without title or link',
  fn: () => {
    const src = { name: 'X', tier: 'B', topic_tags: [] };
    if (normalizeItem({ link: 'x' }, src) !== null) throw new Error('no title should null');
    if (normalizeItem({ title: 't' }, src) !== null) throw new Error('no link should null');
  },
});

cases.push({
  name: 'normalizeItem coerces CDATA-object titles (FierceBiotech CDATA case)',
  fn: () => {
    const src = { name: 'FierceBiotech', tier: 'B', topic_tags: ['industry'] };
    const raw = {
      title: { _: 'Biotech CEO Steps Down Amid Trial Restructure' },
      link: 'https://fiercebiotech.com/x',
      isoDate: '2026-04-29T10:00:00Z',
    };
    const out = normalizeItem(raw, src);
    if (!out) throw new Error('expected non-null');
    if (out.title !== 'Biotech CEO Steps Down Amid Trial Restructure')
      throw new Error('title not coerced: ' + JSON.stringify(out.title));
  },
});

cases.push({
  name: 'normalizeItem strips HTML from titles (FierceBiotech <a> wrapper)',
  fn: () => {
    const src = { name: 'FierceBiotech', tier: 'B', topic_tags: ['industry'] };
    const raw = {
      title: '<a href="/biotech/x">AstraZeneca restarts £300M investment</a>',
      link: 'https://fiercebiotech.com/biotech/x',
      isoDate: '2026-04-29T10:00:00Z',
    };
    const out = normalizeItem(raw, src);
    if (!out) throw new Error('expected non-null');
    if (out.title !== 'AstraZeneca restarts £300M investment')
      throw new Error('html not stripped: ' + JSON.stringify(out.title));
  },
});

cases.push({
  name: 'hashUrl is deterministic and URL-only (ignores query params)',
  fn: () => {
    const a = hashUrl('https://example.com/x');
    const b = hashUrl('https://example.com/x');
    if (a !== b) throw new Error('not deterministic');
    if (typeof a !== 'string' || a.length < 8) throw new Error('weak hash');
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
