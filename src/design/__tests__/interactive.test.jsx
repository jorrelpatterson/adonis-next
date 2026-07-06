import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../Toast';
import Select from '../Select';

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
});
