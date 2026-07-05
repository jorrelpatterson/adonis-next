// src/app/views/workout/__tests__/SwapModal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SwapModal from '../SwapModal';

describe('SwapModal', () => {
  it('lists every alternative for the given exercise', () => {
    const { container } = render(
      <SwapModal exerciseName="Back Squats" onPick={() => {}} onClose={() => {}} />
    );
    expect(container.textContent).toContain('Goblet Squats');
    expect(container.textContent).toContain('Leg Press');
    expect(container.textContent).toContain('Front Squats');
    expect(container.textContent).toContain('Hack Squat');
  });

  it('shows a "no alternatives" message when the exercise has none', () => {
    const { container } = render(
      <SwapModal exerciseName="Yoga Flow" onPick={() => {}} onClose={() => {}} />
    );
    expect(container.textContent.toLowerCase()).toContain('no alternatives');
  });

  it('calls onPick with the alt name when an alt is tapped', () => {
    const onPick = vi.fn();
    const { getByText } = render(
      <SwapModal exerciseName="Back Squats" onPick={onPick} onClose={() => {}} />
    );
    fireEvent.click(getByText('Leg Press'));
    expect(onPick).toHaveBeenCalledWith('Leg Press');
  });

  it('offers a "revert to original" action that calls onPick(null)', () => {
    const onPick = vi.fn();
    const { getByText } = render(
      <SwapModal exerciseName="Back Squats" current="Leg Press" onPick={onPick} onClose={() => {}} />
    );
    fireEvent.click(getByText(/revert/i));
    expect(onPick).toHaveBeenCalledWith(null);
  });
});
