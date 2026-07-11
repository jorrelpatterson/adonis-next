import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakBadge from '../StreakBadge.jsx';
import StreakMilestone, {
  STREAK_TIERS,
  getLastShownMilestone,
  setLastShownMilestone,
  getPendingMilestone,
} from '../StreakMilestone.jsx';

describe('StreakBadge', () => {
  it.each([
    [0, 'Start'],
    [7, 'Bronze'],
    [14, 'Silver'],
    [30, 'Gold'],
    [100, 'Legend'],
  ])('renders the %s-day tier by showing the day count and singular/plural label', (days) => {
    render(<StreakBadge days={days} />);
    // The day count renders via StatNumber (count-up); getByText throws if absent.
    screen.getByText(String(days));
    screen.getByText(days === 1 ? 'day' : 'days');
  });

  it('does not render the flame svg below the 3-day threshold', () => {
    const { container } = render(<StreakBadge days={0} />);
    expect(container.querySelector('svg.adn-flame')).toBeNull();
  });

  it('renders the flame svg at/above the 3-day threshold', () => {
    const { container } = render(<StreakBadge days={7} />);
    expect(container.querySelector('svg.adn-flame')).not.toBeNull();
  });

  it('invokes onTap when clicked', () => {
    const onTap = vi.fn();
    render(<StreakBadge days={7} onTap={onTap} />);
    screen.getByRole('button').click();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});

describe('StreakMilestone localStorage helpers', () => {
  // The sandboxed test env's ambient `localStorage` global is a non-functional
  // stub (no working setItem/getItem persistence), so stub a real in-memory
  // implementation here — same pattern as src/services/__tests__/useAuth.test.jsx.
  let store;
  let fakeLocalStorage;

  beforeEach(() => {
    store = new Map();
    fakeLocalStorage = {
      getItem: vi.fn((k) => (store.has(k) ? store.get(k) : null)),
      setItem: vi.fn((k, v) => store.set(k, String(v))),
      removeItem: vi.fn((k) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    };
    vi.stubGlobal('localStorage', fakeLocalStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getLastShownMilestone defaults to 0 when nothing stored', () => {
    expect(getLastShownMilestone()).toBe(0);
  });

  it('setLastShownMilestone persists via localStorage and getLastShownMilestone reads it back', () => {
    setLastShownMilestone(7);
    expect(fakeLocalStorage.setItem).toHaveBeenCalledWith('adonis_streak_milestone_shown', '7');
    expect(getLastShownMilestone()).toBe(7);
  });

  it('getPendingMilestone returns null when streak has not reached the first tier', () => {
    expect(getPendingMilestone(6)).toBeNull();
  });

  it('getPendingMilestone returns the crossed tier when streak reaches it for the first time', () => {
    const pending = getPendingMilestone(7);
    expect(pending).toEqual(STREAK_TIERS.find((t) => t.days === 7));
  });

  it('getPendingMilestone returns the highest crossed tier not yet shown', () => {
    // Jump straight from 0 to 30 — should surface Gold (30), not Bronze (7) or Silver (14).
    const pending = getPendingMilestone(35);
    expect(pending).toEqual(STREAK_TIERS.find((t) => t.days === 30));
  });

  it('getPendingMilestone respects setLastShownMilestone and does not re-show an already-shown tier', () => {
    setLastShownMilestone(7);
    expect(getPendingMilestone(10)).toBeNull();
  });

  it('getPendingMilestone surfaces the next tier once the streak advances past the last shown one', () => {
    setLastShownMilestone(7);
    const pending = getPendingMilestone(14);
    expect(pending).toEqual(STREAK_TIERS.find((t) => t.days === 14));
  });

  it('getPendingMilestone returns null once the highest tier (100) has already been shown', () => {
    setLastShownMilestone(100);
    expect(getPendingMilestone(365)).toBeNull();
  });
});

describe('StreakMilestone component', () => {
  it('renders nothing when tier is falsy', () => {
    const { container } = render(<StreakMilestone tier={null} days={0} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the tier name, unlocked copy, and day count when tier is provided', () => {
    const tier = STREAK_TIERS.find((t) => t.days === 7);
    render(<StreakMilestone tier={tier} days={7} onClose={() => {}} />);
    screen.getByText(`${tier.name} Streak Unlocked`);
    screen.getByText('days');
    screen.getByText(tier.copy);
  });

  it('invokes onClose when the "Keep Going" button is clicked', () => {
    const onClose = vi.fn();
    const tier = STREAK_TIERS.find((t) => t.days === 14);
    render(<StreakMilestone tier={tier} days={14} onClose={onClose} />);
    screen.getByRole('button', { name: 'Keep Going' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
