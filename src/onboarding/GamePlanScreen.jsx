// "Your Game Plan" — post-calculating summary that shows what the system
// has built across all selected domains. The conversion moment.
//
// Pulls one summary card per protocol via getOnboardingSummary().
// At the bottom: "Start" button → drops the user into the routine app.

import React from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { collectOnboardingSummaries } from '../protocols/protocol-interface';
import { getAllProtocols } from '../protocols/registry';

export default function GamePlanScreen({ profile, protocolStates, onStart }) {
  const summaries = collectOnboardingSummaries(getAllProtocols(), profile, protocolStates);
  const tierInfo = SUB_TIERS[profile?.tier] || SUB_TIERS.free;
  const firstName = (profile?.name || '').split(' ')[0];

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowX: 'hidden', overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Subtle backdrop glow */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%',
        width: '60vw', height: '60vw', maxWidth: 600, maxHeight: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(232,213,183,0.02),transparent 60%)',
        pointerEvents: 'none', filter: 'blur(60px)',
      }} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 32px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginBottom: 16, padding: '6px 16px', borderRadius: 100,
            background: 'rgba(232,213,183,0.04)',
            border: '1px solid rgba(232,213,183,0.08)',
          }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: P.ok, boxShadow: '0 0 6px rgba(52,211,153,0.3)' }} />
            <span style={{ fontSize: 8, fontWeight: 600, color: P.gW, letterSpacing: 2, textTransform: 'uppercase' }}>
              Protocol Initialized
            </span>
          </div>
          <h2 style={{ fontFamily: FD, fontSize: 'clamp(24px,7vw,34px)', fontWeight: 300, margin: '0 0 10px', letterSpacing: 0.5 }}>
            {firstName ? `${firstName}'s ` : 'Your '}
            <GradText style={{ fontStyle: 'italic', fontWeight: 400 }}>Game Plan</GradText>
          </h2>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            {(profile?.domains || []).map(dId => {
              const d = DOMAINS.find(x => x.id === dId);
              return d ? (
                <span key={dId} style={{
                  ...s.tag,
                  background: 'rgba(232,213,183,0.06)', color: P.gW,
                  border: '1px solid rgba(232,213,183,0.1)',
                }}>
                  {d.icon} {d.name}
                </span>
              ) : null;
            })}
          </div>
          <p style={{ color: P.txD, fontSize: 13, margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Every protocol below is adapting to you in real time. Follow it. Log it. The system sharpens itself.
          </p>
        </div>

        {/* Summary cards — one per protocol that contributes a summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {summaries.map(summary => (
            <div key={summary.protocolId} style={{
              ...s.card,
              padding: 16,
              background: 'linear-gradient(135deg, rgba(14,16,22,0.55), rgba(14,16,22,0.35))',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{summary.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2,
                    color: P.gW, marginBottom: 6,
                  }}>
                    {summary.title}
                  </div>
                  {summary.lines.map((line, i) => (
                    <div key={i} style={{ fontSize: 12, color: P.txM, lineHeight: 1.5, marginBottom: 2 }}>
                      {line}
                    </div>
                  ))}
                  {summary.emphasis && (
                    <div style={{
                      fontFamily: FM, fontSize: 10, fontWeight: 700,
                      color: P.gW, marginTop: 6, opacity: 0.85,
                    }}>
                      {summary.emphasis}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {summaries.length === 0 && (
            <div style={{ ...s.card, padding: 16, textAlign: 'center', color: P.txD, fontSize: 12 }}>
              Your routine is ready. Tap Start to dive in.
            </div>
          )}
        </div>

        {/* Tier hint — primes upgrade */}
        {profile?.tier === 'free' && (profile?.domains || []).length > 1 && (
          <div style={{
            ...s.card, padding: 14, marginBottom: 16,
            border: '1px solid rgba(232,213,183,0.15)',
            background: 'linear-gradient(135deg, rgba(232,213,183,0.06), transparent)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: P.gW, marginBottom: 4 }}>
              Heads up
            </div>
            <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.5 }}>
              You're on Free, which unlocks Body. Other domains stay configured but locked.
              Upgrade to Pro from your Profile tab any time to activate them.
            </div>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={onStart}
          style={{
            ...s.btn, ...s.pri,
            width: '100%', justifyContent: 'center',
            padding: '16px 24px', fontSize: 14, fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          Start
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9, color: P.txD, lineHeight: 1.6 }}>
          You can update any of these from the Profile tab.
        </div>
      </div>
    </div>
  );
}
