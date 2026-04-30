// src/views/TravelView.jsx
import React, { useMemo, useState } from 'react';
import { P, FN, FD, FM, grad } from '../design/theme';
import { s } from '../design/styles';
import { H, GradText } from '../design/components';
import { CZ_COUNTRIES, CZ_PATHWAYS } from '../protocols/travel/citizenship/data';

// Parse the leading low-end of a "12-48 mo" / "5-6 years" / "3-6 months" string into months
// for ranking shortest timelines.
function timelineMonthsLow(str) {
  if (!str || typeof str !== 'string') return 9999;
  const lower = str.toLowerCase();
  const match = lower.match(/(\d+)/);
  if (!match) return 9999;
  const n = parseInt(match[1], 10);
  if (lower.includes('year')) return n * 12;
  return n; // assume months
}

const PATHWAY_LABEL = {
  descent: 'By Descent',
  investment: 'By Investment',
  residency: 'By Residency',
  just_passport: 'Passport Power',
};

const BUDGET_COPY = {
  low:  'Under $50k - descent + residency focus',
  mid:  '$50k-250k - Caribbean CBI in range',
  high: '$250k+ - Malta, top-tier CBI',
  na:   'Investment not relevant',
};

const DEFAULT_TRAVEL_DOCS = [
  { id: 'us_passport',  name: 'US Passport',   status: 'Active'   },
  { id: 'real_id',      name: 'Real ID',       status: 'Active'   },
  { id: 'global_entry', name: 'Global Entry',  status: 'Active'   },
  { id: 'tsa',          name: 'TSA PreCheck',  status: 'Inactive' },
  { id: 'nexus',        name: 'NEXUS',         status: 'Inactive' },
];

