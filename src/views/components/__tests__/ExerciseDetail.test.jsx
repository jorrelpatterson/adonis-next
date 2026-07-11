import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ExerciseDetail from '../ExerciseDetail.jsx';
import { EXERCISE_DB } from '../../../protocols/body/workout/exercises.js';

// "Barbell Curls" is a real EXERCISE_DB entry (present in main's exercises.js,
// ported verbatim from the archive) — used to exercise the "known exercise"
// expand path.
const KNOWN_NAME = 'Barbell Curls';
const knownExercise = { name: KNOWN_NAME, sets: 3, reps: 10, rest: '90s' };
const unknownExercise = { name: 'Definitely Not A Real Exercise', sets: 4, reps: 8 };

describe('ExerciseDetail', () => {
  it('sanity: KNOWN_NAME exists in EXERCISE_DB (guards against catalog drift)', () => {
    expect(EXERCISE_DB[KNOWN_NAME]).toBeTruthy();
  });

  it('renders a collapsed summary with sets×reps for the exercise', () => {
    const { container } = render(<ExerciseDetail exercise={knownExercise} />);
    screen.getByText(KNOWN_NAME);
    expect(container.textContent).toContain('3×10');
    expect(container.textContent).toContain('· Rest 90s');
    // Form guide is not shown until expanded.
    expect(screen.queryByText('Form Guide')).toBeNull();
  });

  it('expanding a known exercise reveals form tips, targets, and a Watch Form Video link', () => {
    render(<ExerciseDetail exercise={knownExercise} />);
    fireEvent.click(screen.getByText(KNOWN_NAME));

    screen.getByText('Form Guide');
    screen.getByText('Pro Tip');
    const info = EXERCISE_DB[KNOWN_NAME];
    screen.getByText(info.form);
    screen.getByText(info.tips);

    const link = screen.getByRole('link', { name: /Watch Form Video/i });
    expect(link.getAttribute('href')).toContain('youtube.com/results');
    expect(link.getAttribute('href')).toContain(encodeURIComponent(KNOWN_NAME));
  });

  it('expanding an unknown exercise falls back to a YouTube-search link with no form guide', () => {
    render(<ExerciseDetail exercise={unknownExercise} />);
    fireEvent.click(screen.getByText(unknownExercise.name));

    expect(screen.queryByText('Form Guide')).toBeNull();
    screen.getByText(/No form guide for this exercise yet/i);

    const link = screen.getByRole('link', { name: /Watch on YouTube/i });
    expect(link.getAttribute('href')).toContain('youtube.com/results');
    expect(link.getAttribute('href')).toContain(encodeURIComponent(unknownExercise.name));
  });

  it('renders children inside the expanded slot', () => {
    render(
      <ExerciseDetail exercise={knownExercise}>
        <div>Set logging UI</div>
      </ExerciseDetail>
    );
    expect(screen.queryByText('Set logging UI')).toBeNull();
    fireEvent.click(screen.getByText(KNOWN_NAME));
    screen.getByText('Set logging UI');
  });

  it('returns null when no exercise is provided', () => {
    const { container } = render(<ExerciseDetail exercise={null} />);
    expect(container.innerHTML).toBe('');
  });
});
