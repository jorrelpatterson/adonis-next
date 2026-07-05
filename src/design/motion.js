// Motion helpers — primitives the app uses for premium transitions.
//
// View Transitions API: cross-fade between routes/tabs without unmounting.
// Falls back to a direct state change in browsers that don't support it.
//
// Spring defaults: re-export the easing tokens from CSS so JS animations
// stay in sync with CSS transitions.

const SUPPORTS_VIEW_TRANSITIONS =
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

export const EASE = {
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  soft:   'cubic-bezier(0.16, 1, 0.3, 1)',
  snap:   'cubic-bezier(0.4, 0, 0.2, 1)',
  stiff:  'cubic-bezier(0.6, 0, 0.4, 1)',
};

/**
 * Wrap a state-changing callback in a View Transition so the DOM diff
 * cross-fades instead of snapping. Use for tab switches, modal dismissal,
 * any view-level state change worth a flourish.
 *
 * Usage:
 *   transitionView(() => setActiveTab('body'));
 */
export function transitionView(updateFn) {
  if (!SUPPORTS_VIEW_TRANSITIONS) {
    updateFn();
    return null;
  }
  // Honor reduced motion preference at runtime, not just CSS.
  if (typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    updateFn();
    return null;
  }
  return document.startViewTransition(updateFn);
}

/**
 * Animate a number between two values for count-up displays.
 * Calls onUpdate(current) on each frame; returns a cancel function.
 *
 * Usage:
 *   const cancel = countUpTo({ from: 0, to: 1780, duration: 800, onUpdate: setDisplay });
 */
export function countUpTo({ from = 0, to, duration = 800, onUpdate, easing }) {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) {
    onUpdate(to);
    return () => {};
  }
  if (window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onUpdate(to);
    return () => {};
  }
  const ease = easing || ((t) => 1 - Math.pow(1 - t, 3));   // easeOutCubic
  const start = performance.now();
  const delta = to - from;
  let raf;
  let cancelled = false;
  const tick = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    const v = from + delta * ease(t);
    onUpdate(v);
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}
