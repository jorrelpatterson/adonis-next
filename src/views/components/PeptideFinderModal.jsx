// PeptideFinderModal — re-runnable Peptide Finder wizard.
// Shows the same 5 questions from peptide protocol's onboarding questions
// in a bottom-sheet modal. On Save, persists to protocolStates.peptides.

import React, { useState, useMemo } from 'react';
import { P, FN, FD } from '../../design/theme';
import { s } from '../../design/styles';
import { GradText } from '../../design/components';
import peptideProtocol from '../../protocols/body/peptides/index';
import QuestionField from '../../onboarding/QuestionField';
import { shouldShowQuestion, validateAnswer } from '../../onboarding/question-types';

export default function PeptideFinderModal({ initial, onSave, onClose }) {
  const questions = useMemo(() => peptideProtocol.getOnboardingQuestions(), []);
  const [answers, setAnswers] = useState({ ...(initial || {}) });
  const [error, setError] = useState('');

  const setField = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));

  const visibleQuestions = questions.filter(q => shouldShowQuestion(q, {}, { peptides: answers }));

  const handleSave = () => {
    setError('');
    for (const q of visibleQuestions) {
      const r = validateAnswer(q, answers[q.id]);
      if (!r.valid) {
        setError(r.error);
        return;
      }
    }
    // Retaking the Finder always overrides any prior manual stack pick,
    // so the wizard's goal/budget answers drive the resolver again.
    onSave({ ...answers, selectedStackId: undefined });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,16,0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: FN,
      animation: 'vt-fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card,
        width: '100%', maxWidth: 640,
        padding: '20px 16px 24px',
        borderRadius: '20px 20px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'springIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <div style={{ marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
            Peptide Protocol Finder
          </div>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: P.txS }}>
            <GradText>Build your stack</GradText>
          </div>
          <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>
            5 questions · Adonis recommends · advnce labs sells
          </div>
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
              onChange={v => setField(q.id, v)}
            />
          </div>
        ))}

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

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ ...s.btn, ...s.pri, flex: 2, justifyContent: 'center' }}>
            Save stack
          </button>
        </div>
      </div>
    </div>
  );
}
