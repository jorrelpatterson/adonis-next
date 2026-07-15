import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

// Select.jsx (used for the Sex + Rest Day fields) fires haptics.selection()
// on every pick (iOS P2 Task 2b — was success()) — must be stubbed alongside
// `medium` or the existing "Male" pick below throws (haptics.selection is
// not a function on a partial mock).
vi.mock('../../design/haptics', () => ({
  haptics: { selection: vi.fn(), medium: vi.fn() },
}));

import OnboardingFlow from '../OnboardingFlow';
import { haptics } from '../../design/haptics';

// Protocols aren't self-registering — OnboardingFlow reads getAllProtocols()
// from the shared registry, so the suite must populate it exactly like the
// real app boot does.
import '../../protocols/register-all.js';

afterEach(() => {
  vi.clearAllMocks();
});

// Drives the full wizard end-to-end: basics → domains (Body locked on) →
// workout/peptides/nutrition question sections → schedule → onComplete.
// Labels/options below are copied verbatim from the protocol question
// definitions (src/protocols/body/{workout,peptides,nutrition}/index.js) —
// not guessed.
describe('OnboardingFlow', () => {
  it('walks the full wizard and calls onComplete with a coerced profile + protocol answers', () => {
    const onComplete = vi.fn();
    const { getByText, getByPlaceholderText, getAllByText, container } = render(
      <OnboardingFlow initialProfile={{}} onComplete={onComplete} />
    );

    // ── Step 0: basics ──────────────────────────────────────────────────
    expect(getByText('Tell us about you')).toBeTruthy();

    fireEvent.change(getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
    fireEvent.change(getByPlaceholderText('32'), { target: { value: '32' } });

    // Sex — design-system Select: open the sheet, pick "Male".
    fireEvent.click(getByText('Select…'));
    fireEvent.click(getByText('Male'));

    fireEvent.change(getByPlaceholderText('180'), { target: { value: '190' } });
    fireEvent.change(getByPlaceholderText('5'), { target: { value: '5' } });
    fireEvent.change(getByPlaceholderText('11'), { target: { value: '11' } });

    fireEvent.click(getByText('Moderately active'));

    fireEvent.click(getByText('Continue'));

    // ── Step 1: domains — Body pre-selected + un-toggleable ─────────────
    expect(getByText('What do you want to optimize?')).toBeTruthy();
    const bodyButton = getByText('Body').closest('button');
    expect(bodyButton.style.border).toContain('#E8D5B7'); // P.gW — selected state
    fireEvent.click(bodyButton); // no-op: toggleDomain('body') returns early
    expect(bodyButton.style.border).toContain('#E8D5B7'); // still selected

    fireEvent.click(getByText('Continue'));

    // ── Step 2: workout protocol questions ──────────────────────────────
    expect(getByText('Workout Program')).toBeTruthy();
    fireEvent.click(getByText('Lose fat'));       // primary
    fireEvent.click(getByText('Morning'));        // trainPref
    fireEvent.click(getByText('Full gym'));       // equipment
    fireEvent.click(getByText('Continue'));

    // ── Step 3: peptides protocol questions ─────────────────────────────
    expect(getByText('Peptide Protocol')).toBeTruthy();
    fireEvent.click(getByText('\u{1F525} Drop body fat'));           // optimizeFor (multi)
    fireEvent.click(getByText('Never — I\'m new to this'));          // experience
    fireEvent.click(getByText('No'));                                // glp1Status
    fireEvent.click(getByText('Under $150/mo'));                     // budget
    fireEvent.click(getByText('Fine with daily SubQ'));               // needleComfort
    fireEvent.click(getByText('Continue'));

    // ── Step 4: nutrition protocol questions ────────────────────────────
    expect(getByText('Nutrition & Supplements')).toBeTruthy();
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '165' } }); // goalWeight
    const dateInput = container.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2026-12-31' } });            // targetDate
    // dietary is optional — leave unanswered
    fireEvent.click(getByText('Continue'));

    // ── Step 5: schedule ─────────────────────────────────────────────────
    expect(getByText('Your schedule')).toBeTruthy();
    fireEvent.click(getByText('Employee'));
    fireEvent.click(getByText('Build my protocol'));

    // ── onComplete assertions ───────────────────────────────────────────
    expect(onComplete).toHaveBeenCalledTimes(1);
    // iOS P2 Task 2: save/confirm -> medium on the terminal "Build my
    // protocol" tap.
    expect(haptics.medium).toHaveBeenCalledTimes(1);
    const [finalProfile, protocolAnswers] = onComplete.mock.calls[0];

    expect(finalProfile.age).toBe(32);
    expect(typeof finalProfile.age).toBe('number');
    expect(finalProfile.weight).toBe(190);
    expect(typeof finalProfile.weight).toBe('number');
    expect(finalProfile.hFt).toBe(5);
    expect(finalProfile.hIn).toBe(11);

    expect(finalProfile.workMode).toBe('employee');
    expect(finalProfile.workStart).toBe('09:00');
    expect(finalProfile.workEnd).toBe('17:00');
    expect(finalProfile.restDay).toBe('sun');

    expect(protocolAnswers.workout).toBeTruthy();
    expect(protocolAnswers.workout.primary).toBe('Fat Loss');
    expect(protocolAnswers.workout.trainPref).toBe('morning');
    expect(protocolAnswers.workout.equipment).toBe('gym');

    expect(protocolAnswers.peptides).toBeTruthy();
    expect(protocolAnswers.nutrition).toBeTruthy();
    expect(protocolAnswers.nutrition.goalWeight).toBe('165');
  });
});