export default function TravelView({
  profile,
  protocolStates = {},
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const cz = protocolStates.citizenship || {};
  const pathwayInterest = Array.isArray(cz.pathwayInterest) ? cz.pathwayInterest : [];
  const budgetTier = cz.budgetTier || null;

  const completed = new Set(Array.isArray(completedTasks) ? completedTasks : []);

  // Recommended pathways based on interest, ranked by shortest timeline
  const recommended = useMemo(() => {
    if (!pathwayInterest.length) return [];
    const interestSet = new Set(pathwayInterest);
    const wantsAnyPath = interestSet.has('descent') || interestSet.has('investment') || interestSet.has('residency');
    const justPassport = interestSet.has('just_passport');

    let candidates = CZ_COUNTRIES.filter((c) => interestSet.has(c.pathway));
    if (justPassport && !wantsAnyPath) {
      // Rank purely by visa-free count when user only wants better travel
      candidates = [...CZ_COUNTRIES].sort((a, b) => (b.visaFree || 0) - (a.visaFree || 0));
    } else {
      candidates = candidates.sort(
        (a, b) => timelineMonthsLow(a.timeline) - timelineMonthsLow(b.timeline)
      );
    }
    return candidates.slice(0, 3);
  }, [pathwayInterest]);

  // Local UI state
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [docState, setDocState] = useState(() =>
    DEFAULT_TRAVEL_DOCS.reduce((acc, d) => {
      acc[d.id] = d.status === 'Active';
      return acc;
    }, {})
  );

  const countriesToShow = showAllCountries ? CZ_COUNTRIES : CZ_COUNTRIES.slice(0, 5);

  return (
    <div>
      <H t={'\u{1F30D} Travel'} sub="Passports, trips, visas, global access" />

      {/* 2. Passport Power card */}
      <div
        style={{
          ...s.card,
          marginBottom: 16,
          background:
            'linear-gradient(135deg, rgba(232,213,183,0.10) 0%, rgba(168,188,208,0.05) 60%, rgba(14,16,22,0.55) 100%)',
          borderColor: 'rgba(232,213,183,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.lab}>Passport Power</div>
            <div
              style={{
                fontFamily: FD,
                fontSize: 64,
                fontWeight: 300,
                lineHeight: 1,
                marginTop: 4,
                background: grad,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: 0.5,
              }}
            >
              186
            </div>
            <div style={{ fontSize: 12, color: P.txM, marginTop: 6 }}>
              countries visa-free with US passport
            </div>
          </div>
          <span
            style={{
              ...s.tag,
              background: 'rgba(52,211,153,0.12)',
              color: P.ok,
              border: '1px solid rgba(52,211,153,0.25)',
              alignSelf: 'flex-start',
            }}
          >
            Powerful
          </span>
        </div>
      </div>

      {/* 3. Recommended Pathways */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 400, color: P.tx }}>
            Recommended Pathways
          </div>
          {pathwayInterest.length > 0 && (
            <span style={{ ...s.tag, background: 'rgba(232,213,183,0.06)', color: P.gW }}>
              Top {recommended.length}
            </span>
          )}
        </div>

        {recommended.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>
            <a
              href="#"
              style={{
                color: P.gW,
                textDecoration: 'none',
                borderBottom: '1px solid ' + P.gW + '55',
                paddingBottom: 1,
              }}
            >
              Take the Travel quiz to see your matches {'→'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommended.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(232,213,183,0.03)',
                  border: '1px solid ' + P.bd,
                }}
              >
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{c.flag || '\u{1F30D}'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: P.tx }}>{c.name}</span>
                    <span
                      style={{
                        ...s.tag,
                        background: 'rgba(168,188,208,0.10)',
                        color: P.gC,
                      }}
                    >
                      {PATHWAY_LABEL[c.pathway] || c.pathway}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 4, fontFamily: FM, letterSpacing: 0.3 }}>
                    {c.timeline} {'·'} {c.cost}
                  </div>
                </div>
                <a
                  href="#"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: P.gW,
                    textDecoration: 'none',
                    flexShrink: 0,
                    fontFamily: FN,
                    letterSpacing: 0.3,
                  }}
                >
                  Track this {'→'}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. All Countries */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 400, color: P.tx }}>
            All Countries
          </div>
          <span style={{ fontSize: 10, color: P.txD, letterSpacing: 0.5 }}>
            {CZ_COUNTRIES.length} pathways
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {countriesToShow.map((c, i) => {
            const isLast = i === countriesToShow.length - 1;
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 4px',
                  borderBottom: isLast ? 'none' : '1px solid ' + P.bd,
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{c.flag || '\u{1F30D}'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                    {PATHWAY_LABEL[c.pathway] || c.pathway} {'·'} {c.timeline}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: P.txM,
                    fontFamily: FM,
                    letterSpacing: 0.3,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {c.visaFree} VF
                </div>
              </div>
            );
          })}
        </div>

        {CZ_COUNTRIES.length > 5 && (
          <button
            onClick={() => setShowAllCountries((v) => !v)}
            style={{
              ...s.btn,
              ...s.out,
              marginTop: 12,
              width: '100%',
              justifyContent: 'center',
              padding: '10px 16px',
              minHeight: 0,
              fontSize: 11,
            }}
          >
            {showAllCountries ? 'Show less' : 'Show all ' + CZ_COUNTRIES.length}
          </button>
        )}
      </div>

      {/* 5. Budget tier indicator */}
      {budgetTier && BUDGET_COPY[budgetTier] && (
        <div
          style={{
            ...s.card,
            marginBottom: 16,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 22, flexShrink: 0 }}>{'\u{1F4B0}'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.lab}>Investment Budget</div>
            <div style={{ fontSize: 13, color: P.txS, fontWeight: 500, marginTop: 2 }}>
              {BUDGET_COPY[budgetTier]}
            </div>
          </div>
        </div>
      )}

      {/* 6. Travel Documents Tracker */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 400, color: P.tx, marginBottom: 12 }}>
          Travel Documents
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {DEFAULT_TRAVEL_DOCS.map((d, i) => {
            const isLast = i === DEFAULT_TRAVEL_DOCS.length - 1;
            const checked = !!docState[d.id];
            return (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 4px',
                  borderBottom: isLast ? 'none' : '1px solid ' + P.bd,
                }}
              >
                <button
                  onClick={() => setDocState((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
                  aria-pressed={checked}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    flexShrink: 0,
                    border: checked ? 'none' : '1.5px solid ' + P.gW + '44',
                    background: checked ? P.ok : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: '#0A0B0E',
                    fontFamily: FN,
                    fontWeight: 700,
                  }}
                >
                  {checked ? '✓' : ''}
                </button>
                <div style={{ flex: 1, fontSize: 13, color: P.txS, fontWeight: 500 }}>{d.name}</div>
                <span
                  style={{
                    ...s.tag,
                    background: checked ? 'rgba(52,211,153,0.12)' : 'rgba(156,163,175,0.10)',
                    color: checked ? P.ok : P.txD,
                  }}
                >
                  {checked ? 'Active' : 'Inactive'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Goals */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 400, color: P.tx }}>Goals</div>
          {onAddGoal && (
            <button
              onClick={() => onAddGoal('travel')}
              style={{
                ...s.btn,
                ...s.out,
                padding: '8px 14px',
                fontSize: 11,
                minHeight: 0,
              }}
            >
              + Add goal
            </button>
          )}
        </div>
        {domainGoals.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>
            No travel goals yet. Pick a pathway above and add a goal to start tracking.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {domainGoals.map((g) => {
              const pct = g.progress?.percent || 0;
              return (
                <div
                  key={g.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'rgba(232,213,183,0.03)',
                    border: '1px solid ' + P.bd,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                  <div
                    style={{
                      marginTop: 6,
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(232,213,183,0.08)',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, ' + P.gW + ', ' + P.ok + ')',
                        width: pct + '%',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 4 }}>
                    {pct}% {'·'} {g.progress?.trend || 'on_track'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. Today's tasks */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ fontFamily: FD, fontSize: 18, fontWeight: 400, color: P.tx, marginBottom: 12 }}>
          Today's Tasks
        </div>
        {domainTasks.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.6 }}>
            Nothing on the slate today. Travel work surfaces here when an application is in motion.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {domainTasks.map((t, i) => {
              const isDone = completed.has(t.id);
              const isLast = i === domainTasks.length - 1;
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 4px',
                    borderBottom: isLast ? 'none' : '1px solid ' + P.bd,
                    opacity: isDone ? 0.5 : 1,
                  }}
                >
                  <button
                    onClick={() => onCheckTask && onCheckTask(t.id)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      flexShrink: 0,
                      marginTop: 1,
                      border: isDone ? 'none' : '1.5px solid ' + P.gW + '44',
                      background: isDone ? P.ok : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                      fontFamily: FN,
                    }}
                  >
                    {isDone ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isDone ? P.txD : P.txS,
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {t.title}
                    </div>
                    {t.subtitle && (
                      <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
                        {t.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
