// src/app/__tests__/domain-dispatch.test.jsx
// Task 14 — DOMAIN_VIEWS dispatch. Mirrors domain-gating.test.jsx's mocking +
// store-seeding patterns (Seed component driving the store's replaceState
// action). For each of the 7 mapped domains (body has its own dedicated
// branch and isn't part of DOMAIN_VIEWS):
//   1. pro tier + that domain active -> clicking its tab renders the view's
//      hero heading (an <h2>, per src/design/components/H.jsx).
//   2. domainGoals filtering -> seeding one goal in that domain and one in
//      'body' shows only the matching goal's title in the rendered view.
// Plus one free-tier regression case (Task 12) confirming the dispatch is
// still gated behind LockedDomain.
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
import App from '../App';
import { useAuth } from '../../services/useAuth.js';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: vi.fn(),
}));

const ALL_DOMAINS = ['body', 'money', 'travel', 'mind', 'image', 'purpose', 'environment', 'community'];

// Task 14: hero heading text is the exact `t` string each view passes to
// <H/> (see e.g. src/views/MoneyView.jsx's `<H t={'\u{1F4B0} Money'} .../>`)
// minus the emoji — a plain-word match is enough to prove the *right* view
// mounted without hard-coding emoji codepoints in the test.
const DOMAIN_CASES = [
  { id: 'money', heading: 'Money' },
  { id: 'travel', heading: 'Travel' },
  { id: 'mind', heading: 'Mind' },
  { id: 'image', heading: 'Image' },
  { id: 'purpose', heading: 'Purpose' },
  { id: 'environment', heading: 'Environment' },
  { id: 'community', heading: 'Community' },
];

const BASE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ALL_DOMAINS, tier: 'pro',
};

function Seed({ profile, goals }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile, goals: goals || [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderApp({ profile, goals }) {
  return render(
    <StateProvider>
      <Seed profile={profile} goals={goals} />
      <App />
    </StateProvider>
  );
}

describe('DOMAIN_VIEWS dispatch (Task 14)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe.each(DOMAIN_CASES)('$id domain', ({ id, heading }) => {
    it(`pro tier: clicking the ${id} tab renders the ${heading} view's hero heading`, () => {
      useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'pro', loading: false, signOut: vi.fn() });

      const { getByTestId, container } = renderApp({ profile: BASE_PROFILE });

      fireEvent.click(getByTestId(`tab-${id}`));

      const heroHeading = container.querySelector('h2');
      expect(heroHeading).toBeTruthy();
      expect(heroHeading.textContent).toContain(heading);
    });

    it(`domainGoals filtering: the ${id} view's Goals rail shows only the ${id}-domain goal`, () => {
      useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'pro', loading: false, signOut: vi.fn() });

      const goals = [
        { id: 'g-domain', title: `${id} goal title`, domain: id, status: 'active', activeProtocols: [], progress: { percent: 40 } },
        { id: 'g-body', title: 'body goal title', domain: 'body', status: 'active', activeProtocols: [], progress: { percent: 10 } },
      ];

      const { getByTestId, container } = renderApp({ profile: BASE_PROFILE, goals });

      fireEvent.click(getByTestId(`tab-${id}`));

      expect(container.textContent).toContain(`${id} goal title`);
      expect(container.textContent).not.toContain('body goal title');
    });
  });

  it('free tier: a mapped domain (Travel) still renders LockedDomain, not its DOMAIN_VIEWS entry (Task 12 regression)', () => {
    useAuth.mockReturnValue({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() });

    const { getByTestId, getByText, queryByText } = renderApp({ profile: { ...BASE_PROFILE, tier: 'free' } });

    fireEvent.click(getByTestId('tab-travel'));

    // LockedDomain also renders an <H t="🌍 Travel"/> hero (same domain
    // metadata TravelView would use), so the heading text alone can't
    // distinguish the two — assert on TravelView-only content instead.
    expect(getByText(/Locked — Pro feature/)).toBeTruthy();
    expect(queryByText(/No travel goals yet/)).toBeNull();
  });
});
