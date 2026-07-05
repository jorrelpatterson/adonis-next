import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import * as icons from '../icons';
import * as illustrations from '../illustrations';

describe('iconography', () => {
  it('every icon export renders an svg', () => {
    const entries = Object.entries(icons).filter(([, v]) => typeof v === 'function');
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, Icon] of entries) {
      const { container, unmount } = render(<Icon size={20} />);
      expect(container.querySelector('svg'), name).toBeTruthy();
      unmount();
    }
  });

  it('every illustration export renders an svg', () => {
    const entries = Object.entries(illustrations).filter(([, v]) => typeof v === 'function');
    expect(entries.length).toBeGreaterThan(0);
    for (const [name, Illus] of entries) {
      const { container, unmount } = render(<Illus size={80} />);
      expect(container.querySelector('svg'), name).toBeTruthy();
      unmount();
    }
  });
});
