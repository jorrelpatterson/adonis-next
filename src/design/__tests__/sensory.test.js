import { describe, it, expect, vi, afterEach } from 'vitest';
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
  it('exposes the six intents and never throws without navigator.vibrate', () => {
    for (const k of ['light', 'medium', 'heavy', 'success', 'warning', 'error']) {
      expect(() => haptics[k](), k).not.toThrow();
    }
  });

  it('vibrates with the intent pattern when the platform supports it', () => {
    const spy = vi.fn();
    vi.stubGlobal('navigator', { vibrate: spy });
    haptics.heavy();
    expect(spy).toHaveBeenCalledWith([20, 10, 20]);
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
