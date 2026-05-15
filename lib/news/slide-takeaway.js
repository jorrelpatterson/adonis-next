// lib/news/slide-takeaway.js
// Slide 4 — cream takeaway + soft CTA card.

import React from 'react';
import { TOKENS, SLIDE_W, SLIDE_H, LOGO_SVG } from './tokens.js';

const h = React.createElement;

function brandRow() {
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 18 } },
    h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
               width: 56, height: 56, style: { display: 'block' } }),
    h('div',
      { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 900,
                 letterSpacing: 6, color: TOKENS.ink } },
      'ADVNCE ',
      h('span', { style: { display: 'flex', fontWeight: 400, color: TOKENS.dim } }, 'LABS'),
    ),
  );
}

function topRow(kicker, idx, total = 4) {
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
               fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3,
               color: TOKENS.dim, textTransform: 'uppercase' } },
    h('div', { style: { display: 'flex' } }, kicker),
    h('div', { style: { display: 'flex' } }, `${idx} / ${total}`),
  );
}

export function buildTakeawaySlide({ takeaway, slide_index = 4 }) {
  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('What This Means', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h('div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 50,
                   lineHeight: 1.25, color: TOKENS.ink, maxWidth: 920 } },
        takeaway,
      ),
      h('div', { style: { display: 'flex', width: 88, height: 4, backgroundColor: TOKENS.amber, marginTop: 32 } }),
      h('div',
        { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 18,
                   letterSpacing: 2, textTransform: 'uppercase', color: TOKENS.dim, marginTop: 18 } },
        'For research use only · not medical advice',
      ),
      // CTA card
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: 24, marginTop: 36,
                   backgroundColor: TOKENS.ink, color: TOKENS.bg, padding: '36px 44px' } },
        h('img', { src: `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`,
                   width: 64, height: 64, style: { display: 'block' } }),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div',
            { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 16,
                       letterSpacing: 2, textTransform: 'uppercase', color: TOKENS.cyan } },
            'Research-grade peptides',
          ),
          h('div',
            { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontWeight: 900,
                       fontSize: 38, letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.bg } },
            'ADVNCELABS.COM',
          ),
        ),
        h('div',
          { style: { display: 'flex', marginLeft: 'auto', fontSize: 36, color: TOKENS.cyan } },
          '→',
        ),
      ),
    ),
    brandRow(),
  );
}
