import React, { useState, useEffect, useRef } from 'react';
import { P, FN, FD, FM } from '../design/theme';
import { s } from '../design/styles';
import { H, GradText } from '../design/components';

// 5 breathwork patterns (parallel to mind protocol catalog).
const BREATHWORK_PATTERNS = [
  { id: 'box', name: 'Box', emoji: '\u{1F532}', tag: 'calm',
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    desc: '4·4·4·4 — calm', cycles: 4 },
  { id: '478', name: '4-7-8', emoji: '\u{1F319}', tag: 'sleep',
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    desc: '4 inhale · 7 hold · 8 exhale — sleep', cycles: 4 },
  { id: 'wimhof', name: 'Wim Hof', emoji: '⚡', tag: 'energy',
    inhale: 2, hold1: 0, exhale: 2, hold2: 0,
    desc: '30 deep breaths · hold · recover — energy', cycles: 30,
    isWimHof: true },
  { id: 'calm', name: 'Calm', emoji: '\u{1F30A}', tag: 'anxiety',
    inhale: 5, hold1: 0, exhale: 5, hold2: 0,
    desc: '5·0·5 — anxiety relief', cycles: 6 },
  { id: 'energizing', name: 'Energizing', emoji: '✨', tag: 'alertness',
    inhale: 2, hold1: 0, exhale: 1, hold2: 0,
    desc: '2·0·1 — alertness', cycles: 10 },
];

// 8 nootropics (hardcoded from mind protocol catalog).
const NOOTROPICS = [
  { id: 'caffeine-theanine', name: 'Caffeine + L-Theanine', dose: '100mg / 200mg', timing: 'morning',
    benefit: 'Focus boost' },
  { id: 'lions-mane', name: "Lion's Mane", dose: '500-1000mg', timing: 'morning',
    benefit: 'BDNF, neurogenesis' },
  { id: 'creatine', name: 'Creatine', dose: '5g', timing: 'any',
    benefit: 'Brain energy' },
  { id: 'mag-threonate', name: 'Magnesium-Threonate', dose: '2g', timing: 'evening',
    benefit: 'Sleep + memory' },
  { id: 'omega3', name: 'Omega-3 (DHA)', dose: '1-2g', timing: 'with food',
    benefit: 'Cognitive longevity' },
  { id: 'rhodiola', name: 'Rhodiola Rosea', dose: '200-400mg', timing: 'morning',
    benefit: 'Stress + endurance' },
  { id: 'alpha-gpc', name: 'Alpha-GPC', dose: '300-600mg', timing: 'morning',
    benefit: 'Acetylcholine precursor' },
  { id: 'ashwagandha', name: 'Ashwagandha (KSM-66)', dose: '600mg', timing: 'evening',
    benefit: 'Cortisol + sleep' },
];

// Focus area display map.
const FOCUS_LABELS = {
  calm: { icon: '\u{1F30A}', label: 'Calm' },
  clarity: { icon: '\u{1F48E}', label: 'Clarity' },
  performance: { icon: '⚡', label: 'Performance' },
  resilience: { icon: '\u{1F6E1}️', label: 'Resilience' },
};

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s2 = sec % 60;
  return (m < 10 ? '0' + m : '' + m) + ':' + (s2 < 10 ? '0' + s2 : '' + s2);
}

function MeditationCard() {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600); // 10 min
  const [showToast, setShowToast] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && !paused) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setPaused(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
            return 600;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, paused]);

  const start = () => {
    setSecondsLeft(600);
    setRunning(true);
    setPaused(false);
  };
  const togglePause = () => setPaused(p => !p);
  const endEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setPaused(false);
    setSecondsLeft(600);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div style={{ ...s.card, marginBottom: 12, position: 'relative' }}>
      <div style={{ ...s.lab }}>Meditation Timer</div>
      <div style={{ fontSize: 12, color: P.txD, marginBottom: 14 }}>
        Today's session: 10 minutes
      </div>

      {!running ? (
        <>
          <div style={{
            fontFamily: FM, fontSize: 42, fontWeight: 300,
            color: P.gW, letterSpacing: 2,
            textAlign: 'center', margin: '8px 0 16px',
          }}>
            10:00
          </div>
          <button onClick={start}
            style={{ ...s.btn, ...s.pri, width: '100%', justifyContent: 'center' }}>
            <GradText style={{ color: '#0A0B0E', WebkitTextFillColor: '#0A0B0E' }}>Start</GradText>
          </button>
        </>
      ) : (
        <>
          <div style={{
            fontFamily: FM, fontSize: 56, fontWeight: 300,
            color: P.gW, letterSpacing: 3,
            textAlign: 'center', margin: '8px 0 16px',
            textShadow: '0 0 24px rgba(232,213,183,0.18)',
          }}>
            {fmtTime(secondsLeft)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={togglePause}
              style={{ ...s.btn, ...s.pri, flex: 1, justifyContent: 'center' }}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={endEarly}
              style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
              End early
            </button>
          </div>
        </>
      )}

      {showToast && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: P.ok + '22', color: P.ok,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', padding: '6px 10px', borderRadius: 8,
          border: '1px solid ' + P.ok + '44',
        }}>
          Session logged
        </div>
      )}
    </div>
  );
}

