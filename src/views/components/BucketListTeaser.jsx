// src/views/components/BucketListTeaser.jsx
//
// Bucket List is the flagship post-MVP feature (spec decision 7): name any
// open-ended goal — "Go to Egypt," "Run a marathon," "Buy a house" — and the
// protocol decomposes it into a cross-domain strategy where Money funds it,
// Body preps you, Travel handles the documents, each piece surfacing as a
// goal your daily routine already serves, paced to a target date.
//
// This component STATES that promise and BUILDS NONE of it. It is an
// Elite-gated locked surface, structurally modeled on MindView's
// NootropicsCard Pro-badge pill (src/views/MindView.jsx — see its header
// comment for the precedent), but content-only: zero buttons, links, inputs,
// or handlers of any kind, for any tier. Free/pro tiers see a plain-text
// pointer to redeem an Elite access code in Profile — no navigation is
// wired (Profile-based redemption doesn't exist yet, and this teaser must
// not pretend it does). Elite users see the identical promise copy with
// "Coming first to Elite" badge/footer copy, since Bucket List is the
// literal #1 post-MVP build.
import React from 'react';
import { P, FN, FD } from '../../design/theme';
import { s } from '../../design/styles';

const EXAMPLE_CHIPS = [
  { emoji: '\u{1F1EA}\u{1F1EC}', label: 'Go to Egypt' },
  { emoji: '\u{1F3C3}', label: 'Run a marathon' },
  { emoji: '\u{1F3E1}', label: 'Buy a house' },
];

export default function BucketListTeaser({ tier }) {
  const isElite = tier === 'elite';

  return (
    <div className="adn-reveal" style={{ ...s.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...s.lab, marginBottom: 0 }}>Bucket List</div>
        <span style={{
          fontSize: 8, padding: '3px 8px', borderRadius: 6,
          background: 'rgba(232,213,183,0.08)', color: P.gW,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
        }}>
          {isElite ? 'Coming first to Elite' : 'Elite'}
        </span>
      </div>

      <div style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, marginBottom: 8, lineHeight: 1.3 }}>
        Name any open-ended goal
      </div>

      <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6, marginBottom: 14 }}>
        Say "Go to Egypt" or "Run a marathon" and the protocol decomposes it into a
        cross-domain strategy — Money funds it, Body preps you, Travel handles the
        documents. Each piece becomes a goal your daily routine already serves, paced to
        a target date.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {EXAMPLE_CHIPS.map((c) => (
          <span key={c.label} style={{
            fontFamily: FN, fontSize: 11, fontWeight: 500, letterSpacing: 0.3,
            padding: '7px 12px', borderRadius: 100,
            border: '1px solid ' + P.bd, background: 'rgba(232,213,183,0.02)',
            color: P.txD,
          }}>
            {c.emoji} {c.label}
          </span>
        ))}
      </div>

      <div style={{
        padding: '18px 14px', borderRadius: 10, textAlign: 'center',
        background: 'rgba(232,213,183,0.03)', border: '1px dashed ' + P.bd,
      }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>{'\u{1F512}'}</div>
        {isElite ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: P.txS }}>
              Coming first to Elite
            </div>
            <div style={{ fontSize: 10, color: P.txD, marginTop: 4, lineHeight: 1.5 }}>
              The first thing built after MVP — you'll see it here first.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: P.txS }}>
              Locked — Elite feature
            </div>
            <div style={{ fontSize: 10, color: P.txD, marginTop: 4, lineHeight: 1.5 }}>
              Unlock with an Elite access code — redeem in Profile.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
