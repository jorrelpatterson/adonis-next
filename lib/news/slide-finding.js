// lib/news/slide-finding.js
// Slide 2 — cream finding (compound + plain-English explainer).

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

export function buildFindingSlide({ compound, sub, finding, slide_index = 2 }) {
  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('Finding', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 56 } },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h('div',
          { style: { display: 'flex', fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 132,
                     lineHeight: 0.9, letterSpacing: -1, textTransform: 'uppercase' } },
          compound,
        ),
        h('div', { style: { display: 'flex', width: 88, height: 4, backgroundColor: TOKENS.cyan, marginTop: 18 } }),
        sub ? h('div',
          { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontStyle: 'italic',
                     fontSize: 32, color: TOKENS.dim, marginTop: 22 } },
          sub,
        ) : null,
      ),
      h(
        'div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 50,
                   lineHeight: 1.25, color: TOKENS.ink, maxWidth: 920 } },
        finding,
      ),
    ),
    brandRow(),
  );
}
