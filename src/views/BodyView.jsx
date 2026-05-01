// Body domain view — sub-tab structure matching v1: Peptides | Train | Food | Tools.
// Pure body-domain tools; goals + today's tasks live on the Routine tab.

import React, { useState } from 'react';
import { P, FN, FM } from '../design/theme';
import { s } from '../design/styles';
import { H } from '../design/components';
import { PEPTIDES } from '../protocols/body/peptides/catalog';
import { getStackForFinder, findCatalogPeptide, PROTO_STACKS } from '../protocols/body/peptides/proto-stacks';
import WorkoutLogger from './components/WorkoutLogger';
import FoodLogger from './components/FoodLogger';
import WeightLogger from './components/WeightLogger';
import EmptyState from '../design/EmptyState';
import { IllusPeptides } from '../design/illustrations';
import { sound } from '../design/sound';
import { haptics } from '../design/haptics';

const SUB_TABS = [
  { id: 'peptides', label: 'Peptides', icon: '\u{1F489}' },
  { id: 'train',    label: 'Train',    icon: '\u{1F4AA}' },
  { id: 'food',     label: 'Food',     icon: '\u{1F37D}️' },
  { id: 'tools',    label: 'Tools',    icon: '\u{1F50D}' },
];

export default function BodyView({ profile, protocolStates, setProtocolState, logs, log }) {
  const [subTab, setSubTab] = useState('peptides');

  return (
    <div>
      <H t="🏋️ Body" sub="Peptides, fitness, nutrition, longevity" />

      {/* Sub-tab navigation */}
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
        />
      )}
      {subTab === 'train' && (
        <WorkoutLogger
          profile={profile}
          protocolStates={protocolStates}
          logs={logs}
          log={log}
        />
      )}
      {subTab === 'food' && (
        <FoodLogger
          profile={profile}
          protocolStates={protocolStates}
          logs={logs}
          log={log}
        />
      )}
      {subTab === 'tools' && (
        <WeightLogger
          profile={profile}
          logs={logs}
          log={log}
        />
      )}
    </div>
  );
}

// ─── Peptides sub-tab ─────────────────────────────────────────────────────
function PeptidesSection({ profile, protocolStates, setProtocolState, logs }) {
  const [pane, setPane] = useState('protocol');  // protocol | stacks
  const liveCatalog = (logs?.peptideCatalog && logs.peptideCatalog.length) ? logs.peptideCatalog : PEPTIDES;
  const namedStack = getStackForFinder(protocolStates?.peptides || {});
  const stackPeptides = namedStack
    ? namedStack.items.map(itemName => ({ itemName, peptide: findCatalogPeptide(itemName, liveCatalog) }))
    : [];
  const totalAvailable = liveCatalog.length;

  const switchToStack = (stack) => {
    if (typeof window !== 'undefined' && !window.confirm('Switch to ' + stack.name + ' stack?')) return;
    if (setProtocolState) {
      // Explicit pick — bypasses goal/budget resolution in getStackForFinder.
      // Cleared whenever the user retakes the Peptide Finder.
      setProtocolState('peptides', { selectedStackId: stack.id });
      sound.success();
      haptics.success();
      setPane('protocol');  // hop back to the stack view so user sees the swap
    }
  };

  const subPaneRow = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
    </div>
  );

  return (
    <div>
      {subPaneRow}
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
    </div>
  );
}

// ─── Protocol pane (active stack detail) ──────────────────────────────────
function ProtocolPane({ namedStack, stackPeptides }) {
  // Key by stack id so React remounts on switch — triggers .adn-reveal
  // stagger animation, giving a fade-cross between stacks instead of a snap.
  return (
    <div key={namedStack?.id || 'none'} className="adn-reveal">
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
        15 curated stacks for different goals + budgets. Tap any stack to see what it contains and why it works together.
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
