// AmbientBackdrop — tab-tinted ambient field rendered behind app content.
// Ported from v1 (app.html shell). Layers (back→front, all zIndex 0):
//   1. Top glow ellipse (radial gradient, tab-colored)
//   2. Two blurred orbs (top-right + bottom-left), drifting via orbFloat
//   3. 8 floating particles, tab-accent colored
//   4. Bottom fade so orbs/particles dissolve into BG
//
// Scroll parallax: the orbs and top-glow shift slowly as the user scrolls,
// giving real depth without being distracting. Subscribes to the parent
// scroll container (the App's adn-noise wrapper) via a ref pierced through
// the document. Honors prefers-reduced-motion at runtime.
//
// Pointer-events:none on every layer so taps fall through to content.
// The shell wrapping this should give its content position:relative + zIndex:2.

import React, { useEffect, useRef } from 'react';
import { TAB_VIBES } from './constants';
import { P } from './theme';

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function AmbientBackdrop({ tab }) {
  const vibe = TAB_VIBES[tab] || TAB_VIBES.routine;
  const glowRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const particlesRef = useRef(null);

  // Scroll parallax — listens on the document scroll because the App shell
  // is fixed + overflow:auto, so the scroll lives there. Multiplier per layer
  // creates depth (back layers move slower than front).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (reducedMotion()) return;
    if (typeof document.documentElement.classList.contains === 'function' &&
        document.documentElement.classList.contains('adn-reduced-motion')) return;

    // The scrollable container is the .adn-noise wrapper. Find it once.
    const scroller = document.querySelector('.adn-noise');
    if (!scroller) return;

    let raf = null;
    let latestY = 0;
    const apply = () => {
      const y = latestY;
      // Each layer shifts at a different rate for parallax depth.
      if (glowRef.current)      glowRef.current.style.transform      = `translate3d(0, ${y * -0.15}px, 0)`;
      if (orb1Ref.current)      orb1Ref.current.style.transform      = `translate3d(0, ${y * -0.25}px, 0)`;
      if (orb2Ref.current)      orb2Ref.current.style.transform      = `translate3d(0, ${y * -0.18}px, 0)`;
      if (particlesRef.current) particlesRef.current.style.transform = `translate3d(0, ${y * -0.05}px, 0)`;
      raf = null;
    };
    const onScroll = () => {
      latestY = scroller.scrollTop;
      if (raf == null) raf = requestAnimationFrame(apply);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [tab]);

  return (
    <>
      {/* Top glow */}
      <div ref={glowRef} className="adn-parallax-slow" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '50vh',
        background: `radial-gradient(ellipse 90% 70% at 50% -5%, ${vibe.glow}, transparent 65%)`,
        pointerEvents: 'none', zIndex: 0,
        transition: 'background 1.2s ease',
        willChange: 'transform',
      }} />

      {/* Orb 1 — top right */}
      <div ref={orb1Ref} className="adn-ambient-orb adn-orb-float" style={{
        top: '-10%', right: '-15%',
        width: '45vw', height: '45vw',
        background: vibe.orbColor,
        opacity: 0.8, zIndex: 0,
      }} />

      {/* Orb 2 — bottom left, slower + reversed */}
      <div ref={orb2Ref} className="adn-ambient-orb adn-orb-float-alt" style={{
        bottom: '15%', left: '-20%',
        width: '55vw', height: '55vw',
        background: vibe.orbColor,
        opacity: 0.6, zIndex: 0,
      }} />

      {/* Particle field */}
      <div ref={particlesRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, willChange: 'transform' }}>
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
