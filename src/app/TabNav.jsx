// src/app/TabNav.jsx
import React from 'react';
import { P, FN } from '../design/theme';
import { DOMAINS } from '../design/constants';

const FIXED_TABS = [
  { id: 'home', icon: '\u{1F3E0}', label: 'Home' },
  { id: 'routine', icon: '\u{1F4CB}', label: 'Routine' },
];

// Task 11: fixed tab, always present between domain tabs and Profile \u2014
// InsightsView reads across all domains' logs, so it isn't gated by which
// domains a user has active (unlike the domain tabs above).
const INSIGHTS_TAB = { id: 'insights', icon: '\u{1F4CA}', label: 'Insights' };

const PROFILE_TAB = { id: 'profile', icon: '\u2699\uFE0F', label: 'Profile' };

// Task 12 (DoD item 7): `lockedIds` is a plain array of domain ids the
// caller (App.jsx, via tier-gate.js's isDomainLocked) has determined are
// gated for the current profile's tier. TabNav stays presentational — it
// only decides whether to draw the 🔒 suffix, never the gating logic itself.
export default function TabNav({ activeTab, onTabChange, domains = [], lockedIds = [] }) {
  const domainTabs = DOMAINS
    .filter(d => domains.includes(d.id))
    .map(d => ({ id: d.id, icon: d.icon, label: d.name }));

  const tabs = [...FIXED_TABS, ...domainTabs, INSIGHTS_TAB, PROFILE_TAB];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: P.bg, borderTop: '1px solid ' + P.bd,
      display: 'flex', justifyContent: 'center',
      // Additive (not the old env()-as-fallback form): the bar keeps its
      // normal 6px breathing room above the tab labels AND grows taller by
      // --safe-bottom so labels clear the home indicator instead of the
      // safe-area value replacing the padding outright. 0 on web — the bar
      // is byte-for-byte the same height it always was there.
      padding: '6px 0 calc(6px + var(--safe-bottom))',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', gap: 2, maxWidth: 640, width: '100%', justifyContent: 'space-around' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          const isLocked = lockedIds.includes(tab.id);
          return (
            <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 4px', cursor: 'pointer',
                background: 'transparent', border: 'none', fontFamily: FN,
              }}>
              <span style={{ position: 'relative', fontSize: 18, opacity: isActive ? 1 : 0.4 }}>
                {tab.icon}
                {isLocked && (
                  <span data-testid={`tab-lock-${tab.id}`} style={{
                    position: 'absolute', bottom: -3, right: -7, fontSize: 9,
                  }}>
                    {'\u{1F512}'}
                  </span>
                )}
              </span>
              <span style={{
                fontSize: 8, fontWeight: isActive ? 700 : 500,
                color: isActive ? P.gW : P.txD,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
