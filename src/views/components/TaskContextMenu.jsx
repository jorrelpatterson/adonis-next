// TaskContextMenu — bottom-sheet menu surfaced via long-press on a task.
// Premium iOS-style action menu with task-specific operations: mark done,
// snooze, view info, hide. Glass material, spring entrance.

import React from 'react';
import { P, FN, FD } from '../../design/theme';
import { GradText } from '../../design/components';
import { sound } from '../../design/sound';
import { haptics } from '../../design/haptics';

export default function TaskContextMenu({ task, isCompleted, onAction, onClose }) {
  const fire = (action) => {
    sound.tap();
    haptics.light();
    onAction(action);
    onClose();
  };

  const items = [
    isCompleted
      ? { id: 'uncheck',  label: 'Mark as not done', icon: '↺' }
      : { id: 'check',    label: 'Mark complete',    icon: '✓' },
    { id: 'info',         label: 'See details',      icon: 'ⓘ' },
    { id: 'snooze',       label: 'Snooze 1 hour',    icon: '⏱' },
    { id: 'hide',         label: 'Hide today',       icon: '−', destructive: false },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 11000,
        background: 'rgba(8,10,16,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: FN, padding: '16px 16px env(safe-area-inset-bottom, 16px)',
        animation: 'vt-fade-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: 24,
          background: 'linear-gradient(165deg, rgba(20,22,30,0.95), rgba(14,16,22,0.95))',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(232,213,183,0.08)',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.5), 0 1px 0 0 rgba(255,255,255,0.04) inset',
          padding: '20px 16px 18px',
          animation: 'springIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(232,213,183,0.2)',
          margin: '-8px auto 16px',
        }} />

        {/* Task title */}
        <div style={{ marginBottom: 14, padding: '0 4px' }}>
          <div style={{ fontSize: 9, color: P.txD, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            {task.category || 'Task'}
          </div>
          <div style={{
            fontFamily: FD, fontSize: 18, fontStyle: 'italic',
            fontWeight: 300, color: P.txS, lineHeight: 1.25,
          }}>
            <GradText>{task.title || task.text || 'Task'}</GradText>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => fire(item.id)}
              style={{
                textAlign: 'left',
                padding: '14px 14px', borderRadius: 12,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer', fontFamily: FN,
                display: 'flex', alignItems: 'center', gap: 14,
                color: item.destructive ? '#EF4444' : P.txS,
                fontSize: 14, fontWeight: 500,
              }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(232,213,183,0.06)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: P.gW, flexShrink: 0,
              }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { sound.tap(); onClose(); }}
          style={{
            marginTop: 12, padding: '15px 24px', borderRadius: 14,
            background: 'rgba(232,213,183,0.04)',
            color: P.txS,
            fontFamily: FN, fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
            border: '1px solid rgba(232,213,183,0.1)',
            cursor: 'pointer', width: '100%',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
