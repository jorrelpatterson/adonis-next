// src/views/MoneyView.jsx
// Money domain tab — credit score plan, wallet, optimizer, recommended cards,
// income pipeline, goals, today's tasks. Aligns with the v2 dark/cream aesthetic.
//
// Ported from v2-revival-archive:src/views/MoneyView.jsx (Phase 4 Task 8).
// Sanctioned adaptations (see .superpowers/sdd/task-8-report.md for the full
// writeup):
//   1. The archive embedded its own 13-card CC_DB + SCORE_MAP inline. Both are
//      deleted here; CC_DB now comes from the single-sourced
//      src/protocols/money/credit/cards-db.js and SCORE_MAP from
//      src/protocols/money/credit/data.js (landed in Task 2/3). Main's
//      cards-db.js is a *different* 13-card catalog than the archive's
//      hand-typed one (different ids/card mix) and uses a different record
//      shape (`cats` not `mult`, `cats.grocery` not `mult.groceries`,
//      `bonusVal` not `bonusValue`, no `type` field — has `issuer`/`tier`
//      instead). The view below is adapted to that real shape; `card.issuer`
//      substitutes for the archive's `card.type` as the wallet's secondary
//      line.
//   2. The dead `<a href="#">Apply →</a>` per recommended card is removed —
//      cards render name + AF + bonus as plain text, no anchor.
import React from 'react';
import { P, FN, FM } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import EmptyState from '../design/EmptyState';
import { IllusGoals } from '../design/illustrations';
import { CC_DB } from '../protocols/money/credit/cards-db';
import { SCORE_MAP } from '../protocols/money/credit/data';

const sectionGap = { marginBottom: 12 };
const labStyle = { ...s.lab };

