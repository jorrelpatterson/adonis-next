// src/app/App.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { buildDailyRoutine } from '../routine/pipeline';
import { computeAdaptive } from '../protocols/body/nutrition/adaptive-calories';
import { getAllProtocols } from '../protocols/registry';
import GoalSetup from '../goals/GoalSetup';
import HomeDashboard from '../routine/HomeDashboard';
import CheckinModal from '../protocols/_system/checkin/CheckinModal';
import RoutineView from '../routine/RoutineView';
import BodyView from './views/BodyView';
import TabNav from './TabNav';
import AmbientBackdrop from '../design/AmbientBackdrop';
import { validateAccessCode } from '../state/access-codes';
import { useAuth } from '../services/useAuth.js';
import { updateUserTier } from '../services/auth.js';
import { isProfileIncomplete } from '../auth/ProfileSetup.jsx';
import AuthScreen from '../auth/AuthScreen.jsx';
import OnboardingFlow from '../onboarding/OnboardingFlow.jsx';
import CalculatingScreen from '../onboarding/CalculatingScreen.jsx';
import GamePlanScreen from '../onboarding/GamePlanScreen.jsx';
import { buildInitialGoals } from '../onboarding/initial-goals.js';

// Task 13: metadata tier (stamped on redemption, see updateUserTier) is the
// source of truth on sign-in — the restore effect below only ever upgrades
// the local profile toward it, never downgrades (a code redeemed while
// signed out must survive a subsequent login with a lower/blank metadata tier).
const TIER_RANK = { free: 0, pro: 1, elite: 2 };

