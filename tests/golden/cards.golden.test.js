// Golden characterization tests for v1 `cards` engine functions.
// Extraction: tests/golden/v1/cards.js (verbatim from public/app.html @ 3cf8214).
// calcFiveTwentyFour reads `new Date()` for its 24-month cutoff, so system time
// is pinned; wallet openDates are chosen well clear of the cutoff boundary to
// avoid timezone-dependent fixtures.
import { describe, beforeAll, afterAll, vi } from 'vitest';
import { goldenTest } from './harness.js';
import { calcFiveTwentyFour, getBestCard } from './v1/cards.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-09T12:00:00'));
});

afterAll(() => {
  vi.useRealTimers();
});

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

describe('v1 cards golden', () => {
  goldenTest('calcFiveTwentyFour', FIVE_TWENTY_FOUR_CASES, (wallet) => calcFiveTwentyFour(wallet));
  goldenTest('getBestCard', BEST_CARD_CASES, ([wallet, category]) => getBestCard(wallet, category));
});
