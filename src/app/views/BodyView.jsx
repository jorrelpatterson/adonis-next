// src/app/views/BodyView.jsx
//
// Full port (Phase 4 task-7): Body tab sub-navigation — Peptides | Train |
// Food | Tools. Sub-tab strip markup/styling mirrors main's slim seam
// (task-15) which itself mirrored v2-revival-archive:src/views/BodyView.jsx
// (see git show v2-revival-archive:src/views/BodyView.jsx). This version
// restores the archive's Peptides pane (stack browser + protocol detail)
// and Tools pane (WeightLogger + PhotoJournal), while Train/Food keep this
// phase's existing seams (WorkoutView / FoodLogger) exactly as-is.
//
// App.jsx's own domain header (<H .../>) already renders above this
// component for the 'body' tab, so BodyView does not render its own H —
// unlike the archive version, which owned the whole Body screen.
//
// Sanctioned adaptations from the archive (documented per task-7 brief):
//   1. Order CTAs are plain `https://advncelabs.com/?q=...` links (archive
//      already did this — no Stripe anywhere in the peptide flow).
//   2. "15 curated stacks" copy is derived from PROTO_STACKS.length (14),
//      not hardcoded — the archive's copy had drifted from the data.
//   3. Selected-stack persistence uses protocolState.peptides.selectedStackId
//      via setProtocolState('peptides', { selectedStackId }) — exactly the
//      archive's mechanism (v2-revival-archive:src/views/BodyView.jsx:123).
//      The wiring gap (peptides protocol's getTasks/getRecommendations
//      needing this to reach task emission) is closed in
//      src/protocols/body/peptides/index.js + src/routine/assembler.js —
//      see .superpowers/sdd/task-7-report.md for the full trace.
//   4. loadLiveCatalog() is called from THIS component's Peptides pane on
//      mount (writing into logs.peptideCatalog via the `log` prop), instead
//      of from App.jsx's mount effect (archive's approach). Lighter than
//      threading a new prop through App — see task-7-report.md. Falls back
//      to the static PEPTIDES catalog synchronously so panes render with no
//      network (tests run offline).
//   5. PeptideFinderModal launch + a check-in-driven "stack adjustments"
//      banner are surfaced directly in the Peptides pane (the archive
//      launched the Finder from App.jsx's Insights screen instead — folding
//      it in here keeps the whole peptide flow self-contained in one pane,
//      and getStackAdjustments was otherwise a dead landed dependency).
//   6. The archive's `sound`/`haptics` imports in BodyView were unused dead
//      imports (verified via grep) — not ported.
//   7. Weight is folded into Tools (alongside PhotoJournal) per the
//      archive's actual sub-tab set — Weight is no longer a standalone tab.

import React, { useState, useEffect } from 'react';
import { P, FN } from '../../design/theme';
import { s } from '../../design/styles';
import WorkoutView from './WorkoutView';
import FoodLogger from '../../views/components/FoodLogger';
import WeightLogger from '../../views/components/WeightLogger';
import PhotoJournal from '../../views/components/PhotoJournal';
import PeptideFinderModal from '../../views/components/PeptideFinderModal';
import EmptyState from '../../design/EmptyState';
import { IllusPeptides } from '../../design/illustrations';
import { ActionSheetProvider, useActionSheet } from '../../design/ActionSheet';
import { PEPTIDES } from '../../protocols/body/peptides/catalog';
import { getStackForFinder, findCatalogPeptide, PROTO_STACKS } from '../../protocols/body/peptides/proto-stacks';
import { getStackAdjustments } from '../../protocols/body/peptides/stack-adjustments';
import { getCheckinAverages } from '../../protocols/_system/checkin/selectors';
import { loadLiveCatalog } from '../../services/peptide-catalog';

const SUB_TABS = [
  { id: 'peptides', label: 'Peptides', icon: '\u{1F489}' },
  { id: 'train',    label: 'Train',    icon: '\u{1F4AA}' },
  { id: 'food',     label: 'Food',     icon: '\u{1F37D}️' },
  { id: 'tools',    label: 'Tools',    icon: '\u{1F50D}' },
];

export default function BodyView({ profile, protocolStates, setProtocolState, logs, log }) {
  const [subTab, setSubTab] = useState('peptides');

  return (
    <ActionSheetProvider>
      <div>
        {/* Sub-tab navigation — mirrors archive BodyView's strip pattern */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 16,
          borderBottom: '1px solid ' + P.bd, paddingBottom: 0,
        }}>
          {SUB_TABS.map(t => {
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: FN, padding: '10px 4px', flex: 1,
                  color: isActive ? P.gW : P.txD,
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  borderBottom: '2px solid ' + (isActive ? P.gW : 'transparent'),
                  transition: 'color 0.2s, border-color 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {subTab === 'peptides' && (
          <PeptidesSection
            profile={profile}
            protocolStates={protocolStates}
            setProtocolState={setProtocolState}
            logs={logs}
            log={log}
          />
        )}
        {subTab === 'train' && <WorkoutView />}
        {subTab === 'food' && (
          <FoodLogger
            profile={profile}
            protocolStates={protocolStates}
            logs={logs}
            log={log}
          />
        )}
        {subTab === 'tools' && (
          <>
            <WeightLogger
              profile={profile}
              logs={logs}
              log={log}
            />
            <PhotoJournal
              logs={logs}
              log={log}
            />
          </>
        )}
      </div>
    </ActionSheetProvider>
  );
}