function BreathworkModal({ pattern, onClose }) {
  const [cycle, setCycle] = useState(1);

  const incCycle = () => {
    setCycle(c => Math.min(c + 1, pattern.cycles));
  };
  const reset = () => setCycle(1);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,16,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: FN,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card, width: '100%', maxWidth: 480,
        padding: '24px 20px',
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>{pattern.emoji}</div>
          <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 300, color: P.txS }}>
            {pattern.name}
          </div>
          <div style={{ fontSize: 10, color: P.gW, letterSpacing: 1.5,
            textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
            {pattern.tag}
          </div>
        </div>

        <div style={{
          fontSize: 13, color: P.txM, textAlign: 'center',
          marginBottom: 20, lineHeight: 1.6,
        }}>
          {pattern.isWimHof ? (
            <>30 deep breaths · then full exhale · hold as long as you can · recover breath 15s</>
          ) : (
            <>Inhale {pattern.inhale}s {pattern.hold1 > 0 ? '· hold ' + pattern.hold1 + 's ' : ''}
            · Exhale {pattern.exhale}s
            {pattern.hold2 > 0 ? ' · hold ' + pattern.hold2 + 's' : ''}</>
          )}
        </div>

        <div style={{
          textAlign: 'center', padding: '20px 0', marginBottom: 16,
          background: 'rgba(232,213,183,0.03)', borderRadius: 12,
          border: '1px solid ' + P.bd,
        }}>
          <div style={{ fontSize: 9, color: P.txD, letterSpacing: 2,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Cycle
          </div>
          <div style={{
            fontFamily: FM, fontSize: 44, fontWeight: 300,
            color: P.gW, letterSpacing: 2,
          }}>
            {cycle} <span style={{ color: P.txD, fontSize: 22 }}>/ {pattern.cycles}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={reset}
            style={{ ...s.btn, ...s.out, flex: 1, justifyContent: 'center' }}>
            Reset
          </button>
          <button onClick={incCycle}
            disabled={cycle >= pattern.cycles}
            style={{
              ...s.btn, ...s.pri, flex: 2, justifyContent: 'center',
              opacity: cycle >= pattern.cycles ? 0.5 : 1,
              cursor: cycle >= pattern.cycles ? 'not-allowed' : 'pointer',
            }}>
            {cycle >= pattern.cycles ? 'Complete' : 'Next cycle'}
          </button>
        </div>
        <button onClick={onClose}
          style={{ ...s.btn, ...s.out, width: '100%', justifyContent: 'center', marginTop: 4 }}>
          Close
        </button>
      </div>
    </div>
  );
}

function BreathworkCard() {
  const [activePattern, setActivePattern] = useState(null);

  return (
    <>
      <div style={{ ...s.card, marginBottom: 12 }}>
        <div style={{ ...s.lab }}>Breathwork</div>
        <div style={{ fontSize: 12, color: P.txD, marginBottom: 12 }}>
          5 patterns. Pick by intent.
        </div>
        {BREATHWORK_PATTERNS.map((pat, i) => (
          <div key={pat.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
          }}>
            <span style={{ fontSize: 20 }}>{pat.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                {pat.name}
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                {pat.desc}
              </div>
            </div>
            <button onClick={() => setActivePattern(pat)}
              style={{
                ...s.btn, ...s.out,
                fontSize: 11, padding: '8px 14px', minHeight: 32,
              }}>
              Try it →
            </button>
          </div>
        ))}
      </div>
      {activePattern && (
        <BreathworkModal pattern={activePattern} onClose={() => setActivePattern(null)} />
      )}
    </>
  );
}

function GratitudeCard({ gratitudeEntries, onSave }) {
  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');
  const [g3, setG3] = useState('');
  const [showToast, setShowToast] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const savedToday = (gratitudeEntries && gratitudeEntries[today]) || null;

  const handleSave = () => {
    const entries = [g1.trim(), g2.trim(), g3.trim()];
    if (onSave) onSave(entries);
    setG1(''); setG2(''); setG3('');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const anyFilled = g1.trim() || g2.trim() || g3.trim();

  return (
    <div style={{ ...s.card, marginBottom: 12, position: 'relative' }}>
      <div style={{ ...s.lab }}>Daily Gratitude</div>
      <div style={{ fontSize: 12, color: P.txD, marginBottom: 12 }}>
        3 things. No editing, just write.
      </div>

      {[
        { n: '1.', v: g1, set: setG1 },
        { n: '2.', v: g2, set: setG2 },
        { n: '3.', v: g3, set: setG3 },
      ].map((row, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
        }}>
          <span style={{
            fontFamily: FD, fontSize: 14, color: P.gW,
            fontStyle: 'italic', minWidth: 16,
          }}>
            {row.n}
          </span>
          <input
            value={row.v}
            onChange={e => row.set(e.target.value)}
            placeholder={'I’m grateful for…'}
            style={{ ...s.inp, flex: 1, fontSize: 12, padding: '10px 14px', minHeight: 38 }}
          />
        </div>
      ))}

      <button onClick={handleSave} disabled={!anyFilled}
        style={{
          ...s.btn, ...s.pri, width: '100%',
          justifyContent: 'center', marginTop: 6,
          opacity: anyFilled ? 1 : 0.4,
          cursor: anyFilled ? 'pointer' : 'not-allowed',
        }}>
        Save
      </button>

      {savedToday && Array.isArray(savedToday) && savedToday.some(e => e && e.trim()) && (
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid ' + P.bd,
        }}>
          <div style={{
            fontSize: 9, color: P.txD, letterSpacing: 1.5,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          }}>
            Saved earlier today
          </div>
          {savedToday.map((entry, i) => (
            entry && entry.trim() ? (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '4px 0', fontSize: 12, color: P.txM, lineHeight: 1.5,
              }}>
                <span style={{
                  fontFamily: FD, color: P.gW, fontStyle: 'italic',
                  minWidth: 14,
                }}>
                  {i + 1}.
                </span>
                <span>{entry}</span>
              </div>
            ) : null
          ))}
        </div>
      )}

      {showToast && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: P.ok + '22', color: P.ok,
          fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase', padding: '6px 10px', borderRadius: 8,
          border: '1px solid ' + P.ok + '44',
        }}>
          Logged
        </div>
      )}
    </div>
  );
}

