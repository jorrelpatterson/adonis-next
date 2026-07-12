// src/app/__tests__/LockedDomain.test.jsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import LockedDomain from '../LockedDomain';

const MONEY_DOMAIN = { id: 'money', icon: '\u{1F4B0}', name: 'Money', sub: 'Credit, income, investing' };

describe('LockedDomain', () => {
  it('renders the domain name/icon and Pro-tier copy, not the generic domain view', () => {
    const { getByText, container } = render(<LockedDomain domain={MONEY_DOMAIN} onGoToProfile={() => {}} />);
    expect(container.textContent).toContain('Money');
    expect(getByText(/Locked/)).toBeTruthy();
    // Pro-tier feature copy pulled from SUB_TIERS.pro
    expect(container.textContent).toContain('All domains unlocked');
  });

  it('CTA calls onGoToProfile when clicked', () => {
    const onGoToProfile = vi.fn();
    const { getByText } = render(<LockedDomain domain={MONEY_DOMAIN} onGoToProfile={onGoToProfile} />);
    fireEvent.click(getByText('Redeem an access code'));
    expect(onGoToProfile).toHaveBeenCalledTimes(1);
  });
});
