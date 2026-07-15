// src/platform/__tests__/camera.test.js
//
// camera.js branches entirely on Capacitor.isNativePlatform() (dynamic
// import of @capacitor/core, cached at module scope) — same shape as
// storage.js/status-bar.js, so this mirrors their per-scenario
// vi.resetModules() + vi.doMock() + re-import('../camera.js') pattern
// rather than a single top-level vi.mock.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('platform/camera', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/camera');
  });

  describe('web (isNativePlatform: false)', () => {
    const getPhotoSpy = vi.fn();

    beforeEach(() => {
      getPhotoSpy.mockClear();
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      // Mocked (with a spy) even though the web path should never reach
      // it — same idiom as storage.test.js/status-bar.test.js's web
      // scenarios: assert the native plugin's calls were never made,
      // rather than just hoping a stray import doesn't throw.
      vi.doMock('@capacitor/camera', () => ({
        Camera: { getPhoto: getPhotoSpy },
        CameraResultType: { DataUrl: 'dataUrl' },
        CameraSource: { Prompt: 'PROMPT' },
      }));
    });

    it('isNativePlatform resolves false', async () => {
      const { isNativePlatform } = await import('../camera.js');
      await expect(isNativePlatform()).resolves.toBe(false);
    });

    it('pickProgressPhoto resolves null and never calls @capacitor/camera', async () => {
      const { pickProgressPhoto } = await import('../camera.js');
      await expect(pickProgressPhoto()).resolves.toBeNull();
      expect(getPhotoSpy).not.toHaveBeenCalled();
    });
  });

  describe('native — user picks a photo (getPhoto resolves a dataUrl)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/camera', () => ({
        Camera: {
          getPhoto: vi.fn().mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,AAAA' }),
        },
        CameraResultType: { DataUrl: 'dataUrl' },
        CameraSource: { Prompt: 'PROMPT' },
      }));
    });

    it('isNativePlatform resolves true', async () => {
      const { isNativePlatform } = await import('../camera.js');
      await expect(isNativePlatform()).resolves.toBe(true);
    });

    it('returns the photo dataUrl, calling getPhoto with Prompt/DataUrl/quality 80', async () => {
      const { pickProgressPhoto } = await import('../camera.js');
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const result = await pickProgressPhoto();

      expect(result).toBe('data:image/jpeg;base64,AAAA');
      expect(Camera.getPhoto).toHaveBeenCalledWith({
        source: CameraSource.Prompt,
        resultType: CameraResultType.DataUrl,
        quality: 80,
      });
    });
  });

  describe('native — user cancels the picker (getPhoto rejects)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/camera', () => ({
        Camera: {
          getPhoto: vi.fn().mockRejectedValue(new Error('User cancelled photos app')),
        },
        CameraResultType: { DataUrl: 'dataUrl' },
        CameraSource: { Prompt: 'PROMPT' },
      }));
    });

    it('resolves null instead of throwing', async () => {
      const { pickProgressPhoto } = await import('../camera.js');
      await expect(pickProgressPhoto()).resolves.toBeNull();
    });
  });

  describe('native — getPhoto rejects for a non-cancel reason (e.g. permission denied)', () => {
    beforeEach(() => {
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/camera', () => ({
        Camera: {
          getPhoto: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
        CameraResultType: { DataUrl: 'dataUrl' },
        CameraSource: { Prompt: 'PROMPT' },
      }));
    });

    it('still resolves null rather than throwing (caller treats every failure alike)', async () => {
      const { pickProgressPhoto } = await import('../camera.js');
      await expect(pickProgressPhoto()).resolves.toBeNull();
    });
  });
});
