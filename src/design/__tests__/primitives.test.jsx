import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SkelLine, SkelCircle, SkelCard, SkelRoutine } from '../Skeleton';
import ProgressBar from '../ProgressBar';
import StatNumber from '../StatNumber';
import EmptyState from '../EmptyState';

afterEach(() => vi.unstubAllGlobals());

describe('primitives', () => {
  it('skeleton pieces all render', () => {
    const { container } = render(
      <div data-testid="wrap"><SkelLine /><SkelCircle /><SkelCard /><SkelRoutine /></div>
    );
    expect(container.querySelector('[data-testid="wrap"]').childNodes.length).toBe(4);
  });

  it('ProgressBar renders at a given value', () => {
    const { container } = render(<ProgressBar value={50} max={100} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('StatNumber shows the formatted target (reduced-motion sync path)', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener() {}, removeEventListener() {},
    })));
    const { getByText } = render(<StatNumber value={1780} />);
    expect(getByText('1,780')).toBeTruthy();
  });

  it('EmptyState renders copy and fires its CTA', () => {
    const onCta = vi.fn();
    const { getByText } = render(
      <EmptyState headline="No goals yet" body="Set your first goal." cta="Add goal" onCta={onCta} />
    );
    expect(getByText('No goals yet')).toBeTruthy();
    fireEvent.click(getByText('Add goal'));
    expect(onCta).toHaveBeenCalledTimes(1);
  });
});
