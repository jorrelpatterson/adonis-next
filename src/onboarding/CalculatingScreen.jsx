// "System is thinking" animation — ports v1's calc screen at app.html:5226.
// Plays for ~3.5 seconds, then calls onComplete().
//
// Steps are filtered to the user's selected domains so you don't see
// "Mapping credit strategy" if Money isn't a domain you picked.

import React, { useState, useEffect } from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { GradText } from '../design/components';
import { sound } from '../design/sound';
import { haptics } from '../design/haptics';

const ALL_STEPS = [
  { t: 'Analyzing your profile', icon: '\u{1F9EC}', requiresDomain: null },
  { t: 'Building meal plan',     icon: '\u{1F37D}️', requiresDomain: 'body' },
  { t: 'Calibrating training intensity', icon: '\u{1F3CB}️', requiresDomain: 'body' },
  { t: 'Mapping credit strategy', icon: '\u{1F4B3}', requiresDomain: 'money' },
  { t: 'Routing income pipeline', icon: '\u{1F4B5}', requiresDomain: 'money' },
  { t: 'Mapping passport pathways', icon: '\u{1F30D}', requiresDomain: 'travel' },
  { t: 'Tuning skincare rotation', icon: '✨', requiresDomain: 'image' },
  { t: 'Loading mind protocols', icon: '\u{1F9E0}', requiresDomain: 'mind' },
  { t: 'Setting environment baseline', icon: '\u{1F3E0}', requiresDomain: 'environment' },
  { t: 'Aligning purpose framework', icon: '\u{1F9ED}', requiresDomain: 'purpose' },
  { t: 'Matching accountability', icon: '\u{1F91D}', requiresDomain: 'community' },
  { t: 'Generating daily routines', icon: '\u{1F4C5}', requiresDomain: null },
  { t: 'Syncing peptide schedule', icon: '\u{1F489}', requiresDomain: 'body' },
];

export default function CalculatingScreen({ profile, onComplete }) {
  const domains = new Set(profile?.domains || ['body']);
  const filtered = ALL_STEPS.filter(s => !s.requiresDomain || domains.has(s.requiresDomain));

  const [calcStep, setCalcStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let step = 0;
    sound.tap();
    const iv = setInterval(() => {
      step++;
      if (step < filtered.length) {
        setCalcStep(step);
        sound.tap();
      } else {
        clearInterval(iv);
        setTimeout(() => {
          setReady(true);
          sound.pr();
          haptics.success();
        }, 600);
        setTimeout(() => { onComplete && onComplete(); }, 2400);
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes calcSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes calcPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes calcFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes calcReady{0%{opacity:0;transform:scale(0.8) translateY(20px)}60%{transform:scale(1.04) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        .calc-step{animation:calcFadeIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both}
        .calc-ready{animation:calcReady 0.8s cubic-bezier(0.34,1.56,0.64,1) both}
        .calc-ring{animation:calcSpin 2s linear infinite}
      `}</style>

      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '60vw', height: '60vw', maxWidth: 500, maxHeight: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(232,213,183,0.03),transparent 60%)',
        pointerEvents: 'none', filter: 'blur(80px)',
        animation: 'calcPulse 2s ease-in-out infinite',
      }} />

      {!ready ? (
        <>
          <div className="calc-ring" style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '2px solid rgba(232,213,183,0.06)',
            borderTopColor: 'rgba(232,213,183,0.4)',
            marginBottom: 40,
          }} />
          <div style={{ textAlign: 'center', minHeight: 70 }}>
            <div key={calcStep} className="calc-step" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>
                {filtered[calcStep]?.icon}
              </span>
              <div style={{ fontFamily: FM, fontSize: 13, color: P.gW, letterSpacing: 0.5, fontWeight: 600 }}>
                {filtered[calcStep]?.t}...
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
            {filtered.map((_, i) => (
              <div key={i} style={{
                width: i <= calcStep ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i <= calcStep ? `rgba(232,213,183,${i === calcStep ? 0.6 : 0.2})` : 'rgba(232,213,183,0.06)',
                transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: i === calcStep ? '0 0 12px rgba(232,213,183,0.2)' : 'none',
              }} />
            ))}
          </div>
        </>
      ) : (
        <div className="calc-ready" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(232,213,183,0.04)',
            border: '1px solid rgba(232,213,183,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: '0 0 60px rgba(232,213,183,0.06)',
          }}>
            <span style={{ fontSize: 36 }}>⚡</span>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: P.gW, marginBottom: 12 }}>
            Protocol Initialized
          </div>
          <h2 style={{ fontFamily: FD, fontSize: 32, fontWeight: 300, margin: '0 0 8px', letterSpacing: 0.5 }}>
            Your system is{' '}
            <GradText style={{ fontStyle: 'italic', fontWeight: 400 }}>ready.</GradText>
          </h2>
          <p style={{ fontSize: 13, color: P.txD, fontWeight: 300 }}>
            Every protocol tailored to your data.
          </p>
        </div>
      )}
    </div>
  );
}
