// Smoke tests for PhotoJournal — progress photo grid + lightbox (ported
// verbatim from v2-revival-archive; imports resolved unchanged against
// main's src/design/{sound,haptics,EmptyState,illustrations}).
//
// Canvas capture/watermark (watermarkDataUrl()) only runs inside
// ingestPhoto — it never touches the canvas API during mount or render, so
// the "empty state" / "seeded grid" / "delete" tests below exercise mount,
// empty state, the seeded grid, and delete-via-lightbox without needing to
// stub CanvasRenderingContext2D (happy-dom's canvas support is limited/
// absent: HTMLCanvasElement.getContext() unconditionally returns null —
// see node_modules/happy-dom/src/nodes/html-canvas-element/
// HTMLCanvasElement.ts). The "native camera ingest" describe block below
// DOES need to exercise that pipeline (Task 1: iOS P3 native camera), so it
// stubs canvas + Image locally, scoped to just those tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PhotoJournal from '../PhotoJournal';
import { isNativePlatform, pickProgressPhoto } from '../../../platform/camera';

vi.mock('../../../design/sound', () => ({
  sound: { success: vi.fn(), tap: vi.fn(), toggleOff: vi.fn() },
}));
vi.mock('../../../design/haptics', () => ({
  haptics: { success: vi.fn(), light: vi.fn() },
}));
// PhotoJournal resolves isNativePlatform() once on mount (see the
// component's header comment on why) — every test in this file mounts it,
// so default to web (false) here and let the native-specific describe
// block below override per-test. Without this mock, mounting would hit the
// REAL platform/camera.js, which dynamic-imports the real @capacitor/core
// — harmless functionally (resolves false off-native), but this repo's
// convention (see storage.test.js/status-bar.test.js) is to keep platform
// bridges mocked out of component tests that don't care about them.
vi.mock('../../../platform/camera', () => ({
  isNativePlatform: vi.fn(),
  pickProgressPhoto: vi.fn(),
}));

// Tiny 1x1 transparent PNG — enough to stand in for a watermarked photo
// without touching canvas/image decoding.
const STUB_PHOTO_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

beforeEach(() => {
  // Default every test to web — matches PhotoJournal's initial `native`
  // state (useState(false)), so tests that never care about the native
  // camera path don't need their own mock setup.
  isNativePlatform.mockResolvedValue(false);
  pickProgressPhoto.mockResolvedValue(null);
});

afterEach(() => {
  // Clear call counts (not implementations — the beforeEach above
  // re-establishes those before every test regardless) so
  // toHaveBeenCalled()-style assertions in one test never see calls left
  // over from another.
  vi.clearAllMocks();
});

describe('PhotoJournal — empty state', () => {
  it('renders the empty state when logs.progressPhotos is missing/empty', async () => {
    render(<PhotoJournal logs={{}} log={vi.fn()} />);
    screen.getByText('No photos yet');
    // Let the mount-time isNativePlatform() resolution settle inside this
    // test's act() tracking, rather than have it fire (harmlessly, but
    // noisily) during whichever test happens to run next.
    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());
  });

  it('renders the empty state for an explicit empty array', async () => {
    render(<PhotoJournal logs={{ progressPhotos: [] }} log={vi.fn()} />);
    screen.getByText('No photos yet');
    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());
  });
});

describe('PhotoJournal — seeded grid', () => {
  const seededLogs = {
    progressPhotos: [
      { date: '2026-07-01', iso: '2026-07-01T12:00:00.000Z', data: STUB_PHOTO_DATA },
    ],
  };

  it('renders a grid item for a seeded photo (no empty state)', async () => {
    render(<PhotoJournal logs={seededLogs} log={vi.fn()} />);

    expect(screen.queryByText('No photos yet')).toBeNull();
    screen.getByLabelText(/Photo from Jul 1, 2026/);
    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());
  });

  it('opening the lightbox and deleting removes the photo via log("progressPhotos", ...)', async () => {
    const logFn = vi.fn();
    render(<PhotoJournal logs={seededLogs} log={logFn} />);
    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/Photo from Jul 1, 2026/));
    fireEvent.click(screen.getByText('Delete'));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [key, next] = logFn.mock.calls[0];
    expect(key).toBe('progressPhotos');
    expect(next).toHaveLength(0);
  });

  it('deleting one of multiple photos only removes the targeted entry (length assertion)', async () => {
    const logs = {
      progressPhotos: [
        { date: '2026-07-01', iso: '2026-07-01T12:00:00.000Z', data: STUB_PHOTO_DATA },
        { date: '2026-06-24', iso: '2026-06-24T12:00:00.000Z', data: STUB_PHOTO_DATA },
      ],
    };
    const logFn = vi.fn();
    render(<PhotoJournal logs={logs} log={logFn} />);
    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/Photo from Jul 1, 2026/));
    fireEvent.click(screen.getByText('Delete'));

    expect(logFn).toHaveBeenCalledTimes(1);
    const [, next] = logFn.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0].iso).toBe('2026-06-24T12:00:00.000Z');
  });
});

