import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';
import Select from '../Select';
import { haptics } from '../haptics';

function ToastDemo() {
  const toast = useToast();
  return <button onClick={() => toast.success('Saved')}>fire</button>;
}

describe('Toast', () => {
  it('success() renders the message pill', () => {
    const { getByText } = render(<ToastProvider><ToastDemo /></ToastProvider>);
    fireEvent.click(getByText('fire'));
    expect(getByText('Saved')).toBeTruthy();
  });
});

describe('Select', () => {
  it('shows the selected option label', () => {
    const { getByText } = render(
      <Select value="b" onChange={() => {}} options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]} />
    );
    expect(getByText('Beta')).toBeTruthy();
  });

  it('opens and selects an option', () => {
    let picked = null;
    const { getByText, getAllByText } = render(
      <Select value="a" onChange={(v) => { picked = v; }} options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]} />
    );
    fireEvent.click(getByText('Alpha'));            // open the sheet (trigger shows current)
    fireEvent.click(getAllByText('Beta').pop());    // choose from the sheet list
    expect(picked).toBe('b');
  });

  // iOS P2 Task 2b: a bottom-sheet pick is a discrete picker choice, not a
  // celebration — was haptics.success() (the triple-notification burst),
  // over-firing on every routine pick. Spies on the real module (this file
  // has no vi.mock('../haptics'), so Toast's haptic-free tests above stay
  // unaffected) rather than asserting on a full module mock.
  it('fires haptics.selection (not success) on pick', () => {
    const selectionSpy = vi.spyOn(haptics, 'selection').mockImplementation(() => {});
    const successSpy = vi.spyOn(haptics, 'success').mockImplementation(() => {});
    const { getByText, getAllByText } = render(
      <Select value="a" onChange={() => {}} options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]} />
    );
    fireEvent.click(getByText('Alpha'));
    fireEvent.click(getAllByText('Beta').pop());
    expect(selectionSpy).toHaveBeenCalledTimes(1);
    expect(successSpy).not.toHaveBeenCalled();
    selectionSpy.mockRestore();
    successSpy.mockRestore();
  });
});
