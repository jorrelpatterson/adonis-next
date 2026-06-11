// app/admin/cards/BusinessCard.jsx
// Specimen v3 ambassador card (spec: docs/superpowers/specs/2026-06-10-ambassador-business-cards-design.md).
// Dimensions are physical (in/pt): trim 3.5x2in + 0.0625in bleed -> 3.625x2.125in.
import { shortId, codeStyle } from '../../../lib/businessCard';

const C = {
  cream: '#F4F2EE', ink: '#1A1C22', cyan: '#00A0A8',
  amber: '#E07C24', dim: '#7A7D88', hairline: '#E4E7EC',
};
const MONO = "'JetBrains Mono',monospace";
const BARLOW = "'Barlow Condensed',sans-serif";

const st = {
  card: { width: '3.625in', height: '2.125in', background: C.cream, position: 'relative', overflow: 'hidden' },
  // 0.0625in bleed + 0.1in inset from trim
  frame: { position: 'absolute', inset: '0.1625in', border: `1px solid ${C.ink}` },
  headerLabel: { fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.ink },
  microLabel: { fontFamily: MONO, fontSize: '4.5pt', letterSpacing: '1pt', color: C.dim },
};

function Mark({ size }) {
  // Canonical brand mark (advnce-site/brand-kit/logo.svg, background rect omitted)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <path d="M8 48L18 38L28 43L38 28L46 33L54 18" fill="none" stroke={C.cyan} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="46" cy="33" r="4" fill={C.cyan} />
      <circle cx="54" cy="18" r="4.5" fill={C.amber} />
      <circle cx="54" cy="18" r="7.5" fill="none" stroke={C.amber} strokeWidth="1.5" />
    </svg>
  );
}

export function CardFront() {
  return (
    <div style={st.card}>
      <div style={st.frame}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0.07in 0.1in', borderBottom: `1px solid ${C.ink}` }}>
          <span style={st.headerLabel}>EST. 2025</span>
          <span style={st.headerLabel}>USA</span>
        </div>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.1in' }}>
            <Mark size="0.32in" />
            <span style={{ fontFamily: BARLOW, fontWeight: 400, fontSize: '17pt', letterSpacing: '1pt', color: C.ink, lineHeight: 1 }}>
              advnce <span style={{ color: C.dim }}>labs</span>
            </span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '2pt', color: C.cyan, marginTop: '0.07in' }}>
            RESEARCH-GRADE PEPTIDES
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', padding: '0.065in', borderTop: `1px solid ${C.ink}`, fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.dim }}>
          PRECISION · PURITY · PROTOCOL
        </div>
      </div>
    </div>
  );
}

export function CardBack({ name, code, ambassadorId, qrSvg }) {
  const codeSizing = codeStyle(code);
  return (
    <div style={st.card}>
      <div style={{ ...st.frame, padding: '0.1in 0.117in' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.hairline}`, paddingBottom: '0.055in' }}>
          <span style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.amber }}>AMBASSADOR</span>
          <span style={{ fontFamily: MONO, fontSize: '5pt', letterSpacing: '1.5pt', color: C.dim }}>ID · {shortId(ambassadorId)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.08in' }}>
          <div style={{ minWidth: 0 }}>
            <div style={st.microLabel}>NAME</div>
            <div style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: '12.5pt', color: C.ink, lineHeight: 1.15 }}>
              {String(name || '').toUpperCase()}
            </div>
            <div style={{ ...st.microLabel, marginTop: '0.08in' }}>ACCESS CODE</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, color: C.cyan, lineHeight: 1.3, whiteSpace: 'nowrap', ...codeSizing }}>
              {code}
            </div>
          </div>
          <div className="qr-box" style={{ width: '0.6in', height: '0.6in', background: '#fff', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: qrSvg || '' }} />
        </div>
        <div style={{ position: 'absolute', bottom: '0.07in', left: '0.117in', right: '0.117in', display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: '4.5pt', letterSpacing: '1pt', color: C.dim }}>
          <span>ADVNCELABS.COM</span>
          <span>FOR RESEARCH USE ONLY</span>
        </div>
      </div>
    </div>
  );
}
