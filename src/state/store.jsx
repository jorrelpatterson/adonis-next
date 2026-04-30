// src/state/store.jsx
import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_STATE } from './defaults';

const STORAGE_KEY = 'adonis_v2';
const DEBOUNCE_MS = 500;

const StateContext = createContext(null);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...parsed.profile },
      logs: { ...DEFAULT_STATE.logs, ...parsed.logs },
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };

    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, {
        id: 'goal_' + Date.now().toString(36),
        status: 'active',
        priority: state.goals.length + 1,
        activeProtocols: [],
        progress: { percent: 0, current: null, trend: 'on_track', projectedCompletion: null },
        revenue: { total: 0, items: [] },
        createdAt: new Date().toISOString().slice(0, 10),
        ...action.payload,
      }]};

    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g) };

    case 'REMOVE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };

    case 'SET_PROTOCOL_STATE':
      return { ...state, protocolState: { ...state.protocolState, [action.payload.id]: { ...state.protocolState[action.payload.id], ...action.payload.data } } };

    case 'LOG':
      return { ...state, logs: { ...state.logs, [action.payload.key]: action.payload.merge ? { ...state.logs[action.payload.key], ...action.payload.data } : action.payload.data } };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'REPLACE_STATE':
      return { ...DEFAULT_STATE, ...action.payload };

    default:
      return state;
  }
}

export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const setProfile = useCallback((data) => dispatch({ type: 'SET_PROFILE', payload: data }), []);
  const addGoal = useCallback((data) => dispatch({ type: 'ADD_GOAL', payload: data }), []);
  const updateGoal = useCallback((data) => dispatch({ type: 'UPDATE_GOAL', payload: data }), []);
  const removeGoal = useCallback((id) => dispatch({ type: 'REMOVE_GOAL', payload: id }), []);
  const setProtocolState = useCallback((id, data) => dispatch({ type: 'SET_PROTOCOL_STATE', payload: { id, data } }), []);
  const log = useCallback((key, data, merge = false) => dispatch({ type: 'LOG', payload: { key, data, merge } }), []);
  const setSettings = useCallback((data) => dispatch({ type: 'SET_SETTINGS', payload: data }), []);
  const replaceState = useCallback((data) => dispatch({ type: 'REPLACE_STATE', payload: data }), []);

  const value = {
    state,
    setProfile,
    addGoal,
    updateGoal,
    removeGoal,
    setProtocolState,
    log,
    setSettings,
    replaceState,
  };

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within StateProvider');
  return ctx;
}
