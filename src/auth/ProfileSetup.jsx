// First-run profile capture — shown after signup, before the user can use the app.
// Captures the basics needed for the adaptive engine (BMR, TDEE, calorie targets).

import React, { useState } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import Select from '../design/Select';

const ACTIVITY_OPTIONS = [
  { id: 'sedentary',   label: 'Sedentary',           sub: 'Desk job, minimal exercise' },
  { id: 'light',       label: 'Lightly active',      sub: 'Light exercise 1-3 days/week' },
  { id: 'moderate',    label: 'Moderately active',   sub: 'Exercise 3-5 days/week' },
  { id: 'active',      label: 'Active',              sub: 'Hard exercise 6-7 days/week' },
  { id: 'very_active', label: 'Very active',         sub: 'Twice daily or physical job' },
];

/**
 * Returns true if the profile is missing fields the adaptive engine needs.
 */
export function isProfileIncomplete(profile) {
  if (!profile) return true;
  const required = ['name', 'age', 'gender', 'weight', 'hFt', 'activity'];
  for (const f of required) {
    const v = profile[f];
    if (v == null || v === '') return true;
  }
  return false;
}

export default function ProfileSetup({ onSave }) {
  const [form, setForm] = useState({
    name: '', age: '', gender: '', weight: '', hFt: '', hIn: '', activity: '',
  });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = () => {
    setError('');
    if (!form.name || !form.age || !form.gender || !form.weight || !form.hFt || !form.activity) {
      setError('Please fill in every field — the adaptive engine needs all of it');
      return;
    }
    if (Number(form.age) < 13 || Number(form.age) > 120) {
      setError('Age must be between 13 and 120');
      return;
    }
    if (Number(form.weight) < 50 || Number(form.weight) > 800) {
      setError('Weight (lbs) seems off');
      return;
    }
    onSave({
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      weight: Number(form.weight),
      hFt: Number(form.hFt),
      hIn: Number(form.hIn || 0),
      activity: form.activity,
    });
  };

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px' }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: P.txS }}>
            <GradText>Adonis</GradText>
          </div>
          <div style={{ fontSize: 11, color: P.gW, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
            One-time setup
          </div>
        </div>

        <div style={{ ...s.card, padding: 22, marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: P.txS, marginBottom: 6 }}>
            Tell us about you
          </div>
          <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, marginBottom: 18 }}>
            The protocol adapts to your body. We need a few basics so the adaptive
            calorie engine, workout intensity, and peptide recommendations actually
            fit you instead of giving you generic advice.
          </div>

          {/* Name */}
          <label style={s.lab}>Name</label>
          <input
            value={form.name}
            onChange={set('name')}
            placeholder="Your name"
            style={{ ...s.inp, marginBottom: 14 }}
          />

          {/* Age + gender row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={s.lab}>Age</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.age}
                onChange={set('age')}
                placeholder="32"
                style={{ ...s.inp }}
              />
            </div>
            <div>
              <label style={s.lab}>Sex (for BMR formula)</label>
              <Select
                value={form.gender}
                onChange={(v) => setForm({ ...form, gender: v })}
                placeholder="Select…"
                label="Biological sex"
                options={[
                  { value: 'male',   label: 'Male',   sub: 'Mifflin-St Jeor (M) BMR formula' },
                  { value: 'female', label: 'Female', sub: 'Mifflin-St Jeor (F) BMR formula' },
                ]}
              />
            </div>
          </div>

          {/* Weight + height row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={s.lab}>Weight (lbs)</label>
              <input
                type="number"
                inputMode="decimal"
                value={form.weight}
                onChange={set('weight')}
                placeholder="180"
                style={{ ...s.inp }}
              />
            </div>
            <div>
              <label style={s.lab}>Height (ft)</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.hFt}
                onChange={set('hFt')}
                placeholder="5"
                style={{ ...s.inp }}
              />
            </div>
            <div>
              <label style={s.lab}>(in)</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.hIn}
                onChange={set('hIn')}
                placeholder="11"
                style={{ ...s.inp }}
              />
            </div>
          </div>

          {/* Activity */}
          <label style={s.lab}>Activity level</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
            {ACTIVITY_OPTIONS.map(opt => {
              const isSelected = form.activity === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm({ ...form, activity: opt.id })}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(232,213,183,0.08)' : 'transparent',
                    border: '1px solid ' + (isSelected ? P.gW : P.bd),
                    color: isSelected ? P.txS : P.txM,
                    cursor: 'pointer', fontFamily: FN,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            fontSize: 11, color: P.warn || '#F59E0B',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          style={{ ...s.btn, ...s.pri, width: '100%', justifyContent: 'center' }}
        >
          Continue to Adonis
        </button>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9, color: P.txD, lineHeight: 1.6 }}>
          You can update these anytime from the Profile tab.
        </div>
      </div>
    </div>
  );
}
