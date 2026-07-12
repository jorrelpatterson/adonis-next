// src/app/LockedDomain.jsx
//
// Task 12 (DoD item 7) — polished locked state rendered in place of a gated
// domain's content when isDomainLocked(activeTab, profile.tier) is true (see
// ./tier-gate.js). Structurally modeled on BucketListTeaser's lock-pill
// chrome (src/views/components/BucketListTeaser.jsx — the dashed-border
// 🔒 panel), but this one IS interactive, unlike that teaser: the CTA
// switches the user to the Profile tab, where the real access-code
// redemption input already lives (App.jsx's handleAccessCode). Body never
// renders this (isDomainLocked always returns false for it); Insights never
// renders this either (it's dispatched before the domain-tab branch that
// checks the gate — see tier-gate.js's header comment).
import React from 'react';
import { P, FD } from '../design/theme';
import { s } from '../design/styles';
import { SUB_TIERS } from '../design/constants';
import { H } from '../design/components';

export default function LockedDomain({ domain, onGoToProfile }) {
  const pro = SUB_TIERS.pro;

  return (
    <div>
      <H
        eyebrow="PRO"
        t={(domain?.icon || '') + ' ' + (domain?.name || 'This domain')}
        sub={domain?.sub || ''}
      />

      <div className="adn-reveal" style={{ ...s.card, marginBottom: 12 }}>
        <div style={{
          padding: '18px 14px', borderRadius: 10, textAlign: 'center', marginBottom: 14,
          background: 'rgba(232,213,183,0.03)', border: '1px dashed ' + P.bd,
        }}>
          <div style={{ fontSize: 20, marginBottom: 6 }}>{'\u{1F512}'}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: P.txS }}>
            Locked — {pro.name} feature
          </div>
          <div style={{ fontSize: 10, color: P.txD, marginTop: 4, lineHeight: 1.5 }}>
            {(domain?.name || 'This domain')} unlocks with {pro.name} (${pro.price}/mo) or an access code.
          </div>
        </div>

        <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, marginBottom: 8, lineHeight: 1.3 }}>
          What you get with {pro.name}
        </div>
        <div style={{ marginBottom: 14 }}>
          {pro.features.map((f, i) => (
            <div key={i} style={{ fontSize: 11, color: P.txM, padding: '2px 0' }}>
              {'✓'} {f}
            </div>
          ))}
        </div>

        <button onClick={onGoToProfile} style={{ ...s.pri, width: '100%', padding: '12px 20px', fontSize: 13 }}>
          Redeem an access code
        </button>
      </div>
    </div>
  );
}
