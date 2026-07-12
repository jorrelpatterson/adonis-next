// Smoke tests for PeptideFinderModal — the re-runnable 5-question Peptide
// Finder wizard (ported verbatim from v2-revival-archive; imports resolved
// unchanged against main's src/protocols/body/peptides + src/onboarding).
//
// These drive the real peptideProtocol.getOnboardingQuestions() +
// QuestionField + shouldShowQuestion/validateAnswer — no mocking of the
// question data, so this also guards against the question set drifting
// out from under the modal (e.g. a new required question breaking Save).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PeptideFinderModal from '../PeptideFinderModal';
import peptideProtocol from '../../../protocols/body/peptides/index';
import { shouldShowQuestion } from '../../../onboarding/question-types';

describe('PeptideFinderModal', () => {
  it('renders the first onboarding question label', () => {
    const questions = peptideProtocol.getOnboardingQuestions();
    render(<PeptideFinderModal initial={{}} onSave={vi.fn()} onClose={vi.fn()} />);

    // Question 1: optimizeFor — a required multi-select.
    screen.getByText(questions[0].label);
  });

  it('renders every currently-visible question (none of the 5 have dependsOn today)', () => {
    const questions = peptideProtocol.getOnboardingQuestions();
    const visible = questions.filter(q => shouldShowQuestion(q, {}, { peptides: {} }));

    render(<PeptideFinderModal initial={{}} onSave={vi.fn()} onClose={vi.fn()} />);

    for (const q of visible) {
      screen.getByText(q.label);
    }
  });

  it('answering all required questions and saving fires onSave with the answers map, then onClose', () => {
    const questions = peptideProtocol.getOnboardingQuestions();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<PeptideFinderModal initial={{}} onSave={onSave} onClose={onClose} />);

    // Drive each visible question's real QuestionField control by clicking
    // its first option (select/multi are the only types among these 5).
    for (const q of questions) {
      if (q.type === 'select' || q.type === 'multi') {
        const opt = q.options[0];
        fireEvent.click(screen.getByText(opt.label));
      }
    }

    fireEvent.click(screen.getByText('Save stack'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const answers = onSave.mock.calls[0][0];

    // optimizeFor is multi-select — first option toggled on.
    expect(answers.optimizeFor).toEqual([questions[0].options[0].value]);
    // The remaining 4 are single-select — first option chosen.
    expect(answers.experience).toBe(questions[1].options[0].value);
    expect(answers.glp1Status).toBe(questions[2].options[0].value);
    expect(answers.budget).toBe(questions[3].options[0].value);
    expect(answers.needleComfort).toBe(questions[4].options[0].value);
    // Retaking the Finder always clears any prior manual stack pick.
    expect(answers.selectedStackId).toBeUndefined();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a validation error and does not save when a required question is left blank', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<PeptideFinderModal initial={{}} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByText('Save stack'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    screen.getByText(/is required/);
  });

  it('clicking Cancel calls onClose without saving', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<PeptideFinderModal initial={{}} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('seeds prior answers via the initial prop', () => {
    const questions = peptideProtocol.getOnboardingQuestions();
    const initial = { experience: questions[1].options[1].value };

    render(<PeptideFinderModal initial={initial} onSave={vi.fn()} onClose={vi.fn()} />);

    // The pre-selected option renders with selected styling — assert the
    // button exists (rendering does not throw) as the smoke-level check.
    screen.getByText(questions[1].options[1].label);
  });
});
