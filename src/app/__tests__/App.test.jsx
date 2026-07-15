// src/app/__tests__/App.test.jsx
// Shell smoke test — guards the AmbientBackdrop wiring (Task 10) and the shell
// against crash-on-render regressions as App.jsx becomes the Phase 2+ churn hotspot.
//
// Task 11 added an auth-gated funnel in front of the shell (see funnel.test.jsx
// for gate-branch coverage), so this suite now mocks useAuth as signed-in and
// seeds a complete profile — otherwise every render here would land on
// OnboardingFlow/AuthScreen instead of the shell this file is meant to guard.
// Profile is seeded via the store's replaceState action (not localStorage —
// localStorage isn't wired up in this test environment; store.jsx's
// loadState() only survives because it's try/catch-wrapped internally).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React, { useEffect } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { StateProvider, useAppState } from '../../state/store';
import { CHECKIN_FIELDS } from '../../state/checkin.js';
// OnboardingFlow (driven in the C1 test) reads getAllProtocols() from the
// shared registry — populate it exactly like the real app boot does.
import '../../protocols/register-all.js';
import { computeAdaptive } from '../../protocols/body/nutrition/adaptive-calories';
import App from '../App';
// iOS P2 Task 2b: spied (not vi.mock'd) so the other ~30 pre-existing tests
// in this file keep exercising the REAL haptics module (a safe no-op in
// jsdom) exactly as before — only the new describe below observes calls.
import { haptics } from '../../design/haptics';

vi.mock('../../services/useAuth.js', () => ({
  useAuth: () => ({ user: { id: 'u1' }, tier: 'free', loading: false, signOut: vi.fn() }),
}));

const COMPLETE_PROFILE = {
  name: 'Jordan', age: 30, gender: 'male', weight: 180,
  hFt: 5, hIn: 10, activity: 'moderate', domains: ['body'], tier: 'free',
};

function Seed() {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile: COMPLETE_PROFILE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Exposes the live store state to the test via a mutable box — used by the
// Task 13 check-in test below to assert on logs.checkins after a save.
function StateSpy({ box }) {
  const { state } = useAppState();
  useEffect(() => {
    box.current = state;
  });
  return null;
}

// Seeds an arbitrary profile (the shared Seed above is hardwired to
// COMPLETE_PROFILE) — used by the I2 viewDay-leak test.
function SeedProfile({ profile }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Seeds both profile AND goals in one atomic replaceState — used by the I1
// locked-domain routine-leak test (needs a body goal + a mind goal live in
// state simultaneously).
function SeedProfileGoals({ profile, goals }) {
  const { replaceState } = useAppState();
  useEffect(() => {
    replaceState({ profile, goals });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('App shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders inside StateProvider without throwing', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    expect(container.querySelector('.adn-noise')).toBeTruthy();
  });

  it('mounts the ambient backdrop (z:0 layers) behind the content wrapper (z:2)', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    const kids = [...container.querySelector('.adn-noise').children];
    // AmbientBackdrop renders a fragment of pointer-events:none layers at zIndex 0;
    // the content wrapper carries zIndex 2 so taps/scroll land on content, not the field.
    const firstBackdropIdx = kids.findIndex((el) => el.style.zIndex === '0');
    const contentIdx = kids.findIndex((el) => el.style.zIndex === '2');
    expect(firstBackdropIdx).toBe(0);           // backdrop is the first thing rendered
    expect(contentIdx).toBeGreaterThan(firstBackdropIdx); // content sits above it
  });

  // iOS P1 (safe-area insets): weak presence assertion — the real gate is
  // the simulator screenshot (serif header clearing the Dynamic Island).
  // Renders first to prove the calc()+var() padding doesn't crash; the
  // actual wiring is checked at the source level because happy-dom's
  // CSSOM can't round-trip `calc(16px + var(--safe-top))` back through
  // getAttribute('style') (it silently drops the whole padding
  // declaration on serialize) — a test-environment limitation, not a
  // real-WebKit one.
  it('header wrapper top padding is additive with --safe-top', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    const kids = [...container.querySelector('.adn-noise').children];
    const content = kids.find((el) => el.style.zIndex === '2');
    expect(content).toBeTruthy();

    const src = readFileSync(join(process.cwd(), 'src/app/App.jsx'), 'utf8');
    expect(src).toContain('var(--safe-top)');
    expect(src).toContain('calc(16px');
  });
});

