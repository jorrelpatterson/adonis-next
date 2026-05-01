// src/design/styles.js
//
// Style tokens are intentionally inline objects so they compose cleanly with
// component-level overrides. Material values reference CSS variables defined
// in animations.css so the design system has one source of truth.

import { P, FN, FM, grad } from './theme';

export const s = {
  // Glass card — backdrop-filter blur, layered shadow with inner highlight,
  // gradient hairline border. Scales subtly on press via global :active rule.
  card: {
    background: "rgba(14,16,22,0.55)",
    backdropFilter: "blur(40px) saturate(140%)",
    WebkitBackdropFilter: "blur(40px) saturate(140%)",
    borderRadius: 18,
    border: "1px solid rgba(232,213,183,0.06)",
    padding: 22,
    // Layered shadow: inner highlight + hairline + close shadow + far shadow
    boxShadow: [
      "0 1px 0 0 rgba(255,255,255,0.04) inset",
      "0 0 0 0.5px rgba(232,213,183,0.04)",
      "0 4px 12px rgba(0,0,0,0.18)",
      "0 16px 48px rgba(0,0,0,0.28)",
    ].join(", "),
    transition: "transform .35s cubic-bezier(0.16,1,0.3,1), box-shadow .35s cubic-bezier(0.16,1,0.3,1), background .35s",
  },
  btn: {
    fontFamily: FN, fontSize: 13, fontWeight: 600, border: "none", borderRadius: 12,
    padding: "13px 24px", cursor: "pointer",
    transition: "transform .12s cubic-bezier(0.16,1,0.3,1), filter .12s, box-shadow .35s, background .35s, border-color .35s",
    display: "inline-flex", alignItems: "center", gap: 8, letterSpacing: 0.4, minHeight: 44,
    WebkitTapHighlightColor: "transparent",
  },
  // Primary CTA — gold gradient with shimmer-friendly background-size for hover.
  pri: {
    background: grad,
    backgroundSize: "200% 100%",
    color: "#0A0B0E",
    fontWeight: 700,
    boxShadow: "0 4px 16px rgba(232,213,183,0.18), 0 1px 0 0 rgba(255,255,255,0.2) inset, 0 -1px 0 0 rgba(0,0,0,0.05) inset",
  },
  out: {
    background: "rgba(232,213,183,0.03)", color: P.txS,
    border: "1px solid rgba(232,213,183,0.10)",
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    boxShadow: "0 1px 0 0 rgba(255,255,255,0.03) inset",
  },
  inp: {
    fontFamily: FM, fontSize: 13, background: "rgba(12,14,20,0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(232,213,183,0.08)", borderRadius: 14,
    padding: "14px 18px", color: P.tx, outline: "none", width: "100%",
    boxSizing: "border-box",
    transition: "border-color .35s, box-shadow .35s, background .35s",
    letterSpacing: 0.5, minHeight: 44,
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1',
  },
  lab: {
    fontFamily: FN, fontSize: 9, fontWeight: 700, color: P.txD,
    textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, display: "block",
  },
  tag: {
    fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2,
    padding: "4px 10px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 4,
  },
  sel: {
    fontFamily: FN, fontSize: 13, background: "rgba(12,14,20,0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(232,213,183,0.08)", borderRadius: 14,
    padding: "14px 18px", color: P.tx, outline: "none", width: "100%",
    boxSizing: "border-box", transition: "border-color .35s, box-shadow .35s",
    letterSpacing: 0.3,
    minHeight: 44, WebkitAppearance: "none",
  },
};
