// src/state/__tests__/store.test.jsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { StateProvider, useAppState } from '../store';
import { DEFAULT_STATE } from '../defaults';

function wrapper({ children }) {
  return <StateProvider>{children}</StateProvider>;
}

describe('useAppState', () => {
  beforeEach(() => {
    if (typeof localStorage.clear === 'function') {
      localStorage.clear();
    } else {
      // happy-dom may not implement clear
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      keys.forEach((k) => localStorage.removeItem(k));
    }
  });

  it('returns default state when localStorage is empty', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.profile.tier).toBe('free');
    expect(result.current.state.goals).toEqual([]);
  });

  it('updates profile via setProfile', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setProfile({ name: 'Jorrel', weight: '210' });
    });
    expect(result.current.state.profile.name).toBe('Jorrel');
    expect(result.current.state.profile.weight).toBe('210');
  });

  it('adds a goal via addGoal', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.addGoal({
        title: 'Lose 30lbs',
        domain: 'body',
        type: 'template',
        target: { metric: 'weight', from: 210, to: 180 },
        deadline: '2026-08-01',
      });
    });
    expect(result.current.state.goals).toHaveLength(1);
    expect(result.current.state.goals[0].title).toBe('Lose 30lbs');
    expect(result.current.state.goals[0].status).toBe('active');
    expect(result.current.state.goals[0].id).toBeDefined();
    expect(result.current.state.goals[0].parentId).toBeNull();
    expect(result.current.state.goals[0].progress).toEqual({ percent: 0, current: null, trend: 'on_track', projectedCompletion: null });
    expect(result.current.state.goals[0].revenue).toEqual({ total: 0, items: [] });
  });

  it('addGoal preserves an explicit parentId from the payload (decomposition-ready)', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.addGoal({ title: 'Save $3k', domain: 'money', parentId: 'goal_parent123' });
    });
    expect(result.current.state.goals[0].parentId).toBe('goal_parent123');
  });

  it('updates protocol state via setProtocolState', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setProtocolState('workout', { phase: 'hypertrophy', weekNumber: 5 });
    });
    expect(result.current.state.protocolState.workout.phase).toBe('hypertrophy');
  });
});

// Task 3 (phase5): versioned adonis_v2 storage gate — ledger row 142.
// Missing `_v` (pre-versioning testers, or the migration.js hand-off which
// writes a raw, unstamped blob) is treated as current so existing local data
// survives. A stamped `_v` that doesn't match STORAGE_VERSION (older or
// newer) wipes to DEFAULT_STATE rather than deep-merging a shape we can't
// trust.
//
// This environment's global `localStorage` is Node's own broken Web Storage
// stub (active without `--localstorage-file`) rather than happy-dom's real
// Storage — every method on it is `undefined`, reproducible even outside
// fake timers (see the identical workaround + explanation in
// MindView.test.jsx's "meditation completion" describe block). Swap in an
// in-memory stub for the duration of these tests so both the test's manual
// seeding AND the store's own save effect have something real to call.
describe('versioned storage gate (_v)', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    const memory = new Map();
    const stub = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => { memory.set(k, String(v)); },
      removeItem: (k) => { memory.delete(k); },
      clear: () => { memory.clear(); },
      key: (i) => Array.from(memory.keys())[i] ?? null,
      get length() { return memory.size; },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true, writable: true });
  });

  it('loads a persisted blob with no `_v` normally (back-compat for existing testers)', () => {
    localStorage.setItem('adonis_v2', JSON.stringify({
      ...DEFAULT_STATE,
      profile: { ...DEFAULT_STATE.profile, name: 'Pre-Version Tester' },
    }));
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.profile.name).toBe('Pre-Version Tester');
  });

  it('wipes to DEFAULT_STATE when `_v` does not match STORAGE_VERSION', () => {
    localStorage.setItem('adonis_v2', JSON.stringify({
      ...DEFAULT_STATE,
      profile: { ...DEFAULT_STATE.profile, name: 'Stale Future Blob' },
      _v: 999,
    }));
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.profile.name).toBe(DEFAULT_STATE.profile.name);
    expect(result.current.state).toEqual(DEFAULT_STATE);
  });

  it('a save round-trip stamps `_v: 1` into the persisted blob', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useAppState(), { wrapper });
      act(() => {
        result.current.setProfile({ name: 'Debounced Save' });
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      const saved = JSON.parse(localStorage.getItem('adonis_v2'));
      expect(saved._v).toBe(1);
      expect(saved.profile.name).toBe('Debounced Save');
    } finally {
      vi.useRealTimers();
    }
  });

  it('`_v` never leaks into the in-memory state object', () => {
    localStorage.setItem('adonis_v2', JSON.stringify({ ...DEFAULT_STATE, _v: 1 }));
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state._v).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result.current.state, '_v')).toBe(false);
  });
});
