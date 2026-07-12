// Golden main-engine parity test (Phase 4) — checks main's live cards,
// citizenship, and dispute engines against the frozen v1 golden fixtures.
// Sibling of main-engine-parity.test.js (which covers the nutrition engine).
//
// Unlike the Phase 3/4 verbatim ports (cycle.js, stack-builder.js,
// insights-engine.js), the modules under test here are main's PRE-EXISTING
// engines: src/protocols/money/credit/cards-logic.js,
// src/protocols/travel/citizenship/data.js, and
// src/protocols/money/credit/letters.js. Any divergence from the v1 fixtures
// must be a documented-exception assertion, never silent.
//
// Divergence audit (2026-07-10, verified by data + behavior comparison):
//   ZERO divergences. Main's CC_DB, CZ_COUNTRIES, CZ_QUESTIONS,
//   DISPUTE_TYPES, and BUREAUS are all JSON-identical to the v1 extractions
//   in tests/golden/v1/{cards,citizenship,dispute}.js, and the algorithm
//   bodies differ only in formatting (quote style, \n escapes vs literal
//   newlines, expanded object literals) — not behavior. The data-parity
//   tests below make that explicit so future data drift fails loudly as a
//   DATA divergence (distinct from an algorithm regression) instead of
//   producing a confusing fixture mismatch.
//
// getBestCard note: main's signature is getBestCard(wallet, category,
// db = CC_DB) — a third injectable-db param v1 didn't have. We call it with
// the default (main's own CC_DB), which is legitimate because that db is
// asserted identical to v1's below; if the dbs ever drift, the data-parity
// test pinpoints the cause before the fixture replay fails.
//
// CASES below are copied VERBATIM from tests/golden/cards.golden.test.js,
// tests/golden/citizenship.golden.test.js, and
// tests/golden/dispute.golden.test.js, which source them against the v1
// extractions. Do not hand-edit the arrays — they are inputs, not behavior
// under test.
//
// Determinism: system time is pinned to 2026-07-09T12:00:00 exactly as
// cards.golden.test.js and dispute.golden.test.js do — calcFiveTwentyFour
// reads `new Date()` for its 24-month cutoff and both letter generators
// embed today's date via toLocaleDateString. scoreCitizenshipPaths is pure
// (pinning is harmless there). Every result goes through the same JSON
// round-trip the fixture harness uses.
process.env.TZ = 'UTC';

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Main production engines under test
import { calcFiveTwentyFour, getBestCard } from '../../src/protocols/money/credit/cards-logic.js';
import { CC_DB as MAIN_CC_DB } from '../../src/protocols/money/credit/cards-db.js';
import { scoreCitizenshipPaths, CZ_COUNTRIES as MAIN_CZ_COUNTRIES, CZ_QUESTIONS as MAIN_CZ_QUESTIONS } from '../../src/protocols/travel/citizenship/data.js';
import { generateDisputeLetter, generateLetterByType, getScoreAnalysis } from '../../src/protocols/money/credit/letters.js';
import { DISPUTE_TYPES as MAIN_DISPUTE_TYPES, BUREAUS as MAIN_BUREAUS } from '../../src/protocols/money/credit/data.js';

// v1 extractions — data-parity reference only (algorithms come from main)
import { CC_DB as V1_CC_DB } from './v1/cards.js';
import { CZ_COUNTRIES as V1_CZ_COUNTRIES, CZ_QUESTIONS as V1_CZ_QUESTIONS } from './v1/citizenship.js';
import { DISPUTE_TYPES as V1_DISPUTE_TYPES, BUREAUS as V1_BUREAUS } from './v1/dispute.js';

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function loadFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf8'));
}

function normalize(value) {
  // Same normalization the golden harness applies before writing fixtures.
  return JSON.parse(JSON.stringify({ v: value })).v ?? null;
}

