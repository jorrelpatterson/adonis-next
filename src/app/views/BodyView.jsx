// src/app/views/BodyView.jsx
//
// Slim seam (task-15): Body tab sub-navigation — Train | Food | Weight.
// Sub-tab STRIP markup/styling mirrors v2-revival-archive:src/views/BodyView.jsx
// (see git show v2-revival-archive:src/views/BodyView.jsx), trimmed to the
// three sub-tabs this phase owns. Phase 4's full BodyView port (Peptides
// sub-tab, PhotoJournal, Tools) replaces this strip's CONTENT, not the seam
// itself — the strip pattern is deliberately reused as-is.
//
// App.jsx's own domain header (<H .../>) already renders above this
// component for the 'body' tab, so BodyView does not render its own H —
// unlike the archive version, which owned the whole Body screen.

import React, { useState } from 'react';
import { P, FN } from '../../design/theme';
import WorkoutView from './WorkoutView';
import FoodLogger from '../../views/components/FoodLogger';
import WeightLogger from '../../views/components/WeightLogger';

const SUB_TABS = [
  { id: 'train',  label: 'Train',  icon: '\u{1F4AA}' },
  { id: 'food',   label: 'Food',   icon: '\u{1F37D}️' },
  { id: 'weight', label: 'Weight', icon: '⚖️' },
];

export default function BodyView({ profile, protocolStates, logs, log }) {
  const [subTab, setSubTab] = useState('train');

  return (
    <div>
      {/* Sub-tab navigation — mirrors archive BodyView's strip pattern */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16,
        borderBottom: '1px solid ' + P.bd, paddingBottom: 0,
      }}>
        {SUB_TABS.map(t => {
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: FN, padding: '10px 4px', flex: 1,
                color: isActive ? P.gW : P.txD,
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                borderBottom: '2px solid ' + (isActive ? P.gW : 'transparent'),
                transition: 'color 0.2s, border-color 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'train' && <WorkoutView />}
      {subTab === 'food' && (
        <FoodLogger
          profile={profile}
          protocolStates={protocolStates}
          logs={logs}
          log={log}
        />
      )}
      {subTab === 'weight' && (
        <WeightLogger
          profile={profile}
          logs={logs}
          log={log}
        />
      )}
    </div>
  );
}