export default function MoneyView({
  profile,
  protocolStates = {},
  setProtocolState,
  logs,
  log,
  domainGoals = [],
  domainTasks = [],
  completedTasks = [],
  onCheckTask,
  onAddGoal,
}) {
  const credit = protocolStates['credit-repair'] || {};
  const income = protocolStates.income || {};
  const wallet = credit.ccWallet || [];

  const hasScore = !!credit.creditScoreRange;
  const score = SCORE_MAP[credit.creditScoreRange] || null;
  const scoreTrend = score && score >= 700 ? 'up' : score && score >= 600 ? 'flat' : 'work';

  // Resolve wallet entries (string id or object) to full CC_DB card records.
  const walletCards = wallet.map((entry) => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    return CC_DB.find((c) => c.id === id);
  }).filter(Boolean);

  // Best card for groceries — highest grocery multiplier from owned wallet.
  // main's CC_DB keys category multipliers under `cats.grocery` (archive used
  // `mult.groceries`).
  const bestGrocery = walletCards.length
    ? [...walletCards].sort((a, b) => (b.cats?.grocery || 0) - (a.cats?.grocery || 0))[0]
    : null;

  // Top 3 recommended cards by signup bonus value (`bonusVal` in main's shape).
  const recommended = [...CC_DB].sort((a, b) => b.bonusVal - a.bonusVal).slice(0, 3);

  const incomeTarget = income.incomeTarget;
  const incomeLeads = income.incomeLeads || 0;
  const partnerType = income.partnerType;
  const pipelineStage = income.pipelineStage || 'referred';

  return (
    <div>
      <H t={'\u{1F4B0} Money'} sub="Credit, income, investing" />

      {/* Credit Score */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={labStyle}>Credit Score</div>
        {hasScore ? (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: FM, fontSize: 38, fontWeight: 700, color: P.gW, lineHeight: 1 }}>
              {score}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                color: scoreTrend === 'up' ? P.ok : scoreTrend === 'flat' ? P.warn : P.info,
              }}>
                {scoreTrend === 'up' ? '↑ strong' : scoreTrend === 'flat' ? '→ building' : '↑ rebuilding'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: P.txM, lineHeight: 1.5 }}>
            Take the Money quiz to see your score plan.
          </div>
        )}
        {hasScore && (
          <div style={{ fontSize: 10, color: P.txD, marginTop: 6, letterSpacing: 0.4 }}>
            Range estimate from onboarding {'—'} pull bureau report for exact score.
          </div>
        )}
      </div>

      {/* Wallet */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={labStyle}>Your Wallet</div>
          <span style={{
            fontFamily: FM, fontSize: 9, fontWeight: 700, color: P.gW,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>
            {walletCards.length}/5 in last 24 months
          </span>
        </div>
        {walletCards.length === 0 ? (
          <div style={{ fontSize: 12, color: P.txM }}>Add cards from the catalog below.</div>
        ) : (
          walletCards.map((card, i) => {
            const entry = wallet[i];
            const bonusEarned = typeof entry === 'object' && entry?.bonusEarned;
            return (
              <div key={card.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < walletCards.length - 1 ? '1px solid ' + P.bd : 'none',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{card.name}</div>
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 2, letterSpacing: 0.4 }}>{card.issuer}</div>
                </div>
                <span style={{
                  ...s.tag,
                  background: bonusEarned ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                  color: bonusEarned ? P.ok : P.warn,
                }}>
                  {bonusEarned ? 'Bonus earned' : 'Bonus pending'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Spend Optimizer */}
      <div style={{ ...s.card, padding: 14, ...sectionGap }}>
        <div style={labStyle}>Spend Optimizer</div>
        <div style={{ fontSize: 12, color: P.txS, lineHeight: 1.5 }}>
          Best card for groceries:{' '}
          <span style={{ fontWeight: 700, color: P.gW }}>
            {bestGrocery ? bestGrocery.name : 'Amex Gold (4x groceries)'}
          </span>
        </div>
      </div>

      {/* Recommended Cards */}
      <div style={{ ...s.card, padding: 16, ...sectionGap }}>
        <div style={labStyle}>Recommended Cards</div>
        {recommended.map((card, i) => (
          <div key={card.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < recommended.length - 1 ? '1px solid ' + P.bd : 'none',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{card.name}</div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2, letterSpacing: 0.4 }}>
                AF{' '}
                <span style={{ fontFamily: FM, color: card.af === 0 ? P.ok : P.txM, fontWeight: 700 }}>
                  ${card.af}
                </span>
                {' · '}
                <span style={{ fontFamily: FM, color: P.gW, fontWeight: 700 }}>
                  {card.bonus.toLocaleString()}
                </span>{' bonus'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Income Pipeline */}
      {partnerType && (
        <div style={{ ...s.card, padding: 16, ...sectionGap }}>
          <div style={labStyle}>Income Pipeline</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: P.txD, letterSpacing: 0.4 }}>Stage</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.txS, marginTop: 2, textTransform: 'capitalize' }}>
                {pipelineStage}
              </div>
            </div>
            {incomeTarget && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: P.txD, letterSpacing: 0.4 }}>Target</div>
                <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: P.gW, marginTop: 2 }}>
                  ${Number(incomeTarget).toLocaleString()}/mo
                </div>
              </div>
            )}
          </div>
          <div style={{
            fontSize: 11, color: P.txM, marginTop: 6, paddingTop: 8,
            borderTop: '1px solid ' + P.bd,
          }}>
            <span style={{ fontFamily: FM, fontWeight: 700, color: P.gW }}>{incomeLeads}</span>
            {' lead' + (incomeLeads === 1 ? '' : 's') + ' in pipeline'}
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
        <div style={{ ...s.card, padding: 0, overflow: 'hidden', ...sectionGap }}>
          <EmptyState
            illustration={<IllusGoals />}
            size={120}
            headline="No money goals yet"
            body="Set a target — credit score, savings amount, or income tier — and the system builds the path."
            cta="+ Add Goal"
            onCta={onAddGoal}
          />
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
