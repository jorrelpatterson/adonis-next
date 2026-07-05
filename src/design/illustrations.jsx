// Empty-state illustrations — bespoke SVGs that replace text-only "No X yet"
// states. Each is composed of geometric primitives + thin strokes matching
// the icon set. No external assets, no Lottie. Currentcolor inheritance so
// they tint with the surrounding context.
//
// Design language:
//   - 1.5px stroke, rounded caps (matches icon set)
//   - Gold gradient stops where it works
//   - Subtle motion via .adn-glow class on stand-out elements
//   - 160×160 viewBox by default; scales via prop

import React from 'react';

const baseSvg = (size = 160) => ({
  width: size, height: size,
  viewBox: '0 0 160 160',
  fill: 'none',
});

// Stack of folded papers with a star — "Your goals will land here"
export function IllusGoals({ size }) {
  return (
    <svg {...baseSvg(size)}>
      <defs>
        <linearGradient id="g-goals" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8D5B7" stopOpacity="0.4" />
          <stop offset="1" stopColor="#B8C4D0" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle cx="80" cy="80" r="62" fill="url(#g-goals)" opacity="0.4" />
      {/* Back paper */}
      <rect x="42" y="38" width="68" height="84" rx="6"
        stroke="rgba(232,213,183,0.3)" strokeWidth="1.5" />
      {/* Mid paper */}
      <rect x="48" y="44" width="68" height="84" rx="6"
        fill="rgba(14,16,22,0.8)"
        stroke="rgba(232,213,183,0.5)" strokeWidth="1.5" />
      <line x1="58"  y1="64" x2="106" y2="64" stroke="rgba(232,213,183,0.25)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="58"  y1="78" x2="98"  y2="78" stroke="rgba(232,213,183,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="58"  y1="92" x2="92"  y2="92" stroke="rgba(232,213,183,0.18)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Star */}
      <path
        d="M120 32 L 124 42 L 134 44 L 124 50 L 120 60 L 116 50 L 106 44 L 116 42 Z"
        fill="#E8D5B7"
        className="adn-glow"
        style={{ '--glow-color': 'rgba(232,213,183,0.5)' }}
      />
    </svg>
  );
}

// Calendar with a checkmark — "No tasks today"
export function IllusTasksDone({ size }) {
  return (
    <svg {...baseSvg(size)}>
      <defs>
        <linearGradient id="g-tasks" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34D399" stopOpacity="0.3" />
          <stop offset="1" stopColor="#34D399" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="62" fill="url(#g-tasks)" />
      <rect x="40" y="44" width="80" height="76" rx="8"
        fill="rgba(14,16,22,0.8)"
        stroke="rgba(52,211,153,0.4)" strokeWidth="1.5" />
      <line x1="50" y1="32" x2="50" y2="50" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="110" y1="32" x2="110" y2="50" stroke="rgba(52,211,153,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="62" x2="120" y2="62" stroke="rgba(52,211,153,0.3)" strokeWidth="1.2" />
      <path
        d="M58 90 L 72 104 L 102 76"
        fill="none" stroke="#34D399" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        className="adn-glow"
        style={{ '--glow-color': 'rgba(52,211,153,0.5)' }}
      />
    </svg>
  );
}

// Empty plate — "Start logging meals"
export function IllusFood({ size }) {
  return (
    <svg {...baseSvg(size)}>
      <defs>
        <radialGradient id="g-food" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3B82F6" stopOpacity="0.3" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="62" fill="url(#g-food)" />
      <circle cx="80" cy="84" r="44" fill="rgba(14,16,22,0.6)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
      <circle cx="80" cy="84" r="34" fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="1.2" />
      <path d="M48 50 L 56 38" stroke="rgba(232,213,183,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M112 50 L 104 38" stroke="rgba(232,213,183,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Stopwatch + dumbbell silhouette — "No workout history"
export function IllusWorkout({ size }) {
  return (
    <svg {...baseSvg(size)}>
      <defs>
        <linearGradient id="g-workout" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8D5B7" stopOpacity="0.3" />
          <stop offset="1" stopColor="#E8D5B7" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="62" fill="url(#g-workout)" />
      {/* Dumbbell */}
      <rect x="40" y="76" width="14" height="20" rx="2" fill="rgba(232,213,183,0.7)" />
      <rect x="106" y="76" width="14" height="20" rx="2" fill="rgba(232,213,183,0.7)" />
      <rect x="48" y="82" width="64" height="8" rx="2" fill="rgba(232,213,183,0.5)" />
      {/* Sweat drop */}
      <path
        d="M124 50 C 124 56, 128 60, 130 60 C 132 60, 134 56, 132 50 C 130 44, 128 42, 128 42 C 128 42, 124 44, 124 50 Z"
        fill="#E8D5B7"
        className="adn-glow"
        style={{ '--glow-color': 'rgba(232,213,183,0.5)' }}
      />
    </svg>
  );
}

// DNA double-helix — "No peptide stack yet"
export function IllusPeptides({ size }) {
  return (
    <svg {...baseSvg(size)}>
      <defs>
        <linearGradient id="g-pep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A855F7" stopOpacity="0.3" />
          <stop offset="1" stopColor="#A855F7" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="62" fill="url(#g-pep)" />
      {/* Helix curves */}
      <path d="M58 30 C 58 50, 102 70, 102 90 C 102 110, 58 130, 58 130"
        stroke="rgba(168,85,247,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M102 30 C 102 50, 58 70, 58 90 C 58 110, 102 130, 102 130"
        stroke="rgba(168,85,247,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Rungs */}
      {[40, 60, 80, 100, 120].map((y, i) => {
        const x1 = 58 + Math.sin((y - 30) / 100 * Math.PI) * 22;
        const x2 = 102 - Math.sin((y - 30) / 100 * Math.PI) * 22;
        return <line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke="rgba(232,213,183,0.5)" strokeWidth="1.2" strokeLinecap="round" />;
      })}
    </svg>
  );
}
