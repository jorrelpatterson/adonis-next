// src/app/App.jsx
import React, { useMemo } from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';
import { buildDailyRoutine } from '../routine/pipeline';
import { getAllProtocols } from '../protocols/registry';

export default function App() {
  const { state } = useAppState();
  const { profile, goals, protocolState, logs, settings } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  const protocolMap = useMemo(() => {
    const map = {};
    for (const p of getAllProtocols()) {
      map[p.id] = p;
    }
    return map;
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const routine = useMemo(() => buildDailyRoutine({
    goals,
    protocolMap,
    profile,
    protocolStates: protocolState,
    logs,
    settings,
    day: new Date(),
    today,
  }), [goals, protocolMap, profile, protocolState, logs, settings, today]);

  const { scheduled, deferred, upsells, retention } = routine;

  return (
    <div className="adn-noise" style={{
      fontFamily: FN,
      background: P.bg,
      color: P.tx,
      position: "fixed",
      inset: 0,
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(14,16,22,0.7)",
            border: "1px solid rgba(232,213,183,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: "italic" }}>
              <GradText>A</GradText>
            </span>
          </div>
          <div>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, fontStyle: "italic" }}>
              Adonis / Protocol OS
            </span>
            <div style={{ fontSize: 7, color: P.gW, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700, opacity: 0.7 }}>
              v3.0.0
            </div>
          </div>
        </div>

        <H t="Engine Active" sub={profile.name || 'New User'} />

        {/* Active Goals */}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Active Goals</div>
          {goals.length === 0 ? (
            <p style={{ color: P.txD, fontSize: 12, margin: 0 }}>No goals yet. Protocol engine ready.</p>
          ) : (
            goals.map(g => {
              const pct = g.progress?.percent ?? 0;
              const domain = DOMAINS.find(d => d.id === g.domain);
              const protoCount = (g.activeProtocols || []).length;
              const trend = g.progress?.trend || 'on_track';

              return (
                <div key={g.id} style={{ padding: "10px 0", borderBottom: `1px solid ${P.bd}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                    <div style={{ fontSize: 10, color: P.txD, whiteSpace: "nowrap" }}>{pct}%</div>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 3, borderRadius: 100,
                    background: "rgba(232,213,183,0.08)",
                    marginBottom: 6, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 100,
                      background: "linear-gradient(90deg,#E8D5B7,#34D399)",
                      width: pct + "%",
                      transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {domain && (
                      <span style={{ ...s.tag, background: "rgba(232,213,183,0.04)", color: P.txD }}>
                        {domain.icon} {domain.name}
                      </span>
                    )}
                    {protoCount > 0 && (
                      <span style={{ fontSize: 9, color: P.txD }}>
                        {protoCount} protocol{protoCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, color: trend === 'ahead' ? P.ok : trend === 'behind' ? P.warn : P.txD,
                    }}>
                      {trend.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Today's Routine */}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Today's Routine</div>
          {scheduled.length === 0 ? (
            <p style={{ color: P.txD, fontSize: 12, margin: 0 }}>No tasks yet.</p>
          ) : (
            scheduled.map((task, i) => {
              const goalForTask = goals.find(g => g.id === task.goalId);
              return (
                <div key={task.id || i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 0", borderBottom: `1px solid ${P.bd}`,
                }}>
                  <div style={{ fontSize: 9, color: P.txD, minWidth: 36, paddingTop: 2, textAlign: "right" }}>
                    {task.time || '—'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: P.txS }}>{task.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {goalForTask && (
                        <span style={{ ...s.tag, background: "rgba(232,213,183,0.04)", color: P.txD }}>
                          {goalForTask.title}
                        </span>
                      )}
                      {task.type && (
                        <span style={{ ...s.tag, background: "rgba(184,196,208,0.04)", color: P.gI }}>
                          {task.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {deferred.length > 0 && (
            <div style={{ fontSize: 10, color: P.txD, paddingTop: 8 }}>
              {deferred.length} task{deferred.length !== 1 ? 's' : ''} deferred due to capacity
            </div>
          )}
        </div>

        {/* Recommendations */}
        {upsells.length > 0 && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ ...s.lab }}>Recommendations</div>
            {upsells.map((u, i) => (
              <div key={i} style={{
                fontSize: 12, color: P.txM, padding: "6px 0",
                borderBottom: i < upsells.length - 1 ? `1px solid ${P.bd}` : "none",
              }}>
                {u.message}
              </div>
            ))}
          </div>
        )}

        {/* Insights */}
        {retention.length > 0 && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ ...s.lab }}>Insights</div>
            {retention.map((r, i) => (
              <div key={i} style={{
                fontSize: 12, color: P.txM, padding: "6px 0",
                borderBottom: i < retention.length - 1 ? `1px solid ${P.bd}` : "none",
              }}>
                {r.response}
              </div>
            ))}
          </div>
        )}

        {/* System Status */}
        <div style={{ ...s.card }}>
          <div style={{ ...s.lab }}>System Status</div>
          <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.8 }}>
            Engine: active<br />
            Protocols registered: {Object.keys(protocolMap).length}<br />
            Goals: {goals.length}<br />
            Tasks scheduled: {scheduled.length} / Deferred: {deferred.length}<br />
            Tier: {tierInfo.name}
          </div>
        </div>

      </div>
    </div>
  );
}
