'use client';
import { useState } from 'react';

export default function ApplyForm({ prefill, recipientId, sourceTouch }) {
  const [fields, setFields] = useState({
    email: prefill?.email || '',
    first_name: prefill?.first_name || '',
    last_name: prefill?.last_name || '',
    phone: prefill?.phone || '',
    company: prefill?.company || '',
    city: prefill?.city || '',
    state: prefill?.state || '',
    why_interested: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  function set(k) { return e => setFields({ ...fields, [k]: e.target.value }); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/ambassador-apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, recipient_id: recipientId, source_touch: sourceTouch }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error || 'Submission failed');
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div style={{ padding: '8px 0 36px' }}>
        <p style={{ font: "300 italic 22px 'Cormorant Garamond', serif", color: '#1A1C22', lineHeight: 1.4, margin: '0 0 18px' }}>Got it — your application's in.</p>
        <p style={{ font: "400 15px Arial, sans-serif", color: '#1A1C22', lineHeight: 1.7, margin: 0 }}>We review every application by hand. Expect a same-day reply with your link, ambassador code, and a quick first-share template.</p>
        <p style={{ font: "400 13px Arial, sans-serif", color: '#7A7D88', lineHeight: 1.7, margin: '24px 0 0' }}>&mdash; The advnce labs team</p>
      </div>
    );
  }

  const inputStyle = { width: '100%', padding: 12, fontSize: 14, border: '1px solid #E4E7EC', borderRadius: 3, background: '#fff', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' };
  const labelStyle = { font: "700 10px 'Barlow Condensed', sans-serif", letterSpacing: 2, textTransform: 'uppercase', color: '#4A4F5C', display: 'block', marginBottom: 6 };
  const row = { marginBottom: 16 };

  return (
    <form onSubmit={submit} style={{ padding: '8px 0 36px' }}>
      <div style={row}><label style={labelStyle}>Email *</label><input type="email" required value={fields.email} onChange={set('email')} style={inputStyle} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={labelStyle}>First name *</label><input type="text" required value={fields.first_name} onChange={set('first_name')} style={inputStyle} /></div>
        <div><label style={labelStyle}>Last name</label><input type="text" value={fields.last_name} onChange={set('last_name')} style={inputStyle} /></div>
      </div>
      <div style={row}><label style={labelStyle}>Phone *</label><input type="tel" required value={fields.phone} onChange={set('phone')} style={inputStyle} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div><label style={labelStyle}>Company / dealer</label><input type="text" value={fields.company} onChange={set('company')} style={inputStyle} /></div>
        <div><label style={labelStyle}>City</label><input type="text" value={fields.city} onChange={set('city')} style={inputStyle} /></div>
        <div><label style={labelStyle}>State</label><input type="text" maxLength={2} value={fields.state} onChange={e => setFields({ ...fields, state: e.target.value.toUpperCase() })} style={inputStyle} /></div>
      </div>
      <div style={row}><label style={labelStyle}>What made you say yes? (one line)</label><input type="text" value={fields.why_interested} onChange={set('why_interested')} style={inputStyle} placeholder="e.g. residual income angle / network already buys / curious" /></div>

      {error && <p style={{ color: '#E07C24', font: "400 13px Arial, sans-serif", margin: '0 0 12px' }}>{error}</p>}

      <button type="submit" disabled={busy} style={{
        width: '100%', padding: '16px 24px', font: "900 14px 'Barlow Condensed', sans-serif", letterSpacing: 4,
        textTransform: 'uppercase', color: '#1A1C22', background: '#E07C24', border: 0, borderRadius: 3, cursor: busy ? 'wait' : 'pointer', marginTop: 12,
      }}>{busy ? 'Submitting…' : "I'm in — submit →"}</button>

      <p style={{ font: "400 11px 'JetBrains Mono', monospace", color: '#7A7D88', letterSpacing: 1, marginTop: 18, textAlign: 'center' }}>Same-day review. Your link in your inbox once approved.</p>
    </form>
  );
}
