// Task 13 — CheckinModal: Save must stay disabled until all 8 CHECKIN_FIELDS
// are rated, and onSave must receive the exact ratings map the user picked.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import CheckinModal from '../CheckinModal';
import { CHECKIN_FIELDS } from '../../../../state/checkin.js';

function rate(container, label, value) {
  fireEvent.click(container.querySelector(`[aria-label="${label} rating ${value}"]`));
}

describe('CheckinModal', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders a rating row for every CHECKIN_FIELDS entry', () => {
    const { getByText } = render(<CheckinModal onSave={() => {}} onClose={() => {}} />);
    for (const field of CHECKIN_FIELDS) {
      expect(getByText(field.label)).toBeTruthy();
    }
  });

  it('Save is disabled until all 8 fields are rated', () => {
    const { container, getByText } = render(<CheckinModal onSave={() => {}} onClose={() => {}} />);
    const saveBtn = getByText('Save');
    expect(saveBtn.disabled).toBe(true);

    // Rate all but the last field — still disabled.
    for (const field of CHECKIN_FIELDS.slice(0, -1)) {
      rate(container, field.label, 3);
    }
    expect(saveBtn.disabled).toBe(true);

    // Rate the last field — now enabled.
    const last = CHECKIN_FIELDS[CHECKIN_FIELDS.length - 1];
    rate(container, last.label, 3);
    expect(saveBtn.disabled).toBe(false);
  });

  it('onSave receives the exact ratings map the user picked', () => {
    const onSave = vi.fn();
    const { container, getByText } = render(<CheckinModal onSave={onSave} onClose={() => {}} />);

    const expected = {};
    CHECKIN_FIELDS.forEach((field, i) => {
      const value = (i % 5) + 1; // spread across the 1-5 scale
      rate(container, field.label, value);
      expected[field.id] = value;
    });

    fireEvent.click(getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expected);
  });

  it('does not call onSave when clicked while incomplete (native disabled button no-ops)', () => {
    const onSave = vi.fn();
    const { getByText } = render(<CheckinModal onSave={onSave} onClose={() => {}} />);
    fireEvent.click(getByText('Save'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('auto-closes shortly after a successful save', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { container, getByText } = render(<CheckinModal onSave={onSave} onClose={onClose} />);

    for (const field of CHECKIN_FIELDS) {
      rate(container, field.label, 2);
    }
    fireEvent.click(getByText('Save'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Cancel calls onClose without saving', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(<CheckinModal onSave={onSave} onClose={onClose} />);
    fireEvent.click(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
