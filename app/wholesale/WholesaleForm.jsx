// app/wholesale/WholesaleForm.jsx
'use client';
import { useState } from 'react';
import { COUNTRIES } from '../../lib/constants/countries';

const VOLUMES = ['10–99', '100–499', '500–999', '1000+'];

const labelStyle = {
  fontSize: 10,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#9C9A94',
  marginBottom: 6,
  display: 'block',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0F1117',
  border: '1px solid rgba(232,213,183,0.15)',
  borderRadius: 4,
  color: '#E8E4E0',
  fontSize: 13,
  fontFamily: "'Outfit', sans-serif",
  outline: 'none',
};

export default function WholesaleForm({ turnstileSiteKey }) {
  const [form, setForm] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    country: 'United States',
    state: '',
    expected_volume: '',
    research_use_only: false,
    agree_terms: false,
    // honeypot — bots fill it, humans don't see it
    website_url_hp: '',
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (submitted) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid rgba(232,213,183,0.15)',
          borderRadius: 4,
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: 32,
            color: '#E8D5B7',
            marginBottom: 16,
          }}
        >
          Thank you.
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#9C9A94', maxWidth: 420, margin: '0 auto' }}>
          Your application is in. We review wholesale inquiries within 1–2 business days. If
          approved, you'll receive your login code and current pricing sheet by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
          const res = await fetch('/api/wholesale-apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Submission failed. Please try again.');
            setSubmitting(false);
            return;
          }
          setSubmitted(true);
        } catch (err) {
          setError('Network error. Please try again.');
          setSubmitting(false);
        }
      }}
      style={{ display: 'grid', gap: 18 }}
    >
      {/* honeypot: visually hidden but present in DOM */}
      <input
        type="text"
        name="website_url_hp"
        value={form.website_url_hp}
        onChange={(e) => update('website_url_hp', e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{
          position: 'absolute',
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
        }}
        aria-hidden="true"
      />

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Business name
        </label>
        <input
          type="text"
          required
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Contact name
          </label>
          <input
            type="text"
            required
            value={form.contact_name}
            onChange={(e) => update('contact_name', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Phone
          </label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Email
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>Country
          </label>
          <select
            required
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            style={inputStyle}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c} style={{ background: '#0F1117' }}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            <span style={{ color: '#E07C24' }}>* </span>State / Province
          </label>
          <input
            type="text"
            required
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>
          <span style={{ color: '#E07C24' }}>* </span>Expected monthly volume (vials)
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {VOLUMES.map((v) => {
            const selected = form.expected_volume === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update('expected_volume', v)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  background: selected ? 'rgba(232,213,183,0.08)' : '#0F1117',
                  border: selected
                    ? '1px solid #E8D5B7'
                    : '1px solid rgba(232,213,183,0.15)',
                  borderRadius: 4,
                  color: selected ? '#E8D5B7' : '#9C9A94',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: 1,
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <label
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          background: 'rgba(224,124,36,0.04)',
          border: '1px solid rgba(224,124,36,0.15)',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.55,
          color: '#E8E4E0',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          required
          checked={form.research_use_only}
          onChange={(e) => update('research_use_only', e.target.checked)}
          style={{ marginTop: 2, accentColor: '#E07C24' }}
        />
        <span>
          <span style={{ color: '#E07C24' }}>* </span>I confirm products purchased are for
          research or professional use only.
        </span>
      </label>

      <label
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 14px',
          background: 'rgba(232,213,183,0.04)',
          border: '1px solid rgba(232,213,183,0.15)',
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 1.55,
          color: '#E8E4E0',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          required
          checked={form.agree_terms}
          onChange={(e) => update('agree_terms', e.target.checked)}
          style={{ marginTop: 2, accentColor: '#E8D5B7' }}
        />
        <span>
          <span style={{ color: '#E07C24' }}>* </span>I agree to advnce labs'{' '}
          <a href="/wholesale-terms" style={{ color: '#E8D5B7' }}>
            wholesale terms
          </a>
          .
        </span>
      </label>

      {turnstileSiteKey ? (
        <div
          ref={(el) => {
            if (!el || el.dataset.rendered) return;
            el.dataset.rendered = '1';
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
              window.turnstile?.render(el, {
                sitekey: turnstileSiteKey,
                callback: (token) => setTurnstileToken(token),
                'expired-callback': () => setTurnstileToken(''),
                'error-callback': () => setTurnstileToken(''),
              });
            };
            document.head.appendChild(script);
          }}
          style={{ minHeight: 65, display: 'flex', justifyContent: 'center' }}
        />
      ) : null}

      {error ? (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 4,
            color: '#EF4444',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: 12,
          padding: '14px 24px',
          opacity: submitting ? 0.5 : 1,
          background: '#E8D5B7',
          color: '#050507',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif",
          cursor: 'pointer',
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}
