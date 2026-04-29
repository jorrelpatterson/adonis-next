// lib/news/pubmed.test.mjs
// Run: node lib/news/pubmed.test.mjs

import { buildEsearchUrl, buildEsummaryUrl, parseEsummary, citationAuthors } from './pubmed.js';

const cases = [];

cases.push({
  name: 'esearch URL includes term + reldate + retmax',
  fn: () => {
    const url = buildEsearchUrl({ term: 'BPC-157', reldate: 7, retmax: 50 });
    if (!url.includes('term=BPC-157')) throw new Error('term missing');
    if (!url.includes('reldate=7')) throw new Error('reldate missing');
    if (!url.includes('retmax=50')) throw new Error('retmax missing');
    if (!url.includes('db=pubmed')) throw new Error('db missing');
    if (!url.includes('retmode=json')) throw new Error('retmode missing');
  },
});

cases.push({
  name: 'esummary URL accepts list of PMIDs',
  fn: () => {
    const url = buildEsummaryUrl(['12345', '67890']);
    if (!url.includes('id=12345%2C67890')) throw new Error('PMIDs missing');
  },
});

cases.push({
  name: 'parseEsummary maps fields to candidate shape',
  fn: () => {
    const fake = {
      result: {
        '12345': {
          uid: '12345',
          title: 'BPC-157 accelerates tendon healing',
          source: 'J Pharm Pharmacol',
          pubdate: '2024 Jun',
          authors: [
            { name: 'Sikiric P', authtype: 'Author' },
            { name: 'Hahm KB',  authtype: 'Author' },
          ],
          articleids: [{ idtype: 'doi', value: '10.1234/abc' }],
        },
        uids: ['12345'],
      },
    };
    const items = parseEsummary(fake);
    if (items.length !== 1) throw new Error('expected 1 item');
    const it = items[0];
    if (it.source_url !== 'https://pubmed.ncbi.nlm.nih.gov/12345/') throw new Error('source_url wrong: ' + it.source_url);
    if (it.title !== 'BPC-157 accelerates tendon healing') throw new Error('title wrong');
    if (it.source_name !== 'PubMed') throw new Error('source_name wrong');
    if (!it.raw_content.includes('Sikiric P et al · J Pharm Pharmacol · 2024 · PMID 12345'))
      throw new Error('raw_content missing pre-formatted citation: ' + it.raw_content);
  },
});

cases.push({
  name: 'citationAuthors handles 0/1/many authors and missing data',
  fn: () => {
    if (citationAuthors([]) !== '[Authors unavailable]') throw new Error('empty');
    if (citationAuthors(null) !== '[Authors unavailable]') throw new Error('null');
    if (citationAuthors([{ name: 'Smith J', authtype: 'Author' }]) !== 'Smith J') throw new Error('one');
    if (citationAuthors([{ name: 'Smith J', authtype: 'Author' }, { name: 'Doe A', authtype: 'Author' }]) !== 'Smith J et al') throw new Error('many');
    // Skip CollectiveName entries (e.g. consortium author records)
    const out = citationAuthors([
      { name: 'Some Consortium', authtype: 'CollectiveName' },
      { name: 'Smith J', authtype: 'Author' },
    ]);
    if (out !== 'Smith J') throw new Error('skip-collective: ' + out);
  },
});

let failed = 0;
for (const c of cases) {
  try { c.fn(); console.log(' ✓', c.name); }
  catch (e) { failed++; console.log(' ✗', c.name, '—', e.message); }
}
process.exit(failed ? 1 : 0);