function replay(name, cases, run) {
  const fixture = loadFixture(name);
  cases.forEach((c, i) => {
    it(`${name} reproduces golden fixture: ${c.label}`, () => {
      const expected = fixture[i];
      expect(expected, `no fixture entry at index ${i} for case "${c.label}"`).toBeDefined();
      expect(expected.label, `fixture/case label mismatch at index ${i}`).toBe(c.label);
      expect(normalize(run(c.input)), `output mismatch for case "${c.label}"`).toEqual(expected.output);
    });
  });
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

// --- copied verbatim from tests/golden/cards.golden.test.js ---

// Pinned "today" is 2026-07-09, so the 5/24 cutoff is 2024-07-09.
// "recent" = opened after cutoff; "old" = opened 24+ months ago.
const recent = (openDate, countsFor524 = true) => ({ openDate, countsFor524 });

const FIVE_TWENTY_FOUR_CASES = [
  { label: 'empty wallet -> 0', input: [] },
  {
    label: 'one recent counting card -> 1',
    input: [recent('2025-06-15')],
  },
  {
    label: 'under 5/24: three recent counting, one older than 24 months',
    input: [recent('2025-01-15'), recent('2025-09-01'), recent('2026-03-20'), recent('2022-05-10')],
  },
  {
    label: 'exactly at 5/24: five recent counting cards',
    input: [
      recent('2024-10-01'),
      recent('2025-02-14'),
      recent('2025-07-04'),
      recent('2025-12-25'),
      recent('2026-05-05'),
    ],
  },
  {
    label: 'over 5/24: six recent counting plus old cards',
    input: [
      recent('2024-09-09'),
      recent('2025-01-01'),
      recent('2025-03-03'),
      recent('2025-06-06'),
      recent('2025-11-11'),
      recent('2026-02-02'),
      recent('2021-01-01'),
    ],
  },
  {
    label: 'recent cards with countsFor524=false (biz cards) are excluded',
    input: [recent('2025-08-08'), recent('2025-09-09', false), recent('2026-01-01', false)],
  },
  {
    label: 'all cards older than 24 months -> 0',
    input: [recent('2020-01-01'), recent('2023-06-01'), recent('2024-06-01')],
  },
];

const wc = (cardId) => ({ cardId, openDate: '2025-01-01', spent: 0 });

const BEST_CARD_CASES = [
  { label: 'empty wallet -> null', input: [[], 'dining'] },
  {
    label: 'dining: amexgold 4x beats cfu 3x',
    input: [[wc('cfu'), wc('amexgold')], 'dining'],
  },
  {
    label: 'grocery: bcp 6x beats amexgold 4x and csp 1x',
    input: [[wc('csp'), wc('amexgold'), wc('bcp')], 'grocery'],
  },
  {
    label: 'travel tie at 10x: csr wins over venture_x by wallet order (strict >)',
    input: [[wc('csr'), wc('venture_x')], 'travel'],
  },
  {
    label: 'category missing from cats falls back to cats.other: flights -> venture_x other=2 beats csp other=1',
    input: [[wc('csp'), wc('venture_x')], 'flights'],
  },
  {
    label: 'unknown cardId is skipped; only unknowns -> null',
    input: [[wc('not_a_card'), wc('also_fake')], 'dining'],
  },
  {
    label: 'unknown card skipped but known card still wins',
    input: [[wc('not_a_card'), wc('discover')], 'streaming'],
  },
];

// --- end verbatim copy (cards) ---

// --- copied verbatim from tests/golden/citizenship.golden.test.js ---

const CITIZENSHIP_CASES = [
  {
    // Italy descent match (+40, "Ancestry match"), Italian speaker (+5, "Speaks Italian"),
    // budget 'low' (tier 1): investment misses all gates (-20), residency gets 18-branch,
    // timeline 'soon' (descent +15 / caribbean +15 / else +8),
    // relocate 'no' (residency -5, investment +10, descent +10),
    // purpose: eu (visaFree>=188), children (descent bonus).
    label: 'italy ancestry, low budget, soon, no relocation, eu+children, italian',
    input: {
      ancestry: ['italy'],
      budget: 'low',
      timeline: 'soon',
      relocate: 'no',
      purpose: ['eu', 'children'],
      languages: ['italian'],
    },
  },
  {
    // Ireland descent match; budget 'free' (tier 0) hits the residency 10-branch;
    // timeline 'medium' (+15 flat); relocate 'yes' (residency +10, investment +8);
    // purpose eu only; empty languages array.
    label: 'ireland ancestry, free budget, medium timeline, relocate yes, eu only',
    input: {
      ancestry: ['ireland'],
      budget: 'free',
      timeline: 'medium',
      relocate: 'yes',
      purpose: ['eu'],
      languages: [],
    },
  },
  {
    // Poland descent match; budget 'mid' (tier 2, all investment gates fail);
    // timeline 'no_rush' (final else +18); relocate 'part' (residency +10);
    // purpose 'tax' (panama/paraguay/caribbean +8); Spanish (mexico + argentina reasons).
    label: 'poland ancestry, mid budget, no rush, part-time abroad, tax, spanish',
    input: {
      ancestry: ['poland'],
      budget: 'mid',
      timeline: 'no_rush',
      relocate: 'part',
      purpose: ['tax'],
      languages: ['spanish'],
    },
  },
  {
    // Germany descent match; budget 'high' (tier 3: caribbean within budget,
    // portugal_gv/malta still -20); timeline 'soon'; relocate 'minimal'
    // (paraguay special +8 vs other residency +3); purpose planb + business
    // (business is a no-op — characterizes that it adds nothing);
    // German + Portuguese speaker (germany and portugal_gv reasons).
    label: 'germany ancestry, high budget, soon, minimal visits, planb+business, german+portuguese',
    input: {
      ancestry: ['germany'],
      budget: 'high',
      timeline: 'soon',
      relocate: 'minimal',
      purpose: ['planb', 'business'],
      languages: ['german', 'portuguese'],
    },
  },
  {
    // ancestry 'none' (-40 for every descent country); budget 'premium' (tier 4:
    // caribbean +20, portugal_gv +20, malta +15); timeline 'asap' (caribbean +20,
    // residency -10, descent +5); relocate 'no'; purpose travel (visaFree>=170) + planb.
    label: 'no ancestry, premium budget, asap, no relocation, travel+planb',
    input: {
      ancestry: ['none'],
      budget: 'premium',
      timeline: 'asap',
      relocate: 'no',
      purpose: ['travel', 'planb'],
      languages: ['none'],
    },
  },
  {
    // Multi-ancestry (italy + ireland both match); rich purpose list pushes Italy to
    // 40+20+15+10+10(eu)+8(travel)+5(planb)+8(children)+5(italian) = 121 -> exercises
    // the Math.min(100, ...) upper clamp.
    label: 'multi-ancestry italy+ireland, premium, soon, upper clamp at 100',
    input: {
      ancestry: ['italy', 'ireland'],
      budget: 'premium',
      timeline: 'soon',
      relocate: 'no',
      purpose: ['eu', 'travel', 'planb', 'children'],
      languages: ['italian'],
    },
  },
  {
    // ancestry 'none' + asap + no purposes: descent lands at -40+20+5+10 = -5 ->
    // exercises the Math.max(0, ...) lower clamp (all four descent countries at 0).
    label: 'no ancestry, free budget, asap, relocate yes, empty purpose — lower clamp at 0',
    input: {
      ancestry: ['none'],
      budget: 'free',
      timeline: 'asap',
      relocate: 'yes',
      purpose: [],
      languages: [],
    },
  },
  {
    // Fully empty answers object: ancestry undefined (optional-chaining branch: descent
    // gets -30, not -40); budget undefined -> `?? 1` default tier; timeline undefined ->
    // final else +18; relocate undefined -> residency -5 / investment +8;
    // purpose/languages default to [].
    label: 'empty answers object — all defaults and optional-chaining fallbacks',
    input: {},
  },
];

// --- end verbatim copy (citizenship) ---

// --- copied verbatim from tests/golden/dispute.golden.test.js ---

const PROF = { name: 'Marcus Adonis' };

const DISPUTE_LETTER_CASES = [
  {
    label: 'collection / experian / with amount',
    input: [
      { bureau: 'experian', type: 'collection', creditor: 'Midland Credit', amount: 1250 },
      PROF,
    ],
  },
  {
    label: 'duplicate / equifax / accountNum, no amount',
    input: [
      { bureau: 'equifax', type: 'duplicate', creditor: 'Portfolio Recovery', accountNum: 'PRA-88421' },
      PROF,
    ],
  },
  {
    label: 'outdated / transunion / custom reason appended',
    input: [
      {
        bureau: 'transunion',
        type: 'outdated',
        creditor: 'First Premier Bank',
        reason: 'The account was charged off in early 2018, well over seven years ago.',
      },
      PROF,
    ],
  },
  {
    label: 'bankruptcy / experian / with amount and accountNum',
    input: [
      { bureau: 'experian', type: 'bankruptcy', creditor: 'US Bankruptcy Court', amount: 8400, accountNum: 'BK-2019-1177' },
      PROF,
    ],
  },
  {
    label: 'hard_inquiry / equifax',
    input: [{ bureau: 'equifax', type: 'hard_inquiry', creditor: 'Comenity Bank' }, PROF],
  },
  {
    label: 'unknown type + unknown bureau + empty profile -> placeholder fallbacks',
    input: [{ bureau: 'not_a_bureau', type: 'mystery_type', creditor: '' }, {}],
  },
];

const BASE_DISPUTE = {
  bureau: 'experian',
  type: 'collection',
  creditor: 'Midland Credit',
  amount: 1250,
  accountNum: 'MC-55301',
  dateOpened: '2026-05-20',
};

const LETTER_BY_TYPE_CASES = [
  {
    label: 'initial -> falls back to generateDisputeLetter',
    input: ['initial', BASE_DISPUTE, PROF],
  },
  {
    label: 'followup with dateOpened and amount',
    input: ['followup', BASE_DISPUTE, PROF],
  },
  {
    label: 'cfpb with missing dateOpened -> [DATE] placeholder',
    input: ['cfpb', { bureau: 'equifax', type: 'charge_off', creditor: 'Synchrony Bank', amount: 940 }, PROF],
  },
  {
    label: 'section609 with accountNum and amount',
    input: ['section609', BASE_DISPUTE, PROF],
  },
  {
    label: 'goodwill for late_payment with custom reason',
    input: [
      'goodwill',
      {
        bureau: 'transunion',
        type: 'late_payment',
        creditor: 'Chase',
        accountNum: 'CH-4402',
        reason: 'A hospitalization in March caused a single missed payment; the account has been current ever since.',
      },
      PROF,
    ],
  },
  {
    label: 'goodwill without reason -> default hardship paragraph',
    input: ['goodwill', { bureau: 'experian', type: 'late_payment', creditor: 'Capital One' }, PROF],
  },
  {
    label: 'pay_delete with amount',
    input: ['pay_delete', { bureau: 'experian', type: 'collection', creditor: 'LVNV Funding', amount: 600, accountNum: 'LV-90'}, PROF],
  },
  {
    label: 'debt_validation without amount, empty profile placeholders',
    input: ['debt_validation', { bureau: 'transunion', type: 'collection', creditor: 'Jefferson Capital' }, {}],
  },
];

const SCORE_ANALYSIS_CASES = [
  { label: 'no scores -> Unknown', input: [[], []] },
  {
    label: 'Excellent (780), single reading, no disputes -> delta 0',
    input: [[{ date: '2026-07-01', score: 780 }], []],
  },
  {
    label: 'Good (720) up from 680 -> positive delta',
    input: [
      [
        { date: '2026-05-01', score: 680 },
        { date: '2026-07-01', score: 720 },
      ],
      [],
    ],
  },
  {
    label: 'Fair (660) with one active dispute -> singular active-dispute tip',
    input: [
      [{ date: '2026-07-01', score: 660 }],
      [{ id: 1, type: 'collection', status: 'sent' }],
    ],
  },
  {
    label: 'Poor (610) with two active disputes incl hard_inquiry -> plural + inquiry tips',
    input: [
      [
        { date: '2026-06-01', score: 625 },
        { date: '2026-07-01', score: 610 },
      ],
      [
        { id: 1, type: 'hard_inquiry', status: 'pending' },
        { id: 2, type: 'late_payment', status: 'in_review' },
      ],
    ],
  },
  {
    label: 'Very Poor (550) with only resolved disputes -> no active tip, hard_inquiry tip still fires',
    input: [
      [{ date: '2026-07-01', score: 550 }],
      [{ id: 1, type: 'hard_inquiry', status: 'resolved' }],
    ],
  },
];

// --- end verbatim copy (dispute) ---

describe('main engine data parity with v1 (drift classifier)', () => {
  // These are not fixture replays — they classify any future fixture-replay
  // failure. If one of these fails, the divergence is DATA drift in main's
  // module data; if these pass but a replay below fails, it is ALGORITHM drift.
  it('main CC_DB is JSON-identical to the v1 extraction', () => {
    expect(normalize(MAIN_CC_DB)).toEqual(normalize(V1_CC_DB));
  });
  it('main CZ_COUNTRIES and CZ_QUESTIONS are JSON-identical to the v1 extraction', () => {
    expect(normalize(MAIN_CZ_COUNTRIES)).toEqual(normalize(V1_CZ_COUNTRIES));
    expect(normalize(MAIN_CZ_QUESTIONS)).toEqual(normalize(V1_CZ_QUESTIONS));
  });
  it('main DISPUTE_TYPES and BUREAUS are JSON-identical to the v1 extraction', () => {
    expect(normalize(MAIN_DISPUTE_TYPES)).toEqual(normalize(V1_DISPUTE_TYPES));
    expect(normalize(MAIN_BUREAUS)).toEqual(normalize(V1_BUREAUS));
  });
});

describe('main cards engine vs v1 golden fixtures', () => {
  replay('calcFiveTwentyFour', FIVE_TWENTY_FOUR_CASES, (wallet) => calcFiveTwentyFour(wallet));
  // getBestCard called with its default db (main's CC_DB, asserted v1-identical above).
  replay('getBestCard', BEST_CARD_CASES, ([wallet, category]) => getBestCard(wallet, category));
});

describe('main citizenship engine vs v1 golden fixtures', () => {
  replay('citizenship', CITIZENSHIP_CASES, (input) => scoreCitizenshipPaths(input));
});

describe('main dispute engine vs v1 golden fixtures', () => {
  replay('generateDisputeLetter', DISPUTE_LETTER_CASES, ([dispute, prof]) =>
    generateDisputeLetter(dispute, prof)
  );
  replay('generateLetterByType', LETTER_BY_TYPE_CASES, ([type, dispute, prof]) =>
    generateLetterByType(type, dispute, prof)
  );
  replay('getScoreAnalysis', SCORE_ANALYSIS_CASES, ([scores, disputes]) =>
    getScoreAnalysis(scores, disputes)
  );
});
