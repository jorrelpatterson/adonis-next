// src/app/__tests__/App.test.jsx
// Shell smoke test — guards the AmbientBackdrop wiring (Task 10) and the shell
// against crash-on-render regressions as App.jsx becomes the Phase 2+ churn hotspot.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { StateProvider } from '../../state/store';
import App from '../App';

describe('App shell', () => {
  it('renders inside StateProvider without throwing', () => {
    const { container } = render(
      <StateProvider>
        <App />
      </StateProvider>
    );
    expect(container.querySelector('.adn-noise')).toBeTruthy();
  });

  it('mounts the ambient backdrop (z:0 layers) behind the content wrapper (z:2)', () => {
    const { container } = render(
      <StateProvider>
        <App />
      </StateProvider>
    );
    const kids = [...container.querySelector('.adn-noise').children];
    // AmbientBackdrop renders a fragment of pointer-events:none layers at zIndex 0;
    // the content wrapper carries zIndex 2 so taps/scroll land on content, not the field.
    const firstBackdropIdx = kids.findIndex((el) => el.style.zIndex === '0');
    const contentIdx = kids.findIndex((el) => el.style.zIndex === '2');
    expect(firstBackdropIdx).toBe(0);           // backdrop is the first thing rendered
    expect(contentIdx).toBeGreaterThan(firstBackdropIdx); // content sits above it
  });
});
