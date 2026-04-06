import React from 'react';
import { FD, P } from '../theme';

export default function H({ t, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: FD,
        fontSize: 28,
        fontWeight: 300,
        margin: "0 0 6px",
        letterSpacing: 0.5,
        lineHeight: 1.15,
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
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
