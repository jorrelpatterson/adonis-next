'use client';
import { useState, useEffect } from 'react';

const OFFSET_KEY = 'rewards_announce_offset';

// One-off ADVNCE Rewards launch announcement: dry run → test send → send all.
// Backed by /api/rewards-announce. No tracking table; failures are listed for retry.

const card = { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: 20, marginBottom: 16 };
const btn = { padding: '10px 18px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' };

export default function RewardsAnnouncePage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [armed, setArmed] = useState(false);
  const [resumeOffset, setResumeOffset] = useState(0);
  const [failedAll, setFailedAll] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setResumeOffset(parseInt(localStorage.getItem(OFFSET_KEY) || '0', 10) || 0);
  }, []);

  async function call(payload) {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/rewards-announce', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult({ payload, data });
      return data;
    } catch (err) {
      setError(String(err.message || err));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function sendAll() {
    setArmed(false);
    setDone(false);
    // Resume from the last completed chunk (survives reloads/crashes via localStorage).
    // A chunk that errors mid-flight is NOT marked complete; retrying re-sends only
    // that chunk — bounded duplication, never a restart from zero.
    let offset = parseInt(localStorage.getItem(OFFSET_KEY) || '0', 10) || 0;
    for (;;) {
      const data = await call({ mode: 'send', confirm: 'SEND EVERYONE', offset });
      if (!data) { setResumeOffset(offset); return; } // error shown; offset kept for resume
      if (Array.isArray(data.failed) && data.failed.length) setFailedAll(f => [...f, ...data.failed]);
      if (data.next_offset == null) {
        localStorage.removeItem(OFFSET_KEY);
        setResumeOffset(0);
        setDone(true);
        return;
      }
      offset = data.next_offset;
      localStorage.setItem(OFFSET_KEY, String(offset));
      setResumeOffset(offset);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1928', marginBottom: 4 }}>ADVNCE Rewards — Launch Announcement</h1>
      <p style={{ fontSize: 13, color: '#6B7A94', marginBottom: 20 }}>
        One-time email to all customers, subscribers, and ambassadors (deduped, unsubscribes excluded).
        Members at $350+ get the &ldquo;you already earned this&rdquo; email with their tier and gift; everyone else gets the program intro.
      </p>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>1 · Preview the plan</div>
        <button disabled={busy} onClick={() => call({ mode: 'dryrun' })} style={{ ...btn, background: '#F7F8FA', color: '#0072B5', border: '1px solid #E4E7EC' }}>
          {busy ? 'Working…' : 'Dry run — who gets what'}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>2 · Send yourself both versions</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@email.com"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #E4E7EC', borderRadius: 6, fontSize: 13 }} />
          <button disabled={busy || !testEmail} onClick={() => call({ mode: 'test', testEmail })} style={{ ...btn, background: '#0072B5', color: '#fff' }}>
            Send test
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>3 · Send to everyone</div>
        {!armed ? (
          <button disabled={busy} onClick={() => setArmed(true)} style={{ ...btn, background: '#FFF7ED', color: '#E07C24', border: '1px solid #E07C24' }}>
            {resumeOffset > 0 ? `Resume send (from #${resumeOffset})…` : 'Send to everyone…'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#B91C1C' }}>
              {resumeOffset > 0 ? `Resumes at recipient #${resumeOffset}.` : 'This emails the entire list.'} Sure?
            </span>
            <button disabled={busy} onClick={sendAll} style={{ ...btn, background: '#E07C24', color: '#fff' }}>Yes — send now</button>
            <button disabled={busy} onClick={() => setArmed(false)} style={{ ...btn, background: '#F7F8FA', color: '#6B7A94', border: '1px solid #E4E7EC' }}>Cancel</button>
          </div>
        )}
        {done && <div style={{ fontSize: 13, color: '#16A34A', marginTop: 10 }}>✓ Send complete{failedAll.length ? ` — ${failedAll.length} failed (listed below)` : ' — no failures'}</div>}
        {failedAll.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#B91C1C', marginBottom: 4 }}>Failed recipients (all chunks):</div>
            {failedAll.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: '#4A4F5C', padding: '2px 0' }}>{f.email} — {f.error}</div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ ...card, border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: 13 }}>⚠ {error}</div>}

      {result && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Result — {result.payload.mode}
          </div>
          {result.data.counts && (
            <div style={{ fontSize: 13, color: '#0F1928', marginBottom: 10 }}>
              {Object.entries(result.data.counts).map(([k, v]) => <span key={k} style={{ marginRight: 16 }}><strong>{v}</strong> {k.replace('_', ' ')}</span>)}
              {typeof result.data.total === 'number' && <span><strong>{result.data.total}</strong> total</span>}
            </div>
          )}
          {Array.isArray(result.data.members) && result.data.members.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0F1928', marginBottom: 6 }}>Members (already earned status):</div>
              {result.data.members.map(m => (
                <div key={m.email} style={{ fontSize: 12, color: '#4A4F5C', padding: '3px 0', borderBottom: '1px solid #F0F1F4' }}>
                  {m.email} — <strong>{m.tier}</strong> · ${m.lifetime.toFixed(2)} lifetime · gift: {m.gifts.join(' + ')}
                </div>
              ))}
            </div>
          )}
          <pre style={{ fontSize: 11, background: '#F7F8FA', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 280 }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
