// src/state/__tests__/store.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
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
  });

  it('updates protocol state via setProtocolState', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setProtocolState('workout', { phase: 'hypertrophy', weekNumber: 5 });
    });
    expect(result.current.state.protocolState.workout.phase).toBe('hypertrophy');
  });
});
