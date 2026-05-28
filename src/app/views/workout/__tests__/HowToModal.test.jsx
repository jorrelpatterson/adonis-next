// src/app/views/workout/__tests__/HowToModal.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import HowToModal from '../HowToModal';

describe('HowToModal', () => {
  it('renders muscles, form, tips, and level for a known exercise', () => {
    const { container } = render(
      <HowToModal exerciseName="Back Squats" onClose={() => {}} />
    );
    expect(container.textContent).toContain('Quads');
    expect(container.textContent).toContain('high bar');
    expect(container.textContent).toMatch(/chest up/i);
    expect(container.textContent.toLowerCase()).toContain('advanced');
  });

  it('renders a YouTube link to the form video', () => {
    const { container } = render(
      <HowToModal exerciseName="Back Squats" onClose={() => {}} />
    );
    const link = container.querySelector('a[href*="youtube.com"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toContain('Back%20Squats');
  });

  it('calls onClose when backdrop or close button clicked', () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <HowToModal exerciseName="Back Squats" onClose={onClose} />
    );
    fireEvent.click(getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back gracefully for an unknown exercise', () => {
    const { container } = render(
      <HowToModal exerciseName="Mystery Move" onClose={() => {}} />
    );
    expect(container.textContent).toContain('Mystery Move');
    expect(container.querySelector('a[href*="youtube.com"]')).not.toBeNull();
  });
});
