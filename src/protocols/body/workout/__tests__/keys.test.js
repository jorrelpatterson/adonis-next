// src/protocols/body/workout/__tests__/keys.test.js
import { describe, it, expect } from 'vitest';
import { logKey, prKey, swapKey } from '../keys';

describe('workout keys', () => {
  it('logKey joins goal, week, day, exercise, set with |', () => {
    expect(logKey('Muscle Gain', 3, 1, 'Back Squats', 0)).toBe('Muscle Gain|3|1|Back Squats|0');
  });

  it('prKey joins goal and exercise with |', () => {
    expect(prKey('Muscle Gain', 'Back Squats')).toBe('Muscle Gain|Back Squats');
  });

  it('swapKey joins goal, week, day, exercise with |', () => {
    expect(swapKey('Fat Loss', 5, 2, 'Burpees')).toBe('Fat Loss|5|2|Burpees');
  });
});
