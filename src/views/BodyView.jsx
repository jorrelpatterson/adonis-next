import React from 'react';
import { P, FN } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { recommendStack } from '../protocols/body/peptides/recommend-stack';
import { PEPTIDES } from '../protocols/body/peptides/catalog';

export default function BodyView({
  profile, protocolStates, logs,
  domainGoals, domainTasks, completedTasks,
  onCheckTask, onAddGoal,
}) {
  const liveCatalog = (logs?.peptideCatalog && logs.peptideCatalog.length) ? logs.peptideCatalog : PEPTIDES;
  const peptideStack = recommendStack(protocolStates?.peptides || {}, liveCatalog);

  return (
    <div>
      <H t="🏋️ Body" sub="Peptides, fitness, nutrition, longevity" />

      {/* Recommended peptide stack */}
      {peptideStack.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.gW }}>
                Your Peptide Stack
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                {peptideStack.length} compound{peptideStack.length === 1 ? '' : 's'} matched to your goals
              </div>
            </div>
            <span style={{ fontSize: 22 }}>{'\u{1F489}'}</span>
          </div>
          {peptideStack.map(({ peptide, reason }) => {
            const buyUrl = 'https://advncelabs.com/?q=' + encodeURIComponent(peptide.name);
            return (
              <div key={peptide.id} style={{
                padding: '10px 0', borderTop: '1px solid ' + P.bd,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                      {peptide.name}
                    </div>
                    <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                      {peptide.dose} · {peptide.tod || 'AM'} · {peptide.dur || 'as prescribed'}
                    </div>
                    <div style={{ fontSize: 10, color: P.gW, marginTop: 4, fontStyle: 'italic' }}>
                      {reason}
                    </div>
                    {peptide.inStock === false && (
                      <div style={{ fontSize: 9, color: P.warn || '#F59E0B', marginTop: 4, fontWeight: 600 }}>
                        · Out of stock — pre-sell available
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 700, color: P.gW }}>
                      ${peptide.price}
                    </div>
                    <a href={buyUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', marginTop: 4,
                        fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                        color: P.gW, textDecoration: 'none',
                        border: '1px solid ' + P.gW + '44',
                        padding: '4px 10px', borderRadius: 6,
                      }}>
                      View on advnce labs →
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(232,213,183,0.04)', fontSize: 9, color: P.txD, lineHeight: 1.5 }}>
            Adonis recommends · advnce labs sells · Research compounds, not medical advice
          </div>
        </div>
      )}

      {/* Goals */}
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
          <div style={{ fontSize: 13, color: P.txM }}>No body goals yet</div>
          <button onClick={onAddGoal}
            style={{ ...s.btn, ...s.pri, marginTop: 10, padding: '8px 20px', fontSize: 12 }}>
            + Add Body Goal
          </button>
        </div>
      )}

      {/* Today's tasks */}
      {domainTasks.length > 0 && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ ...s.lab }}>Today's Tasks</div>
          {domainTasks.map(task => {
            const isDone = completedTasks.includes(task.id);
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + P.bd, opacity: isDone ? 0.5 : 1 }}>
                <button onClick={() => onCheckTask(task.id)}
                  style={{ width: 20, height: 20, borderRadius: 10, border: isDone ? 'none' : '1.5px solid ' + P.gW + '44', background: isDone ? P.ok : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontFamily: FN, flexShrink: 0 }}>
                  {isDone ? '✓' : ''}
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
    </div>
  );
}
