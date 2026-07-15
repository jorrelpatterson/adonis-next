// Sound — Web Audio synthesis for premium UI feedback (no asset files needed).
//
// Real apps license sound packs ($200-500). For v1 we synthesize minimalist
// click/swoosh/chime tones from the WebAudio API. Result: tasteful, on-brand,
// zero bundle bloat, mute-able from settings.
//
// Each sound is tuned to be:
//   - SHORT (50-300ms) so it never overlaps interaction
//   - QUIET (gain ~ 0.04) so it's felt more than heard
//   - HARMONIC (no dissonance — chord-based when multiple tones)
//
// User mute is respected via localStorage, wired to AppSettings.jsx's
// "Sound effects" toggle (isSoundMuted/setSoundMuted below).
//
// --- iOS hardware silent switch policy (single source of truth) ---------
// Spec default: SFX respect the hardware silent switch — go silent when
// the phone is flipped to silent, like most premium apps. This file only
// ever plays tones through the WebAudio API (AudioContext oscillators,
// see tone() below) — no HTML5 <audio>, no native audio plugin. Neither
// this app nor the Capacitor iOS shell configures an AVAudioSession
// category anywhere: verified clean (grep for AVAudioSession/setCategory
// and for a UIBackgroundModes "audio" entry) across ios/App
// (AppDelegate.swift, Info.plist, the CapApp-SPM package),
// capacitor.config.json, AND Capacitor's own vendored native runtime
// (node_modules/@capacitor/ios) — zero matches anywhere in the stack. With
// no override, WKWebView uses the OS default session for web-originated
// audio, which — same as Safari — IS silenced by the hardware ring/silent
// switch. So the switch is respected for free; nothing may ever call
// AVAudioSession.setCategory(.playback) (or add a plugin that does), since
// that would force SFX to ignore the switch. The switch can't be flipped
// in the iOS Simulator, so "flip it, SFX go silent" stays a P4
// physical-device verification item — this file only guarantees the
// no-override precondition that makes that true.
//
// App mute (isSoundMuted/setSoundMuted, adonis_sound_muted in localStorage)
// is a SEPARATE gate layered on top of the switch — both must be "on" for
// a tone to actually play. It also does NOT key off
// prefers-reduced-motion / adonis_reduced_motion: reduced motion silences
// decorative animation only (design/motion.js), never sound — muting sound
// and reducing motion are independent dials by design.

const STORAGE_KEY = 'adonis_sound_muted';

let _ctx = null;
let _muted = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { _ctx = new AC(); } catch { return null; }
  return _ctx;
}

function isMuted() {
  if (_muted != null) return _muted;
  if (typeof window === 'undefined') return true;
  try { _muted = localStorage.getItem(STORAGE_KEY) === '1'; } catch { _muted = false; }
  return _muted;
}

export function setSoundMuted(m) {
  _muted = !!m;
  try { localStorage.setItem(STORAGE_KEY, _muted ? '1' : '0'); } catch { /* noop */ }
}

export function isSoundMuted() { return isMuted(); }

// Resume audio context on first user gesture (browsers block autoplay).
if (typeof document !== 'undefined') {
  const resume = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    document.removeEventListener('pointerdown', resume);
    document.removeEventListener('touchstart', resume);
  };
  document.addEventListener('pointerdown', resume, { once: true });
  document.addEventListener('touchstart', resume, { once: true });
}

// Play a single tone with envelope.
function tone({ freq, duration = 0.12, gain = 0.04, type = 'sine', delay = 0, attack = 0.005, release }) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration + (release || 0));
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + (release || 0) + 0.05);
}

// ─── Sound vocabulary ────────────────────────────────────────────────────

export const sound = {
  // Soft tap — for light interactions. Thinking: a finger tap on a glass surface.
  tap: () => tone({ freq: 1800, duration: 0.04, gain: 0.025, type: 'sine', attack: 0.002, release: 0.04 }),

  // Toggle on — slightly higher, longer than tap.
  toggleOn: () => tone({ freq: 1400, duration: 0.08, gain: 0.04, type: 'triangle', attack: 0.003, release: 0.06 }),

  // Toggle off — half-step lower.
  toggleOff: () => tone({ freq: 1100, duration: 0.08, gain: 0.04, type: 'triangle', attack: 0.003, release: 0.06 }),

  // Success — rising third (C5 → E5). Used on save/complete.
  success: () => {
    tone({ freq: 523.25, duration: 0.10, gain: 0.04, type: 'sine', attack: 0.005, release: 0.08 });
    tone({ freq: 659.25, duration: 0.14, gain: 0.04, type: 'sine', delay: 0.06, attack: 0.005, release: 0.10 });
  },

  // PR celebration — major triad (C5, E5, G5) with overtone shimmer.
  pr: () => {
    tone({ freq: 523.25, duration: 0.18, gain: 0.05, type: 'sine', attack: 0.005, release: 0.18 });
    tone({ freq: 659.25, duration: 0.22, gain: 0.05, type: 'sine', delay: 0.04, attack: 0.005, release: 0.20 });
    tone({ freq: 783.99, duration: 0.30, gain: 0.05, type: 'sine', delay: 0.08, attack: 0.005, release: 0.30 });
    tone({ freq: 1567.98, duration: 0.20, gain: 0.02, type: 'triangle', delay: 0.10, attack: 0.005, release: 0.20 });
  },

  // Warning — soft minor descending (a heads-up, not a panic).
  warning: () => {
    tone({ freq: 659.25, duration: 0.12, gain: 0.05, type: 'triangle', attack: 0.005, release: 0.10 });
    tone({ freq: 523.25, duration: 0.16, gain: 0.05, type: 'triangle', delay: 0.10, attack: 0.005, release: 0.14 });
  },

  // Error — short dissonant descending interval.
  error: () => {
    tone({ freq: 466.16, duration: 0.08, gain: 0.05, type: 'square', attack: 0.005, release: 0.08 });
    tone({ freq: 311.13, duration: 0.18, gain: 0.05, type: 'triangle', delay: 0.05, attack: 0.005, release: 0.16 });
  },
};
