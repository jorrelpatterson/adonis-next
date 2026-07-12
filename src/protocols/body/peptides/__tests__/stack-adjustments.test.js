import { describe, it, expect } from 'vitest';
import { getStackAdjustments } from '../stack-adjustments.js';
import { PEPTIDES } from '../catalog.js';

describe('getStackAdjustments', () => {
  it('returns empty when averages are null (insufficient data)', () => {
    expect(getStackAdjustments(null, [], PEPTIDES)).toEqual([]);
  });

  it('returns empty when all averages are healthy', () => {
    const avg = { mood: 4, energy: 4, sleep: 4, stress: 4, appetite: 4, skin: 4, focus: 4, soreness: 4 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    // strongAcrossBoard requires > 4 strictly; 4 doesn't qualify, so no adds and no reduces
    expect(result).toEqual([]);
  });

  it('suggests DSIP when avg sleep below 2.5', () => {
    const avg = { mood: 3, energy: 3, sleep: 2, focus: 3 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    const add = result.find(r => r.type === 'add' && r.peptide.name.startsWith('DSIP'));
    expect(add).toBeTruthy();
    expect(add.reason).toMatch(/sleep/i);
  });

  it('does NOT suggest DSIP when one is already in stack', () => {
    const avg = { mood: 3, energy: 3, sleep: 2, focus: 3 };
    const result = getStackAdjustments(avg, ['DSIP 5mg'], PEPTIDES);
    const dsipAdd = result.find(r => r.type === 'add' && r.peptide.name.startsWith('DSIP'));
    expect(dsipAdd).toBeUndefined();
  });

  it('suggests CJC/Ipa Blend when avg energy below 2.5', () => {
    const avg = { mood: 3, energy: 2, sleep: 3, focus: 3 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    const add = result.find(r => r.type === 'add' && r.peptide.name.includes('CJC/Ipa'));
    expect(add).toBeTruthy();
    expect(add.reason).toMatch(/energy/i);
  });

  it('suggests Selank when avg focus below 2.5', () => {
    const avg = { mood: 3, energy: 3, sleep: 3, focus: 2 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    const add = result.find(r => r.type === 'add' && r.peptide.name.startsWith('Selank'));
    expect(add).toBeTruthy();
    expect(add.reason).toMatch(/clarity|focus/i);
  });

  it('suggests reducing DSIP when all metrics strong', () => {
    const avg = { mood: 5, energy: 5, sleep: 5, focus: 5 };
    const result = getStackAdjustments(avg, ['DSIP 5mg'], PEPTIDES);
    const reduce = result.find(r => r.type === 'reduce' && r.peptide.name === 'DSIP 5mg');
    expect(reduce).toBeTruthy();
  });

  it('does NOT suggest reducing when only some metrics are strong', () => {
    const avg = { mood: 5, energy: 5, sleep: 3, focus: 3 };  // sleep not high
    const result = getStackAdjustments(avg, ['DSIP 5mg'], PEPTIDES);
    const reduce = result.find(r => r.type === 'reduce');
    expect(reduce).toBeUndefined();
  });

  it('picks the cheapest variant when multiple options exist', () => {
    const avg = { mood: 3, energy: 3, sleep: 2, focus: 3 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    const dsipPick = result.find(r => r.type === 'add' && r.peptide.name.startsWith('DSIP'));
    expect(dsipPick).toBeTruthy();
    // DSIP 5mg ($35) is cheaper than DSIP 10mg ($65) and DSIP 15mg ($69)
    expect(dsipPick.peptide.price).toBeLessThanOrEqual(35);
  });

  it('combines multiple adjustments when multiple metrics low', () => {
    const avg = { mood: 3, energy: 2, sleep: 2, focus: 2 };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    const adds = result.filter(r => r.type === 'add');
    expect(adds.length).toBe(3); // DSIP, CJC/Ipa, Selank
  });

  it('handles undefined averages gracefully', () => {
    expect(getStackAdjustments(undefined, [], PEPTIDES)).toEqual([]);
  });

  it('handles missing field in averages (null value) gracefully', () => {
    const avg = { mood: 3, energy: null, sleep: 2, focus: null };
    const result = getStackAdjustments(avg, [], PEPTIDES);
    // Only sleep should fire; energy and focus null are skipped
    expect(result.filter(r => r.type === 'add').length).toBe(1);
    expect(result[0].peptide.name).toMatch(/DSIP/);
  });
});
