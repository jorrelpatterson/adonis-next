import { test, expect } from 'vitest';
import { shortId, refUrl, codeStyle } from './businessCard.js';

test('shortId takes first 4 hex chars of the UUID, uppercased', () => {
  expect(shortId('02c8c313-29c0-47ec-9aec-9309a185d76f')).toBe('02C8');
});

test('shortId tolerates missing input', () => {
  expect(shortId(null)).toBe('');
});

test('refUrl builds the advncelabs ref link, normalized uppercase', () => {
  expect(refUrl('kayla10')).toBe('https://advncelabs.com/?ref=KAYLA10');
});

test('short codes get the max font size (11pt cap)', () => {
  expect(codeStyle('SHANTEL').fontSize).toBe('11.00pt');
});

test('long codes shrink below the cap but stay readable', () => {
  const f = parseFloat(codeStyle('EZEKIELPHOTOGRAPHY').fontSize); // 18 chars
  expect(f).toBeLessThan(11);
  expect(f).toBeGreaterThan(9);
});

test('20-char codes (schema max) still >= 9pt', () => {
  expect(parseFloat(codeStyle('A'.repeat(20)).fontSize)).toBeGreaterThanOrEqual(9);
});

test('letter-spacing scales with font size', () => {
  const s = codeStyle('SHANTEL');
  expect(s.letterSpacing).toBe('2.09pt'); // 11 * 0.19
});
