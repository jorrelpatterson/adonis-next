// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies
// GOAL_MAP: public/app.html line 173
// buildStacks: public/app.html lines 186-193
// (buildStacks references no other identifiers; GOAL_MAP included per ledger pairing "buildStacks+GOAL_MAP")
const GOAL_MAP = { "Fat Loss": ["Fat Loss", "Weight Management", "Growth Hormone"], "Muscle Gain": ["Growth Hormone", "Recovery"], "Recomposition": ["Growth Hormone", "Recovery", "Fat Loss"], "Aesthetics": ["Skin & Recovery", "Growth Hormone", "Recovery", "Longevity"], "Anti-Aging": ["Longevity", "Skin & Recovery", "Growth Hormone", "Sleep"], "Cognitive": ["Cognitive", "Recovery", "Immune"], "Hormonal": ["Hormonal", "Growth Hormone", "Recovery", "Sleep"], "Wellness": ["Recovery", "Wellness", "Longevity", "Immune", "Sleep"] };
function buildStacks(recPeps) {
  const sorted = [...recPeps].sort((a, b) => b.price - a.price);
  const ess = sorted.slice(0, Math.min(3, sorted.length));
  const opt = sorted.slice(0, Math.min(6, sorted.length));
  const full = sorted;
  const sum = (arr) => arr.reduce((s, p) => s + p.price, 0);
  return [{ tier: "Essentials", peptides: ess, retail: sum(ess), price: Math.round(sum(ess) * 0.8), color: "#D4C4AA", desc: "Core peptides for your primary goal" }, { tier: "Optimized", peptides: opt, retail: sum(opt), price: Math.round(sum(opt) * 0.72), color: "#E8D5B7", desc: "Full support across your goals", popular: true }, { tier: "Full Protocol", peptides: full, retail: sum(full), price: Math.round(sum(full) * 0.65), color: "#B8C4D0", desc: "Complete stack + priority shipping + practitioner consult" }];
}

export { GOAL_MAP, buildStacks };
