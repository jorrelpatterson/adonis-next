// Haptics — abstraction over native (Capacitor) and web vibration.
//
// On web: best-effort using navigator.vibrate (Android Chrome only; iOS Safari
// silently ignores). Web haptics are weak — the goal here is a stable API that
// becomes properly tactile when the app is wrapped in Capacitor and we swap to
// @capacitor/haptics. Until then, this stays subtle so we don't burn battery.
//
// Premium apps fire haptics with intent: not on every tap, but on:
//   - successful save / completion → light
//   - PR / streak milestone       → medium
//   - error / destructive confirm → warning
// All call sites should be additive — never the only feedback for an action.

const isClient = typeof window !== 'undefined';

const reducedMotion = () =>
  isClient && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function vibrate(pattern) {
  if (!isClient || reducedMotion()) return;
  if (navigator && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
  // When Capacitor-wrapped: dynamic import @capacitor/haptics here and call
  // Haptics.impact({ style: ImpactStyle.Light }) etc. Keep this file the only
  // place that branches on platform.
}

export const haptics = {
  light:    () => vibrate(8),
  medium:   () => vibrate(15),
  heavy:    () => vibrate([20, 10, 20]),
  success:  () => vibrate([10, 30, 10]),
  warning:  () => vibrate([20, 40, 20]),
  error:    () => vibrate([40, 30, 40, 30, 40]),
};
