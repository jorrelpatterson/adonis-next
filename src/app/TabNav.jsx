// TabNav — bottom navigation, premium polish:
// - Glass material (backdrop-filter) replacing flat color
// - Bespoke SVG icons (no system emoji), single line-weight
// - Active item: full-color icon scaled +8%, breathing dot above
// - Inactive: desaturated, 0.55 opacity
// - Press feedback: scale on tap via global :active rule
// - Safe-area padding for iOS home indicator
// - viewTransitionName persists the bar across tab transitions

import React from 'react';
import { P, FN } from '../design/theme';
import { DOMAINS } from '../design/constants';
import { DomainIcon } from '../design/icons';

const FIXED_TABS = [
  { id: 'routine', label: 'Routine' },
];

const INSIGHTS_TAB = { id: 'insights', label: 'Insights' };
const PROFILE_TAB  = { id: 'profile',  label: 'Profile' };

export default function TabNav({ activeTab, onTabChange, domains = [] }) {
  const domainTabs = DOMAINS
    .filter(d => domains.includes(d.id))
    .map(d => ({ id: d.id, label: d.name }));

  const tabs = [...FIXED_TABS, ...domainTabs, INSIGHTS_TAB, PROFILE_TAB];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'rgba(6,7,9,0.72)',
      backdropFilter: 'blur(36px) saturate(180%)',
      WebkitBackdropFilter: 'blur(36px) saturate(180%)',
      borderTop: '1px solid rgba(232,213,183,0.06)',
      boxShadow: '0 -16px 48px rgba(0,0,0,0.5), 0 -1px 0 0 rgba(255,255,255,0.04) inset',
      display: 'flex', justifyContent: 'center',
      padding: '6px 0 env(safe-area-inset-bottom, 6px)',
      zIndex: 100,
      viewTransitionName: 'tabnav',
    }}>
      <div style={{ display: 'flex', gap: 2, maxWidth: 640, width: '100%', justifyContent: 'space-around' }}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`adn-nav-item ${isActive ? 'active' : ''}`}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '10px 4px 8px', cursor: 'pointer',
                background: 'transparent', border: 'none', fontFamily: FN,
                position: 'relative',
                color: isActive ? P.gW : P.txD,
                opacity: isActive ? 1 : 0.55,
              }}
            >
              <span style={{
                display: 'inline-flex',
                transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                transform: isActive ? 'translateY(-1px) scale(1.08)' : 'scale(1)',
              }}>
                <DomainIcon id={tab.id} size={22} />
              </span>
              <span style={{
                fontSize: 8.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? P.gW : P.txD,
                textTransform: 'uppercase', letterSpacing: 1.2,
                transition: 'color 0.35s, font-weight 0.35s',
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