// Task 1 (iOS P3): native camera routing. isNativePlatform() is resolved
// once on mount (see PhotoJournal's header comment on why the click
// handler itself must stay synchronous), so these tests wait for that to
// settle before tapping "+ Add".
describe('PhotoJournal — Add button routes by platform', () => {
  it('on web, tapping Add clicks the hidden file input and never calls pickProgressPhoto', async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<PhotoJournal logs={{}} log={vi.fn()} />);

    await waitFor(() => expect(isNativePlatform).toHaveBeenCalled());
    fireEvent.click(screen.getByText('+ Add'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(pickProgressPhoto).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('on native, tapping Add calls pickProgressPhoto instead of the file input', async () => {
    isNativePlatform.mockResolvedValue(true);
    pickProgressPhoto.mockResolvedValue(null); // user cancels — nothing to ingest
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<PhotoJournal logs={{}} log={vi.fn()} />);

    // Flush the mount effect's isNativePlatform().then(setNative) inside
    // act() so `native` has actually committed BEFORE we tap — a single
    // real click's branch is decided at click time, so (unlike the tests
    // below that don't care about the file input) this one can't use a
    // retry-click waitFor: retrying would click the file input on the
    // pre-flip attempts and make the "never called" assertion below
    // meaningless.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByText('+ Add'));

    await waitFor(() => expect(pickProgressPhoto).toHaveBeenCalledTimes(1));
    expect(clickSpy).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('native cancel (pickProgressPhoto resolves null) never calls log', async () => {
    isNativePlatform.mockResolvedValue(true);
    pickProgressPhoto.mockResolvedValue(null);
    const logFn = vi.fn();
    render(<PhotoJournal logs={{}} log={logFn} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Add'));
      expect(pickProgressPhoto).toHaveBeenCalled();
    });

    // Give any (incorrect) ingest pipeline a chance to run before asserting
    // it didn't.
    await act(async () => { await Promise.resolve(); });
    expect(logFn).not.toHaveBeenCalled();
  });
});

// Task 1 (iOS P3): the native camera's dataUrl feeds the SAME
// watermark -> cap -> save pipeline the web file input already used
// (ingestPhoto, extracted from the old File-only handleSelect). Real
// watermarking needs canvas 2D + image decoding, neither of which
// happy-dom implements (see this file's header comment), so these stub
// both — scoped to just this block — to exercise the real pipeline
// end-to-end instead of re-testing canvas pixels.
describe('PhotoJournal — native camera ingest (dataUrl -> watermark -> cap -> save)', () => {
  const WATERMARKED_DATA = 'data:image/jpeg;base64,WATERMARKED';
  let getContextSpy;
  let toDataURLSpy;

  beforeEach(() => {
    isNativePlatform.mockResolvedValue(true);

    vi.stubGlobal(
      'Image',
      class {
        set src(_value) {
          queueMicrotask(() => {
            this.width = 400;
            this.height = 300;
            this.onload?.();
          });
        }
      }
    );
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
    });
    toDataURLSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValue(WATERMARKED_DATA);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    getContextSpy.mockRestore();
    toDataURLSpy.mockRestore();
  });

  it('watermarks the camera dataUrl and saves it via log("progressPhotos", ...)', async () => {
    pickProgressPhoto.mockResolvedValue('data:image/png;base64,RAWCAMERA');
    const logFn = vi.fn();
    render(<PhotoJournal logs={{}} log={logFn} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Add'));
      expect(logFn).toHaveBeenCalled();
    });

    const [key, next] = logFn.mock.calls[0];
    expect(key).toBe('progressPhotos');
    expect(next[0].data).toBe(WATERMARKED_DATA);
  });

  it('prepends the new photo and caps the list at 30', async () => {
    pickProgressPhoto.mockResolvedValue('data:image/png;base64,RAWCAMERA');
    const thirty = Array.from({ length: 30 }, (_, i) => ({
      date: '2026-06-01',
      iso: `2026-06-01T00:00:0${i % 10}.000Z-${i}`,
      data: STUB_PHOTO_DATA,
    }));
    const logFn = vi.fn();
    render(<PhotoJournal logs={{ progressPhotos: thirty }} log={logFn} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Add'));
      expect(logFn).toHaveBeenCalled();
    });

    const [, next] = logFn.mock.calls[0];
    expect(next).toHaveLength(30);
    expect(next[0].data).toBe(WATERMARKED_DATA);
  });
});
