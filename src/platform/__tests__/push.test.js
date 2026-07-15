// src/platform/__tests__/push.test.js
//
// push.js branches entirely on Capacitor.isNativePlatform() (dynamic import
// of @capacitor/core, cached at module scope) — same shape as
// camera.js/deep-link.js/storage.js/status-bar.js, so this mirrors their
// per-scenario vi.resetModules() + vi.doMock() + re-import('../push.js')
// pattern rather than a single top-level vi.mock.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('platform/push', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/push-notifications');
  });

  describe('web (isNativePlatform: false)', () => {
    const checkPermissions = vi.fn();
    const requestPermissions = vi.fn();
    const register = vi.fn();
    const addListener = vi.fn();

    beforeEach(() => {
      checkPermissions.mockClear();
      requestPermissions.mockClear();
      register.mockClear();
      addListener.mockClear();
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => false },
      }));
      // Mocked (with spies) even though the web path should never reach it
      // — same idiom as camera.test.js/deep-link.test.js's web scenarios:
      // assert the native plugin's calls were never made, rather than just
      // hoping a stray import doesn't throw.
      vi.doMock('@capacitor/push-notifications', () => ({
        PushNotifications: { checkPermissions, requestPermissions, register, addListener },
      }));
    });

    it('getPushPermissionState resolves denied without calling checkPermissions', async () => {
      const { getPushPermissionState } = await import('../push.js');
      await expect(getPushPermissionState()).resolves.toBe('denied');
      expect(checkPermissions).not.toHaveBeenCalled();
    });

    it('requestAndRegister resolves denied without calling any plugin method or saveToken', async () => {
      const { requestAndRegister } = await import('../push.js');
      const saveToken = vi.fn();
      await expect(requestAndRegister(saveToken)).resolves.toBe('denied');
      expect(requestPermissions).not.toHaveBeenCalled();
      expect(register).not.toHaveBeenCalled();
      expect(addListener).not.toHaveBeenCalled();
      expect(saveToken).not.toHaveBeenCalled();
    });

    it('initPushListeners resolves without registering any listener', async () => {
      const { initPushListeners } = await import('../push.js');
      await initPushListeners(vi.fn());
      expect(addListener).not.toHaveBeenCalled();
    });
  });

  describe('native', () => {
    let checkPermissions, requestPermissions, register, addListener;
    let capturedRegistrationCb, capturedReceivedCb, capturedActionCb;
    let removeSpy;

    beforeEach(() => {
      capturedRegistrationCb = null;
      capturedReceivedCb = null;
      capturedActionCb = null;
      removeSpy = vi.fn().mockResolvedValue(undefined);
      checkPermissions = vi.fn();
      requestPermissions = vi.fn();
      register = vi.fn().mockResolvedValue(undefined);
      addListener = vi.fn((event, cb) => {
        if (event === 'registration') capturedRegistrationCb = cb;
        if (event === 'pushNotificationReceived') capturedReceivedCb = cb;
        if (event === 'pushNotificationActionPerformed') capturedActionCb = cb;
        return Promise.resolve({ remove: removeSpy });
      });
      vi.doMock('@capacitor/core', () => ({
        Capacitor: { isNativePlatform: () => true },
      }));
      vi.doMock('@capacitor/push-notifications', () => ({
        PushNotifications: { checkPermissions, requestPermissions, register, addListener },
      }));
    });

    describe('getPushPermissionState', () => {
      it.each([
        ['granted', 'granted'],
        ['denied', 'denied'],
        ['prompt', 'prompt'],
        ['prompt-with-rationale', 'prompt'],
        [undefined, 'prompt'],
      ])('checkPermissions receive=%s -> %s', async (receive, expected) => {
        checkPermissions.mockResolvedValue({ receive });
        const { getPushPermissionState } = await import('../push.js');
        await expect(getPushPermissionState()).resolves.toBe(expected);
      });

      it('resolves denied (not a throw) if checkPermissions rejects', async () => {
        checkPermissions.mockRejectedValue(new Error('native bridge down'));
        const { getPushPermissionState } = await import('../push.js');
        await expect(getPushPermissionState()).resolves.toBe('denied');
      });
    });

    describe('requestAndRegister', () => {
      it('denied: requestPermissions is called, but register/addListener/saveToken never are', async () => {
        requestPermissions.mockResolvedValue({ receive: 'denied' });
        const saveToken = vi.fn();
        const { requestAndRegister } = await import('../push.js');

        await expect(requestAndRegister(saveToken)).resolves.toBe('denied');

        expect(requestPermissions).toHaveBeenCalledTimes(1);
        expect(register).not.toHaveBeenCalled();
        expect(addListener).not.toHaveBeenCalled();
        expect(saveToken).not.toHaveBeenCalled();
      });

      it('granted: wires a registration listener and calls register()', async () => {
        requestPermissions.mockResolvedValue({ receive: 'granted' });
        const saveToken = vi.fn();
        const { requestAndRegister } = await import('../push.js');

        await expect(requestAndRegister(saveToken)).resolves.toBe('granted');

        expect(addListener).toHaveBeenCalledWith('registration', expect.any(Function));
        expect(register).toHaveBeenCalledTimes(1);
        // No token has arrived yet at this point — saveToken is only ever
        // called from the registration event callback, not by register()
        // resolving.
        expect(saveToken).not.toHaveBeenCalled();
      });

      it('granted + a token later arrives via the registration event: saveToken gets token.value, listener unlistens itself', async () => {
        requestPermissions.mockResolvedValue({ receive: 'granted' });
        const saveToken = vi.fn();
        const { requestAndRegister } = await import('../push.js');
        await requestAndRegister(saveToken);

        await capturedRegistrationCb({ value: 'abc-apns-token' });

        expect(saveToken).toHaveBeenCalledWith('abc-apns-token');
        expect(removeSpy).toHaveBeenCalledTimes(1);
      });

      it('granted but no token ever arrives (Simulator reality): still resolves granted, saveToken never called', async () => {
        requestPermissions.mockResolvedValue({ receive: 'granted' });
        const saveToken = vi.fn();
        const { requestAndRegister } = await import('../push.js');

        await expect(requestAndRegister(saveToken)).resolves.toBe('granted');
        expect(saveToken).not.toHaveBeenCalled();
      });

      it('a throwing/rejecting saveToken never crashes the registration callback', async () => {
        requestPermissions.mockResolvedValue({ receive: 'granted' });
        const saveToken = vi.fn().mockRejectedValue(new Error('endpoint 404 — Task 4 not shipped yet'));
        const { requestAndRegister } = await import('../push.js');
        await requestAndRegister(saveToken);

        await expect(capturedRegistrationCb({ value: 'tok' })).resolves.not.toThrow();
      });

      it('resolves denied (not a throw) if requestPermissions rejects', async () => {
        requestPermissions.mockRejectedValue(new Error('native bridge down'));
        const { requestAndRegister } = await import('../push.js');
        await expect(requestAndRegister(vi.fn())).resolves.toBe('denied');
      });

      it('still resolves granted even if register() itself throws — permission is already a settled fact', async () => {
        requestPermissions.mockResolvedValue({ receive: 'granted' });
        register.mockRejectedValue(new Error('registration plumbing failed'));
        const { requestAndRegister } = await import('../push.js');
        await expect(requestAndRegister(vi.fn())).resolves.toBe('granted');
      });
    });

    describe('initPushListeners', () => {
      it('registers pushNotificationReceived and pushNotificationActionPerformed', async () => {
        const { initPushListeners } = await import('../push.js');
        await initPushListeners(vi.fn());

        expect(addListener).toHaveBeenCalledWith('pushNotificationReceived', expect.any(Function));
        expect(addListener).toHaveBeenCalledWith('pushNotificationActionPerformed', expect.any(Function));
      });

      it('a foreground receive never throws (registered, currently a no-op)', async () => {
        const { initPushListeners } = await import('../push.js');
        await initPushListeners(vi.fn());

        expect(() => capturedReceivedCb({ id: '1', data: {} })).not.toThrow();
      });

      it('a tap whose notification.data.tab is set calls onTapRoute with that tab', async () => {
        const onTapRoute = vi.fn();
        const { initPushListeners } = await import('../push.js');
        await initPushListeners(onTapRoute);

        capturedActionCb({ actionId: 'tap', notification: { id: '1', data: { tab: 'routine' } } });

        expect(onTapRoute).toHaveBeenCalledWith('routine');
      });

      it('a tap with no data.tab never calls onTapRoute', async () => {
        const onTapRoute = vi.fn();
        const { initPushListeners } = await import('../push.js');
        await initPushListeners(onTapRoute);

        capturedActionCb({ actionId: 'tap', notification: { id: '1', data: {} } });

        expect(onTapRoute).not.toHaveBeenCalled();
      });
    });
  });
});
