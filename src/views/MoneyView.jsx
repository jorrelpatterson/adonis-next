// src/views/MoneyView.jsx
// Money domain tab — credit score plan, wallet, optimizer, recommended cards,
// income pipeline, goals, today's tasks. Aligns with the v2 dark/cream aesthetic.
import React from 'react';
import { P, FN, FM } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';

// Catalog of 13 credit cards used by the recommender + spend optimizer.
// CC_DB does not yet exist as a shared module in src/protocols/money/credit;
// kept inline here so this view stays self-contained until data is extracted.
const CC_DB = [
  { id: 'csp', name: 'Chase Sapphire Preferred', type: 'Travel', af: 95, bonus: 60000, bonusValue: 750, mult: { groceries: 3, dining: 3, travel: 2, gas: 1 } },
  { id: 'csr', name: 'Chase Sapphire Reserve', type: 'Travel', af: 550, bonus: 60000, bonusValue: 900, mult: { groceries: 1, dining: 3, travel: 3, gas: 1 } },
  { id: 'amex_gold', name: 'Amex Gold', type: 'Dining', af: 250, bonus: 60000, bonusValue: 1200, mult: { groceries: 4, dining: 4, travel: 3, gas: 1 } },
  { id: 'amex_plat', name: 'Amex Platinum', type: 'Travel', af: 695, bonus: 80000, bonusValue: 1600, mult: { groceries: 1, dining: 1, travel: 5, gas: 1 } },
  { id: 'amex_blue_cash', name: 'Amex Blue Cash Preferred', type: 'Cashback', af: 95, bonus: 250, bonusValue: 250, mult: { groceries: 6, dining: 1, travel: 1, gas: 3 } },
  { id: 'capone_venture_x', name: 'Capital One Venture X', type: 'Travel', af: 395, bonus: 75000, bonusValue: 1125, mult: { groceries: 2, dining: 2, travel: 2, gas: 2 } },
  { id: 'capone_venture', name: 'Capital One Venture', type: 'Travel', af: 95, bonus: 75000, bonusValue: 750, mult: { groceries: 2, dining: 2, travel: 2, gas: 2 } },
  { id: 'citi_prem', name: 'Citi Premier', type: 'Travel', af: 95, bonus: 80000, bonusValue: 800, mult: { groceries: 3, dining: 3, travel: 3, gas: 3 } },
  { id: 'citi_double', name: 'Citi Double Cash', type: 'Cashback', af: 0, bonus: 200, bonusValue: 200, mult: { groceries: 2, dining: 2, travel: 2, gas: 2 } },
  { id: 'amex_brilliant', name: 'Amex Marriott Bonvoy Brilliant', type: 'Hotel', af: 650, bonus: 95000, bonusValue: 950, mult: { groceries: 2, dining: 3, travel: 2, gas: 2 } },
  { id: 'chase_freedom_unl', name: 'Chase Freedom Unlimited', type: 'Cashback', af: 0, bonus: 200, bonusValue: 200, mult: { groceries: 1.5, dining: 3, travel: 1.5, gas: 1.5 } },
  { id: 'amex_business_plat', name: 'Amex Business Platinum', type: 'Business', af: 695, bonus: 150000, bonusValue: 3000, mult: { groceries: 1, dining: 1, travel: 5, gas: 1 } },
  { id: 'chase_ihg', name: 'Chase IHG One Premier', type: 'Hotel', af: 99, bonus: 140000, bonusValue: 700, mult: { groceries: 2, dining: 2, travel: 5, gas: 2 } },
];

// Map onboarding score range → representative score number.
const SCORE_MAP = { rebuild: 550, '600_700': 650, '700_800': 750, '800_plus': 800 };

const sectionGap = { marginBottom: 12 };
const labStyle = { ...s.lab };

export default function MoneyView({
  profile,
  protocolStates = {},
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
  const bestGrocery = walletCards.length
    ? [...walletCards].sort((a, b) => (b.mult?.groceries || 0) - (a.mult?.groceries || 0))[0]
    : null;

  // Top 3 recommended cards by signup bonus value.
  const recommended = [...CC_DB].sort((a, b) => b.bonusValue - a.bonusValue).slice(0, 3);

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
                  <div style={{ fontSize: 10, color: P.txD, marginTop: 2, letterSpacing: 0.4 }}>{card.type}</div>
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
            <a href="#" style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              color: P.gW, textDecoration: 'none',
              border: '1px solid ' + P.gW + '44',
              padding: '6px 12px', borderRadius: 6, flexShrink: 0,
            }}>
              Apply {'→'}
            </a>
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
        <div style={{ ...s.card, padding: 20, textAlign: 'center', ...sectionGap }}>
          <div style={{ fontSize: 13, color: P.txM }}>No money goals yet</div>
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
