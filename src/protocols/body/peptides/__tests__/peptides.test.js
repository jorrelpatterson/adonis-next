import { describe, it, expect } from 'vitest';
import peptideProtocol from '../index';
import { validateProtocol } from '../../../protocol-interface';

describe('peptide protocol', () => {
  it('passes protocol interface validation', () => {
    expect(validateProtocol(peptideProtocol)).toBe(true);
  });

  it('has correct identity (id=peptides, domain=body)', () => {
    expect(peptideProtocol.id).toBe('peptides');
    expect(peptideProtocol.domain).toBe('body');
  });

  it('canServe body goals only', () => {
    expect(peptideProtocol.canServe({ domain: 'body' })).toBe(true);
    expect(peptideProtocol.canServe({ domain: 'mind' })).toBe(false);
    expect(peptideProtocol.canServe({ domain: 'money' })).toBe(false);
    expect(peptideProtocol.canServe(null)).toBe(false);
  });

  it('getTasks returns dose tasks for active peptides on correct days', () => {
    // Weekly peptide on Monday (dayIdx 1) should show
    const state = { activePeptides: [{ id: 9, name: 'Semaglutide 5mg', dose: '0.5mg/wk', freq: 'weekly', tod: 'morning' }] };
    const monday = new Date('2026-04-06');
    const tasks = peptideProtocol.getTasks(state, {}, monday);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0].category).toBe('peptide');
  });

  it('getTasks skips peptides not due today', () => {
    // Weekly on Tuesday should NOT show
    const state = { activePeptides: [{ id: 9, name: 'Sema', dose: '0.5mg', freq: 'weekly', tod: 'morning' }] };
    const tuesday = new Date('2026-04-07');
    const tasks = peptideProtocol.getTasks(state, {}, tuesday);
    expect(tasks.filter(t => t.category === 'peptide')).toHaveLength(0);
  });

  it('getRecommendations suggests peptides for fat loss goal (pro tier)', () => {
    const recs = peptideProtocol.getRecommendations({ activePeptides: [] }, { tier: 'pro' }, { domain: 'body', templateId: 'lose-weight' });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].type).toBe('product');
  });

  it('getRecommendations returns empty for free tier', () => {
    const recs = peptideProtocol.getRecommendations({}, { tier: 'free' }, { domain: 'body', templateId: 'lose-weight' });
    expect(recs).toEqual([]);
  });

  it('getRecommendations switches to adaptive (check-in driven) when averages indicate low sleep', () => {
    const checkinAverages = { mood: 3, energy: 3, sleep: 2, focus: 3, stress: 3, appetite: 3, skin: 3, soreness: 3, _count: 7 };
    const state = { activePeptides: [], stackNames: [], checkinAverages };
    const recs = peptideProtocol.getRecommendations(state, { tier: 'pro' }, { domain: 'body', templateId: 'lose-weight' });

    expect(recs.length).toBeGreaterThan(0);
    const dsipRec = recs.find(r => r.name && r.name.startsWith('DSIP'));
    expect(dsipRec).toBeTruthy();
    expect(dsipRec.data.adaptive).toBe(true);
    expect(dsipRec.data.reason).toMatch(/sleep/i);
  });

  it('getState computes checkinAverages from logs', () => {
    const logs = {
      checkins: {
        '2026-04-25': { mood: 3, energy: 3, sleep: 2, focus: 3 },
        '2026-04-26': { mood: 3, energy: 3, sleep: 2, focus: 3 },
        '2026-04-27': { mood: 3, energy: 3, sleep: 2, focus: 3 },
        '2026-04-28': { mood: 3, energy: 3, sleep: 2, focus: 3 },
        '2026-04-29': { mood: 3, energy: 3, sleep: 2, focus: 3 },
      },
    };
    const profile = { activePeptides: [{ id: 9, name: 'Tirz 10mg' }] };
    const state = peptideProtocol.getState(profile, logs, { domain: 'body' });
    expect(state.checkinAverages).not.toBeNull();
    expect(state.checkinAverages.sleep).toBe(2);
    expect(state.stackNames).toEqual(['Tirz 10mg']);
  });

  it('getUpsells flags low supply', () => {
    const state = { supplyDaysLeft: 3, activeProduct: { name: 'Tirz', price: 99 } };
    const upsells = peptideProtocol.getUpsells(state, {}, {});
    expect(upsells.length).toBeGreaterThan(0);
  });
});
