import React, { useState } from 'react';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS } from '../design/constants';
import { GOAL_TEMPLATES, getTemplatesForDomain } from './goal-templates';
import { createGoalFromTemplate } from './goal-engine';

export default function GoalSetup({ onCreateGoal, onCancel, profile, initialDomain }) {
  const [step, setStep] = useState(initialDomain ? 2 : 1);
  const [selectedDomain, setSelectedDomain] = useState(initialDomain || null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [answers, setAnswers] = useState({});

  if (step === 1) {
    return (
      <div>
        <H t="Set a Goal" sub="Choose a domain" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {DOMAINS.map(d => (
            <button key={d.id} onClick={() => { setSelectedDomain(d.id); setStep(2); }}
              style={{ ...s.card, cursor: 'pointer', textAlign: 'left', padding: 14, border: '1px solid ' + P.bd, background: 'transparent', fontFamily: FN }}>
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

  if (step === 2) {
    const templates = getTemplatesForDomain(selectedDomain);
    const domain = DOMAINS.find(d => d.id === selectedDomain);
    return (
      <div>
        <H t={(domain?.icon || '') + ' ' + (domain?.name || '')} sub="Pick a goal" />
        {templates.length === 0 ? (
          <div style={{ ...s.card, padding: 20, textAlign: 'center' }}>
            <p style={{ color: P.txD, fontSize: 12 }}>No templates yet for this domain.</p>
          </div>
        ) : templates.map(t => (
          <button key={t.id} onClick={() => {
            setSelectedTemplate(t);
            const prefilled = {};
            if (t.setupQuestions.find(q => q.key === 'currentWeight') && profile?.weight) prefilled.currentWeight = profile.weight;
            setAnswers(prefilled);
            setStep(3);
          }}
            style={{ ...s.card, cursor: 'pointer', textAlign: 'left', padding: 14, marginBottom: 8, border: '1px solid ' + P.bd, background: 'transparent', fontFamily: FN, display: 'block', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.txS }}>{t.title}</div>
                <div style={{ fontSize: 11, color: P.txD }}>{t.description}</div>
              </div>
            </div>
          </button>
        ))}
        <button onClick={() => initialDomain ? onCancel && onCancel() : setStep(1)} style={{ ...s.out, marginTop: 12, width: '100%' }}>
          {initialDomain ? 'Cancel' : 'Back'}
        </button>
      </div>
    );
  }

  if (step === 3 && selectedTemplate) {
    return (
      <div>
        <H t={(selectedTemplate.icon || '') + ' ' + selectedTemplate.title} sub="Configure your goal" />
        <div style={{ ...s.card, padding: 16 }}>
          {selectedTemplate.setupQuestions.map(q => (
            <div key={q.key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: P.txM, display: 'block', marginBottom: 4 }}>{q.label}</label>
              {q.type === 'select' ? (
                <select value={answers[q.key] || ''} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                  style={{ ...s.inp, width: '100%' }}>
                  <option value="">Select...</option>
                  {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input type={q.type === 'date' ? 'date' : q.type === 'number' ? 'number' : 'text'}
                  value={answers[q.key] || ''} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                  style={{ ...s.inp, width: '100%' }} placeholder={q.label} />
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setStep(4)} style={{ ...s.pri, marginTop: 12, width: '100%' }}>Review Goal</button>
        <button onClick={() => setStep(2)} style={{ ...s.out, marginTop: 8, width: '100%' }}>Back</button>
      </div>
    );
  }

  if (step === 4 && selectedTemplate) {
    const goal = createGoalFromTemplate(selectedTemplate, answers);
    return (
      <div>
        <H t="Confirm Goal" sub={selectedTemplate.title} />
        <div style={{ ...s.card, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: P.txS, marginBottom: 8 }}>{goal.title}</div>
          {goal.deadline && <div style={{ fontSize: 11, color: P.txM }}>Deadline: {goal.deadline}</div>}
          <div style={{ fontSize: 11, color: P.txD, marginTop: 6 }}>{goal.activeProtocols.length} protocols will activate</div>
        </div>
        <button onClick={() => onCreateGoal(goal)} style={{ ...s.pri, marginTop: 12, width: '100%' }}>
          Activate Goal
        </button>
        <button onClick={() => setStep(3)} style={{ ...s.out, marginTop: 8, width: '100%' }}>Back</button>
      </div>
    );
  }

  return null;
}
