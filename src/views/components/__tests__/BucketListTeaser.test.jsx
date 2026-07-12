// src/views/components/__tests__/BucketListTeaser.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import BucketListTeaser from '../BucketListTeaser';

describe('BucketListTeaser', () => {
  it('free tier: shows lock chrome and the redeem-pointer text, zero interactive elements', () => {
    const { container } = render(<BucketListTeaser tier="free" />);
    expect(container.textContent).toContain('Bucket List');
    expect(container.textContent).toContain('Locked — Elite feature');
    expect(container.textContent).toContain('Unlock with an Elite access code — redeem in Profile.');
    expect(container.querySelectorAll('button, a, input').length).toBe(0);
  });

  it('pro tier: still locked (not just free-gated), zero interactive elements', () => {
    const { container } = render(<BucketListTeaser tier="pro" />);
    expect(container.textContent).toContain('Locked — Elite feature');
    expect(container.textContent).toContain('redeem in Profile');
    expect(container.querySelectorAll('button, a, input').length).toBe(0);
  });

  it('elite tier: renders the "Coming first to Elite" variant, still zero interactive elements', () => {
    const { container } = render(<BucketListTeaser tier="elite" />);
    expect(container.textContent).toContain('Coming first to Elite');
    expect(container.textContent).not.toContain('Locked — Elite feature');
    expect(container.textContent).not.toContain('redeem in Profile');
    expect(container.querySelectorAll('button, a, input').length).toBe(0);
  });

  it('promise copy mentions cross-domain decomposition (stable phrase), for every tier', () => {
    for (const tier of ['free', 'pro', 'elite']) {
      const { container } = render(<BucketListTeaser tier={tier} />);
      expect(container.textContent).toContain('cross-domain strategy');
      expect(container.textContent).toContain('Money funds it');
      expect(container.textContent).toContain('Body preps you');
      expect(container.textContent).toContain('Travel handles the');
    }
  });

  it('renders 2-3 example goal chips', () => {
    const { container } = render(<BucketListTeaser tier="free" />);
    expect(container.textContent).toContain('Go to Egypt');
    expect(container.textContent).toContain('Run a marathon');
    expect(container.textContent).toContain('Buy a house');
  });

  it('never wires an href="#" or onClick-style navigation', () => {
    const { container } = render(<BucketListTeaser tier="free" />);
    expect(container.querySelectorAll('[href]').length).toBe(0);
  });
});
