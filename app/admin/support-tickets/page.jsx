'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const cs = {
  h1:     { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 4 },
  sub:    { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  tile:   { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '18px 22px' },
  tileLabel: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  tileVal: { fontSize: 24, fontWeight: 700, color: '#0F1928' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16 },
  filterBtn: (active) => ({
    padding: '6px 14px', border: '1px solid #E4E7EC', borderRadius: 4,
    background: active ? '#0F1928' : '#fff',
    color: active ? '#fff' : '#0F1928',
    fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', cursor: 'pointer',
  }),
  row:    { background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '18px 22px', marginBottom: 10 },
  rowHead:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  who:    { fontWeight: 700, color: '#0F1928', fontSize: 15 },
  meta:   { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#7A7D88', letterSpacing: 1 },
  email:  { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#00A0A8' },
  issue:  { fontSize: 13, color: '#0F1928', lineHeight: 1.55, background: '#F8F9FB', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', marginTop: 8 },
  actions:{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' },
  btn:    { padding: '6px 12px', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, textTransform: 'uppercase' },
  btnCyan: { background: '#00A0A8', color: '#fff' },
  btnOutline: { background: '#fff', color: '#0F1928', border: '1px solid #E4E7EC' },
  pill:   (bg, color) => ({
    display: 'inline-block', padding: '3px 8px', background: bg, color,
    borderRadius: 3, fontFamily: "'JetBrains Mono',monospace", fontSize: 9,
    letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
  }),
  empty:  { textAlign: 'center', padding: 80, color: '#7A7D88', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  transcript: { marginTop: 10, padding: 12, background: '#F8F9FB', borderRadius: 4, maxHeight: 300, overflow: 'auto' },
  transcriptMsg: { fontSize: 12, color: '#0F1928', marginBottom: 8, lineHeight: 1.5 },
  transcriptRole: { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#7A7D88', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
};

const INTENT_STYLE = {
  order:      { bg: '#FEF3C7', color: '#92400E' },
  wholesale:  { bg: '#DBEAFE', color: '#1E40AF' },
  ambassador: { bg: '#E0E7FF', color: '#3730A3' },
  research:   { bg: '#D1FAE5', color: '#065F46' },
  general:    { bg: '#F3F4F6', color: '#374151' },
};

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMin = (now - d) / 60000;
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`;
      const r = await fetch(`/api/support-tickets${q}`, { credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { tickets } = await r.json();
      setTickets(tickets || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    const r = await fetch('/api/support-tickets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) load();
    else alert('Update failed: ' + (await r.text()));
  }

  const counts = tickets.reduce((a, t) => { a[t.status] = (a[t.status] || 0) + 1; return a; }, {});
  const openCount = counts.open || 0;
  const inProgressCount = counts.in_progress || 0;
  const resolvedCount = counts.resolved || 0;

  return (
    <div style={{ flex: 1 }}>
      <h1 className="admin-page-h1" style={cs.h1}>Support Tickets</h1>
      <div className="admin-page-sub" style={cs.sub}>Chat escalations from advncelabs.com</div>

      <div className="admin-filter-row" style={cs.filterRow}>
        {['open', 'in_progress', 'resolved', 'all'].map((s) => (
          <button key={s} style={cs.filterBtn(filter === s)} onClick={() => setFilter(s)}>
            {s.replace('_', ' ')}
            {s === filter && ` · ${tickets.length}`}
          </button>
        ))}
      </div>

      {loading && <div style={cs.empty}>Loading…</div>}
      {error && <div style={{ ...cs.empty, color: '#DC2626' }}>Error: {error}</div>}
      {!loading && !error && tickets.length === 0 && (
        <div style={cs.empty}>No {filter === 'all' ? '' : filter} tickets.</div>
      )}

      {!loading && !error && tickets.length > 0 && (
        <div>
          {tickets.map((t) => {
            const intentSt = INTENT_STYLE[t.intent] || INTENT_STYLE.general;
            const statusSt =
              t.status === 'open' ? { bg: '#FEE2E2', color: '#991B1B' } :
              t.status === 'in_progress' ? { bg: '#FEF3C7', color: '#92400E' } :
              { bg: '#D1FAE5', color: '#065F46' };
            const isExp = !!expanded[t.id];
            const hasTranscript = Array.isArray(t.chat_transcript) && t.chat_transcript.length > 0;
            return (
              <div key={t.id} className="admin-row-card" style={cs.row}>
                <div className="admin-row-head" style={cs.rowHead}>
                  <div>
                    <div style={cs.who}>{t.name}</div>
                    <a href={`mailto:${t.email}?subject=Re: your message to advnce labs`} style={cs.email}>{t.email}</a>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={cs.pill(intentSt.bg, intentSt.color)}>{(t.intent || 'general')}</span>
                    <span style={cs.pill(statusSt.bg, statusSt.color)}>{t.status.replace('_', ' ')}</span>
                    <span style={{ ...cs.meta, marginLeft: 6 }}>{fmt(t.created_at)}</span>
                  </div>
                </div>

                <div style={cs.issue}>{t.issue}</div>

                {t.page_url && (
                  <div style={{ ...cs.meta, marginTop: 8 }}>Page: {t.page_url}</div>
                )}

                {hasTranscript && (
                  <>
                    <button
                      style={{ ...cs.btn, ...cs.btnOutline, marginTop: 10 }}
                      onClick={() => setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))}
                    >
                      {isExp ? 'Hide' : 'Show'} chat context ({t.chat_transcript.length})
                    </button>
                    {isExp && (
                      <div style={cs.transcript}>
                        {t.chat_transcript.map((m, i) => (
                          <div key={i} style={cs.transcriptMsg}>
                            <div style={cs.transcriptRole}>{m.role === 'user' ? 'Visitor' : 'AI'}</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="admin-row-actions" style={cs.actions}>
                  <a
                    href={`mailto:${t.email}?subject=Re: your message to advnce labs&body=Hi ${t.name.split(' ')[0] || ''},%0A%0A`}
                    style={{ ...cs.btn, ...cs.btnCyan, textDecoration: 'none' }}
                  >
                    Reply →
                  </a>
                  {t.status !== 'in_progress' && (
                    <button style={{ ...cs.btn, ...cs.btnOutline }} onClick={() => updateStatus(t.id, 'in_progress')}>Working on it</button>
                  )}
                  {t.status !== 'resolved' && (
                    <button style={{ ...cs.btn, ...cs.btnOutline }} onClick={() => updateStatus(t.id, 'resolved')}>Mark resolved</button>
                  )}
                  {t.status === 'resolved' && (
                    <button style={{ ...cs.btn, ...cs.btnOutline }} onClick={() => updateStatus(t.id, 'open')}>Re-open</button>
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