describe('Task 11: Insights tab', () => {
  afterEach(() => cleanup());

  it('clicking the Insights tab renders InsightsView', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    fireEvent.click(container.querySelector('[data-testid="tab-insights"]'));
    expect(container.textContent).toContain('90-Day Consistency');
    expect(container.textContent).toContain('Correlations');
  });
});

describe('C1: onboarding goal answers reach the profile (adaptive layer live)', () => {
  afterEach(() => {
    cleanup();
    delete global.fetch;
  });

  it('completing onboarding writes goalW + targetDate to the profile, activating computeAdaptive', () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true })); // funnel-resume lead-capture
    const box = { current: null };
    const { getByText, getByPlaceholderText, container } = render(
      <StateProvider>
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Drive the full wizard (labels verbatim from the protocol question defs,
    // mirroring src/onboarding/__tests__/OnboardingFlow.test.jsx).
    // basics
    fireEvent.change(getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
    fireEvent.change(getByPlaceholderText('32'), { target: { value: '32' } });
    fireEvent.click(getByText('Select…')); fireEvent.click(getByText('Male'));
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '190' } });
    fireEvent.change(getByPlaceholderText('5'), { target: { value: '5' } });
    fireEvent.change(getByPlaceholderText('11'), { target: { value: '11' } });
    fireEvent.click(getByText('Moderately active'));
    fireEvent.click(getByText('Continue'));
    // domains — Body locked on
    fireEvent.click(getByText('Continue'));
    // workout
    fireEvent.click(getByText('Lose fat'));
    fireEvent.click(getByText('Morning'));
    fireEvent.click(getByText('Full gym'));
    fireEvent.click(getByText('Continue'));
    // peptides
    fireEvent.click(getByText('\u{1F525} Drop body fat'));
    fireEvent.click(getByText('Never — I\'m new to this'));
    fireEvent.click(getByText('No'));
    fireEvent.click(getByText('Under $150/mo'));
    fireEvent.click(getByText('Fine with daily SubQ'));
    fireEvent.click(getByText('Continue'));
    // nutrition — goalWeight + targetDate are the answers C1 hoists onto profile
    fireEvent.change(getByPlaceholderText('180'), { target: { value: '165' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-12-31' } });
    fireEvent.click(getByText('Continue'));
    // schedule
    fireEvent.click(getByText('Employee'));
    fireEvent.click(getByText('Build my protocol'));

    const profile = box.current.profile;
    expect(profile.goalW).toBe(165);
    expect(typeof profile.goalW).toBe('number');
    expect(profile.targetDate).toBe('2026-12-31');

    // The whole point: the adaptive engine now leaves its no_goal early-return.
    const today = new Date().toISOString().slice(0, 10);
    expect(computeAdaptive(profile, [], today, 'Fat Loss').pace).not.toBe('no_goal');
  });
});

