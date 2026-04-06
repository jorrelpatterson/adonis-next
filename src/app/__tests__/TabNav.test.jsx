// src/app/__tests__/TabNav.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import TabNav from '../TabNav';

describe('TabNav', () => {
  it('always shows Routine and Profile tabs', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={[]} />);
    expect(container.textContent).toContain('Routine');
    expect(container.textContent).toContain('Profile');
  });

  it('shows domain tabs for active domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body', 'money']} />);
    expect(container.textContent).toContain('Body');
    expect(container.textContent).toContain('Money');
  });

  it('does not show inactive domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body']} />);
    expect(container.textContent).not.toContain('Travel');
  });
});
