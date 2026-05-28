// src/app/views/workout/__tests__/WeekSelector.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import WeekSelector from '../WeekSelector';

describe('WeekSelector', () => {
  it('renders current week and phase label', () => {
    const { container } = render(<WeekSelector week={6} onChange={() => {}} />);
    expect(container.textContent).toContain('Week 6');
    expect(container.textContent).toContain('Hypertrophy');
  });

  it('increments on > click, clamped at 16', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(<WeekSelector week={15} onChange={onChange} />);
    fireEvent.click(getByLabelText('next week'));
    expect(onChange).toHaveBeenCalledWith(16);
    rerender(<WeekSelector week={16} onChange={onChange} />);
    fireEvent.click(getByLabelText('next week'));
    expect(onChange).toHaveBeenLastCalledWith(16);
  });

  it('decrements on < click, clamped at 1', () => {
    const onChange = vi.fn();
    const { getByLabelText, rerender } = render(<WeekSelector week={2} onChange={onChange} />);
    fireEvent.click(getByLabelText('previous week'));
    expect(onChange).toHaveBeenCalledWith(1);
    rerender(<WeekSelector week={1} onChange={onChange} />);
    fireEvent.click(getByLabelText('previous week'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
