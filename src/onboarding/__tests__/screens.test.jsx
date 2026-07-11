import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import CalculatingScreen from '../CalculatingScreen';
import GamePlanScreen from '../GamePlanScreen';

// Protocols aren't self-registering — GamePlanScreen reads getAllProtocols()
// from the shared registry, so the suite must populate it exactly like the
// real app boot does.
import '../../protocols/register-all.js';

describe('CalculatingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('plays its step animation then calls onComplete exactly once', () => {
    const onComplete = vi.fn();
    render(<CalculatingScreen profile={{ domains: ['body'] }} onComplete={onComplete} />);

    expect(onComplete).not.toHaveBeenCalled();

    // Animation steps every ~500ms, then a 600ms ready-state delay, then a
    // 2400ms onComplete delay (measured from the last step) — advance well
    // past 5s total to be safe.
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('GamePlanScreen', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a Start button that calls onStart when clicked', () => {
    const onStart = vi.fn();
    const { getByText } = render(
      <GamePlanScreen
        profile={{ domains: ['body'], tier: 'free' }}
        protocolStates={{}}
        onStart={onStart}
      />
    );

    const startButton = getByText('Start');
    expect(startButton).toBeTruthy();

    fireEvent.click(startButton);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not wire any Stripe checkout navigation from the Free-tier upsell card', () => {
    // Upsell card only renders when a free-tier user has more than one
    // domain selected (see GamePlanScreen's tier-hint condition) — use two
    // domains here so the card under test is actually on screen.
    const { container, getByText } = render(
      <GamePlanScreen
        profile={{ domains: ['body', 'mind'], tier: 'free' }}
        protocolStates={{}}
        onStart={vi.fn()}
      />
    );

    // The Free-tier upsell is an informational card pointing users to the
    // Profile tab — it has no button/link/onClick of its own, so there is
    // no checkout redirect to click through to.
    expect(getByText(/Upgrade to Pro from your Profile tab/)).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/redirectToCheckout|buy\.stripe\.com/);

    // Only the single Start button should be clickable in this tree.
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe('Start');
  });
});
