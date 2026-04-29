// lib/news/curator.test.mjs
// Run: node lib/news/curator.test.mjs

import { validateCuratorOutput, nextAccentColor } from './curator.js';

const cases = [];

cases.push({
  name: 'validateCuratorOutput accepts a well-formed pick',
  fn: () => {
    const ok = {
      picks: [{
        slot: 'mon', candidate_id: 'abc', compound: 'BPC-157',
        source_url: 'https://pubmed.ncbi.nlm.nih.gov/123/',
        source_quality: 'A', citation: 'Sikiric · J · 2024 · PMID 123',
        accent_color: 'teal', hook: 'BPC-157 ACCELERATED HEALING 47%',
        highlight_words: ['47%'], slide_2_finding: 'x', slide_3_mechanism: 'x',
        slide_3_citation: 'x', slide_4_takeaway: 'x',
        caption: 'x'.repeat(300), hashtags: ['#a','#b','#c','#d','#e','#f'],
        needs_legal_review: false,
      }],
      skipped_slots: [], candidates_reviewed: 10,
    };
    const errs = validateCuratorOutput(ok);
    if (errs.length) throw new Error('expected no errors, got: ' + JSON.stringify(errs));
  },
});

cases.push({
  name: 'validateCuratorOutput rejects missing required fields',
  fn: () => {
    const bad = { picks: [{ slot: 'mon' /* missing many */ }], skipped_slots: [], candidates_reviewed: 0 };
    const errs = validateCuratorOutput(bad);
    if (errs.length === 0) throw new Error('expected errors');
  },
});

cases.push({
  name: 'validateCuratorOutput rejects invalid accent_color',
  fn: () => {
    const bad = {
      picks: [{ slot:'mon',candidate_id:'a',compound:'x',source_url:'x',source_quality:'A',
        citation:'x',accent_color:'red',hook:'x',highlight_words:[],slide_2_finding:'x',
        slide_3_mechanism:'x',slide_3_citation:'x',slide_4_takeaway:'x',caption:'x'.repeat(300),
        hashtags:['#a','#b','#c','#d','#e','#f'],needs_legal_review:false }],
      skipped_slots:[], candidates_reviewed:1,
    };
    const errs = validateCuratorOutput(bad);
    if (!errs.some((e) => e.includes('accent_color'))) throw new Error('expected accent_color error');
  },
});

cases.push({
  name: 'nextAccentColor flips correctly',
  fn: () => {
    if (nextAccentColor('teal') !== 'amber') throw new Error('teal → amber');
    if (nextAccentColor('amber') !== 'teal') throw new Error('amber → teal');
    if (nextAccentColor(null) !== 'teal') throw new Error('null → teal default');
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
