'use client';
import { Suspense } from 'react';

export default function AmbassadorLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: '#0F1928', color: '#fff', padding: '14px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>
          ADVNCE <span style={{ fontWeight: 300, opacity: 0.6 }}>AMBASSADOR</span>
        </div>
        <a
          href="https://www.advncelabs.com"
          style={{ fontSize: 11, color: '#6B7A94', textDecoration: 'none', letterSpacing: 1, textTransform: 'uppercase' }}
        >
          ↗ advncelabs.com
        </a>
      </header>
      <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Suspense fallback={<div style={{ color: '#7A7D88' }}>Loading…</div>}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
