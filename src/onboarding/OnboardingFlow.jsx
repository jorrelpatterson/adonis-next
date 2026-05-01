// Multi-step onboarding wizard — replaces single-page ProfileSetup.
//
// FLOW
//   Step 0: Profile basics (name, age, sex, weight, height, activity)
//   Step 1: Domain selection (which 2 for free, all 8 for pro/elite)
//   Step 2..N: Per-protocol questions for selected domains
//   Step N+1: Schedule (work week + training preference) — currently skipped at MVP
//   On finish: calls onComplete(profileUpdates, protocolStateUpdates)
//
// State is held locally; only flushed to global store on completion. This
// lets users navigate back without losing answers and keeps localStorage clean.

import React, { useState, useMemo } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText } from '../design/components';
import { DOMAINS } from '../design/constants';
import { collectOnboardingQuestions } from '../protocols/protocol-interface';
import { getAllProtocols } from '../protocols/registry';
import { shouldShowQuestion } from './question-types';
import QuestionField from './QuestionField';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary',           sub: 'Desk job, minimal exercise' },
  { value: 'light',       label: 'Lightly active',      sub: 'Light exercise 1-3 days/week' },
  { value: 'moderate',    label: 'Moderately active',   sub: 'Exercise 3-5 days/week' },
  { value: 'active',      label: 'Active',              sub: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very active',         sub: 'Twice daily or physical job' },
];

