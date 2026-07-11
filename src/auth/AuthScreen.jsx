import React, { useState } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { H, GradText } from '../design/components';
// Google OAuth deferred — see parity ledger 2026-07-09
import { signUpWithEmail, signInWithEmail } from '../services/auth.js';

export default function AuthScreen({ heading = 'Adonis', subheading = 'Sign up to unlock your protocol' }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Email and password required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const fn = mode === 'signup' ? signUpWithEmail : signInWithEmail;
    const { error: err } = await fn(email, password);
    setLoading(false);
    if (err) setError(typeof err === 'string' ? err : (err.message || 'Something went wrong'));
    // On success, useAuth's onAuthStateChange listener will rerender App
  };

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px',
            background: 'rgba(14,16,22,0.7)', border: '1px solid rgba(232,213,183,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: FD, fontSize: 28, fontWeight: 300, fontStyle: 'italic' }}>
              <GradText>A</GradText>
            </span>
          </div>
          <H t={heading} sub={subheading} eyebrow="Protocol OS" />
        </div>

        <div className="adn-reveal" style={{ ...s.card, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: P.txS }}>
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </div>
            <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>
              {mode === 'signup'
                ? 'Free forever · Body domain included'
                : 'Sign in to continue your protocol'}
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              style={{ ...s.inp, marginBottom: 10 }}
            />
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={{ ...s.inp, marginBottom: 14 }}
            />

            {error && (
              <div style={{
                fontSize: 11, color: P.warn || '#F59E0B',
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.15)',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...s.btn, ...s.pri,
                width: '100%', justifyContent: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: P.txD }}>
            {mode === 'signup' ? 'Already have an account?' : 'New to Adonis?'}
            {' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
              style={{
                background: 'none', border: 'none',
                color: P.gW, cursor: 'pointer',
                fontFamily: FN, fontSize: 11, fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9, color: P.txD, letterSpacing: 1, lineHeight: 1.6 }}>
          By signing up you agree to the protocol design as research<br />and education, not medical advice.
        </div>

      </div>
    </div>
  );
}
