// @vitest-environment node
import { describe, it, expect } from 'vitest';
import '../register-all.js';
import { getAllProtocols } from '../registry.js';
import { collectOnboardingQuestions, collectOnboardingSummaries } from '../protocol-interface.js';

describe('protocol onboarding layer', () => {
  it('every registered protocol exposes onboarding methods', () => {
    const all = getAllProtocols();
    expect(all.length).toBeGreaterThanOrEqual(11);
    for (const p of all) {
      expect(typeof p.getOnboardingQuestions, `${p.id} missing getOnboardingQuestions`).toBe('function');
      expect(typeof p.getOnboardingSummary, `${p.id} missing getOnboardingSummary`).toBe('function');
      const qs = p.getOnboardingQuestions();
      expect(Array.isArray(qs)).toBe(true);
      for (const q of qs) { expect(q.id).toBeTruthy(); expect(q.type).toBeTruthy(); }
    }
  });

  // Archive's collectOnboardingQuestions returns one section per contributing
  // protocol shaped as { protocolId, name, icon, domain, questions } — not a
  // nested `protocol` object — and collectOnboardingSummaries flattens each
  // summary into { protocolId, domain, ...summary }. Assertions below match
  // that real contract (see git show v2-revival-archive:src/protocols/protocol-interface.js).
  it('collectors group by protocol and respect profile domains', () => {
    const all = getAllProtocols();
    const sections = collectOnboardingQuestions(all, { domains: ['body'] });
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) expect(s.domain).toBe('body');
    const summaries = collectOnboardingSummaries(all, { domains: ['body'] }, {});
    expect(Array.isArray(summaries)).toBe(true);
  });
});
