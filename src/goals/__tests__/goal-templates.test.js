import { describe, it, expect } from 'vitest';
import { GOAL_TEMPLATES, getTemplatesForDomain } from '../goal-templates';

describe('goal-templates', () => {
  it('exports an array of templates', () => {
    expect(Array.isArray(GOAL_TEMPLATES)).toBe(true);
    expect(GOAL_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template has required fields', () => {
    for (const t of GOAL_TEMPLATES) {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('title');
      expect(t).toHaveProperty('domain');
      expect(t).toHaveProperty('type', 'template');
      expect(t).toHaveProperty('protocols');
      expect(Array.isArray(t.protocols)).toBe(true);
      expect(t.protocols.length).toBeGreaterThan(0);
      expect(t).toHaveProperty('setupQuestions');
      expect(Array.isArray(t.setupQuestions)).toBe(true);
    }
  });

  it('every template protocol entry has protocolId and domain', () => {
    for (const t of GOAL_TEMPLATES) {
      for (const p of t.protocols) {
        expect(p).toHaveProperty('protocolId');
        expect(p).toHaveProperty('domain');
      }
    }
  });

  it('getTemplatesForDomain filters by domain', () => {
    const bodyTemplates = getTemplatesForDomain('body');
    expect(bodyTemplates.length).toBeGreaterThan(0);
    expect(bodyTemplates.every(t => t.domain === 'body')).toBe(true);
  });

  it('getTemplatesForDomain returns empty for unknown domain', () => {
    expect(getTemplatesForDomain('nonexistent')).toEqual([]);
  });

  it('body domain has lose weight template with peptide protocol', () => {
    const loseWeight = GOAL_TEMPLATES.find(t => t.id === 'lose-weight');
    expect(loseWeight).toBeDefined();
    expect(loseWeight.domain).toBe('body');
    expect(loseWeight.protocols.some(p => p.protocolId === 'peptides')).toBe(true);
    expect(loseWeight.protocols.some(p => p.protocolId === 'fat-loss-workout')).toBe(true);
  });

  it('travel domain has trip template with cross-domain protocols', () => {
    const trip = GOAL_TEMPLATES.find(t => t.id === 'plan-trip');
    expect(trip).toBeDefined();
    expect(trip.domain).toBe('travel');
    const domains = new Set(trip.protocols.map(p => p.domain));
    expect(domains.size).toBeGreaterThan(1);
  });
});
