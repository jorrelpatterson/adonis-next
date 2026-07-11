import { describe, it, expect } from 'vitest';
import { validateAnswer, shouldShowQuestion } from '../question-types';

describe('validateAnswer', () => {
  it('required text left empty returns an error string naming the field', () => {
    const question = { id: 'name', type: 'text', label: 'Name', required: true };
    const result = validateAnswer(question, '');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  it('required field with null value also errors', () => {
    const question = { id: 'name', type: 'text', label: 'Name', required: true };
    const result = validateAnswer(question, null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  it('required multi field with empty array errors', () => {
    const question = { id: 'goals', type: 'multi', label: 'Goals', required: true, options: [] };
    const result = validateAnswer(question, []);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Goals is required');
  });

  it('number below min returns a Min error', () => {
    const question = { id: 'weight', type: 'number', label: 'Weight', min: 50, max: 800 };
    const result = validateAnswer(question, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Min 50');
  });

  it('number above max returns a Max error', () => {
    const question = { id: 'weight', type: 'number', label: 'Weight', min: 50, max: 800 };
    const result = validateAnswer(question, 900);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Max 800');
  });

  it('non-numeric value for number type errors as "Must be a number"', () => {
    const question = { id: 'weight', type: 'number', label: 'Weight', min: 50, max: 800 };
    const result = validateAnswer(question, 'abc');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must be a number');
  });

  it('valid number within range returns valid with null error', () => {
    const question = { id: 'weight', type: 'number', label: 'Weight', min: 50, max: 800 };
    const result = validateAnswer(question, 180);
    expect(result).toEqual({ valid: true, error: null });
  });

  it('valid non-required text answer returns valid with null error', () => {
    const question = { id: 'name', type: 'text', label: 'Name' };
    const result = validateAnswer(question, 'Jorrel');
    expect(result).toEqual({ valid: true, error: null });
  });

  it('optional field left empty (not required) is valid', () => {
    const question = { id: 'name', type: 'text', label: 'Name' };
    const result = validateAnswer(question, '');
    expect(result).toEqual({ valid: true, error: null });
  });

  it('select with a value not in options is invalid', () => {
    const question = {
      id: 'goal',
      type: 'select',
      label: 'Goal',
      options: [{ value: 'cut', label: 'Lose fat' }, { value: 'bulk', label: 'Build muscle' }],
    };
    const result = validateAnswer(question, 'maintain');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid option');
  });

  it('select with a value matching an option is valid', () => {
    const question = {
      id: 'goal',
      type: 'select',
      label: 'Goal',
      options: [{ value: 'cut', label: 'Lose fat' }, { value: 'bulk', label: 'Build muscle' }],
    };
    const result = validateAnswer(question, 'cut');
    expect(result).toEqual({ valid: true, error: null });
  });

  it('multi with a non-array value is invalid', () => {
    const question = {
      id: 'goals',
      type: 'multi',
      label: 'Goals',
      options: [{ value: 'cut' }, { value: 'bulk' }],
    };
    const result = validateAnswer(question, 'cut');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Must be an array');
  });

  it('multi with a value outside the option set is invalid', () => {
    const question = {
      id: 'goals',
      type: 'multi',
      label: 'Goals',
      options: [{ value: 'cut' }, { value: 'bulk' }],
    };
    const result = validateAnswer(question, ['cut', 'unknown']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid option');
  });

  it('multi with all valid values is valid', () => {
    const question = {
      id: 'goals',
      type: 'multi',
      label: 'Goals',
      options: [{ value: 'cut' }, { value: 'bulk' }],
    };
    const result = validateAnswer(question, ['cut', 'bulk']);
    expect(result).toEqual({ valid: true, error: null });
  });

  it('unrecognized type falls through to valid', () => {
    const question = { id: 'x', type: 'toggle', label: 'X' };
    const result = validateAnswer(question, true);
    expect(result).toEqual({ valid: true, error: null });
  });
});

describe('shouldShowQuestion', () => {
  it('returns true when the question has no dependsOn', () => {
    const question = { id: 'name', type: 'text', label: 'Name' };
    expect(shouldShowQuestion(question, {}, {})).toBe(true);
  });

  it('returns true when dependsOn matches a protocolStates answer', () => {
    const question = {
      id: 'lutealPhase',
      type: 'toggle',
      label: 'Luteal phase?',
      dependsOn: { field: 'gender', value: 'female', protocolId: 'workout' },
    };
    const protocolStates = { workout: { gender: 'female' } };
    expect(shouldShowQuestion(question, {}, protocolStates)).toBe(true);
  });

  it('returns false when dependsOn does not match a protocolStates answer', () => {
    const question = {
      id: 'lutealPhase',
      type: 'toggle',
      label: 'Luteal phase?',
      dependsOn: { field: 'gender', value: 'female', protocolId: 'workout' },
    };
    const protocolStates = { workout: { gender: 'male' } };
    expect(shouldShowQuestion(question, {}, protocolStates)).toBe(false);
  });

  it('falls back to matching against profile when dependsOn has no protocolId', () => {
    const question = {
      id: 'extra',
      type: 'text',
      label: 'Extra',
      dependsOn: { field: 'tier', value: 'pro' },
    };
    expect(shouldShowQuestion(question, { tier: 'pro' }, {})).toBe(true);
    expect(shouldShowQuestion(question, { tier: 'free' }, {})).toBe(false);
  });
});
