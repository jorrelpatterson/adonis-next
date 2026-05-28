// src/app/views/workout/ExerciseCard.jsx
import React, { useState } from 'react';
import { P, FN, FD } from '../../../design/theme';
import { s } from '../../../design/styles';
import { swapKey } from '../../../protocols/body/workout/keys';
import {
  getProgressionSuggestion, parseRestSeconds,
} from '../../../protocols/body/workout/progression';
import SetGrid from './SetGrid';
import HowToModal from './HowToModal';
import SwapModal from './SwapModal';

export default function ExerciseCard({
  goal, week, dayIdx, exercise, wkLogs, wkPRs, wkSwaps,
  onSet, onSwap, onStartRest,
}) {
  const [showHowTo, setShowHowTo] = useState(false);
  const [showSwap, setShowSwap] = useState(false);

  const swappedTo = wkSwaps[swapKey(goal, week, dayIdx, exercise.name)] || null;
  const activeName = swappedTo || exercise.name;
  const activeExercise = { ...exercise, name: activeName };

  const suggestion = getProgressionSuggestion({ wkLogs, goal, week, dayIdx, exercise: activeExercise });
  const restSeconds = parseRestSeconds(exercise.rest);

  return (
    <div style={{ ...s.card, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: FD, fontSize: 17, fontWeight: 300, color: P.gW, fontStyle: 'italic' }}>
            {activeName}{swappedTo && (
              <span style={{ fontSize: 9, color: P.txD, marginLeft: 8, fontStyle: 'normal' }}>
                (swapped from {exercise.name})
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: P.txM, marginTop: 2 }}>
            {exercise.sets} × {exercise.reps} · Rest {exercise.rest}
          </div>
          {exercise.note && (
            <div style={{ fontSize: 10, color: P.txD, marginTop: 4, fontStyle: 'italic' }}>{exercise.note}</div>
          )}
        </div>
      </div>

      {suggestion && (
        <div style={{
          background: 'rgba(232,213,183,0.04)', border: '1px solid ' + P.bd,
          borderRadius: 10, padding: '8px 12px', margin: '10px 0',
          fontSize: 11, color: P.txS,
        }}>
          {suggestion.hitTarget ? (
            <>Last: <b>{suggestion.lastWeight}</b> lbs → Today: <b style={{ color: P.ok }}>{suggestion.nextWeight}</b> lbs (+{suggestion.delta})</>
          ) : (
            <>Hit all reps at <b>{suggestion.lastWeight}</b> lbs to unlock +{suggestion.unlockDelta}.</>
          )}
        </div>
      )}

      <SetGrid
        goal={goal} week={week} dayIdx={dayIdx} exercise={activeExercise}
        wkLogs={wkLogs} wkPRs={wkPRs} onSet={onSet}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setShowHowTo(true)} style={{ ...s.btn, ...s.out, padding: '8px 14px', fontSize: 11 }}>
          How-To
        </button>
        <button onClick={() => setShowSwap(true)} style={{ ...s.btn, ...s.out, padding: '8px 14px', fontSize: 11 }}>
          Swap
        </button>
        {restSeconds > 0 && (
          <button
            onClick={() => onStartRest(restSeconds, activeName)}
            style={{ ...s.btn, ...s.pri, padding: '8px 14px', fontSize: 11, marginLeft: 'auto' }}
          >
            Start {restSeconds}s Rest
          </button>
        )}
      </div>

      {showHowTo && (
        <HowToModal exerciseName={activeName} onClose={() => setShowHowTo(false)} />
      )}
      {showSwap && (
        <SwapModal
          exerciseName={exercise.name}
          current={swappedTo}
          onPick={(alt) => { onSwap(alt); setShowSwap(false); }}
          onClose={() => setShowSwap(false)}
        />
      )}
    </div>
  );
}
