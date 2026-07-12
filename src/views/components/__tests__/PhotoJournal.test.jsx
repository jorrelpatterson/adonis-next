// Smoke tests for PhotoJournal — progress photo grid + lightbox (ported
// verbatim from v2-revival-archive; imports resolved unchanged against
// main's src/design/{sound,haptics,EmptyState,illustrations}).
//
// Canvas capture/watermark (watermarkImage()) only runs inside the file
// <input> onChange handler — it never touches the canvas API during mount
// or render, so these tests exercise mount, empty state, the seeded grid,
// and delete-via-lightbox without needing to stub CanvasRenderingContext2D
// (happy-dom's canvas support is limited/absent — see brief).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoJournal from '../PhotoJournal';

vi.mock('../../../design/sound', () => ({
  sound: { success: vi.fn(), tap: vi.fn(), toggleOff: vi.fn() },
}));
vi.mock('../../../design/haptics', () => ({
  haptics: { success: vi.fn(), light: vi.fn() },
}));

// Tiny 1x1 transparent PNG — enough to stand in for a watermarked photo
// without touching canvas/image decoding.
const STUB_PHOTO_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('PhotoJournal — empty state', () => {
  it('renders the empty state when logs.progressPhotos is missing/empty', () => {
    render(<PhotoJournal logs={{}} log={vi.fn()} />);
    screen.getByText('No photos yet');
  });

  it('renders the empty state for an explicit empty array', () => {
    render(<PhotoJournal logs={{ progressPhotos: [] }} log={vi.fn()} />);
    screen.getByText('No photos yet');
  });
});

describe('PhotoJournal — seeded grid', () => {
  const seededLogs = {
    progressPhotos: [
      { date: '2026-07-01', iso: '2026-07-01T12:00:00.000Z', data: STUB_PHOTO_DATA },
    ],
  };

  it('renders a grid item for a seeded photo (no empty state)', () => {
    render(<PhotoJournal logs={seededLogs} log={vi.fn()} />);

    expect(screen.queryByText('No photos yet')).toBeNull();
    screen.getByLabelText(/Photo from Jul 1, 2026/);
  });

  it('opening the lightbox and deleting removes the photo via log("progressPhotos", ...)', () => {
    const logFn = vi.fn();
    render(<PhotoJournal logs={seededLogs} log={logFn} />);

    fireEvent.click(screen.getByLabelText(/Photo from Jul 1, 2026/));
    fireEvent.click(screen.getByText('Delete'));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [key, next] = logFn.mock.calls[0];
    expect(key).toBe('progressPhotos');
    expect(next).toHaveLength(0);
  });

  it('deleting one of multiple photos only removes the targeted entry (length assertion)', () => {
    const logs = {
      progressPhotos: [
        { date: '2026-07-01', iso: '2026-07-01T12:00:00.000Z', data: STUB_PHOTO_DATA },
        { date: '2026-06-24', iso: '2026-06-24T12:00:00.000Z', data: STUB_PHOTO_DATA },
      ],
    };
    const logFn = vi.fn();
    render(<PhotoJournal logs={logs} log={logFn} />);

    fireEvent.click(screen.getByLabelText(/Photo from Jul 1, 2026/));
    fireEvent.click(screen.getByText('Delete'));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [, next] = logFn.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0].iso).toBe('2026-06-24T12:00:00.000Z');
  });
});