describe('I1: locked-domain protocols emit no routine tasks for free tier', () => {
  afterEach(() => cleanup());

  // Body goal (never locks) + Mind goal (Pro-gated). The mind protocol's
  // getTasks always emits a "🙏 Gratitude" task, which — under the routine
  // capacity of a two-goal state — is always SCHEDULED (never deferred), so
  // its title is a reliable DOM tell for whether mind tasks reached the routine.
  const BODY_GOAL = {
    id: 'g_body', status: 'active', domain: 'body', title: 'Get Lean',
    priority: 1, activeProtocols: [{ protocolId: 'workout' }],
    progress: { percent: 0 },
  };
  const MIND_GOAL = {
    id: 'g_mind', status: 'active', domain: 'mind', title: 'Sharpen Mind',
    priority: 2, activeProtocols: [{ protocolId: 'mind' }],
    progress: { percent: 0 },
  };
  const BASE = {
    name: 'Jordan', age: 30, gender: 'male', weight: 180,
    hFt: 5, hIn: 10, activity: 'moderate', domains: ['body', 'mind'],
  };

  function renderRoutine(tier) {
    // useAuth is mocked signed-in as free (module-level vi.mock above); the
    // no-downgrade restore effect never lowers a seeded profile.tier, so a
    // seeded 'pro' survives even under the free auth mock.
    const utils = render(
      <StateProvider>
        <SeedProfileGoals profile={{ ...BASE, tier }} goals={[BODY_GOAL, MIND_GOAL]} />
        <App />
      </StateProvider>
    );
    fireEvent.click(utils.container.querySelector('[data-testid="tab-routine"]'));
    return utils;
  }

  it('free tier: the Mind goal contributes NO tasks to the routine', () => {
    const { container } = renderRoutine('free');
    expect(container.textContent).not.toContain('Gratitude');
  });

  it('pro tier: the same state DOES surface the Mind goal tasks', () => {
    const { container } = renderRoutine('pro');
    expect(container.textContent).toContain('Gratitude');
  });

  it('free tier: the Body goal (never locks) still contributes its routine tasks', () => {
    // Guards against an over-broad filter that would starve the routine
    // entirely — body must survive the tier gate on every tier.
    const { container } = renderRoutine('free');
    // workout getTasks emits a session task titled "🔥 {workout.d}" on training
    // days; the goal-progress card ("Get Lean") always renders regardless. The
    // body goal's presence in the Routine surface is the load-bearing check.
    expect(container.textContent).toContain('Get Lean');
  });
});

describe('I2: browsed viewDay does not leak into the domain views', () => {
  afterEach(() => cleanup());

  const MIND_GOAL = {
    id: 'g_mind', status: 'active', domain: 'mind', title: 'Sharpen Mind',
    priority: 1, activeProtocols: [{ protocolId: 'mind' }],
    progress: { percent: 0 },
  };
  // Pro tier so the Mind tab renders its real view (with the day-built
  // "Today's Tasks" card) rather than LockedDomain.
  const PRO = {
    name: 'Jordan', age: 30, gender: 'male', weight: 180,
    hFt: 5, hIn: 10, activity: 'moderate', domains: ['body', 'mind'], tier: 'pro',
  };

  it('browsing Routine forward then opening a domain tab files completions to REAL today, not the browsed day', () => {
    const box = { current: null };
    const { container } = render(
      <StateProvider>
        <SeedProfileGoals profile={PRO} goals={[MIND_GOAL]} />
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Routine → browse viewDay off today via a different day chip.
    fireEvent.click(container.querySelector('[data-testid="tab-routine"]'));
    const todayDow = new Date().getDay();
    const otherIdx = (todayDow + 3) % 7; // guaranteed != todayDow
    fireEvent.click(container.querySelector(`[data-testid="day-chip-${otherIdx}"]`));

    // Open the Mind tab and check a task in its "Today's Tasks" card. Without
    // the snap-back (I2), the routine + completedTasks + todayKey are all still
    // keyed on the browsed day, so this completion would misfile there —
    // polluting that day's streak/score. The mind protocol always emits a
    // "🙏 Gratitude" task (id 'mind-gratitude').
    fireEvent.click(container.querySelector('[data-testid="tab-mind"]'));
    // Target the routine task row in the "Today's Tasks" card (its subtitle
    // "Sets intention…" is unique to the mind-gratitude routine task — this
    // avoids MindView's own "Daily Gratitude" journaling widget, which shares
    // the word "Gratitude" but does not call onCheckTask).
    const checkbox = [...container.querySelectorAll('button')]
      .find(b => b.parentElement?.textContent?.includes('Sets intention'));
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);

    const today = new Date().toISOString().slice(0, 10);
    const routineLogs = box.current.logs.routine;
    // Completion landed on TODAY's key, and no browsed-day key was written.
    expect(routineLogs[today]).toContain('mind-gratitude');
    expect(Object.keys(routineLogs)).toEqual([today]);
  });
});

