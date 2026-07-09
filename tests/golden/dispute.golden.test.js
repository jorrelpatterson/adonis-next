// Golden characterization tests for v1 `dispute` engine functions.
// Extraction: tests/golden/v1/dispute.js (verbatim from public/app.html @ 3cf8214).
// Both letter generators embed today's date via new Date().toLocaleDateString,
// so system time is pinned.
import { describe, beforeAll, afterAll, vi } from 'vitest';
import { goldenTest } from './harness.js';
import { generateDisputeLetter, generateLetterByType, getScoreAnalysis } from './v1/dispute.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

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

describe('v1 dispute golden', () => {
  goldenTest('generateDisputeLetter', DISPUTE_LETTER_CASES, ([dispute, prof]) =>
    generateDisputeLetter(dispute, prof)
  );
  goldenTest('generateLetterByType', LETTER_BY_TYPE_CASES, ([type, dispute, prof]) =>
    generateLetterByType(type, dispute, prof)
  );
  goldenTest('getScoreAnalysis', SCORE_ANALYSIS_CASES, ([scores, disputes]) =>
    getScoreAnalysis(scores, disputes)
  );
});
