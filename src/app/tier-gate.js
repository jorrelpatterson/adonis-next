// src/app/tier-gate.js
//
// Task 12 (DoD item 7) — free-tier domain gating. Body is the one domain
// seeded free at signup (SUB_TIERS.free's "1 active goal (Body)"), so it
// never locks. Every other domain requires Pro or Elite. TIER_RANK already
// exists in App.jsx for the metadata-restore no-downgrade guard; this stays
// a direct tier === 'pro' || tier === 'elite' comparison rather than
// importing it, matching SUB_TIERS semantics without pulling App.jsx's
// funnel/auth machinery into this tiny, easily-unit-tested module.
//
// Insights is NOT a domain and is never routed through this gate — it's a
// fixed tab (see TabNav.jsx) that reads across all domains' logs, so it's a
// free, cross-domain feature. App.jsx's render dispatch checks
// `activeTab === 'insights'` *before* it reaches the domain-tab branch this
// function guards, so isDomainLocked is simply never called for it.
export function isDomainLocked(domainId, tier) {
  if (domainId === 'body') return false;
  return !(tier === 'pro' || tier === 'elite');
}
