// src/design/__tests__/theme.test.js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { P, FN, FD, FM, grad, gradSub } from '../theme';

describe('theme', () => {
  it('exports color palette P with required keys', () => {
    expect(P.bg).toBe('#060709');
    expect(P.gW).toBe('#E8D5B7');
    expect(P.ok).toBe('#34D399');
    expect(P.err).toBe('#EF4444');
    expect(P.txS).toBeDefined();
    expect(P.txM).toBeDefined();
    expect(P.txD).toBeDefined();
  });

  it('exports font stacks', () => {
    expect(FN).toContain('Outfit');
    expect(FD).toContain('Cormorant Garamond');
    expect(FM).toContain('JetBrains Mono');
  });

  it('exports gradient strings', () => {
    expect(grad).toContain('linear-gradient');
    expect(gradSub).toContain('linear-gradient');
  });
});
