// src/app/App.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { buildDailyRoutine } from '../routine/pipeline';
import { getAllProtocols } from '../protocols/registry';
import GoalSetup from '../goals/GoalSetup';
import RoutineView from '../routine/RoutineView';
import TabNav from './TabNav';
import { validateAccessCode } from '../state/access-codes';

export default function App() {
  const { state, addGoal, setProfile, log, updateGoal } = useAppState();
  const { profile, goals, protocolState: protocolStates, logs, settings } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const [activeTab, setActiveTab] = useState('routine');
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [viewDay, setViewDay] = useState(new Date());
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessCodeMsg, setAccessCodeMsg] = useState('');

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
    const updated = current.includes(taskId)
      ? current.filter(id => id !== taskId)
      : [...current, taskId];
    log('routine', { ...logs.routine, [todayKey]: updated });
  }, [logs.routine, todayKey, log]);

  const handleCreateGoal = useCallback((goal) => {
    addGoal(goal);
    setShowGoalSetup(false);
    setActiveTab('routine');
  }, [addGoal]);

  const handleAccessCode = useCallback(() => {
    const result = validateAccessCode(accessCodeInput);
    if (result) {
      setProfile({ tier: result.tier });
      setAccessCodeMsg('Activated: ' + result.name + ' (' + result.tier + ' tier)');
      setAccessCodeInput('');
    } else {
      setAccessCodeMsg('Invalid code');
    }
  }, [accessCodeInput, setProfile]);

  const activeGoals = goals.filter(g => g.status === 'active');

  return (
    <div className="adn-noise" style={{
      fontFamily: FN, background: P.bg, color: P.tx,
      position: 'fixed', inset: 0, overflowY: 'auto',
      paddingBottom: 80,
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 0' }}>

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
            onCancel={() => setShowGoalSetup(false)}
            profile={profile}
          />
        ) : activeTab === 'routine' ? (
          <div>
            {/* Add Goal Button */}
            <button onClick={() => setShowGoalSetup(true)}
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
              completedTasks={completedTasks}
              day={viewDay}
              goals={activeGoals}
              onDayChange={setViewDay}
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

            {/* Primary Goal */}
            <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: P.txD, display: 'block', marginBottom: 4 }}>Primary Goal</label>
              <select value={profile.primary || ''} onChange={e => setProfile({ primary: e.target.value })}
                style={{ ...s.inp, width: '100%' }}>
                <option value="">Select...</option>
                {['Fat Loss', 'Muscle Gain', 'Recomposition', 'Aesthetics', 'Anti-Aging', 'Cognitive', 'Wellness'].map(g =>
                  <option key={g} value={g}>{g}</option>
                )}
              </select>
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
                Protocols: {getAllProtocols().length} registered{'
'}
                Goals: {goals.length} ({activeGoals.length} active){'
'}
                Engine: active
              </div>
            </div>
          </div>
        ) : (
          /* Domain tab placeholder */
          <div>
            <H t={DOMAINS.find(d => d.id === activeTab)?.icon + ' ' + (DOMAINS.find(d => d.id === activeTab)?.name || activeTab)}
              sub={DOMAINS.find(d => d.id === activeTab)?.desc || ''} />
            <div style={{ ...s.card, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: P.txM }}>
                {DOMAINS.find(d => d.id === activeTab)?.name} domain coming soon
              </div>
              <div style={{ fontSize: 11, color: P.txD, marginTop: 4 }}>
                Your routine already includes tasks from this domain's protocols.
              </div>
            </div>
          </div>
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
    </div>
  );
}
