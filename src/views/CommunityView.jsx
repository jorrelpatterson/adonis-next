// src/views/CommunityView.jsx
// Community domain tab — accountability partners, masterminds, streak sharing.
// All matching/feed data here is placeholder. Real Supabase-backed matching
// ships in v2.x. Keeps the v2 dark/cream aesthetic consistent with MoneyView.
//
// Ported from v2-revival-archive:src/views/CommunityView.jsx (task-11-brief).
// Adaptations vs. the archive:
//   1. `streakDays` — archive hardcoded `12`; now real, via
//      `computeRoutineStreak(logs?.routine || {}, todayISO)` (src/routine/streak.js),
//      same engine RoutineView/HomeDashboard use. Requires a new `logs` prop
//      (the archive never took one).
//   2. Sample matches/feed — the archive already flagged these as placeholder
//      in a header comment and an inline "Real matching ships in v2.x" note
//      inside the Find Partners card only. Per the brief, that intent is now
//      made visible with an explicit "Preview — matching ships later" label
//      chip on BOTH placeholder sections (Find Partners and Group Activity),
//      not just the one that already had a note.
//   3. Dead links/buttons — the archive had four inert `<a href="#">`s
//      ("Edit" on Your Profile, "Connect" per sample match, "Find someone" on
//      Active Partners, and implicitly the sample feed has none) with no
//      handlers. Per element:
//        - "Edit" (Your Profile) — REMOVED. No profile-edit surface exists
//          anywhere in this view; a dangling link to nothing is worse than no
//          link. Lighter touch than fake-disabling a header action.
//        - "Connect →" (per sample match row) — kept but made inert-visible:
//          swapped `<a href="#">` for a `<span>` with the same visual chrome
//          plus reduced opacity, no `href`, no click handler. It reads as
//          part of the preview card (which is explicitly labeled as such),
//          not as a real, clickable dead end.
//        - "Find someone →" (Active Partners, shown regardless of solo/
//          matching mode) — REMOVED. This card is not under the Preview
//          label (it's real, empty state UI, not sample data), so a fake
//          "Find someone" CTA would misrepresent working functionality more
//          than a missing button would.
import React from 'react';
import { P, FN, FM, grad } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { computeRoutineStreak } from '../routine/streak';

const sectionGap = { marginBottom: 12 };
const labStyle = { ...s.lab };

// Map lookingFor enum → human-readable label.
const LOOKING_LABEL = {
  accountability: 'Accountability partner',
  mastermind: 'Mastermind group',
  just_streaks: 'Solo streaks',
};

// Sample matches — placeholder, shipped as static fixtures until v2.x matcher.
const SAMPLE_MATCHES = [
  { id: 'alex',   name: 'Alex M.',   match: 78, shared: ['Body', 'Mind'] },
  { id: 'jordan', name: 'Jordan K.', match: 71, shared: ['Body', 'Money'] },
  { id: 'sam',    name: 'Sam R.',    match: 65, shared: ['Body', 'Travel'] },
];

// Mastermind feed posts — placeholder.
const SAMPLE_FEED = [
  { id: 'p1', who: 'Jordan', text: 'hit my squat PR today \u{1F4AA}', when: '2h ago' },
  { id: 'p2', who: 'Alex',   text: 'down 3 lbs this week, sticking to plan', when: '5h ago' },
  { id: 'p3', who: 'Sam',    text: 'just got my first credit card approved', when: '1d ago' },
];

// Domain tag → small icon character. Not exhaustive — matches what the
// onboarding flow exposes today.
const DOMAIN_ICON = {
  Body: '\u{1F4AA}',
  Mind: '\u{1F9D8}',
  Money: '\u{1F4B0}',
  Travel: '✈️',
  Image: '\u{1F454}',
  Purpose: '\u{1F3AF}',
  Environment: '\u{1F3E0}',
  Community: '\u{1F91D}',
};

function Avatar({ letter }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 16,
      background: P.gW, color: '#0A0B0E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FN, fontSize: 13, fontWeight: 700,
      flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

function MatchPercent({ value }) {
  // High matches (>=75) get the gradient treatment; otherwise plain gold mono.
  if (value >= 75) {
    return (
      <span style={{
        fontFamily: FM, fontSize: 14, fontWeight: 700,
        background: grad,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: 0.5,
      }}>
        {value}%
      </span>
    );
  }
  return (
    <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: P.gW, letterSpacing: 0.5 }}>
      {value}%
    </span>
  );
}

// Visible "this section is sample data" chip — the brief's "Preview —
// matching ships later" label, made explicit rather than buried in a note.
function PreviewChip() {
  return (
    <span style={{
      ...s.tag,
      background: 'rgba(96,165,250,0.10)',
      color: '#93C5FD',
    }}>
      Preview — matching ships later
    </span>
  );
}

