import React from 'react';
import { FD, P } from '../theme';

// H — section header. Premium type pairing: serif italic display
// with optical sizing, generous tracking, tight leading.

export default function H({ t, sub, eyebrow }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {eyebrow && (
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: P.gW,
          textTransform: 'uppercase',
          letterSpacing: 2.2,
          marginBottom: 8,
          opacity: 0.8,
        }}>
          {eyebrow}
        </div>
      )}
      <h2 style={{
        fontFamily: FD,
        fontSize: 'clamp(28px, 8vw, 38px)',
        fontWeight: 300,
        margin: '0 0 6px',
        letterSpacing: -0.4,
        lineHeight: 1.05,
        fontStyle: 'italic',
        color: P.tx,
      }}>
        {t}
      </h2>
      {sub && (
        <p style={{
          color: P.txD,
          margin: 0,
          fontSize: 12,
          letterSpacing: 0.4,
          fontWeight: 300,
          lineHeight: 1.5,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
