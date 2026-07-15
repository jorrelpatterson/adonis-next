import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EASE, transitionView, countUpTo } from '../motion';
import { haptics } from '../haptics';
import { sound, setSoundMuted, isSoundMuted } from '../sound';

afterEach(() => vi.unstubAllGlobals());

describe('motion', () => {
  it('exposes the four easing tokens', () => {
    expect(Object.keys(EASE)).toEqual(['spring', 'soft', 'snap', 'stiff']);
  });

  it('transitionView falls back to a synchronous call without startViewTransition', () => {
    const fn = vi.fn();
    const result = transitionView(fn); // happy-dom has no document.startViewTransition
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('countUpTo jumps straight to the target without requestAnimationFrame', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const seen = [];
    const cancel = countUpTo({ from: 0, to: 100, onUpdate: (v) => seen.push(v) });
    expect(seen).toEqual([100]);
    expect(typeof cancel).toBe('function');
  });
});

describe('haptics', () => {
  it('exposes the seven intents and never throws without navigator.vibrate', () => {
    for (const k of ['light', 'medium', 'heavy', 'success', 'warning', 'error', 'selection']) {
      expect(() => haptics[k](), k).not.toThrow();
    }
  });

  // haptics.js now gates every call behind an async isNative() check (see
  // src/design/__tests__/haptics.test.js for the full native-vs-web
  // matrix), so navigator.vibrate no longer fires synchronously — this
  // waits for the platform check's microtask to resolve before asserting,
  // same idiom as platform/storage.test.js and platform/status-bar.test.js.
  it('vibrates with the intent pattern when the platform supports it', async () => {
    const spy = vi.fn();
    vi.stubGlobal('navigator', { vibrate: spy });
    haptics.heavy();
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith([20, 10, 20]);
    });
  });
});

describe('sound', () => {
  it('mute setting round-trips', () => {
    setSoundMuted(true);
    expect(isSoundMuted()).toBe(true);
    setSoundMuted(false);
    expect(isSoundMuted()).toBe(false);
  });

  it('exposes the seven cues and never throws without AudioContext', () => {
    for (const k of ['tap', 'toggleOn', 'toggleOff', 'success', 'pr', 'warning', 'error']) {
      expect(() => sound[k](), k).not.toThrow();
    }
  });
});

// sound.js caches its AudioContext (and mute flag) at module scope, so each
// case below needs a fresh module instance rather than the shared `sound`
// import above — same vi.resetModules() + dynamic re-import idiom as
// src/platform/__tests__/storage.test.js uses for its own module-scope
// cache (nativePromise). This is the "mute-setting respect" unit surface
// for the iOS P2 Task 4 silent-switch policy documented at the top of
// sound.js: the hardware switch itself can't be exercised outside a real
// device (P4 item), but the app-mute gate that sits alongside it is fully
// testable, so it's asserted here directly against the audio mechanism
// (does tone() actually reach the WebAudio graph, or not) rather than just
// the isMuted()/localStorage round-trip above.
describe('sound — mute gates actual audio production', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Minimal WebAudio stand-in covering exactly what tone() in sound.js
  // touches (currentTime, destination, createOscillator, createGain).
  // A plain `function` (not an arrow) so `new MockAudioContext()` can
  // return the shared mock instance per JS constructor-return semantics.
  function mockAudioContext() {
    const oscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const gainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const createOscillator = vi.fn(() => oscillator);
    const createGain = vi.fn(() => gainNode);
    function MockAudioContext() {
      return { currentTime: 0, destination: {}, createOscillator, createGain };
    }
    return { MockAudioContext, createOscillator };
  }

  it('produces no audio when muted', async () => {
    const { MockAudioContext, createOscillator } = mockAudioContext();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const fresh = await import('../sound.js');

    fresh.setSoundMuted(true);
    fresh.sound.tap();

    expect(createOscillator).not.toHaveBeenCalled();
  });

  it('produces audio when unmuted', async () => {
    const { MockAudioContext, createOscillator } = mockAudioContext();
    vi.stubGlobal('AudioContext', MockAudioContext);
    const fresh = await import('../sound.js');

    fresh.setSoundMuted(false);
    fresh.sound.tap();

    expect(createOscillator).toHaveBeenCalledTimes(1);
  });
});
