// src/app/views/workout/__tests__/DaySelector.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DaySelector from '../DaySelector';

const program = [
  { d: 'Rest', dur: 0, exercises: [] },
  { d: 'Push', dur: 60, exercises: [{ name: 'X', sets: 3, reps: '8' }] },
  { d: 'Pull', dur: 60, exercises: [{ name: 'Y', sets: 3, reps: '8' }] },
  { d: 'Legs', dur: 60, exercises: [{ name: 'Z', sets: 3, reps: '8' }] },
  { d: 'Rest', dur: 0, exercises: [] },
  { d: 'Pump', dur: 45, exercises: [{ name: 'W', sets: 3, reps: '10' }] },
  { d: 'Rest', dur: 0, exercises: [] },
];

describe('DaySelector', () => {
  it('renders 7 day buttons labeled S M T W T F S', () => {
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={1} program={program} wkLogs={{}} onSelect={() => {}} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(7);
    const labels = Array.from(buttons).map(b => b.textContent || '');
    ['S','M','T','W','T','F','S'].forEach((letter, i) => {
      expect(labels[i].startsWith(letter)).toBe(true);
    });
  });

  it('calls onSelect with the clicked dayIdx', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={1} program={program} wkLogs={{}} onSelect={onSelect} />
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[3]);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('marks the active day visually (data-active attr)', () => {
    const { container } = render(
      <DaySelector goal="Muscle Gain" week={1} dayIdx={2} program={program} wkLogs={{}} onSelect={() => {}} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[2].getAttribute('data-active')).toBe('true');
    expect(buttons[1].getAttribute('data-active')).toBe('false');
  });
});
