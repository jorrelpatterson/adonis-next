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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Wired up in Task 7 — for now this is UI-only.
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

      {/* Turnstile placeholder — Task 6 fills this */}
      {turnstileSiteKey ? (
        <div data-turnstile-placeholder style={{ minHeight: 65 }} />
      ) : null}

      <button
        type="submit"
        style={{
          marginTop: 12,
          padding: '14px 24px',
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
        Submit Application
      </button>
    </form>
  );
}
