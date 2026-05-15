// lib/news/slide-mechanism.js
// Slide 3 — cream mechanism + citation block.

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

export function buildMechanismSlide({ mechanism, citation, slide_index = 3 }) {
  // Citation comes in as one string like "Sikiric et al · J Pharm Pharmacol · 2024 · PMID 12345678"
  // Display the whole thing, but split off any trailing PMID-only fragment for dim styling.
  const citParts = (citation || '').split('·').map((s) => s.trim());

  return h(
    'div',
    {
      style: {
        width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '88px 96px',
        backgroundColor: TOKENS.bg, color: TOKENS.ink, fontFamily: 'Barlow Condensed',
      },
    },
    topRow('Mechanism', slide_index),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 48 } },
      h('div',
        { style: { display: 'flex', fontFamily: 'Cormorant Garamond', fontSize: 44,
                   lineHeight: 1.3, color: TOKENS.ink, maxWidth: 920 } },
        mechanism,
      ),
      // Citation block
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 8,
                   borderTop: `1px solid ${TOKENS.rule}`, paddingTop: 24 } },
        h('div',
          { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 16,
                     letterSpacing: 2, color: TOKENS.dim, textTransform: 'uppercase' } },
          'Source',
        ),
        h('div',
          { style: { display: 'flex', flexWrap: 'wrap', fontFamily: 'JetBrains Mono', fontSize: 22,
                     color: TOKENS.ink, letterSpacing: 0.5 } },
          citParts.slice(0, 3).join(' · '),
        ),
        citParts.length > 3
          ? h('div',
              { style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 18,
                         color: TOKENS.dim, letterSpacing: 0.5 } },
              citParts.slice(3).join(' · '),
            )
          : null,
      ),
    ),
    brandRow(),
  );
}
