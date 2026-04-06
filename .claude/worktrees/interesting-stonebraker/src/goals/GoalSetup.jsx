// src/goals/GoalSetup.jsx
import React, { useState } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS } from '../design/constants';
import { GOAL_TEMPLATES, getTemplatesForDomain } from './goal-templates';
import { createGoalFromTemplate } from './goal-engine';

export default function GoalSetup({ onCreateGoal, onCancel, profile }) {
  const [step, setStep] = useState(1);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [answers, setAnswers] = useState({});

  // Step 1: Domain picker
  if (step === 1) {
    return (
      <div>
        <H t="Set a Goal" sub="Choose a domain" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DOMAINS.map(d => (
            <button key={d.id} onClick={() => { setSelectedDomain(d.id); setStep(2); }}
              style={{
                ...s.card, cursor: 'pointer', textAlign: 'left', padding: 14,
                border: '1px solid ' + P.bd, background: 'transparent',
                fontFamily: FN,
              }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{d.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{d.name}</div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>{d.sub}</div>
            </button>
          ))}
        </div>
        {onCancel && <button onClick={onCancel} style={{ ...s.out, marginTop: 16, width: '100%' }}>Cancel</button>}
      </div>
    );
  }

  // Step 2: Template picker
  if (step === 2) {
    const templates = getTemplatesForDomain(selectedDomain);
    const domain = DOMAINS.find(d => d.id === selectedDomain);
    return (
      <div>
        <H t={domain?.icon + ' ' + domain?.name} sub="Pick a goal" />
        {templates.length === 0 ? (
          <div style={{ ...s.card, padding: 20, textAlign: 'center' }}>
            <p style={{ color: P.txD, fontSize: 12 }}>No templates yet for this domain.</p>
          </div>
        ) : templates.map(t => (
          <button key={t.id} onClick={() => {
            setSelectedTemplate(t);
            // Pre-fill answers from profile
            const prefilled = {};
            if (t.setupQuestions.find(q => q.key === 'currentWeight') && profile?.weight) {
              prefilled.currentWeight = profile.weight;
            }
            setAnswers(prefilled);
            setStep(3);
          }}
            style={{
              ...s.card, cursor: 'pointer', textAlign: 'left', padding: 14,
              marginBottom: 8, border: '1px solid ' + P.bd, background: 'transparent',
              fontFamily: FN, display: 'block', width: '100%',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.txS }}>{t.title}</div>
                <div style={{ fontSize: 11, color: P.txD }}>{t.description}</div>
                <div style={{ fontSize: 9, color: P.txD, marginTop: 2 }}>
                  {t.protocols.length} protocols across {new Set(t.protocols.map(p => p.domain)).size} domain{new Set(t.protocols.map(p => p.domain)).size > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </button>
        ))}
        <button onClick={() => setStep(1)} style={{ ...s.out, marginTop: 12, width: '100%' }}>Back</button>
      </div>
    );
  }

  // Step 3: Setup questions
  if (step === 3 && selectedTemplate) {
    return (
      <div>
        <H t={selectedTemplate.icon + ' ' + selectedTemplate.title} sub="Configure your goal" />
        <div style={{ ...s.card, padding: 16 }}>
          {selectedTemplate.setupQuestions.map(q => (
            <div key={q.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: P.txM, display: 'block', marginBottom: 4 }}>
                {q.label}
              </label>
              {q.type === 'select' ? (
                <select
                  value={answers[q.key] || ''}
                  onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                  style={{ ...s.inp, width: '100%' }}>
                  <option value="">Select...</option>
                  {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={q.type === 'date' ? 'date' : q.type === 'number' ? 'number' : 'text'}
                  value={answers[q.key] || ''}
                  onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                  style={{ ...s.inp, width: '100%' }}
                  placeholder={q.label}
                />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(4)}
          style={{ ...s.pri, marginTop: 12, width: '100%' }}
          disabled={selectedTemplate.setupQuestions.some(q => !answers[q.key])}>
          Review Goal
        </button>
        <button onClick={() => setStep(2)} style={{ ...s.out, marginTop: 8, width: '100%' }}>Back</button>
      </div>
    );
  }

  // Step 4: Confirm
  if (step === 4 && selectedTemplate) {
    const goal = createGoalFromTemplate(selectedTemplate, answers);
    return (
      <div>
        <H t="Confirm Goal" sub={selectedTemplate.title} />
        <div style={{ ...s.card, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.txS, marginBottom: 8 }}>{goal.title}</div>
          {goal.deadline && <div style={{ fontSize: 11, color: P.txM }}>Deadline: {goal.deadline}</div>}
          <div style={{ fontSize: 11, color: P.txD, marginTop: 6 }}>
            {goal.activeProtocols.length} protocols will activate:
          </div>
          {goal.activeProtocols.map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: P.txM, paddingLeft: 8, marginTop: 2 }}>
              {'\u2022'} {p.protocolId} ({p.domain})
            </div>
          ))}
        </div>
        <button onClick={() => { onCreateGoal(goal); }} style={{ ...s.pri, marginTop: 12, width: '100%' }}>
          <GradText>Activate Goal</GradText>
        </button>
        <button onClick={() => setStep(3)} style={{ ...s.out, marginTop: 8, width: '100%' }}>Back</button>
      </div>
    );
  }

  return null;
}
