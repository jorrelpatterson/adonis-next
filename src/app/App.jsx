// src/app/App.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppState } from '../state/store';
import { loadLiveCatalog } from '../services/peptide-catalog';
import { useAuth } from '../services/useAuth';
import AuthScreen from '../auth/AuthScreen';
import { isProfileIncomplete } from '../auth/ProfileSetup';
import OnboardingFlow from '../onboarding/OnboardingFlow';
import CalculatingScreen from '../onboarding/CalculatingScreen';
import GamePlanScreen from '../onboarding/GamePlanScreen';
import { buildInitialGoals } from '../onboarding/initial-goals';
import { redirectToCheckout } from '../services/upgrade';
import BodyView from '../views/BodyView';
import InsightsView from '../views/InsightsView';
import MoneyView from '../views/MoneyView';
import TravelView from '../views/TravelView';
import MindView from '../views/MindView';
import ImageView from '../views/ImageView';
import PurposeView from '../views/PurposeView';
import EnvironmentView from '../views/EnvironmentView';
import CommunityView from '../views/CommunityView';

const DOMAIN_VIEWS = {
  body: BodyView,
  money: MoneyView,
  travel: TravelView,
  mind: MindView,
  image: ImageView,
  purpose: PurposeView,
  environment: EnvironmentView,
  community: CommunityView,
};
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import AmbientBackdrop from '../design/AmbientBackdrop';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { buildDailyRoutine } from '../routine/pipeline';
import { getAllProtocols } from '../protocols/registry';
import GoalSetup from '../goals/GoalSetup';
import RoutineView from '../routine/RoutineView';
import TabNav from './TabNav';
import CheckinModal from '../protocols/_system/checkin/CheckinModal';
import PeptideFinderModal from '../views/components/PeptideFinderModal';
import { WORKOUT_GOAL_TO_OPTIMIZE, getStackForFinder } from '../protocols/body/peptides/proto-stacks';
import { validateAccessCode } from '../state/access-codes';
import ProfileHeader, { getFitnessPillars } from './components/ProfileHeader';
import FitnessPillarsModal from './components/FitnessPillarsModal';
import ResetConfirmModal from './components/ResetConfirmModal';
import EmptyState from '../design/EmptyState';
import { IllusGoals } from '../design/illustrations';
import { DomainIcon } from '../design/icons';
import AppSettings from './components/AppSettings';
import { ToastProvider, useToast } from '../design/Toast';
import { transitionView } from '../design/motion';
import { haptics } from '../design/haptics';
import { sound } from '../design/sound';

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const toast = useToast();
  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth();
  const { state, addGoal, removeGoal, setProfile, log, updateGoal, setProtocolState } = useAppState();
  const { profile, goals, protocolState: protocolStates, logs, settings } = state;

  // Sync server-side tier into local profile when auth profile resolves.
  // Server is the source of truth for tier (Stripe-controlled); localStorage caches it.
  useEffect(() => {
    if (authProfile && authProfile.tier && authProfile.tier !== profile.tier) {
      setProfile({ tier: authProfile.tier });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProfile?.tier]);

  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const [activeTab, setActiveTab] = useState('routine');
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [goalSetupDomain, setGoalSetupDomain] = useState(null);
  const [viewDay, setViewDay] = useState(new Date());
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeMsg, setAccessCodeMsg] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const [showPeptideFinder, setShowPeptideFinder] = useState(false);
  const [showProtocolPlan, setShowProtocolPlan] = useState(false);
  const [showPillarsModal, setShowPillarsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Onboarding state machine — 'profile' | 'calculating' | 'gameplan' | 'app'
  const [onboardingPhase, setOnboardingPhase] = useState('profile');
  // Soft-reset flag — when true, OnboardingFlow re-runs even if profile is complete.
  const [forceOnboarding, setForceOnboarding] = useState(false);

  // Load live peptide catalog from Supabase on mount.
  // Merges live commerce data (price, stock, active) onto v2's protocol metadata.
  // On Supabase failure, falls back gracefully to the static catalog.
  useEffect(() => {
    let cancelled = false;
    loadLiveCatalog().then(catalog => {
      if (!cancelled) log('peptideCatalog', catalog);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply user's stored reduced-motion preference on boot.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    try {
      const stored = localStorage.getItem('adonis_reduced_motion') === '1';
      document.documentElement.classList.toggle('adn-reduced-motion', stored);
    } catch { /* noop */ }
  }, []);

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

  const handleCheckTask = useCallback((taskId) => {
    const current = (logs.routine && logs.routine[todayKey]) || [];
    const wasChecked = current.includes(taskId);
    const updated = wasChecked
      ? current.filter(id => id !== taskId)
      : [...current, taskId];
    if (wasChecked) {
      haptics.light();
      sound.toggleOff();
    } else {
      haptics.success();
      sound.success();
    }
    log('routine', { ...logs.routine, [todayKey]: updated });
  }, [logs.routine, todayKey, log]);

  const handleTaskTap = useCallback((task) => {
    if (task.type === 'check-in') setShowCheckin(true);
  }, []);

  const handleSaveCheckin = useCallback((ratings) => {
    log('checkins', { ...logs.checkins, [todayKey]: ratings });
  }, [logs.checkins, todayKey, log]);

  const handleCreateGoal = useCallback((goal) => {
    // Prevent duplicate goals from same template
    const isDuplicate = goals.some(g => g.templateId === goal.templateId && g.status === 'active');
    if (isDuplicate) {
      toast.warning('You already have this goal active');
      setShowGoalSetup(false);
      setGoalSetupDomain(null);
      return;
    }
    toast.success(`Goal added: ${goal.title}`);
    addGoal(goal);
    setShowGoalSetup(false);
    setGoalSetupDomain(null);
    setActiveTab('routine');
  }, [addGoal, goals, toast]);

  // Tab switch with view transition + tactile feedback. Falls back gracefully
  // on browsers without the View Transitions API.
  const handleTabChange = useCallback((next) => {
    if (next === activeTab) return;
    haptics.light();
    sound.tap();
    transitionView(() => setActiveTab(next));
  }, [activeTab]);

  const handleAccessCode = useCallback(() => {
    const result = validateAccessCode(accessCodeInput);
    if (result) {
      setProfile({ tier: result.tier });
      toast.success(`Activated: ${result.name} (${result.tier})`);
      setAccessCodeInput('');
      setAccessCodeMsg('');
    } else {
      toast.error('Invalid code');
      setAccessCodeMsg('');
    }
  }, [accessCodeInput, setProfile, toast]);

  const activeGoals = goals.filter(g => g.status === 'active');

  // AUTH GATE — show loading while session resolves, login screen if no user
  if (authLoading) {
    return (
      <div style={{
        fontFamily: FN, background: P.bg, color: P.tx,
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
        color: P.txD,
      }}>
        Loading...
      </div>
    );
  }
  if (!user) {
    return <AuthScreen />;
  }

  // ─── ONBOARDING SALES FUNNEL ──────────────────────────────────────────
  // Phase 1.5 port from v1: multi-step wizard → calculating animation →
  // game plan summary → main app. Conversion-critical UX.
  if ((isProfileIncomplete(profile) || forceOnboarding) && onboardingPhase === 'profile') {
    return (
      <OnboardingFlow
        initialProfile={profile}
        onComplete={(profileUpdates, protocolStateUpdates) => {
          // Seed fitnessPillars from primary fitness goal if not already set.
          // User can multi-select more from Profile tab afterward.
          const primary = protocolStateUpdates?.workout?.primary || profileUpdates?.primary;
          if (primary && (!profileUpdates.fitnessPillars || profileUpdates.fitnessPillars.length === 0)) {
            profileUpdates = { ...profileUpdates, fitnessPillars: [primary] };
          }
          setProfile(profileUpdates);
          for (const [protocolId, answers] of Object.entries(protocolStateUpdates)) {
            setProtocolState(protocolId, answers);
          }
          // Auto-create initial goals so the user lands in a populated routine
          // instead of "No tasks yet · Add a goal." Skip on soft reset (existing
          // goals would duplicate; user can add new ones manually if they want).
          if (!forceOnboarding) {
            const initialGoals = buildInitialGoals(profileUpdates, protocolStateUpdates);
            for (const goal of initialGoals) {
              addGoal(goal);
            }
          }
          setForceOnboarding(false);
          setOnboardingPhase('calculating');
        }}
      />
    );
  }
  if (onboardingPhase === 'calculating') {
    return (
      <CalculatingScreen
        profile={profile}
        onComplete={() => setOnboardingPhase('gameplan')}
      />
    );
  }
  if (onboardingPhase === 'gameplan') {
    return (
      <GamePlanScreen
        profile={profile}
        protocolStates={protocolStates}
        onStart={() => setOnboardingPhase('app')}
      />
    );
  }

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
      overflowX: 'hidden',
      paddingBottom: 80,
    }}>
      <AmbientBackdrop tab={activeTab} />
      <div
        key={activeTab}
        className="adn-reveal"
        style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0', position: 'relative', zIndex: 2, viewTransitionName: 'root' }}
      >

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
            />
          </div>
        ) : activeTab === 'insights' ? (
          <InsightsView profile={profile} logs={logs} />
        ) : activeTab === 'profile' ? (
          <div>
            <H t="Profile" sub={null} />

            {/* Header summary card — avatar, name, pillars, stat grid + View My Protocol CTA */}
            <ProfileHeader
              profile={profile}
              protocolStates={protocolStates}
              goals={goals}
              onViewProtocol={() => setShowProtocolPlan(true)}
              onEditPillars={() => setShowPillarsModal(true)}
            />

            {/* Account */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 8 }}>Account</div>
              <div style={{ fontSize: 13, color: P.txS, marginBottom: 10, wordBreak: 'break-all' }}>
                {user.email}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                  color: P.ok,
                }}>
                  <span style={{ fontSize: 12 }}>{'☁️'}</span>
                  Synced
                </div>
                <button
                  onClick={signOut}
                  style={{ ...s.btn, ...s.out, fontSize: 11, padding: '8px 14px', minHeight: 36 }}
                >
                  Log Out
                </button>
              </div>
            </div>

            {/* Subscription card — tier name + feature chips + upgrade buttons + redeem */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 6 }}>
                Subscription
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, fontStyle: 'italic', color: tierInfo.color }}>
                  {tierInfo.name}
                </span>
                {tierInfo.price > 0 && (
                  <span style={{ fontSize: 11, color: P.txD }}>${tierInfo.price}/mo</span>
                )}
              </div>
              {tierInfo.features?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {tierInfo.features.map((f, i) => (
                    <span key={i} style={{
                      fontSize: 10, padding: '4px 10px', borderRadius: 100,
                      background: 'rgba(232,213,183,0.04)', border: '1px solid ' + P.bd,
                      color: P.txM,
                    }}>
                      {'✓'} {f}
                    </span>
                  ))}
                </div>
              )}
              {profile.tier !== 'elite' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {profile.tier !== 'pro' && (
                    <button
                      onClick={() => redirectToCheckout('pro', user)}
                      style={{ ...s.btn, ...s.pri, width: '100%', justifyContent: 'space-between' }}
                    >
                      <span>Upgrade to Pro</span>
                      <span style={{ opacity: 0.7 }}>$14.99/mo</span>
                    </button>
                  )}
                  <button
                    onClick={() => redirectToCheckout('elite', user)}
                    style={{
                      ...s.btn, ...s.out,
                      width: '100%', justifyContent: 'space-between',
                      borderColor: 'rgba(184,196,208,0.3)',
                    }}
                  >
                    <span>{profile.tier === 'pro' ? 'Upgrade to Elite' : 'Elite · adaptive engine + AI'}</span>
                    <span style={{ color: P.txD }}>$29.99/mo</span>
                  </button>
                </div>
              )}
              {/* Inline access code */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={accessCodeInput}
                  onChange={e => setAccessCodeInput(e.target.value)}
                  style={{ ...s.inp, flex: 1, fontSize: 12 }}
                  placeholder="Have a code?"
                />
                <button onClick={handleAccessCode} style={{ ...s.btn, ...s.out, fontSize: 11, padding: '8px 14px' }}>
                  Redeem
                </button>
              </div>
              {accessCodeMsg && (
                <div style={{ fontSize: 10, color: accessCodeMsg.includes('Activated') ? P.ok : P.err, marginTop: 6 }}>
                  {accessCodeMsg}
                </div>
              )}
            </div>

            {/* Profile basics */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 10 }}>Profile</div>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Name</label>
              <input
                value={profile.name || ''}
                onChange={e => setProfile({ name: e.target.value })}
                style={{ ...s.inp, width: '100%', marginBottom: 10 }}
                placeholder="Your name"
              />
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Current Weight (lbs)</label>
              <input
                type="number"
                value={profile.weight || ''}
                onChange={e => setProfile({ weight: e.target.value })}
                style={{ ...s.inp, width: '100%' }}
                placeholder="210"
              />
            </div>

            {/* Your Goals */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD }}>Your Goals</label>
                <button onClick={() => { setGoalSetupDomain(null); setShowGoalSetup(true); }}
                  style={{ ...s.btn, ...s.out, fontSize: 10, padding: '4px 10px', minHeight: 26 }}>
                  + Add
                </button>
              </div>
              {activeGoals.length === 0 ? (
                <EmptyState
                  illustration={<IllusGoals />}
                  size={120}
                  headline="No goals yet"
                  body="Add your first to start the system. Your routine, recommendations, and check-ins all hang off goals."
                  cta="Add a goal"
                  onCta={() => { setGoalSetupDomain(null); setShowGoalSetup(true); }}
                />
              ) : (
                activeGoals.map(g => (
                  <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.txS }}>
                        {g.title}
                      </div>
                      <div style={{ fontSize: 10, color: P.txD, marginTop: 1 }}>
                        {g.domain} · {g.activeProtocols?.length || 0} protocols · {g.progress?.percent || 0}%
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.confirm('Remove "' + g.title + '"?')) {
                          removeGoal(g.id);
                          toast.info(`Removed: ${g.title}`);
                        }
                      }}
                      style={{
                        background: 'transparent', border: 'none',
                        color: P.txD, cursor: 'pointer', fontSize: 16, padding: '4px 8px',
                      }}
                      title="Remove goal"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Active Domains */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, display: 'block', marginBottom: 8 }}>Active Protocols</label>
              <div style={{ fontSize: 10, color: P.txD, marginBottom: 10, lineHeight: 1.5 }}>
                Tap to enable or disable domains
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {DOMAINS.map(d => {
                  const isActive = (profile.domains || []).includes(d.id);
                  return (
                    <button key={d.id} onClick={() => {
                      haptics.light();
                      isActive ? sound.toggleOff() : sound.toggleOn();
                      const current = profile.domains || [];
                      const updated = isActive ? current.filter(id => id !== d.id) : [...current, d.id];
                      setProfile({ domains: updated });
                    }}
                      style={{
                        padding: '12px 12px', borderRadius: 12, textAlign: 'left',
                        border: '1px solid ' + (isActive ? 'rgba(232,213,183,0.25)' : P.bd),
                        background: isActive ? 'rgba(232,213,183,0.06)' : 'transparent',
                        cursor: 'pointer', fontFamily: FN,
                        display: 'flex', alignItems: 'center', gap: 10,
                        boxShadow: isActive ? '0 0 0 0.5px rgba(232,213,183,0.1) inset, 0 4px 16px rgba(232,213,183,0.04)' : 'none',
                      }}>
                      <span style={{
                        display: 'inline-flex',
                        color: isActive ? P.gW : P.txD,
                        opacity: isActive ? 1 : 0.6,
                        transition: 'color 0.4s, opacity 0.4s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      }}>
                        <DomainIcon id={d.id} size={18} />
                      </span>
                      <span style={{ fontSize: 12, color: isActive ? P.gW : P.txD, fontWeight: isActive ? 700 : 500, letterSpacing: 0.3 }}>
                        {d.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Peptide Stack — picker entry point */}
            {(profile.domains || []).includes('body') && (() => {
              const activeStack = getStackForFinder(protocolStates?.peptides);
              return (
                <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
                  <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, display: 'block', marginBottom: 4 }}>
                    Peptide Stack
                  </label>
                  <div style={{ fontSize: 11, color: P.txM, marginBottom: 8, lineHeight: 1.5 }}>
                    {activeStack
                      ? <>Active: <span style={{ color: activeStack.color, fontWeight: 700 }}>{activeStack.icon} {activeStack.name}</span> · {activeStack.items.length} compound{activeStack.items.length === 1 ? '' : 's'}</>
                      : 'Take the Peptide Finder to get a personalized stack — 5 questions, ~1 min.'}
                  </div>
                  <button onClick={() => setShowPeptideFinder(true)}
                    style={{ ...s.btn, ...s.out, fontSize: 11, padding: '6px 12px', minHeight: 30 }}>
                    {activeStack ? 'Retake Peptide Finder' : 'Take Peptide Finder'}
                  </button>
                </div>
              );
            })()}

            {/* Feel & Feedback — sound + motion toggles */}
            <AppSettings />

            {/* Re-run Setup — soft reset */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 6 }}>Reset</div>
              <div style={{ fontSize: 11, color: P.txM, marginBottom: 10, lineHeight: 1.5 }}>
                Re-run onboarding from scratch. Your weight history, food logs, and PRs are preserved — only your profile answers get overwritten.
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                style={{
                  ...s.btn, width: '100%', justifyContent: 'center',
                  background: 'transparent',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: P.warn || '#F59E0B',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                Reset & Start Over
              </button>
            </div>
          </div>
        ) : (
          /* Domain tab view — dispatched to per-domain component */
          (() => {
            const View = DOMAIN_VIEWS[activeTab];
            const domainGoals = activeGoals.filter(g => g.domain === activeTab);
            const domainTasks = routine.scheduled.filter(t => {
              const proto = protocolMap[t.protocolId];
              return proto && proto.domain === activeTab;
            });
            const handleAddGoal = () => { setGoalSetupDomain(activeTab); setShowGoalSetup(true); };
            if (!View) {
              return (
                <div style={{ ...s.card, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: P.txD }}>No view for {activeTab} yet</div>
                </div>
              );
            }
            return (
              <View
                profile={profile}
                protocolStates={protocolStates}
                setProtocolState={setProtocolState}
                logs={logs}
                log={log}
                domainGoals={domainGoals}
                domainTasks={domainTasks}
                completedTasks={completedTasks}
                onCheckTask={handleCheckTask}
                onAddGoal={handleAddGoal}
              />
            );
          })()
        )}
      </div>

      {/* Tab Navigation */}
      {!showGoalSetup && (
        <TabNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          domains={profile.domains || ['body']}
        />
      )}

      {/* Check-in modal */}
      {showCheckin && (
        <CheckinModal
          onSave={handleSaveCheckin}
          onClose={() => setShowCheckin(false)}
        />
      )}

      {/* Peptide Finder retake modal */}
      {showPeptideFinder && (
        <PeptideFinderModal
          initial={protocolStates.peptides}
          onSave={(answers) => setProtocolState('peptides', answers)}
          onClose={() => setShowPeptideFinder(false)}
        />
      )}

      {/* Fitness pillars editor */}
      {showPillarsModal && (
        <FitnessPillarsModal
          initial={getFitnessPillars(profile, protocolStates)}
          onSave={(pillars) => {
            setProfile({ fitnessPillars: pillars });
            // Sync primary fitness goal — first pillar drives workout split + macros + stack.
            const newPrimary = pillars[0];
            if (newPrimary) {
              setProtocolState('workout', { primary: newPrimary });
              const optimizeFor = WORKOUT_GOAL_TO_OPTIMIZE[newPrimary];
              if (optimizeFor) {
                setProtocolState('peptides', { optimizeFor, selectedStackId: undefined });
              }
            }
          }}
          onClose={() => setShowPillarsModal(false)}
        />
      )}

      {/* Reset confirmation */}
      {showResetConfirm && (
        <ResetConfirmModal
          onConfirm={() => {
            setForceOnboarding(true);
            setOnboardingPhase('profile');
          }}
          onClose={() => setShowResetConfirm(false)}
        />
      )}

      {/* View My Protocol overlay — re-shows the Game Plan summary */}
      {showProtocolPlan && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: P.bg,
        }}>
          <button
            onClick={() => setShowProtocolPlan(false)}
            aria-label="Close"
            style={{
              position: 'fixed', top: 16, left: 16, zIndex: 1001,
              width: 40, height: 40, borderRadius: 20,
              background: 'rgba(14,16,22,0.7)', border: '1px solid ' + P.bd,
              color: P.txS, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
          <GamePlanScreen
            profile={profile}
            protocolStates={protocolStates}
            onStart={() => setShowProtocolPlan(false)}
          />
        </div>
      )}
    </div>
  );
}
