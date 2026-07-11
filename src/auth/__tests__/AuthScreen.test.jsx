import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthScreen from '../AuthScreen.jsx';
import { signUpWithEmail, signInWithEmail } from '../../services/auth.js';

vi.mock('../../services/auth.js');

describe('AuthScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithEmail.mockResolvedValue({ user: { id: 'u1' }, error: null });
    signUpWithEmail.mockResolvedValue({ user: { id: 'u1' }, error: null });
  });

  it('renders email + password inputs and a submit button', () => {
    const { container } = render(<AuthScreen />);
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(container.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('renders the default heading and subheading via H', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Adonis')).toBeTruthy();
    expect(screen.getByText('Sign up to unlock your protocol')).toBeTruthy();
  });

  it('renders custom heading and subheading when provided', () => {
    render(<AuthScreen heading="Custom Heading" subheading="Custom subheading text" />);
    expect(screen.getByText('Custom Heading')).toBeTruthy();
    expect(screen.getByText('Custom subheading text')).toBeTruthy();
  });

  it('never renders Google OAuth text', () => {
    const { container } = render(<AuthScreen />);
    expect(container.textContent).not.toMatch(/google/i);
  });

  it('toggles mode, swapping the submit button label between /sign in/i and /sign up/i', () => {
    const { container } = render(<AuthScreen />);
    const submitBtn = () => container.querySelector('button[type="submit"]');

    expect(submitBtn().textContent).toMatch(/sign in/i);

    // Click the mode-toggle link (the only non-submit button initially)
    const toggleBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.type !== 'submit'
    );
    fireEvent.click(toggleBtn);

    expect(submitBtn().textContent).toMatch(/sign up/i);
  });

  it('renders in signup mode without toggling when initialMode="signup"', () => {
    const { container } = render(<AuthScreen initialMode="signup" />);
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn.textContent).toMatch(/sign up/i);
    expect(screen.getByText('Create your account')).toBeTruthy();
  });

  it('renders the error message when signUpWithEmail resolves with an error', async () => {
    signUpWithEmail.mockResolvedValue({ user: null, error: { message: 'boom' } });

    const { container } = render(<AuthScreen />);

    // Switch to signup mode so submit routes through signUpWithEmail
    const toggleBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.type !== 'submit'
    );
    fireEvent.click(toggleBtn);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password1' } });
    fireEvent.click(container.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeTruthy();
    });
    expect(signUpWithEmail).toHaveBeenCalledWith('a@b.com', 'password1');
  });
});
