import { describe, it, expect } from 'vitest';
import citizenshipProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';
import { CZ_PATHWAYS, CZ_COUNTRIES, CZ_QUESTIONS } from '../data';

describe('citizenship data', () => {
  it('has 4 pathways', () => { expect(CZ_PATHWAYS).toHaveLength(4); });
  it('has 11 countries', () => { expect(CZ_COUNTRIES).toHaveLength(11); });
  it('has 6 assessment questions', () => { expect(CZ_QUESTIONS).toHaveLength(6); });
  it('Italy has descent pathway with docs', () => {
    const italy = CZ_COUNTRIES.find(c => c.id === 'italy');
    expect(italy.pathway).toBe('descent');
    expect(italy.docs.length).toBeGreaterThan(0);
  });
});

describe('citizenship protocol', () => {
  it('passes protocol validation', () => { expect(validateProtocol(citizenshipProtocol)).toBe(true); });
  it('has correct identity', () => { expect(citizenshipProtocol.id).toBe('citizenship'); expect(citizenshipProtocol.domain).toBe('travel'); });
  it('canServe travel goals', () => { expect(citizenshipProtocol.canServe({ domain: 'travel' })).toBe(true); });
  it('getTasks returns tasks when application active', () => {
    const state = { applications: [{ countryId: 'italy', status: 'gathering_docs' }] };
    const monday = new Date('2026-04-06');
    const tasks = citizenshipProtocol.getTasks(state, {}, monday);
    expect(tasks.length).toBeGreaterThan(0);
  });
  it('getRecommendations includes attorney service', () => {
    const recs = citizenshipProtocol.getRecommendations({}, { tier: 'pro' }, { domain: 'travel' });
    expect(recs.some(r => r.type === 'service')).toBe(true);
  });
});
