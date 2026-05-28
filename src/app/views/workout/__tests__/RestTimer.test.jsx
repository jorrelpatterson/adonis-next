// src/app/views/workout/__tests__/RestTimer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import RestTimer from '../RestTimer';

describe('RestTimer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders exercise name and starting seconds', () => {
    const { container } = render(
      <RestTimer exerciseName="Back Squats" seconds={60} onDone={() => {}} onSkip={() => {}} />
    );
    expect(container.textContent).toContain('Back Squats');
    expect(container.textContent).toContain('60');
  });

  it('counts down each second', () => {
    const { container } = render(
      <RestTimer exerciseName="Rows" seconds={3} onDone={() => {}} onSkip={() => {}} />
    );
    expect(container.textContent).toContain('3');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.textContent).toContain('2');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.textContent).toContain('1');
  });

  it('calls onDone and vibrates when countdown hits 0', () => {
    const onDone = vi.fn();
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<RestTimer exerciseName="Rows" seconds={1} onDone={onDone} onSkip={() => {}} />);
    act(() => { vi.advanceTimersByTime(1100); });
    expect(onDone).toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith(200);
  });

  it('calls onSkip when skip button clicked', () => {
    const onSkip = vi.fn();
    const { getByText } = render(
      <RestTimer exerciseName="Rows" seconds={60} onDone={() => {}} onSkip={onSkip} />
    );
    fireEvent.click(getByText(/skip/i));
    expect(onSkip).toHaveBeenCalled();
  });
});
