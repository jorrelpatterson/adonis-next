// src/app/App.jsx
import React from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';

export default function App() {
  const { state, setProfile } = useAppState();
  const { profile } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  return (
    <div className="adn-noise" style={{
      fontFamily: FN,
      background: P.bg,
      color: P.tx,
      position: "fixed",
      inset: 0,
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(14,16,22,0.7)",
            border: "1px solid rgba(232,213,183,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: "italic" }}>
              <GradText>A</GradText>
            </span>
          </div>
          <div>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, fontStyle: "italic" }}>
              Adonis
            </span>
            <div style={{ fontSize: 7, color: P.gW, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700, opacity: 0.7 }}>
              v2 Foundation
            </div>
          </div>
        </div>

        <H t="Foundation Loaded" sub={`${profile.name || 'New User'} \u00B7 ${tierInfo.name} \u00B7 ${state.goals.length} goals`} />

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Active Domains</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DOMAINS.filter(d => profile.domains.includes(d.id)).map(d => (
              <div key={d.id} style={{ ...s.tag, background: "rgba(232,213,183,0.04)", color: P.txM }}>
                {d.icon} {d.name}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Goals</div>
          {state.goals.length === 0 ? (
            <p style={{ color: P.txD, fontSize: 12, margin: 0 }}>No goals yet. Protocol engine ready.</p>
          ) : (
            state.goals.map(g => (
              <div key={g.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.bd}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontSize: 10, color: P.txD }}>{g.domain} \u00B7 {g.status}</div>
              </div>
            ))
          )}
        </div>

        <div style={{ ...s.card }}>
          <div style={{ ...s.lab }}>System Status</div>
          <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.8 }}>
            Design system: extracted<br />
            Protocol interface: defined<br />
            State model: active (adonis_v2)<br />
            Migration: {localStorage.getItem('adonis_v1') ? 'v1 data available' : 'no v1 data'}<br />
            Protocols registered: 0 (ready for Plan 2)
          </div>
        </div>
      </div>
    </div>
  );
}
