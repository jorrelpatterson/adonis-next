// source: v1 public/app.html (GOAL_MAP line 173, buildStacks lines 186-193) via tests/golden/v1/stacks.js — VERBATIM, golden-gated
// Do not edit these bodies. If tests/golden/fixtures/stacks.json fails to reproduce,
// the bug is in this copy, not in the fixture — see src/protocols/body/peptides/__tests__/stack-builder.test.js.
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
