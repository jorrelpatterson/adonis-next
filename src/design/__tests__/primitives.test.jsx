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

  it('ProgressBar fills to value/max as a width percentage', () => {
    const { container } = render(<ProgressBar value={50} max={100} />);
    // Outer rail wraps an inner fill div whose width encodes the percentage.
    const fill = container.firstChild.firstChild;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe('50%');
  });

  it('ProgressBar clamps out-of-range values to 0–100%', () => {
    const { container } = render(<ProgressBar value={250} max={100} />);
    expect(container.firstChild.firstChild.style.width).toBe('100%');
  });

  it('StatNumber sync path jumps from initial to the formatted target under reduced motion', () => {
    // matches:true forces countUpTo's reduced-motion branch, which must render
    // the TARGET immediately rather than animating up from `initial`.
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true, addEventListener() {}, removeEventListener() {},
    })));
    // initial={0} gives the count-up a real range, so a broken sync path would
    // leave "0" on screen instead of the target.
    const { getByText, queryByText } = render(<StatNumber value={1780} initial={0} />);
    expect(getByText('1,780')).toBeTruthy();
    expect(queryByText('0')).toBeNull();
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