export default function CommunityView({
  profile = {},
  protocolStates = {},
  logs = {},
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const community = protocolStates.community || {};
  const lookingFor = community.lookingFor || 'just_streaks';
  const shareStreaks = !!community.shareStreaks;

  const displayName = profile?.name || 'Anonymous';
  const initial = (displayName[0] || 'A').toUpperCase();
  const lookingLabel = LOOKING_LABEL[lookingFor] || 'Solo streaks';

  const showPartners = lookingFor === 'accountability' || lookingFor === 'mastermind';
  const showFeed = lookingFor === 'mastermind';
  const showSoloNotice = lookingFor === 'just_streaks';

  const todayISO = new Date().toISOString().slice(0, 10);
  const streakDays = computeRoutineStreak(logs?.routine || {}, todayISO);

  return (
    <div>
      <H t={'\u{1F91D} Community'} sub="Accountability partners, masterminds" />

      {/* Your Profile */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={labStyle}>Your Profile</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar letter={initial} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: P.txS }}>{displayName}</div>
            <div style={{ fontSize: 11, color: P.txM, marginTop: 3 }}>
              Looking for: <span style={{ color: P.txS, fontWeight: 600 }}>{lookingLabel}</span>
            </div>
            <div style={{ fontSize: 11, color: P.txM, marginTop: 2 }}>
              Sharing streaks:{' '}
              <span style={{
                fontFamily: FM, fontWeight: 700,
                color: shareStreaks ? P.ok : P.txD,
                letterSpacing: 0.5,
              }}>
                {shareStreaks ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Card */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={labStyle}>Current Streak</div>
          <span style={{
            ...s.tag,
            background: shareStreaks ? 'rgba(52,211,153,0.12)' : 'rgba(156,163,175,0.12)',
            color: shareStreaks ? P.ok : P.txM,
          }}>
            {shareStreaks ? 'Public' : 'Private'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontFamily: FM, fontSize: 38, fontWeight: 700, color: P.gW, lineHeight: 1 }}>
            {streakDays}
          </div>
          <div style={{ fontSize: 12, color: P.txM, letterSpacing: 0.4 }}>days</div>
        </div>
        <div style={{ fontSize: 11, color: P.txD, marginTop: 6, letterSpacing: 0.4 }}>
          across all selected domains
        </div>
      </div>

      {/* Find Partners — sample data, explicitly labeled */}
      {showPartners && (
        <div style={{ ...s.card, padding: 16, ...sectionGap }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ ...labStyle, marginBottom: 0 }}>
              {lookingFor === 'mastermind' ? 'Find Group Members' : 'Find Partners'}
            </div>
            <PreviewChip />
          </div>
          {SAMPLE_MATCHES.map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0',
              borderBottom: i < SAMPLE_MATCHES.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
              <Avatar letter={m.name[0]} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{m.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  {m.shared.map((d) => (
                    <span key={d} title={d} style={{
                      fontSize: 11, color: P.txM,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      {DOMAIN_ICON[d] || '•'}
                    </span>
                  ))}
                  <span style={{ fontSize: 10, color: P.txD, marginLeft: 4, letterSpacing: 0.4 }}>
                    Shared: {m.shared.join(', ')}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <MatchPercent value={m.match} />
                {/* Inert-visible: same chrome as a real CTA, no href/handler
                    — see the file-header note on dead-link handling. */}
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  color: P.gW, opacity: 0.5,
                  border: '1px solid ' + P.gW + '44',
                  padding: '5px 10px', borderRadius: 6,
                }}>
                  Connect {'→'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Partners — real (empty) state, not sample data */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={labStyle}>Active Partners</div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 0',
        }}>
          <div style={{ fontSize: 13, color: P.txM }}>No active partners yet</div>
        </div>
      </div>

      {/* Group Activity (mastermind only) — sample data, explicitly labeled */}
      {showFeed && (
        <div style={{ ...s.card, padding: 16, ...sectionGap }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ ...labStyle, marginBottom: 0 }}>Group Activity</div>
            <PreviewChip />
          </div>
          {SAMPLE_FEED.map((post, i) => (
            <div key={post.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 0',
              borderBottom: i < SAMPLE_FEED.length - 1 ? '1px solid ' + P.bd : 'none',
            }}>
              <Avatar letter={post.who[0]} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 13, color: P.txS }}>
                    <span style={{ fontWeight: 700, color: P.gW }}>{post.who}</span>
                    {': '}
                    <span style={{ color: P.txS }}>{post.text}</span>
                  </div>
                  <div style={{
                    fontFamily: FM, fontSize: 9, color: P.txD,
                    letterSpacing: 0.5, flexShrink: 0,
                  }}>
                    {post.when}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Solo Mode notice */}
      {showSoloNotice && (
        <div style={{
          ...s.card, padding: 14, ...sectionGap,
          background: 'rgba(14,16,22,0.4)',
        }}>
          <div style={labStyle}>Solo Mode</div>
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.5 }}>
            You're in solo mode. Streaks track privately. Switch from your profile any time.
          </div>
        </div>
      )}

      {/* Goals */}
      {domainGoals.length > 0 ? (
        <div style={{ ...s.card, padding: 14, ...sectionGap }}>
          <div style={labStyle}>Goals</div>
          {domainGoals.map((g) => (
            <div key={g.id} style={{ padding: '8px 0', borderBottom: '1px solid ' + P.bd }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.gW }}>
                  {g.progress?.percent || 0}%
                </div>
              </div>
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: 'rgba(232,213,183,0.08)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                  width: (g.progress?.percent || 0) + '%',
                }} />
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 3 }}>
                {g.activeProtocols?.length || 0} protocols active
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...s.card, padding: 20, textAlign: 'center', ...sectionGap }}>
          <div style={{ fontSize: 13, color: P.txM }}>No community goals yet</div>
          <button onClick={onAddGoal}
            style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
            + Add Goal
          </button>
        </div>
      )}

      {/* Today's Tasks */}
      {domainTasks.length > 0 && (
        <div style={{ ...s.card, padding: 14, ...sectionGap }}>
          <div style={labStyle}>Today's Tasks</div>
          {domainTasks.map((task) => {
            const isDone = completedTasks.includes(task.id);
            return (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid ' + P.bd,
                opacity: isDone ? 0.5 : 1,
              }}>
                <button onClick={() => onCheckTask && onCheckTask(task.id)}
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                    background: isDone ? P.ok : 'transparent',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontFamily: FN, flexShrink: 0,
                  }}>
                  {isDone ? '✓' : ''}
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    color: isDone ? P.txD : P.txS,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {task.title}
                  </div>
                  {(task.subtitle || task.sub) && (
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                      {task.subtitle || task.sub}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
