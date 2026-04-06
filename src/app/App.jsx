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
  const { state, addGoal, removeGoal, setProfile, log, updateGoal } = useAppState();
  const { profile, goals, protocolState: protocolStates, logs, settings } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const [activeTab, setActiveTab] = useState('routine');
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [goalSetupDomain, setGoalSetupDomain] = useState(null);
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
                    <button onClick={() => { setGoalSetupDomain(null); setShowGoalSetup(true); }}
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
    </div>
  );
}
