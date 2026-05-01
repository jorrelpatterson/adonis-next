import React from 'react';
import { P, FN } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { PEPTIDES } from '../protocols/body/peptides/catalog';
import { getStackForFinder, findCatalogPeptide } from '../protocols/body/peptides/proto-stacks';
import WorkoutLogger from './components/WorkoutLogger';
import FoodLogger from './components/FoodLogger';
import WeightLogger from './components/WeightLogger';

export default function BodyView({
  profile, protocolStates, logs, log,
  domainGoals, domainTasks, completedTasks,
  onCheckTask, onAddGoal,
}) {
  const liveCatalog = (logs?.peptideCatalog && logs.peptideCatalog.length) ? logs.peptideCatalog : PEPTIDES;
  const namedStack = getStackForFinder(protocolStates?.peptides || {});
  const stackPeptides = namedStack
    ? namedStack.items.map(itemName => ({ itemName, peptide: findCatalogPeptide(itemName, liveCatalog) }))
    : [];

  return (
    <div>
      <H t="🏋️ Body" sub="Peptides, fitness, nutrition, longevity" />

      {/* Workout Logger — set logging + PR detection */}
      <WorkoutLogger
        profile={profile}
        protocolStates={protocolStates}
        logs={logs}
        log={log}
      />

      {/* Food Logger — calorie + macro tracking */}
      <FoodLogger
        profile={profile}
        protocolStates={protocolStates}
        logs={logs}
        log={log}
      />

      {/* Weight Logger — daily weight + 14-day trend */}
      <WeightLogger
        profile={profile}
        logs={logs}
        log={log}
      />

      {/* Named peptide stack — selected from finder answers */}
      {namedStack && (
        <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: P.gW }}>
                Your Stack
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 22 }}>{namedStack.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: namedStack.color, letterSpacing: 1.5 }}>
                  {namedStack.name}
                </span>
              </div>
              <div style={{ fontSize: 11, color: P.txM, marginTop: 4, lineHeight: 1.5 }}>
                {namedStack.tag}
              </div>
              <div style={{ fontSize: 10, color: P.txD, marginTop: 4, fontFamily: FN }}>
                {namedStack.monthly} · {namedStack.items.length} compound{namedStack.items.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 6, background: namedStack.color + '14', border: '1px solid ' + namedStack.color + '22', fontSize: 10, color: P.txM, lineHeight: 1.5, marginBottom: 8 }}>
            <strong style={{ color: namedStack.color, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Why this stack</strong>
            <div style={{ marginTop: 4 }}>{namedStack.why}</div>
          </div>
          {stackPeptides.map(({ itemName, peptide }) => {
            const buyUrl = 'https://advncelabs.com/?q=' + encodeURIComponent(itemName);
            const price = peptide?.price;
            const inStock = peptide ? peptide.inStock !== false : null;
            return (
              <div key={itemName} style={{
                padding: '10px 0', borderTop: '1px solid ' + P.bd,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>
                      {itemName}
                    </div>
                    {peptide && (
                      <div style={{ fontSize: 10, color: P.txD, marginTop: 2 }}>
                        {peptide.dose || ''}{peptide.tod ? ' · ' + peptide.tod : ''}{peptide.dur ? ' · ' + peptide.dur : ''}
                      </div>
                    )}
                    {inStock === false && (
                      <div style={{ fontSize: 9, color: P.warn || '#F59E0B', marginTop: 4, fontWeight: 600 }}>
                        · Out of stock — pre-sell available
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {price != null && (
                      <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 700, color: P.gW }}>
                        ${price}
                      </div>
                    )}
                    <a href={buyUrl} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', marginTop: 4,
                        fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                        color: P.gW, textDecoration: 'none',
                        border: '1px solid ' + P.gW + '44',
                        padding: '4px 10px', borderRadius: 6,
                      }}>
                      Browse →
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