// ─── iOS P2 Task 2b: centralized check-off haptic (all views) ─────────────
// handleCheckTask (App.jsx) is now the ONE place the check-off haptic fires,
// so every view sharing it — RoutineView's TaskRow AND the 7 domain views'
// "Today's Tasks" cards — gets the same tick. Before this fix, only
// RoutineView buzzed on check-off; the domain views (wired to the same
// handleCheckTask via onCheckTask) fired nothing. Reuses the I2 test's
// Mind-goal recipe above (the mind protocol always emits the 'mind-
// gratitude' task) to drive a real domain-view check-off end to end.
describe('iOS P2 Task 2b: handleCheckTask fires the check-off haptic centrally', () => {
  const MIND_GOAL = {
    id: 'g_mind', status: 'active', domain: 'mind', title: 'Sharpen Mind',
    priority: 1, activeProtocols: [{ protocolId: 'mind' }],
    progress: { percent: 0 },
  };
  const PRO = {
    name: 'Jordan', age: 30, gender: 'male', weight: 180,
    hFt: 5, hIn: 10, activity: 'moderate', domains: ['body', 'mind'], tier: 'pro',
  };

  let lightSpy;
  beforeEach(() => {
    lightSpy = vi.spyOn(haptics, 'light').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    lightSpy.mockRestore();
  });

  it('fires haptics.light only on the completing edge, driven via a domain view (Mind) check-off', () => {
    const { container } = render(
      <StateProvider>
        <SeedProfileGoals profile={PRO} goals={[MIND_GOAL]} />
        <App />
      </StateProvider>
    );

    fireEvent.click(container.querySelector('[data-testid="tab-mind"]'));
    lightSpy.mockClear(); // isolate from TabNav's own tab-switch haptics.light call
    // Same "Sets intention…" lookup the I2 test above uses to target the
    // routine task row in Mind's "Today's Tasks" card, not its separate
    // Daily Gratitude journaling widget.
    const checkbox = [...container.querySelectorAll('button')]
      .find(b => b.parentElement?.textContent?.includes('Sets intention'));
    expect(checkbox).toBeTruthy();

    fireEvent.click(checkbox); // complete — domain views fired NO haptic before this fix
    expect(lightSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(checkbox); // uncheck — stays silent, same as RoutineView always was
    expect(lightSpy).toHaveBeenCalledTimes(1);
  });
});

describe('I2: viewDay does not leak into the Home tab', () => {
  afterEach(() => cleanup());

  it('browsing Routine to another day, then returning Home, snaps the dashboard back to real today', () => {
    const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    // goalW + targetDate activate the adaptive pace line, which renders the
    // dashboard's day-name label ("{weekday} · {paceLabel}") we assert on.
    const profile = { ...COMPLETE_PROFILE, goalW: 170, targetDate: '2026-12-31' };
    const { container } = render(
      <StateProvider>
        <SeedProfile profile={profile} />
        <App />
      </StateProvider>
    );

    // Routine → move viewDay off today via a different day chip.
    fireEvent.click(container.querySelector('[data-testid="tab-routine"]'));
    const todayDow = new Date().getDay();
    const otherIdx = (todayDow + 3) % 7; // guaranteed != todayDow
    fireEvent.click(container.querySelector(`[data-testid="day-chip-${otherIdx}"]`));

    // Back to Home — the dashboard must reflect TODAY, not the browsed day.
    fireEvent.click(container.querySelector('[data-testid="tab-home"]'));
    const dash = container.querySelector('[data-testid="home-dashboard"]');
    expect(dash).toBeTruthy();
    expect(dash.textContent).toContain(todayName);
  });
});

describe('V3: fitness pillars save drives the Train program', () => {
  afterEach(() => cleanup());

  it('promoting Muscle Gain in the pillars editor re-points the Train view to the Muscle Gain program', () => {
    // Seed an existing pillar so ProfileHeader renders its "+ EDIT" chip
    // (the chip only shows when pillars exist). profile.primary is left unset,
    // so the Train view initially resolves to the default 'Anti-Aging' program
    // (WorkoutView: profile.primary || 'Wellness' → GOAL_ALIASES.Wellness).
    const profile = { ...COMPLETE_PROFILE, fitnessPillars: ['Wellness'] };
    const { container, getByText, getAllByText } = render(
      <StateProvider>
        <SeedProfile profile={profile} />
        <App />
      </StateProvider>
    );

    // Sanity: before any pillar change, the Train view shows the default program.
    fireEvent.click(container.querySelector('[data-testid="tab-body"]'));
    fireEvent.click(getByText('Train'));
    expect(container.textContent).toContain('Anti-Aging');
    expect(container.textContent).not.toContain('Muscle Gain');

    // Open the pillars editor from the Profile tab and promote Muscle Gain to
    // primary (first click adds it; second click promotes it to slot 0).
    fireEvent.click(container.querySelector('[data-testid="tab-profile"]'));
    fireEvent.click(getByText('+ EDIT'));
    fireEvent.click(getByText('Muscle Gain')); // add
    fireEvent.click(getByText('Muscle Gain')); // promote to primary
    fireEvent.click(getByText('Save'));

    // Back to the Train view — the program must now be Muscle Gain. This only
    // holds if the pillars save wrote profile.primary (V3 fix); both WorkoutView
    // and workout.getState read profile.primary, so without that write the Train
    // program stays on the default.
    fireEvent.click(container.querySelector('[data-testid="tab-body"]'));
    fireEvent.click(getByText('Train'));
    expect(getAllByText('Muscle Gain').length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain('Anti-Aging');
  });
});

describe('Task 13: home tab + daily check-in', () => {
  afterEach(() => {
    cleanup();
  });

  it('lands on the home tab (HomeDashboard) by default', () => {
    const { container } = render(
      <StateProvider>
        <Seed />
        <App />
      </StateProvider>
    );
    expect(container.querySelector('[data-testid="home-dashboard"]')).toBeTruthy();
  });

  it('tapping the check-in card, rating all fields, and saving writes logs.checkins[today]', () => {
    const box = { current: null };
    const { container, getByText } = render(
      <StateProvider>
        <Seed />
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Open the modal from the Home dashboard's check-in card.
    fireEvent.click(container.querySelector('[data-testid="checkin-card"]'));

    // Rate every field's first (lowest) option so allRated flips true.
    for (const field of CHECKIN_FIELDS) {
      fireEvent.click(container.querySelector(`[aria-label="${field.label} rating 1"]`));
    }

    fireEvent.click(getByText('Save'));

    const today = new Date().toISOString().slice(0, 10);
    const saved = box.current.logs.checkins[today];
    expect(saved).toBeTruthy();
    for (const field of CHECKIN_FIELDS) {
      expect(saved[field.id]).toBe(1);
    }
  });

  it('regression: a check-in saved from Home after browsing Routine to another day still writes to REAL today, not the Routine view-day', () => {
    const box = { current: null };
    const { container, getByText } = render(
      <StateProvider>
        <Seed />
        <StateSpy box={box} />
        <App />
      </StateProvider>
    );

    // Navigate to Routine (TabNav tab, data-testid="tab-routine" — "Routine"
    // text alone is ambiguous, HomeDashboard also has a "Routine" stat tile)
    // and move viewDay off today by clicking a different day chip
    // (RoutineView renders 7 chips as data-testid="day-chip-<i>", one per
    // weekday index; pick any index other than today's).
    fireEvent.click(container.querySelector('[data-testid="tab-routine"]'));
    const todayDow = new Date().getDay();
    const otherIdx = (todayDow + 3) % 7; // guaranteed != todayDow
    fireEvent.click(container.querySelector(`[data-testid="day-chip-${otherIdx}"]`));

    // Back to Home — the check-in card lives there — and save a check-in.
    fireEvent.click(container.querySelector('[data-testid="tab-home"]'));
    fireEvent.click(container.querySelector('[data-testid="checkin-card"]'));
    for (const field of CHECKIN_FIELDS) {
      fireEvent.click(container.querySelector(`[aria-label="${field.label} rating 1"]`));
    }
    fireEvent.click(getByText('Save'));

    const today = new Date().toISOString().slice(0, 10);
    const checkins = box.current.logs.checkins;
    expect(checkins[today]).toBeTruthy();
    for (const field of CHECKIN_FIELDS) {
      expect(checkins[today][field.id]).toBe(1);
    }
    // No other date key should have been written by this save.
    expect(Object.keys(checkins)).toEqual([today]);
  });
});
