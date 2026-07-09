// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies
// generateInsights: public/app.html lines 611-636
// (generateInsights references no external identifiers — CHECKIN_FIELDS at line 195 is NOT used by it, so not extracted)
function generateInsights(logs, checkins) {
  const ins = [];
  const recent = Object.entries(checkins).slice(-7);
  if (recent.length < 3) return [{ type: "info", text: "Log at least 3 days of check-ins to unlock personalized insights.", icon: "\u{1F4CA}" }];
  const avg = (f) => {
    const v = recent.map(([_, d]) => d[f]).filter((v2) => v2 != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const aM = avg("mood"), aE = avg("energy"), aS = avg("sleep"), aSt = avg("stress"), aF = avg("focus"), aA = avg("appetite");
  if (aE !== null && aE < 2.5) ins.push({ type: "warning", text: "Energy trending down. Consider CJC-1295/Ipamorelin or review caloric intake.", icon: "\u{1F50B}" });
  if (aS !== null && aS < 2.5) ins.push({ type: "warning", text: "Sleep below baseline. DSIP or MK-677 before bed may help.", icon: "\u{1F634}" });
  if (aM !== null && aM < 2.5) ins.push({ type: "warning", text: "Mood below baseline. Selank may help. Check protein and omega-3 intake.", icon: "\u{1F614}" });
  if (aSt !== null && aSt > 3.5) ins.push({ type: "warning", text: "Stress elevated. Selank and magnesium glycinate recommended.", icon: "\u{1F630}" });
  if (aF !== null && aF < 2.5) ins.push({ type: "warning", text: "Mental clarity low. Dihexa or Selank may help. Check hydration.", icon: "\u{1F32B}\uFE0F" });
  if (aA !== null && aA > 4) ins.push({ type: "info", text: "Appetite elevated. Semaglutide or 5-Amino-1MQ can help manage hunger.", icon: "\u{1F37D}\uFE0F" });
  if (aE !== null && aE >= 4 && aM !== null && aM >= 4) ins.push({ type: "success", text: "Energy and mood are excellent \u2014 your protocol is dialed in.", icon: "\u{1F525}" });
  const rf = Object.entries(logs).slice(-7);
  if (rf.length >= 3) {
    const ac = rf.map(([_, f]) => f.reduce((s, x) => s + x.cal, 0)).reduce((a, b) => a + b, 0) / rf.length;
    if (ac < 1200) ins.push({ type: "warning", text: `Averaging ${Math.round(ac)} cal \u2014 likely insufficient.`, icon: "\u26A0\uFE0F" });
    const ap = rf.map(([_, f]) => f.reduce((s, x) => s + x.p, 0)).reduce((a, b) => a + b, 0) / rf.length;
    if (ap < 80) ins.push({ type: "info", text: `Protein low (~${Math.round(ap)}g/day). Aim for 0.8-1g/lb.`, icon: "\u{1F969}" });
  }
  if (!ins.length) ins.push({ type: "success", text: "All metrics stable. Keep logging for deeper insights.", icon: "\u2705" });
  return ins;
}

export { generateInsights };