export default function App() {
  const { state, addGoal, removeGoal, setProfile, setProtocolState, log, updateGoal } = useAppState();
  const { profile, goals, protocolState: protocolStates, logs, settings } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const [activeTab, setActiveTab] = useState('home');
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [goalSetupDomain, setGoalSetupDomain] = useState(null);
  const [viewDay, setViewDay] = useState(new Date());
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeMsg, setAccessCodeMsg] = useState('');
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  // ─── auth-gated funnel (spec decision 4: signup gate BEFORE protocol
  // delivery) — onboarding → signup → calculating → gameplan → app ────────
  const { user, tier: authTier, loading: authLoading } = useAuth();
  const [funnel, setFunnel] = useState(null); // null = derive from profile/user; 'signup' | 'calculating' | 'gameplan' are transient stages

  // Task 14: dev/E2E URL-param bypass (Verification addendum) — lets the
  // headless screenshot shooter (scripts/screenshot-baseline.sh) reach inner
  // screens without driving the real auth+onboarding funnel. DEV-gated so
  // `import.meta.env.DEV` (true under vitest and `vite dev`, false in
  // `vite build`) tree-shakes this whole branch — including the seeded
  // profile literal — out of production bundles. Params read once via
  // `useState` initializer rather than on every render; the search string
  // isn't expected to change during a session.
  const [e2eParams] = useState(() => (
    import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
  ));
  const e2e = e2eParams?.get('e2e') === '1';
  const forcedScreen = e2eParams?.get('screen');

  // Funnel resume — keyed on (user, profile.funnelPending) rather than the
  // transient `funnel` stage. `funnelPending` is stamped onto the profile at
  // onboarding-complete and PERSISTS (store deep-merges profile), so BOTH
  // resume paths land here: (a) immediate session — user authenticates while
  // funnel==='signup'; (b) email-confirmation reload — the app reloads with
  // funnel=null after the user clicks the confirm link, but the persisted
  // funnelPending flag re-triggers this. Either way we resume at calculating
  // → gameplan instead of silently dumping the user into the tab shell.
  useEffect(() => {
    if (user && profile.funnelPending && funnel !== 'calculating' && funnel !== 'gameplan') {
      // Lead capture: upsert into `subscribers` so the existing welcome-drip
      // cron (app/api/cron/welcome-emails) picks the new app signup up.
      // Fire-and-forget — must never block the funnel on fetch failure.
      fetch('/api/app-signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, firstName: profile.name }),
      }).catch(() => {}); // relative URL resolves in prod (app served under the Next domain) and no-ops in vite dev
      setFunnel('calculating');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile.funnelPending]);

  // Metadata tier restore-on-login (Task 13): a tier stamped into Supabase
  // user metadata (via updateUserTier, e.g. an access code redeemed on
  // another device) survives reinstall — on any sign-in where it outranks
  // the local profile tier, upgrade the local profile to match. Never
  // downgrades: TIER_RANK comparison means a locally-redeemed elite code
  // stays elite even if metadata is still 'free'.
  useEffect(() => {
    if (user && TIER_RANK[authTier] > TIER_RANK[profile.tier || 'free']) {
      setProfile({ tier: authTier });
    }
  }, [user, authTier]);

  // Task 14: `?e2e=1` seeds a complete profile (so isProfileIncomplete()
  // passes and the funnel/onboarding gates below never trigger) and jumps
  // straight to a requested tab. Both no-op once the profile is already
  // complete / activeTab already matches, so they're safe across re-renders.
  useEffect(() => {
    if (e2e && isProfileIncomplete(profile)) {
      setProfile({
        name: 'E2E', age: 30, gender: 'male', weight: 185, goalW: 175,
        targetDate: '2026-12-31',
        hFt: 5, hIn: 11, activity: 'moderate', domains: ['body'], tier: 'elite',
      });
    }
  }, [e2e]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const tab = e2eParams?.get('tab');
    if (e2e && tab) setActiveTab(tab);
  }, [e2e]); // eslint-disable-line react-hooks/exhaustive-deps

  // I2: the Home tab is a "today" surface — it reads the same viewDay-built
  // routine/completedTasks/day that Routine does. Browsing Routine to another
  // day chip moves viewDay off today; without this reset, switching back to
  // Home would leak that browsed day into the dashboard (wrong routine tile,
  // wrong day label). Snap viewDay back to real today whenever Home activates.
  useEffect(() => {
    if (activeTab === 'home') setViewDay(new Date());
  }, [activeTab]);

  // Build protocol map from registry
  const protocolMap = useMemo(() => {
    const map = {};
    for (const p of getAllProtocols()) map[p.id] = p;
    return map;
  }, []);

  // Build today's routine
  const today = new Date().toISOString().slice(0, 10);
  const routine = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'active');
    return buildDailyRoutine({
      goals: activeGoals, protocolMap, profile, protocolStates, logs, settings,
      day: viewDay, today,
    });
  }, [goals, protocolMap, profile, protocolStates, logs, settings, viewDay, today]);

  // Completed tasks for today
  const todayKey = viewDay.toISOString().slice(0, 10);
  const completedTasks = (logs.routine && logs.routine[todayKey]) || [];

  // I1: primaryGoal — the single source of truth for the active goal label,
  // derived ONCE here so RoutineView (pace banner), HomeDashboard and
  // buildWeekStats (Sunday recap scoring) all key off the SAME target rather
  // than each recomputing their own. Chain: profile.primary is the intended
  // source of truth; protocolStates.workout.primary is the onboarding-time
  // answer it's derived from. (WorkoutView/FoodLogger use a shorter
  // `profile.primary || 'Wellness'` chain — that's pre-existing main behavior,
  // deliberately left untouched here.) adaptive is memoized here since it keys
  // off profile/logs.weight/today, then threaded down as a prop.
  const primaryGoal = profile.primary || protocolStates.workout?.primary || 'Wellness';
  const adaptive = useMemo(
    () => computeAdaptive(profile, logs.weight, today, primaryGoal),
    [profile, logs.weight, today, primaryGoal]
  );

  const handleCheckTask = useCallback((taskId) => {
    const current = (logs.routine && logs.routine[todayKey]) || [];
    const updated = current.includes(taskId)
      ? current.filter(id => id !== taskId)
      : [...current, taskId];
    log('routine', { ...logs.routine, [todayKey]: updated });
  }, [logs.routine, todayKey, log]);

  // Task 14: RoutineView's long-press/tap surface — mirrors how the archive's
  // App.jsx wired the same prop (`handleTaskTap`, v2-revival-archive:src/app/
  // App.jsx): the only task `type` RoutineView ever makes tappable is
  // 'check-in' (see RoutineView.jsx's `isTappable` check), so this opens the
  // same check-in modal the Home tab's `onCheckinTap` already opens.
  const handleTaskTap = useCallback((task) => {
    if (task.type === 'check-in') setShowCheckinModal(true);
  }, []);

  // Task 13: Daily check-in save — writes today's ratings into logs.checkins
  // keyed by REAL today (`today`, not the Routine view-day `todayKey`), then
  // closes the modal (CheckinModal also auto-closes itself after its own
  // "Got it" confirmation beat). A check-in saved from Home must land on the
  // real date regardless of which day the user last browsed to in Routine —
  // otherwise it misfiles onto that day's key and silently overwrites its
  // existing check-in, while Home (which reads real-today) shows nothing.
  const handleSaveCheckin = useCallback((ratings) => {
    log('checkins', { ...logs.checkins, [today]: ratings });
  }, [logs.checkins, today, log]);

  const handleCreateGoal = useCallback((goal) => {
    // Prevent duplicate goals from same template
    const isDuplicate = goals.some(g => g.templateId === goal.templateId && g.status === 'active');
    if (isDuplicate) {
      // Could show a message, but for now just close
      setShowGoalSetup(false);
      setGoalSetupDomain(null);
      return;
    }
    addGoal(goal);
    setShowGoalSetup(false);
    setGoalSetupDomain(null);
    setActiveTab('routine');
  }, [addGoal, goals]);

  const handleAccessCode = useCallback(() => {
    const result = validateAccessCode(accessCodeInput);
    if (!result) {
      setAccessCodeMsg('Invalid code');
      return;
    }
    // Guard against a durable DOWNGRADE: a redeemed code must only ever raise
    // the tier. Without this an Elite user typing a pro-tier code (e.g.
    // ADONIS2026) drops to pro both locally AND in user metadata — and the
    // no-downgrade restore-on-login can't recover it. Same TIER_RANK rule the
    // metadata-restore effect uses.
    const currentTier = profile.tier || 'free';
    if (TIER_RANK[result.tier] <= TIER_RANK[currentTier]) {
      setAccessCodeMsg('You already have ' + (SUB_TIERS[currentTier]?.name || currentTier) + ' access');
      return;
    }
    setProfile({ tier: result.tier });
    // Stamp into Supabase user metadata so the unlock survives reinstall
    // (Task 13). Best-effort — never block the local unlock on this.
    if (user) updateUserTier(result.tier, accessCodeInput).catch(() => {});
    setAccessCodeMsg('Activated: ' + result.name + ' (' + result.tier + ' tier)');
    setAccessCodeInput('');
  }, [accessCodeInput, setProfile, user, profile.tier]);

  const activeGoals = goals.filter(g => g.status === 'active');

  const handleOnboardingComplete = (profileUpdates, protocolAnswers) => {
    const answers = protocolAnswers || {};
    const primary = answers.workout?.primary;
    if (primary) profileUpdates.fitnessPillars = [primary];
    // C1: hoist the nutrition goal answers onto the profile — exactly parallel
    // to the workout.primary → fitnessPillars hoist above. computeAdaptive
    // gates its whole adaptive layer on profile.goalW + profile.targetDate
    // (adaptive-calories.js), but the wizard only ever landed these answers in
    // protocolStates.nutrition + the derived goal object; nothing wrote them
    // back to the profile, so the adaptive engine sat permanently on its
    // no_goal early-return. This is the missing write.
    const n = answers.nutrition;
    if (n?.goalWeight) profileUpdates.goalW = Number(n.goalWeight);
    if (n?.targetDate) profileUpdates.targetDate = n.targetDate;
    // funnelPending persists (store deep-merges profile) so the calculating→
    // gameplan hop resumes even across an email-confirmation reload — see the
    // funnel-resume effect above. Cleared on GamePlanScreen's onStart.
    setProfile({ ...profileUpdates, funnelPending: true });
    Object.entries(answers).forEach(([pid, data]) => setProtocolState(pid, data));
    buildInitialGoals({ ...profile, ...profileUpdates }, answers).forEach(addGoal);
    setFunnel('signup'); // signup gate BEFORE protocol delivery (spec decision 4)
  };

  // ─── funnel gate — resolves before the tab shell renders below ─────────
  // Task 14: dev/E2E bypass goes first — `?screen=auth|onboarding` forces
  // that screen unauthenticated (for the screenshot shooter), and `?e2e=1`
  // skips the whole funnel below (the seeding effect above makes the
  // profile complete, so the tab shell renders straight away).
  if (forcedScreen === 'auth') {
    return <AuthScreen />;
  }
  if (forcedScreen === 'onboarding') {
    return <OnboardingFlow initialProfile={{}} onComplete={handleOnboardingComplete} />;
  }
  if (!e2e) {
    if (authLoading || (funnel === 'signup' && user)) {
      return <BootSplash />;
    }
    if (funnel === 'signup' && !user) {
      return <AuthScreen subheading="Create your account to unlock your game plan" initialMode="signup" />;
    }
    if (funnel === 'calculating') {
      return <CalculatingScreen profile={profile} onComplete={() => setFunnel('gameplan')} />;
    }
    if (funnel === 'gameplan') {
      return <GamePlanScreen profile={profile} protocolStates={protocolStates} onStart={() => { setProfile({ funnelPending: false }); setFunnel(null); }} />;
    }
    if (isProfileIncomplete(profile)) {
      return <OnboardingFlow initialProfile={profile} onComplete={handleOnboardingComplete} />;
    }
    if (!user) {
      return <AuthScreen />; // returning device, signed out
    }
  }

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <AmbientBackdrop tab={activeTab} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(14,16,22,0.7)', border: '1px solid rgba(232,213,183,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: 'italic' }}>
                <GradText>A</GradText>
              </span>
            </div>
            <div>
              <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, fontStyle: 'italic' }}>
                Adonis
              </span>
              <div style={{ fontSize: 7, color: P.gW, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>
                Protocol OS
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 8, padding: '3px 8px', borderRadius: 6,
              background: tierInfo.color + '15', color: tierInfo.color,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {tierInfo.name}
            </span>
          </div>
        </div>

        {/* Goal Setup Modal */}
        {showGoalSetup ? (
          <GoalSetup
            onCreateGoal={handleCreateGoal}
            onCancel={() => { setShowGoalSetup(false); setGoalSetupDomain(null); }}
            profile={profile}
            initialDomain={goalSetupDomain}
          />
        ) : activeTab === 'home' ? (
          <HomeDashboard
            profile={profile}
            logs={logs}
            today={today}
            routine={routine}
            completedTasks={completedTasks}
            adaptive={adaptive}
            day={viewDay}
            onCheckinTap={() => setShowCheckinModal(true)}
          />
        ) : activeTab === 'routine' ? (
          <div>
            {/* Add Goal Button */}
            <button onClick={() => { setGoalSetupDomain(null); setShowGoalSetup(true); }}
              style={{
                ...s.out, width: '100%', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <span style={{ fontSize: 14 }}>+</span> Add Goal
            </button>

            {/* Routine */}
            <RoutineView
              routine={routine}
              onCheckTask={handleCheckTask}
              onTaskTap={handleTaskTap}
              completedTasks={completedTasks}
              day={viewDay}
              goals={activeGoals}
              onDayChange={setViewDay}
              logs={logs}
              profile={profile}
              today={today}
              adaptive={adaptive}
              goal={primaryGoal}
            />
          </div>
        ) : activeTab === 'profile' ? (
          <div>
            <H t="Profile" sub={profile.name || 'Set up your profile'} />

            {/* Name */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Name</label>
              <input
                value={profile.name || ''}
                onChange={e => setProfile({ name: e.target.value })}
                style={{ ...s.inp, width: '100%' }}
                placeholder="Your name"
              />
            </div>

            {/* Primary Goal — derived from first active goal */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.txD, marginBottom: 4 }}>Primary Goal</div>
              <div style={{ fontSize: 13, color: P.txS }}>
                {activeGoals.length > 0 ? activeGoals[0].title : 'Add a goal to get started'}
              </div>
              {activeGoals.length > 0 && (
                <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                  Set by your first active goal. Determines workout program + supplement stack.
                </div>
              )}
            </div>

            {/* Weight */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Current Weight (lbs)</label>
              <input
                type="number"
                value={profile.weight || ''}
                onChange={e => setProfile({ weight: e.target.value })}
                style={{ ...s.inp, width: '100%' }}
                placeholder="210"
              />
            </div>

            {/* Domains */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 8 }}>Active Domains</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {DOMAINS.map(d => {
                  const isActive = (profile.domains || []).includes(d.id);
                  return (
                    <button key={d.id} onClick={() => {
                      const current = profile.domains || [];
                      const updated = isActive ? current.filter(id => id !== d.id) : [...current, d.id];
                      setProfile({ domains: updated });
                    }}
                      style={{
                        padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                        border: '1px solid ' + (isActive ? P.gW + '44' : P.bd),
                        background: isActive ? 'rgba(232,213,183,0.04)' : 'transparent',
                        cursor: 'pointer', fontFamily: FN,
                      }}>
                      <span style={{ fontSize: 14 }}>{d.icon}</span>
                      <span style={{ fontSize: 11, color: isActive ? P.gW : P.txD, marginLeft: 6, fontWeight: isActive ? 600 : 400 }}>
                        {d.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Access Code */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Access Code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={accessCodeInput}
                  onChange={e => setAccessCodeInput(e.target.value)}
                  style={{ ...s.inp, flex: 1 }}
                  placeholder="Enter code"
                />
                <button onClick={handleAccessCode} style={{ ...s.pri, padding: '8px 16px' }}>
                  Apply
                </button>
              </div>
              {accessCodeMsg && (
                <div style={{ fontSize: 11, color: accessCodeMsg.includes('Activated') ? P.ok : P.err, marginTop: 6 }}>
                  {accessCodeMsg}
                </div>
              )}
            </div>

            {/* Tier Info */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.txD, marginBottom: 4 }}>Current Tier</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: tierInfo.color }}>{tierInfo.name}</span>
                {tierInfo.price > 0 && <span style={{ fontSize: 11, color: P.txD }}>${tierInfo.price}/mo</span>}
              </div>
              <div style={{ marginTop: 8 }}>
                {tierInfo.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: P.txM, padding: '2px 0' }}>
                    {'✓'} {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Goals */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.txD, marginBottom: 8 }}>Active Goals ({activeGoals.length})</div>
              {activeGoals.length === 0 ? (
                <div style={{ fontSize: 11, color: P.txD }}>No active goals</div>
              ) : activeGoals.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + P.bd }}>
                  <div>
                    <div style={{ fontSize: 12, color: P.txS }}>{g.title}</div>
                    <div style={{ fontSize: 9, color: P.txD }}>{g.domain} {'·'} {g.activeProtocols?.length || 0} protocols</div>
                  </div>
                  <span style={{ fontSize: 11, color: P.gW }}>{g.progress?.percent || 0}%</span>
                </div>
              ))}
            </div>

            {/* System Status */}
            <div style={{ ...s.card, padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: P.txD, marginBottom: 4 }}>System Status</div>
              <div style={{ fontSize: 10, color: P.txD, lineHeight: 1.8 }}>
                Protocols: {getAllProtocols().length} registered<br />
                Goals: {goals.length} ({activeGoals.length} active)<br />
                Engine: active
              </div>
            </div>
          </div>
        ) : (
          /* Domain tab view */
          (() => {
            const domain = DOMAINS.find(d => d.id === activeTab);
            if (activeTab === 'body') {
              return (
                <div>
                  <H t={(domain?.icon || '') + ' ' + (domain?.name || activeTab)}
                    sub={domain?.sub || ''} />
                  <BodyView
                    profile={profile}
                    protocolStates={protocolStates}
                    setProtocolState={setProtocolState}
                    logs={logs}
                    log={log}
                  />
                </div>
              );
            }
            const domainGoals = activeGoals.filter(g => g.domain === activeTab);
            const domainTasks = routine.scheduled.filter(t => {
              const proto = protocolMap[t.protocolId];
              return proto && proto.domain === activeTab;
            });
            return (
              <div>
                <H t={(domain?.icon || '') + ' ' + (domain?.name || activeTab)}
                  sub={domain?.sub || ''} />

                {/* Domain Goals */}
                {domainGoals.length > 0 ? (
                  <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
                    <div style={{ ...s.lab }}>Goals</div>
                    {domainGoals.map(g => (
                      <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                          <div style={{ fontSize: 11, color: P.gW }}>{g.progress?.percent || 0}%</div>
                        </div>
                        <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.08)' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')', width: (g.progress?.percent || 0) + '%' }} />
                        </div>
                        <div style={{ fontSize: 10, color: P.txD, marginTop: 3 }}>{g.activeProtocols?.length || 0} protocols active</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ ...s.card, padding: 20, textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: P.txM }}>No {domain?.name} goals yet</div>
                    <button onClick={() => { setGoalSetupDomain(activeTab); setShowGoalSetup(true); }}
                      style={{ ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
                      + Add {domain?.name} Goal
                    </button>
                  </div>
                )}

                {/* Today's tasks for this domain */}
                {domainTasks.length > 0 && (
                  <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
                    <div style={{ ...s.lab }}>Today's Tasks</div>
                    {domainTasks.map(task => {
                      const isDone = completedTasks.includes(task.id);
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + P.bd, opacity: isDone ? 0.5 : 1 }}>
                          <button onClick={() => handleCheckTask(task.id)}
                            style={{ width: 20, height: 20, borderRadius: 10, border: isDone ? 'none' : '1.5px solid ' + P.gW + '44', background: isDone ? P.ok : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontFamily: FN, flexShrink: 0 }}>
                            {isDone ? '\u2713' : ''}
                          </button>
                          <div>
                            <div style={{ fontSize: 13, color: isDone ? P.txD : P.txS, textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
                            {task.subtitle && <div style={{ fontSize: 10, color: P.txD }}>{task.subtitle}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Domain description */}
                <div style={{ ...s.card, padding: 14 }}>
                  <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>{domain?.desc || ''}</div>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Tab Navigation */}
      {!showGoalSetup && (
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          domains={profile.domains || ['body']}
        />
      )}

      {/* Daily Check-in modal (Task 13) — fixed-position overlay, mounted
          alongside the tab content rather than replacing it. */}
      {showCheckinModal && (
        <CheckinModal
          onSave={handleSaveCheckin}
          onClose={() => setShowCheckinModal(false)}
        />
      )}
    </div>
  );
}

// Minimal boot splash — shown while the auth session resolves, and during the
// signup→calculating handoff so the user never sees an AuthScreen flash after
// they've just authenticated. Phase-1-deferred boot splash lands here (Task 11).
function BootSplash() {
  return (
    <div
      data-testid="boot-splash"
      className="adn-noise adn-reveal"
      style={{
        fontFamily: FN, background: P.bg, color: P.tx,
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{ fontFamily: FD, fontSize: 28, fontWeight: 300, fontStyle: 'italic' }}>
        <GradText>Adonis</GradText>
      </span>
    </div>
  );
}
