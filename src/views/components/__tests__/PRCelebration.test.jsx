import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../design/sound', () => ({
  sound: { pr: vi.fn() },
}));
vi.mock('../../../design/haptics', () => ({
  haptics: { success: vi.fn() },
}));

import PRCelebration from '../PRCelebration.jsx';
import { sound } from '../../../design/sound';
import { haptics } from '../../../design/haptics';

beforeEach(() => {
  vi.clearAllMocks();
  // countUpTo (design/motion.js) honors prefers-reduced-motion by resolving
  // onUpdate(to) synchronously instead of animating via rAF over 1000ms —
  // force that branch so the count-up settles immediately and the test
  // doesn't need fake timers.
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
    matches: true,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PRCelebration', () => {
  it('renders the exercise name and reps line, and count-up settles on the PR weight', () => {
    const { container } = render(
      <PRCelebration exercise="Back Squats" weight={225} reps={5} onClose={() => {}} />
    );
    // "Back Squats" and " · 5 reps" are adjacent text nodes in the same
    // element, so assert on the container's full text rather than an exact
    // getByText match.
    expect(container.textContent).toContain('Back Squats');
    expect(container.textContent).toContain('· 5 reps');
    // countUpTo short-circuits synchronously under reduced-motion / no-rAF
    // test environments (see design/motion.js), so the final value renders
    // immediately.
    screen.getByText('225');
  });

  it('fires the sound and haptics on mount', () => {
    render(<PRCelebration exercise="Bench Press" weight={185} reps={3} onClose={() => {}} />);
    expect(sound.pr).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when Continue is clicked', () => {
    const onClose = vi.fn();
    render(<PRCelebration exercise="Deadlift" weight={315} reps={1} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // iOS P1 (safe-area insets): weak presence assertion — the real gate is
  // the simulator screenshot. Full-screen takeover, so both edges matter:
  // the eyebrow label up top and the Continue button down near the home
  // indicator. Renders first to prove the calc()+var() padding doesn't
  // crash; the actual wiring is checked at the source level because
  // happy-dom's CSSOM can't round-trip `calc(24px + var(--safe-top))`
  // back through getAttribute('style') (it silently drops the whole
  // padding declaration on serialize) — a test-environment limitation,
  // not a real-WebKit one.
  it('root overlay padding is additive with --safe-top and --safe-bottom', () => {
    const { container } = render(
      <PRCelebration exercise="Front Squats" weight={135} reps={8} onClose={() => {}} />
    );
    expect(container.firstChild).toBeTruthy();

    const src = readFileSync(join(process.cwd(), 'src/views/components/PRCelebration.jsx'), 'utf8');
    expect(src).toContain('var(--safe-top)');
    expect(src).toContain('var(--safe-bottom)');
    expect(src).toContain('calc(24px');
  });
});
