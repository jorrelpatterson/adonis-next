// AmbientBackdrop — tab-tinted ambient field rendered behind app content.
// Ported from v1 (app.html shell). Layers (back→front, all zIndex 0):
//   1. Top glow ellipse (radial gradient, tab-colored)
//   2. Two blurred orbs (top-right + bottom-left), drifting via orbFloat
//   3. 8 floating particles, tab-accent colored
//   4. Bottom fade so orbs/particles dissolve into BG
//
// Pointer-events:none on every layer so taps fall through to content.
// The shell wrapping this should give its content position:relative + zIndex:2.

import React from 'react';
import { TAB_VIBES } from './constants';
import { P } from './theme';

export default function AmbientBackdrop({ tab }) {
  const vibe = TAB_VIBES[tab] || TAB_VIBES.routine;

  return (
    <>
      {/* Top glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh',
        background: `radial-gradient(ellipse 90% 70% at 50% -5%, ${vibe.glow}, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
        transition: 'background 1.2s ease',
      }} />

      {/* Orb 1 — top right */}
      <div className="adn-ambient-orb adn-orb-float" style={{
        top: '-10%', right: '-15%',
        width: '45vw', height: '45vw',
        background: vibe.orbColor,
        opacity: 0.8, zIndex: 0,
      }} />

      {/* Orb 2 — bottom left, slower + reversed */}
      <div className="adn-ambient-orb adn-orb-float-alt" style={{
        bottom: '15%', left: '-20%',
        width: '55vw', height: '55vw',
        background: vibe.orbColor,
        opacity: 0.6, zIndex: 0,
      }} />

      {/* Particle field */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="adn-particle adn-particle-1" style={{ top: '12%', left: '18%', background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-2" style={{ top: '25%', right: '12%', background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-3" style={{ top: '45%', left: '8%',  background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-4" style={{ top: '60%', right: '20%', background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-5" style={{ top: '78%', left: '35%', background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-1" style={{ top: '35%', left: '65%', background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-3" style={{ top: '88%', right: '8%',  background: vibe.accent, color: vibe.accent }} />
        <div className="adn-particle adn-particle-2" style={{ top: '8%',  left: '50%', background: vibe.accent, color: vibe.accent }} />
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '20vh',
        background: `linear-gradient(to top, ${P.bg} 10%, transparent)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
    </>
  );
}
