// src/design/styles.js
import { P, FN, FM, grad } from './theme';

export const s = {
  card: {
    background: "rgba(14,16,22,0.55)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: 18,
    border: "1px solid rgba(232,213,183,0.05)",
    padding: 22,
    boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 1px 0 0 rgba(255,255,255,0.02) inset, 0 0 0 0.5px rgba(232,213,183,0.03)",
    transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
  },
  btn: {
    fontFamily: FN, fontSize: 13, fontWeight: 600, border: "none", borderRadius: 12,
    padding: "13px 24px", cursor: "pointer",
    transition: "all .35s cubic-bezier(0.34,1.56,0.64,1)",
    display: "inline-flex", alignItems: "center", gap: 8, letterSpacing: 0.4, minHeight: 44,
  },
  pri: { background: grad, color: "#0A0B0E", fontWeight: 700 },
  out: {
    background: "rgba(232,213,183,0.03)", color: P.txS,
    border: "1px solid rgba(232,213,183,0.08)", backdropFilter: "blur(20px)",
  },
  inp: {
    fontFamily: FM, fontSize: 13, background: "rgba(12,14,20,0.9)",
    border: "1.5px solid rgba(232,213,183,0.06)", borderRadius: 14,
    padding: "14px 18px", color: P.tx, outline: "none", width: "100%",
    boxSizing: "border-box", transition: "all .35s cubic-bezier(0.34,1.56,0.64,1)",
    letterSpacing: 0.5, minHeight: 44,
  },
  lab: {
    fontFamily: FN, fontSize: 8, fontWeight: 700, color: P.txD,
    textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, display: "block",
  },
  tag: {
    fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2,
    padding: "4px 10px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 4,
  },
  sel: {
    fontFamily: FN, fontSize: 13, background: "rgba(12,14,20,0.9)",
    border: "1.5px solid rgba(232,213,183,0.06)", borderRadius: 14,
    padding: "14px 18px", color: P.tx, outline: "none", width: "100%",
    boxSizing: "border-box", transition: "all .35s", letterSpacing: 0.3,
    minHeight: 44, WebkitAppearance: "none",
  },
};
