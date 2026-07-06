import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, renderHook, act, fireEvent, waitFor } from '@testing-library/react';
import { useLongPress } from '../useLongPress';
import { ActionSheetProvider, useActionSheet } from '../ActionSheet';
import PullToRefresh from '../PullToRefresh';

describe('useLongPress', () => {
  it('fires after the delay and not before', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delay: 500 }));
    act(() => { result.current.onMouseDown({ clientX: 10, clientY: 10 }); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(cb).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(200); });
    expect(cb).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('cancels when the pointer lifts early', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress(cb, { delay: 500 }));
    act(() => { result.current.onMouseDown({ clientX: 0, clientY: 0 }); });
    act(() => { result.current.onMouseUp(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

function SheetDemo({ onResult }) {
  const { confirm } = useActionSheet();
  return (
    <button onClick={async () => onResult(await confirm({ title: 'Delete goal?', confirmText: 'Delete', destructive: true }))}>
      open
    </button>
  );
}

describe('ActionSheet', () => {
  it('confirm resolves true when the confirm button is tapped', async () => {
    const onResult = vi.fn();
    const { getByText } = render(<ActionSheetProvider><SheetDemo onResult={onResult} /></ActionSheetProvider>);
    fireEvent.click(getByText('open'));
    expect(getByText('Delete goal?')).toBeTruthy();
    fireEvent.click(getByText('Delete'));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });
});

describe('PullToRefresh', () => {
  it('renders without a scroll container present', () => {
    expect(() => render(<PullToRefresh onRefresh={() => {}} />)).not.toThrow();
  });
});