function FocusAreasCard({ focusAreas }) {
  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <div style={{ ...s.lab }}>Focus Areas</div>
      {focusAreas.length === 0 ? (
        <div style={{ fontSize: 12, color: P.txM, padding: '8px 0' }}>
          Take the Mind quiz to set focus areas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {focusAreas.map(area => {
            const meta = FOCUS_LABELS[area];
            if (!meta) return null;
            return (
              <span key={area} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 100,
                background: 'rgba(232,213,183,0.06)',
                border: '1px solid rgba(232,213,183,0.12)',
                color: P.gW, fontSize: 11, fontWeight: 600,
                letterSpacing: 0.3,
              }}>
                <span style={{ fontSize: 13 }}>{meta.icon}</span>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NootropicsCard({ nootropicsActive, onToggle }) {
  const active = nootropicsActive || {};

  const toggle = id => {
    if (onToggle) onToggle(id);
  };

  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...s.lab, marginBottom: 0 }}>Nootropic Stack</div>
        <span style={{
          fontSize: 8, padding: '3px 8px', borderRadius: 6,
          background: 'rgba(232,213,183,0.08)', color: P.gW,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5,
        }}>
          Pro
        </span>
      </div>
      <div style={{ fontSize: 12, color: P.txD, marginBottom: 12 }}>
        Research-backed compounds. Toggle to track.
      </div>

      {NOOTROPICS.map((n, i) => {
        const isOn = !!active[n.id];
        return (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
            opacity: isOn ? 1 : 0.7,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                {n.name}
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                <span style={{ fontFamily: FM, color: P.gM }}>{n.dose}</span>
                {' · '}{n.timing}{' · '}{n.benefit}
              </div>
            </div>
            <button onClick={() => toggle(n.id)}
              style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase',
                padding: '6px 12px', borderRadius: 100,
                background: isOn ? P.ok + '22' : 'transparent',
                color: isOn ? P.ok : P.txD,
                border: '1px solid ' + (isOn ? P.ok + '55' : P.bd),
                cursor: 'pointer', fontFamily: FN,
                minWidth: 70,
              }}>
              {isOn ? 'Active' : 'Inactive'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function GoalsCard({ domainGoals, onAddGoal }) {
  if (domainGoals.length === 0) {
    return (
      <div style={{ ...s.card, padding: 20, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: P.txM }}>No mind goals yet</div>
        {onAddGoal && (
          <button onClick={() => onAddGoal('mind')}
            style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12, justifyContent: 'center' }}>
            + Add Mind Goal
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <div style={{ ...s.lab }}>Goals</div>
      {domainGoals.map((g, i) => (
        <div key={g.id} style={{
          padding: '10px 0',
          borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
            <div style={{ fontSize: 11, color: P.gW }}>{g.progress?.percent || 0}%</div>
          </div>
          <div style={{
            marginTop: 5, height: 3, borderRadius: 2,
            background: 'rgba(232,213,183,0.08)',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
              width: (g.progress?.percent || 0) + '%',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 10, color: P.txD, marginTop: 4 }}>
            {g.activeProtocols?.length || 0} protocols active
          </div>
        </div>
      ))}
    </div>
  );
}

function TasksCard({ domainTasks, completedTasks, onCheckTask }) {
  if (!domainTasks || domainTasks.length === 0) return null;
  const completed = new Set(Array.isArray(completedTasks) ? completedTasks : []);

  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <div style={{ ...s.lab }}>Today's Tasks</div>
      {domainTasks.map((task, i) => {
        const isDone = completed.has(task.id);
        return (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 0',
            borderTop: i === 0 ? 'none' : '1px solid ' + P.bd,
            opacity: isDone ? 0.5 : 1,
          }}>
            <button onClick={() => onCheckTask && onCheckTask(task.id)}
              style={{
                width: 20, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
                border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                background: isDone ? P.ok : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#fff', fontFamily: FN,
              }}>
              {isDone ? '✓' : ''}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: isDone ? P.txD : P.txS,
                textDecoration: isDone ? 'line-through' : 'none',
              }}>
                {task.title}
              </div>
              {task.subtitle && (
                <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
                  {task.subtitle}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MindView({
  profile,
  protocolStates,
  setProtocolState,
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const mindState = (protocolStates && protocolStates.mind) || {};
  const focusAreas = mindState.focusAreas || [];
  const nootropicsOpen = mindState.nootropicsOpen === true;
  const nootropicsActive = mindState.nootropicsActive || {};
  const gratitudeEntries = mindState.gratitudeEntries || {};

  const today = new Date().toISOString().slice(0, 10);

  const handleToggleNootropic = (id) => {
    if (!setProtocolState) return;
    setProtocolState('mind', {
      nootropicsActive: { ...nootropicsActive, [id]: !nootropicsActive[id] },
    });
  };

  const handleSaveGratitude = (entries) => {
    if (!setProtocolState) return;
    setProtocolState('mind', {
      gratitudeEntries: { ...gratitudeEntries, [today]: entries },
    });
  };

  return (
    <div>
      <H t={'\u{1F9E0} Mind'} sub="Focus, clarity, mental health" />

      <MeditationCard />
      <BreathworkCard />
      <GratitudeCard
        gratitudeEntries={gratitudeEntries}
        onSave={handleSaveGratitude}
      />
      <FocusAreasCard focusAreas={focusAreas} />
      {nootropicsOpen && (
        <NootropicsCard
          nootropicsActive={nootropicsActive}
          onToggle={handleToggleNootropic}
        />
      )}
      <GoalsCard domainGoals={domainGoals} onAddGoal={onAddGoal} />
      <TasksCard
        domainTasks={domainTasks}
        completedTasks={completedTasks}
        onCheckTask={onCheckTask}
      />
    </div>
  );
}
