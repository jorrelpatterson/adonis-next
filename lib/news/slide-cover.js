// lib/news/slide-cover.js
// Slide 1 — dark cover (the hook). Renders via Satori (next/og).
// Returns a React element ready to pass to ImageResponse.

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

// Splits a hook string into spans, highlighting any word in highlight_words.
function renderHookText(hook, highlights, accentColor) {
  if (!Array.isArray(highlights) || highlights.length === 0) return [hook];
  // Build a regex of escaped highlight words
  const esc = highlights.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'gi');
  const parts = hook.split(re);
  return parts.map((part, i) => {
    if (!part) return null;
    const isHi = highlights.some((w) => w.toLowerCase() === part.toLowerCase());
    return h(
      'span',
      { key: i, style: { color: isHi ? accentColor : TOKENS.white } },
      part,
    );
  }).filter(Boolean);
}

// Headline auto-shrink so the cover never overflows for longer hooks.
// 1080×1350 canvas with 88×96px padding leaves ~888px usable width.
function hookFontSize(hook) {
  const len = (hook || '').length;
  if (len <= 50) return 152; // short, punchy — original size
  if (len <= 65) return 132; // medium
  if (len <= 80) return 112; // long but capped — still readable
  return 96;                 // safety net (validation should reject hooks past 80)
}

export function buildCoverSlide({ hook, highlight_words, accent_color, tier, source_quality, slide_index = 1, slide_total = 4 }) {
  const accentHex = accent_color === 'amber' ? TOKENS.amber : TOKENS.cyan;
  const tierLabel = String(tier || 'RESEARCH').toUpperCase();
  const tierGrade = source_quality ? `${tierLabel} · ${source_quality}` : tierLabel;
  const headlineSize = hookFontSize(hook);

  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.ink, color: TOKENS.white,
        fontFamily: 'Barlow Condensed',
      },
    },
    // top row: brandmark + slide indicator
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 18 } },
        h('img', {
          src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
          width: 64, height: 64,
          style: { display: 'block' },
        }),
        h(
          'div',
          { style: { display: 'flex', fontSize: 26, fontWeight: 900, letterSpacing: 6, color: TOKENS.white } },
          'ADVNCE ',
          h('span', { style: { display: 'flex', fontWeight: 400, color: 'rgba(255,255,255,0.5)' } }, 'LABS'),
        ),
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' } },
        `${slide_index} / ${slide_total}`,
      ),
    ),
    // headline
    h(
      'div',
      {
        style: {
          display: 'flex', flexWrap: 'wrap',
          fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: headlineSize,
          lineHeight: 0.92, letterSpacing: -2, textTransform: 'uppercase',
          color: TOKENS.white,
        },
      },
      ...renderHookText(hook, highlight_words || [], accentHex),
    ),
    // bottom row: SWIPE + tier badge
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
                 fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' } },
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        'SWIPE',
        h('span', { style: { display: 'flex', color: accentHex, fontSize: 28 } }, '→'),
      ),
      h('div', { style: { display: 'flex' } }, tierGrade),
    ),
  );
}
