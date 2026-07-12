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

  it('always shows the Insights tab, regardless of active domains', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={[]} />);
    expect(container.textContent).toContain('Insights');
  });

  it('places Insights between domain tabs and Profile', () => {
    const { container } = render(<TabNav activeTab="routine" onTabChange={() => {}} domains={['body']} />);
    const ids = Array.from(container.querySelectorAll('button')).map(b => b.getAttribute('data-testid'));
    const insightsIdx = ids.indexOf('tab-insights');
    const profileIdx = ids.indexOf('tab-profile');
    const bodyIdx = ids.indexOf('tab-body');
    expect(insightsIdx).toBeGreaterThan(bodyIdx);
    expect(insightsIdx).toBeLessThan(profileIdx);
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
