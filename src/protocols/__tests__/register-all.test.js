import { describe, it, expect } from 'vitest';
import { getAllProtocols, getProtocol } from '../registry';
import { validateProtocol } from '../protocol-interface';
import '../register-all'; // trigger registration

describe('protocol registration', () => {
  it('registers workout protocol', () => {
    expect(getProtocol('workout')).toBeDefined();
  });
  it('registers peptides protocol', () => {
    expect(getProtocol('peptides')).toBeDefined();
  });
  it('registers nutrition protocol', () => {
    expect(getProtocol('nutrition')).toBeDefined();
  });
  it('all registered protocols pass validation', () => {
    for (const p of getAllProtocols()) {
      expect(validateProtocol(p)).toBe(true);
    }
  });
  it('has at least 3 protocols', () => {
    expect(getAllProtocols().length).toBeGreaterThanOrEqual(3);
  });
});
