// Bespoke icon set — thin-stroke SVGs that replace emoji in load-bearing UI.
//
// Design language: 24×24 viewBox, 1.5px stroke, rounded caps + joins.
// Stroke is currentColor so the icon inherits text color — same line-weight
// across the whole app, controlled centrally.
//
// Each icon is a pure component, props pass-through to the <svg> root for
// size + className. Default: 20px. Use Icon.Tab() variants for the bottom bar.

import React from 'react';

const base = (size = 20, className, style) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  style,
});

export function IconRoutine({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <rect x="4" y="5" width="16" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <path d="M9 14.5l1.8 1.8L14.5 12.5" strokeWidth={1.7} />
    </svg>
  );
}

export function IconBody({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M7 22l1-7-3-2 2-3.5h10l2 3.5-3 2 1 7" />
    </svg>
  );
}

export function IconMoney({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <rect x="3" y="6.5" width="18" height="12" rx="2" />
      <circle cx="12" cy="12.5" r="2.5" />
      <path d="M3 10h18M3 15h18" opacity="0.5" />
    </svg>
  );
}

export function IconTravel({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a13 13 0 010 18M12 3a13 13 0 000 18" />
    </svg>
  );
}

export function IconMind({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <path d="M12 4c-3.5 0-6 2.5-6 5.5 0 1.5.5 2.5 1.5 3.5L7 20h2l.5-3h5l.5 3h2l-.5-7c1-1 1.5-2 1.5-3.5C18 6.5 15.5 4 12 4z" />
      <circle cx="10" cy="10" r="0.6" fill="currentColor" />
      <circle cx="14" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function IconImage({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 16l.7 2.1L21.7 19l-2 .7L19 22l-.7-2.3-2-.7 2-.6z" opacity="0.6" />
      <path d="M5 4l.5 1.5L7 6l-1.5.5L5 8l-.5-1.5L3 6l1.5-.5z" opacity="0.6" />
    </svg>
  );
}

export function IconCommunity({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M14 19c.3-2.5 2-4 4-4s3.5 1.2 4 3" />
    </svg>
  );
}

export function IconEnvironment({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <path d="M3 21V11l9-6 9 6v10" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

export function IconPurpose({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5l-2 5-5 2 2-5z" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconInsights({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" strokeWidth={1.7} />
    </svg>
  );
}

export function IconProfile({ size, className, style }) {
  return (
    <svg {...base(size, className, style)}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

// Map domain ID → icon component. Used by TabNav and anywhere we render
// a domain icon. Falls back to Routine if unknown.
export const DOMAIN_ICONS = {
  routine:     IconRoutine,
  body:        IconBody,
  money:       IconMoney,
  travel:      IconTravel,
  mind:        IconMind,
  image:       IconImage,
  community:   IconCommunity,
  environment: IconEnvironment,
  purpose:     IconPurpose,
  insights:    IconInsights,
  profile:     IconProfile,
};

export function DomainIcon({ id, size, className, style }) {
  const Cmp = DOMAIN_ICONS[id] || IconRoutine;
  return <Cmp size={size} className={className} style={style} />;
}
