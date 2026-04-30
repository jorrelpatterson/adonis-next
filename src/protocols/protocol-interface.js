// src/protocols/protocol-interface.js
const REQUIRED_FIELDS = ['id', 'domain', 'name', 'icon'];
const REQUIRED_METHODS = ['canServe', 'getState', 'getTasks', 'getAutomations', 'getRecommendations', 'getUpsells'];

// Optional methods — added in Phase 1.5 onboarding port. Protocols that
// don't implement them are skipped in the onboarding wizard / game plan.
//
//   getOnboardingQuestions(profile) → Question[]
//     Each question matches the schema in src/onboarding/question-types.js.
//     Empty array = protocol has no onboarding questions (e.g. system-only).
//
//   getOnboardingSummary(profile, protocolState) → Summary | null
//     Returns a summary card to render on the GamePlan screen, or null if
//     this protocol has nothing to show. Shape:
//       { title: string, icon: string, lines: string[], emphasis?: string }
const OPTIONAL_METHODS = ['getOnboardingQuestions', 'getOnboardingSummary'];

export function validateProtocol(protocol) {
  if (!protocol) return false;
  for (const field of REQUIRED_FIELDS) {
    if (!protocol[field]) return false;
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof protocol[method] !== 'function') return false;
  }
  return true;
}

/**
 * Aggregates onboarding questions across protocols matching the user's
 * selected domains. Returns one section per protocol that contributes
 * questions. Each section is { protocolId, name, icon, domain, questions }.
 */
export function collectOnboardingQuestions(protocols, profile) {
  const sections = [];
  const selectedDomains = new Set(profile?.domains || ['body']);

  for (const proto of protocols) {
    if (proto.domain !== '_system' && !selectedDomains.has(proto.domain)) continue;
    if (typeof proto.getOnboardingQuestions !== 'function') continue;
    const questions = proto.getOnboardingQuestions(profile) || [];
    if (!questions.length) continue;
    sections.push({
      protocolId: proto.id,
      name: proto.name,
      icon: proto.icon,
      domain: proto.domain,
      questions,
    });
  }
  return sections;
}

/**
 * Aggregates onboarding summaries across selected-domain protocols for
 * the GamePlan screen. Same filter logic as collectOnboardingQuestions.
 */
export function collectOnboardingSummaries(protocols, profile, protocolStates) {
  const summaries = [];
  const selectedDomains = new Set(profile?.domains || ['body']);

  for (const proto of protocols) {
    if (proto.domain !== '_system' && !selectedDomains.has(proto.domain)) continue;
    if (typeof proto.getOnboardingSummary !== 'function') continue;
    const summary = proto.getOnboardingSummary(profile, protocolStates?.[proto.id] || {});
    if (!summary) continue;
    summaries.push({
      protocolId: proto.id,
      domain: proto.domain,
      ...summary,
    });
  }
  return summaries;
}
