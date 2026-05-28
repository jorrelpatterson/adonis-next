// src/app/views/workout/__tests__/DeloadBanner.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import DeloadBanner from '../DeloadBanner';

describe('DeloadBanner', () => {
  it('renders the cut-volume guidance', () => {
    const { container } = render(<DeloadBanner />);
    expect(container.textContent.toLowerCase()).toContain('deload');
    expect(container.textContent).toContain('40');
    expect(container.textContent.toLowerCase()).toContain('volume');
  });
});