// ─── Peptides sub-tab ─────────────────────────────────────────────────────
function PeptidesSection({ profile, protocolStates, setProtocolState, logs, log }) {
  const [pane, setPane] = useState('protocol');  // protocol | stacks
  const [showFinder, setShowFinder] = useState(false);
  const actionSheet = useActionSheet();

  // Load the live (Supabase-backed) catalog on mount and stash it in
  // logs.peptideCatalog — the same location the peptides protocol engine
  // reads from (src/protocols/body/peptides/index.js resolveCatalog()).
  // Falls back to the static PEPTIDES catalog below until this resolves
  // (or forever, offline) so the pane always renders without network.
  useEffect(() => {
    let cancelled = false;
    loadLiveCatalog().then(catalog => {
      if (!cancelled && typeof log === 'function') log('peptideCatalog', catalog);
    }).catch(() => { /* static fallback already rendering — nothing to do */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveCatalog = (logs?.peptideCatalog && logs.peptideCatalog.length) ? logs.peptideCatalog : PEPTIDES;
  const finderAnswers = protocolStates?.peptides || {};
  const namedStack = getStackForFinder(finderAnswers);
  const stackPeptides = namedStack
    ? namedStack.items.map(itemName => ({ itemName, peptide: findCatalogPeptide(itemName, liveCatalog) }))
    : [];
  const totalAvailable = liveCatalog.length;

  const checkinAverages = getCheckinAverages(logs);
  const adjustments = namedStack
    ? getStackAdjustments(checkinAverages, namedStack.items, liveCatalog).filter(adj => adj.type === 'add')
    : [];

  const switchToStack = async (stack) => {
    const ok = await actionSheet.confirm({
      title: `Switch to ${stack.name}?`,
      message: `Your routine will update to use these ${stack.items.length} compounds. You can switch back anytime.`,
      confirmText: 'Switch Stack',
      cancelText: 'Cancel',
    });
    if (!ok) return;
    if (setProtocolState) {
      setProtocolState('peptides', { selectedStackId: stack.id });
      setPane('protocol');
    }
  };

  const handleFinderSave = (answers) => {
    if (setProtocolState) setProtocolState('peptides', answers);
  };

  const subPaneRow = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
      {[
        { id: 'protocol', label: 'Protocol' },
        { id: 'stacks',   label: 'Stacks' },
      ].map(p => {
        const isActive = pane === p.id;
        return (
          <button key={p.id} onClick={() => setPane(p.id)}
            style={{
              ...s.btn, ...(isActive ? s.pri : s.out),
              fontSize: 11, padding: '6px 14px', minHeight: 32,
            }}>
            {p.label}
          </button>
        );
      })}
      <button onClick={() => setShowFinder(true)}
        style={{
          marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: FN, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: P.gW, textDecoration: 'underline', padding: '6px 4px',
        }}>
        {namedStack ? 'Retake Finder' : 'Take Peptide Finder'} →
      </button>
    </div>
  );

  return (
    <div>
      {subPaneRow}
      {adjustments.length > 0 && pane === 'protocol' && (
        <div style={{ ...s.card, padding: 12, marginBottom: 12, border: '1px solid ' + P.gW + '33' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.gW, marginBottom: 6 }}>
            Based on your check-ins
          </div>
          {adjustments.map(adj => (
            <div key={adj.peptide.id} style={{ fontSize: 11, color: P.txM, marginBottom: 4, lineHeight: 1.5 }}>
              + {adj.peptide.name} — {adj.reason}
            </div>
          ))}
        </div>
      )}
      {pane === 'stacks' ? (
        <StacksBrowser
          stacks={PROTO_STACKS}
          activeStackId={namedStack?.id}
          onSwitch={switchToStack}
        />
      ) : !namedStack ? (
        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <EmptyState
            illustration={<IllusPeptides />}
            headline="Build your stack"
            body={`Pick a curated peptide stack from the ${totalAvailable} compounds in our library, or take the Finder for a personalized recommendation.`}
            cta="Browse Stacks"
            onCta={() => setPane('stacks')}
            size={120}
          />
          <div style={{
            padding: '0 20px 20px',
            fontSize: 9, color: P.txD, lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center',
          }}>
            ⚕ Adonis is educational. All peptides require a valid prescription. Consult your provider before starting any peptide therapy.
          </div>
        </div>
      ) : (
        <ProtocolPane
          namedStack={namedStack}
          stackPeptides={stackPeptides}
        />
      )}
      {showFinder && (
        <PeptideFinderModal
          initial={protocolStates?.peptides}
          onSave={handleFinderSave}
          onClose={() => setShowFinder(false)}
        />
      )}
    </div>
  );
}

// ─── Protocol pane (active stack detail) ──────────────────────────────────
function ProtocolPane({ namedStack, stackPeptides }) {
  // Key by stack id so React remounts on switch — triggers a fade-cross
  // between stacks instead of a snap.
  return (
    <div key={namedStack?.id || 'none'}>
      {/* Stack header */}
      <div style={{ ...s.card, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
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
        <div style={{
          padding: '8px 10px', borderRadius: 6,
          background: namedStack.color + '14',
          border: '1px solid ' + namedStack.color + '22',
          fontSize: 10, color: P.txM, lineHeight: 1.5, marginBottom: 8,
        }}>
          <strong style={{ color: namedStack.color, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>Why this stack</strong>
          <div style={{ marginTop: 4 }}>{namedStack.why}</div>
        </div>
        {stackPeptides.map(({ itemName, peptide }) => {
          const buyUrl = 'https://advncelabs.com/?q=' + encodeURIComponent(itemName);
          const price = peptide?.price;
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
                      {peptide.dose || ''}{peptide.tod ? ' · ' + peptide.tod : ''}{peptide.freq ? ' · ' + peptide.freq.replace(/_/g, ' ') : ''}
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
      </div>

      <div style={{
        fontSize: 9, color: P.txD, lineHeight: 1.5, fontStyle: 'italic',
        textAlign: 'center', padding: '8px 12px',
      }}>
        ⚕ Adonis is educational. All peptides require a valid prescription. Consult your provider before starting any peptide therapy.
      </div>
    </div>
  );
}

// ─── Stacks browser pane ──────────────────────────────────────────────────
function StacksBrowser({ stacks, activeStackId, onSwitch }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div style={{
        fontSize: 11, color: P.txM, lineHeight: 1.5, marginBottom: 12,
        padding: '0 4px',
      }}>
        {stacks.length} curated stacks for different goals + budgets. Tap any stack to see what it contains and why it works together.
      </div>

      {stacks.map(stack => {
        const isActive = stack.id === activeStackId;
        const isOpen = expanded === stack.id;
        return (
          <div
            key={stack.id}
            style={{
              ...s.card,
              padding: 0,
              marginBottom: 8,
              overflow: 'hidden',
              border: '1px solid ' + (isActive ? stack.color + '66' : 'rgba(232,213,183,0.05)'),
            }}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : stack.id)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                width: '100%', padding: '12px 14px', textAlign: 'left',
                fontFamily: FN, color: P.txS,
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>{stack.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: stack.color, letterSpacing: 1.2 }}>
                    {stack.name}
                  </span>
                  {isActive && (
                    <span style={{
                      fontSize: 8, padding: '1px 6px', borderRadius: 4,
                      background: stack.color + '22', color: stack.color,
                      fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: P.txD, marginTop: 2, lineHeight: 1.4 }}>
                  {stack.tag}
                </div>
                <div style={{ fontSize: 9, color: P.txD, marginTop: 3, fontFamily: FN }}>
                  {stack.monthly} · {stack.items.length} compound{stack.items.length === 1 ? '' : 's'}
                </div>
              </div>
              <span style={{
                fontSize: 14, color: P.txD, flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}>
                ›
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{
                  padding: '8px 10px', borderRadius: 6,
                  background: stack.color + '14',
                  border: '1px solid ' + stack.color + '22',
                  fontSize: 10, color: P.txM, lineHeight: 1.5, marginBottom: 10,
                }}>
                  <strong style={{ color: stack.color, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
                    Why this stack
                  </strong>
                  <div style={{ marginTop: 4 }}>{stack.why}</div>
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: P.txD, marginBottom: 6 }}>
                  Compounds
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {stack.items.map(item => (
                    <span key={item} style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 4,
                      background: 'rgba(232,213,183,0.04)',
                      color: P.txM,
                      border: '1px solid ' + P.bd,
                    }}>
                      {item}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: P.txD, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 10 }}>
                  Best for: {stack.target}
                </div>
                {!isActive && (
                  <button
                    onClick={() => onSwitch(stack)}
                    style={{
                      ...s.btn, ...s.pri,
                      width: '100%', justifyContent: 'center',
                      fontSize: 12, padding: '10px 14px',
                    }}
                  >
                    Switch to {stack.name}
                  </button>
                )}
                {isActive && (
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: stack.color + '10', textAlign: 'center',
                    fontSize: 11, fontWeight: 600, color: stack.color,
                  }}>
                    ✓ This is your active stack
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
