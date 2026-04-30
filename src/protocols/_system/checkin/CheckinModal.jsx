import React, { useState } from 'react';
import { P, FN } from '../../../design/theme';
import { s } from '../../../design/styles';
import { CHECKIN_FIELDS } from './fields.js';

export default function CheckinModal({ onSave, onClose }) {
  const [ratings, setRatings] = useState({});
  const [saved, setSaved] = useState(false);

  const setRating = (id, value) => setRatings(r => ({ ...r, [id]: value }));

  const handleSave = () => {
    setSaved(true);
    onSave(ratings);
    setTimeout(() => onClose(), 900);
  };

  const allRated = CHECKIN_FIELDS.every(f => ratings[f.id] != null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,10,16,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: FN,
    }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        ...s.card,
        width: '100%', maxWidth: 640,
        padding: '20px 16px 24px',
        borderRadius: '16px 16px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {saved ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F44D}'}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: P.txS }}>Got it</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: P.txD, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                Daily Check-in
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: P.txS }}>
                How are you feeling today?
              </div>
            </div>

            {CHECKIN_FIELDS.map(field => (
              <div key={field.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.txM, marginBottom: 8 }}>
                  {field.label}
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                  {field.emoji.map((emoji, idx) => {
                    const value = idx + 1;
                    const isSelected = ratings[field.id] === value;
                    return (
                      <button
                        key={idx}
                        onClick={() => setRating(field.id, value)}
                        aria-label={field.label + ' rating ' + value}
                        style={{
                          flex: 1,
                          minHeight: 48,
                          fontSize: 22,
                          background: isSelected ? field.colors[idx] + '33' : 'transparent',
                          border: '1.5px solid ' + (isSelected ? field.colors[idx] : P.bd),
                          borderRadius: 10,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          fontFamily: FN,
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={onClose} style={{ ...s.btn, ...s.out, flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!allRated}
                style={{
                  ...s.btn, ...s.pri,
                  flex: 2,
                  opacity: allRated ? 1 : 0.4,
                  cursor: allRated ? 'pointer' : 'not-allowed',
                }}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