export default function OnboardingFlow({ initialProfile, onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfileLocal] = useState({
    name: '', age: '', gender: '', weight: '', hFt: '', hIn: '', activity: '',
    domains: ['body'],  // body always selected
    ...initialProfile,
  });
  const [protocolAnswers, setProtocolAnswers] = useState({});
  const [schedule, setSchedule] = useState({
    workMode: '',
    workStart: '09:00',
    workEnd: '17:00',
    restDay: 'sun',
  });
  const [error, setError] = useState('');

  const setField = (k, v) => setProfileLocal(p => ({ ...p, [k]: v }));
  const setProtocolField = (protocolId, qid, v) => setProtocolAnswers(prev => ({
    ...prev,
    [protocolId]: { ...(prev[protocolId] || {}), [qid]: v },
  }));

  // Compute the per-protocol question sections based on selected domains.
  // Recomputes when profile.domains changes.
  const sections = useMemo(() => {
    const protos = getAllProtocols();
    return collectOnboardingQuestions(protos, profile);
  }, [profile.domains]);

  // Total step count: 2 fixed (basics, domains) + N protocol sections + 1 schedule
  const totalSteps = 2 + sections.length + 1;
  const scheduleStepIdx = 2 + sections.length;

  const onBasicsNext = () => {
    setError('');
    if (!profile.name || !profile.age || !profile.gender || !profile.weight || !profile.hFt || !profile.activity) {
      setError('Please fill in every field');
      return;
    }
    if (Number(profile.age) < 13 || Number(profile.age) > 120) {
      setError('Age must be 13-120');
      return;
    }
    if (Number(profile.weight) < 50 || Number(profile.weight) > 800) {
      setError('Weight (lbs) seems off');
      return;
    }
    setStep(1);
  };

  const toggleDomain = (id) => {
    if (id === 'body') return; // body always on
    setProfileLocal(p => {
      const has = (p.domains || []).includes(id);
      return { ...p, domains: has ? p.domains.filter(d => d !== id) : [...(p.domains || []), id] };
    });
  };

  const onDomainsNext = () => {
    setError('');
    if (!profile.domains || profile.domains.length === 0) {
      setError('Pick at least one domain');
      return;
    }
    setStep(2);
  };

  const onProtocolNext = () => {
    setError('');
    const sectionIdx = step - 2;
    const section = sections[sectionIdx];
    const answers = protocolAnswers[section.protocolId] || {};
    // Validate required questions that are visible
    for (const q of section.questions) {
      if (!shouldShowQuestion(q, profile, protocolAnswers)) continue;
      const v = answers[q.id];
      if (q.required && (v == null || v === '' || (Array.isArray(v) && v.length === 0))) {
        setError(`Please answer: ${q.label}`);
        return;
      }
    }
    setStep(step + 1);  // advances to next protocol page or to schedule step
  };

  const onScheduleNext = () => {
    setError('');
    if (!schedule.workMode) {
      setError('Pick how you work — drives when we schedule training');
      return;
    }
    const finalProfile = {
      ...profile,
      age: Number(profile.age),
      weight: Number(profile.weight),
      hFt: Number(profile.hFt),
      hIn: Number(profile.hIn || 0),
      workMode: schedule.workMode,
      workStart: schedule.workStart,
      workEnd: schedule.workEnd,
      restDay: schedule.restDay,
    };
    onComplete(finalProfile, protocolAnswers);
  };

  const goBack = () => {
    setError('');
    if (step > 0) setStep(step - 1);
  };

  const progressPercent = ((step + 1) / totalSteps) * 100;

  // ─── render shell ─────────────────────────────────────────────────────────
  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px 32px' }}>

        {/* Brand + progress */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: P.txS }}>
            <GradText>Adonis</GradText>
          </div>
          <div style={{ fontSize: 9, color: P.gW, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
            Step {step + 1} of {totalSteps}
          </div>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: P.bd, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
            width: progressPercent + '%',
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* ─── step 0: Basics ─── */}
        {step === 0 && (
          <div style={{ ...s.card, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: P.txS, marginBottom: 6 }}>
              Tell us about you
            </div>
            <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, marginBottom: 18 }}>
              Adaptive calorie + intensity engines need this. We'll never share it.
            </div>

            <label style={s.lab}>Name</label>
            <input value={profile.name} onChange={e => setField('name', e.target.value)} placeholder="Your name" style={{ ...s.inp, marginBottom: 12 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={s.lab}>Age</label>
                <input type="number" inputMode="numeric" value={profile.age} onChange={e => setField('age', e.target.value)} placeholder="32" style={s.inp} />
              </div>
              <div>
                <label style={s.lab}>Sex</label>
                <select value={profile.gender} onChange={e => setField('gender', e.target.value)} style={s.sel}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={s.lab}>Weight (lbs)</label>
                <input type="number" inputMode="decimal" value={profile.weight} onChange={e => setField('weight', e.target.value)} placeholder="180" style={s.inp} />
              </div>
              <div>
                <label style={s.lab}>Ht (ft)</label>
                <input type="number" inputMode="numeric" value={profile.hFt} onChange={e => setField('hFt', e.target.value)} placeholder="5" style={s.inp} />
              </div>
              <div>
                <label style={s.lab}>(in)</label>
                <input type="number" inputMode="numeric" value={profile.hIn} onChange={e => setField('hIn', e.target.value)} placeholder="11" style={s.inp} />
              </div>
            </div>

            <label style={s.lab}>Activity level</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ACTIVITY_OPTIONS.map(opt => {
                const selected = profile.activity === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setField('activity', opt.value)} style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                    background: selected ? 'rgba(232,213,183,0.08)' : 'transparent',
                    border: '1px solid ' + (selected ? P.gW : P.bd),
                    color: selected ? P.txS : P.txM, cursor: 'pointer', fontFamily: FN,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── step 1: Domain selection ─── */}
        {step === 1 && (
          <div style={{ ...s.card, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: P.txS, marginBottom: 6 }}>
              What do you want to optimize?
            </div>
            <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, marginBottom: 18 }}>
              <strong style={{ color: P.txM }}>Body is free, forever.</strong> Add any others you want
              configured — Pro/Elite unlocks them all. Locked domains stay set up,
              ready to activate when you upgrade.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DOMAINS.map(d => {
                const isOn = (profile.domains || []).includes(d.id);
                const isBody = d.id === 'body';
                const isPaywalled = !isBody;  // Body is the only free domain
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDomain(d.id)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 12px',
                      borderRadius: 12,
                      position: 'relative',
                      background: isOn ? 'rgba(232,213,183,0.08)' : 'transparent',
                      border: '1.5px solid ' + (isOn ? P.gW : P.bd),
                      color: isOn ? P.txS : P.txM,
                      cursor: isBody ? 'default' : 'pointer',
                      fontFamily: FN,
                      opacity: isBody ? 0.95 : 1,
                    }}
                  >
                    {/* Tier badge — top-right corner */}
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      {isBody ? (
                        <span style={{
                          fontSize: 7, padding: '2px 6px', borderRadius: 4,
                          background: P.ok + '20', color: P.ok,
                          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                        }}>Free</span>
                      ) : (
                        <span style={{
                          fontSize: 7, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(232,213,183,0.08)', color: P.gW,
                          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                        }}>
                          <span style={{ fontSize: 8 }}>{'\u{1F512}'}</span>
                          Pro
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, paddingRight: 36 }}>
                      <span style={{ fontSize: 18 }}>{d.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: P.txD, lineHeight: 1.4 }}>{d.sub}</div>
                  </button>
                );
              })}
            </div>

            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(232,213,183,0.04)',
              border: '1px solid rgba(232,213,183,0.08)',
              fontSize: 10, color: P.txD, lineHeight: 1.5,
            }}>
              <strong style={{ color: P.gW }}>Tip:</strong> answer for every domain you{'’'}re curious about.
              Locked ones stay configured — when you upgrade, your routine activates instantly.
            </div>
          </div>
        )}

        {/* ─── step N (last): Schedule ─── */}
        {step === scheduleStepIdx && (
          <div style={{ ...s.card, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: P.txS, marginBottom: 6 }}>
              Your schedule
            </div>
            <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, marginBottom: 18 }}>
              Drives when we schedule training, meals, and routine tasks. You can change all of this later.
            </div>

            <label style={s.lab}>How do you work?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {[
                { value: 'employee',     label: 'Employee', sub: 'Fixed hours, structured day' },
                { value: 'entrepreneur', label: 'Entrepreneur / self-employed', sub: 'Flexible hours' },
                { value: 'shift',        label: 'Shift work', sub: 'Variable schedule, rotating shifts' },
              ].map(opt => {
                const sel = schedule.workMode === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setSchedule(prev => ({ ...prev, workMode: opt.value }))}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                      background: sel ? 'rgba(232,213,183,0.08)' : 'transparent',
                      border: '1px solid ' + (sel ? P.gW : P.bd),
                      color: sel ? P.txS : P.txM, cursor: 'pointer', fontFamily: FN,
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={s.lab}>Work start</label>
                <input type="time" value={schedule.workStart}
                  onChange={e => setSchedule(prev => ({ ...prev, workStart: e.target.value }))}
                  style={{ ...s.inp, fontFamily: FN }} />
              </div>
              <div>
                <label style={s.lab}>Work end</label>
                <input type="time" value={schedule.workEnd}
                  onChange={e => setSchedule(prev => ({ ...prev, workEnd: e.target.value }))}
                  style={{ ...s.inp, fontFamily: FN }} />
              </div>
            </div>

            <label style={s.lab}>Primary rest day</label>
            <select value={schedule.restDay} onChange={e => setSchedule(prev => ({ ...prev, restDay: e.target.value }))} style={s.sel}>
              <option value="sun">Sunday</option>
              <option value="sat">Saturday</option>
              <option value="mon">Monday</option>
              <option value="any">Floating — pick weekly</option>
            </select>
          </div>
        )}

        {/* ─── step 2..N-1: Protocol questions ─── */}
        {step >= 2 && step < 2 + sections.length && (() => {
          const section = sections[step - 2];
          if (!section) return null;
          const answers = protocolAnswers[section.protocolId] || {};
          const visibleQuestions = section.questions.filter(q =>
            shouldShowQuestion(q, profile, protocolAnswers)
          );
          return (
            <div style={{ ...s.card, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{section.icon}</span>
                <div style={{ fontSize: 18, fontWeight: 600, color: P.txS }}>
                  {section.name}
                </div>
              </div>
              <div style={{ fontSize: 11, color: P.txD, lineHeight: 1.6, marginBottom: 18 }}>
                A few questions to set up your {section.domain} protocol.
              </div>

              {visibleQuestions.map(q => (
                <div key={q.id} style={{ marginBottom: 16 }}>
                  <label style={s.lab}>{q.label}</label>
                  {q.subtitle && (
                    <div style={{ fontSize: 10, color: P.txD, marginTop: -4, marginBottom: 8, lineHeight: 1.5 }}>
                      {q.subtitle}
                    </div>
                  )}
                  <QuestionField
                    question={q}
                    value={answers[q.id]}
                    onChange={v => setProtocolField(section.protocolId, q.id, v)}
                  />
                </div>
              ))}
            </div>
          );
        })()}

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 11, color: P.warn || '#F59E0B',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 8, padding: '10px 14px', marginTop: 12,
          }}>
            {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {step > 0 && (
            <button onClick={goBack} style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
              Back
            </button>
          )}
          <button
            onClick={
              step === 0 ? onBasicsNext :
              step === 1 ? onDomainsNext :
              step === scheduleStepIdx ? onScheduleNext :
              onProtocolNext
            }
            style={{ ...s.btn, ...s.pri, flex: 2, justifyContent: 'center' }}
          >
            {step === scheduleStepIdx ? 'Build my protocol' : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  );
}
