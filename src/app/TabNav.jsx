// src/app/TabNav.jsx
import React from 'react';
import { P, FN } from '../design/theme';
import { DOMAINS } from '../design/constants';

const FIXED_TABS = [
  { id: 'routine', icon: '\u{1F4CB}', label: 'Routine' },
];

const PROFILE_TAB = { id: 'profile', icon: '\u2699\uFE0F', label: 'Profile' };

export default function TabNav({ activeTab, onTabChange, domains = [] }) {
  const domainTabs = DOMAINS
    .filter(d => domains.includes(d.id))
    .map(d => ({ id: d.id, icon: d.icon, label: d.name }));

  const tabs = [...FIXED_TABS, ...domainTabs, PROFILE_TAB];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: P.bg, borderTop: '1px solid ' + P.bd,
      display: 'flex', justifyContent: 'center',
      padding: '6px 0 env(safe-area-inset-bottom, 6px)',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', gap: 2, maxWidth: 640, width: '100%', justifyContent: 'space-around' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 4px', cursor: 'pointer',
                background: 'transparent', border: 'none', fontFamily: FN,
              }}>
              <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.4 }}>{tab.icon}</span>
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
