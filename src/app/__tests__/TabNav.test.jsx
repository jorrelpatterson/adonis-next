// src/app/__tests__/TabNav.test.jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

vi.mock('../../design/haptics', () => ({
  haptics: { light: vi.fn() },
}));

import TabNav from '../TabNav';
import { haptics } from '../../design/haptics';

describe('TabNav', () => {
  it('always shows Routine and Profile tabs', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={[]} />);
    expect(container.textContent).toContain('Routine');
    expect(container.textContent).toContain('Profile');
  });

  it('always shows the Insights tab, regardless of active domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={[]} />);
    expect(container.textContent).toContain('Insights');
  });

  it('places Insights between domain tabs and Profile', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body']} />);
    const ids = Array.from(container.querySelectorAll('button')).map(b => b.getAttribute('data-testid'));
    const insightsIdx = ids.indexOf('tab-insights');
    const profileIdx = ids.indexOf('tab-profile');
    const bodyIdx = ids.indexOf('tab-body');
    expect(insightsIdx).toBeGreaterThan(bodyIdx);
    expect(insightsIdx).toBeLessThan(profileIdx);
  });

  it('shows domain tabs for active domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body', 'money']} />);
    expect(container.textContent).toContain('Body');
    expect(container.textContent).toContain('Money');
  });

  it('does not show inactive domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body']} />);
    expect(container.textContent).not.toContain('Travel');
  });

  // Task 12 (DoD item 7) — lockedIds is a presentational prop from App.jsx
  // (via tier-gate.js's isDomainLocked); TabNav just draws the glyph.
  it('shows a lock glyph on a gated domain tab (free tier w/ money domain)', () => {
    const { getByTestId } = render(
      <TabNav activeTab="routine" onTabChange={() => {}} domains={['body', 'money']} lockedIds={['money']} />
    );
    expect(getByTestId('tab-lock-money')).toBeTruthy();
  });

  it('shows no lock glyph when no domains are locked (pro/elite tier)', () => {
    const { queryByTestId } = render(
      <TabNav activeTab="routine" onTabChange={() => {}} domains={['body', 'money']} lockedIds={[]} />
    );
    expect(queryByTestId('tab-lock-money')).toBeNull();
    expect(queryByTestId('tab-lock-body')).toBeNull();
  });

  // iOS P1 (safe-area insets): weak presence assertion — the real gate is
  // the simulator screenshot (labels clearing the home indicator). Renders
  // first to prove the calc()+var() padding doesn't crash; the actual
  // wiring is checked at the source level because happy-dom's CSSOM can't
  // round-trip `calc(6px + var(--safe-bottom))` back through
  // getAttribute('style') (it silently drops the whole padding
  // declaration on serialize) — a test-environment limitation, not a
  // real-WebKit one.
  it('bottom padding is additive with --safe-bottom, not a bare env() fallback', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={[]} />);
    expect(container.firstChild).toBeTruthy();

    const src = readFileSync(join(process.cwd(), 'src/app/TabNav.jsx'), 'utf8');
    expect(src).toContain('var(--safe-bottom)');
    expect(src).toContain('calc(6px');
  });
});

// ─── iOS P2 Task 2: tab-switch haptics ──────────────────────────────────
describe('TabNav — haptics', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fires haptics.light when switching to a different tab', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <TabNav activeTab="routine" onTabChange={onTabChange} domains={[]} />
    );
    fireEvent.click(getByTestId('tab-home'));
    expect(haptics.light).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('home');
  });

  it('does not fire haptics.light when re-tapping the already-active tab', () => {
    const onTabChange = vi.fn();
    const { getByTestId } = render(
      <TabNav activeTab="routine" onTabChange={onTabChange} domains={[]} />
    );
    fireEvent.click(getByTestId('tab-routine'));
    expect(haptics.light).not.toHaveBeenCalled();
    // onTabChange itself is unconditional — only the haptic is gated.
    expect(onTabChange).toHaveBeenCalledWith('routine');
  });
});
