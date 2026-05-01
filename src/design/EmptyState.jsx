// EmptyState — coherent empty-state container.
// Couples a bespoke illustration (IllusGoals/Tasks/Food/Workout/Peptides)
// with a serif headline + body copy + optional CTA, all on a glass card.
// Shows up everywhere data is empty: replaces "No goals yet" plain text.

import React from 'react';
import { P, FN, FD } from './theme';
import { GradText } from './components';

export default function EmptyState({
  illustration,
  headline,
  body,
  cta,
  onCta,
  size = 140,
}) {
  return (
    <div style={{
      padding: '32px 20px 28px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: 'springScale 0.55s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>
      {illustration && (
        <div style={{ marginBottom: 20 }}>
          {React.cloneElement(illustration, { size })}
        </div>
      )}
      {headline && (
        <h3 style={{
          fontFamily: FD,
          fontSize: 22,
          fontStyle: 'italic',
          fontWeight: 300,
          margin: '0 0 8px',
          color: P.tx,
          letterSpacing: -0.3,
        }}>
          <GradText>{headline}</GradText>
        </h3>
      )}
      {body && (
        <p style={{
          fontFamily: FN,
          fontSize: 12, lineHeight: 1.6,
          color: P.txM,
          margin: 0, maxWidth: 320,
        }}>
          {body}
        </p>
      )}
      {cta && (
        <button
          onClick={onCta}
          style={{
            marginTop: 18,
            padding: '12px 28px', borderRadius: 100,
            background: 'linear-gradient(135deg,#E8D5B7,#C9B89A,#B8C4D0)',
            color: '#0A0B0E', fontFamily: FN, fontSize: 12, fontWeight: 700,
            letterSpacing: 0.5, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232,213,183,0.18), 0 1px 0 0 rgba(255,255,255,0.3) inset',
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}
