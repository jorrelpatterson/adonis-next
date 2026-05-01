// AppSettings — feel-and-feedback settings card on the Profile tab.
// Premium apps give users control over sound/motion/haptics rather than
// forcing the experience. Settings persist via localStorage so they
// survive across sessions and devices on the same browser.

import React, { useState } from 'react';
import { P, FN } from '../../design/theme';
import { s } from '../../design/styles';
import { isSoundMuted, setSoundMuted, sound } from '../../design/sound';

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid ' + P.bd, gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{
          width: 46, height: 26, borderRadius: 13,
          background: value ? 'linear-gradient(135deg,#E8D5B7,#C9B89A)' : 'rgba(232,213,183,0.08)',
          border: '1px solid ' + (value ? 'rgba(232,213,183,0.3)' : P.bd),
          position: 'relative', cursor: 'pointer',
          transition: 'background 0.4s, border-color 0.4s',
          boxShadow: value
            ? '0 0 12px rgba(232,213,183,0.2), 0 1px 0 0 rgba(255,255,255,0.2) inset'
            : 'inset 0 1px 4px rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: value ? '#0A0B0E' : '#5C6070',
          transition: 'left 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function AppSettings() {
  const [muted, setMuted] = useState(isSoundMuted());
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('adonis_reduced_motion') === '1'; } catch { return false; }
  });

  const handleSound = (next) => {
    // next === true means "sound on" → muted should be false
    setSoundMuted(!next);
    setMuted(!next);
    if (next) sound.tap();
  };

  const handleReducedMotion = (next) => {
    setReducedMotion(next);
    try { localStorage.setItem('adonis_reduced_motion', next ? '1' : '0'); } catch { /* noop */ }
    // Apply immediately by setting a class on <html>
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('adn-reduced-motion', next);
    }
  };

  return (
    <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 6 }}>
        Feel & Feedback
      </div>
      <div style={{ fontSize: 11, color: P.txD, marginBottom: 8, lineHeight: 1.5 }}>
        Tune the audible and tactile feedback the app gives you on each action.
      </div>
      <ToggleRow
        label="Sound effects"
        sub="Soft tones on tap, complete, and PR. Synthesized — no audio files."
        value={!muted}
        onChange={handleSound}
      />
      <ToggleRow
        label="Reduced motion"
        sub="Disable decorative animations. Honors your system setting too."
        value={reducedMotion}
        onChange={handleReducedMotion}
      />
    </div>
  );
}
