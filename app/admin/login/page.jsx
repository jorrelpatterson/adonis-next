'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(from);
        router.refresh();
      } else {
        setError('Invalid credentials');
        setPassword('');
      }
    } catch (err) {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0F1928',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: '#fff',
        borderRadius: 12, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg viewBox="0 0 48 28" width="48" height="28" fill="none" style={{ marginBottom: 12 }}>
            <path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#0F1928" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="20" cy="14" r="2" fill="#00A0A8" opacity=".7"/>
            <circle cx="32" cy="9" r="2" fill="#00A0A8"/>
            <circle cx="38" cy="12" r="2" fill="#E07C24"/>
            <circle cx="46" cy="3" r="2.5" fill="#E07C24"/>
          </svg>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22,
            fontWeight: 800, letterSpacing: 2, color: '#0F1928',
          }}>
            ADONIS <span style={{ fontWeight: 300, color: '#8C919E' }}>ADMIN</span>
          </div>
          <div style={{ fontSize: 12, color: '#8C919E', marginTop: 4 }}>Sign in to continue</div>
        </div>

        <div onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && password && handleLogin(e)}
            autoFocus
            style={{
              width: '100%', padding: '14px 16px', border: '1.5px solid #E4E7EC',
              borderRadius: 8, fontSize: 15, outline: 'none', background: '#FAFBFC',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#0072B5'}
            onBlur={e => e.target.style.borderColor = '#E4E7EC'}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && handleLogin(e)}
            style={{
              width: '100%', padding: '14px 16px', border: '1.5px solid #E4E7EC',
              borderRadius: 8, fontSize: 15, outline: 'none', background: '#FAFBFC',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#0072B5'}
            onBlur={e => e.target.style.borderColor = '#E4E7EC'}
          />

          {error && (
            <div style={{
              padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 6, fontSize: 13, color: '#DC2626', fontWeight: 500,
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            style={{
              width: '100%', padding: '14px', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: email && password && !loading ? '#0072B5' : '#E4E7EC',
              color: email && password && !loading ? '#fff' : '#8C919E',
              transition: 'all 0.2s', letterSpacing: 0.5,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#B0B4BC', textAlign: 'center', marginTop: 20 }}>
          Adonis Protocol OS · Admin Panel v3.0
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0F1928' }} />}><LoginInner /></Suspense>;
}
