'use client';

import { useMemo, useState } from 'react';

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'flagged',  label: 'Flagged' },
  { key: 'new',      label: 'New' },
  { key: 'picked',   label: 'Picked' },
  { key: 'skipped',  label: 'Skipped' },
  { key: 'cooldown', label: 'Cooldown' },
  { key: 'cultural', label: 'Cultural-moment' },
];

const TIER_BG = { A: '#1A1C22', B: '#7A7D88', C: '#E07C24' };

export default function CandidatesTable({ candidates }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  // Mirror flagged state locally so toggling is instant; persists via fetch.
  const [flagged, setFlagged] = useState(() => {
    const init = {};
    for (const c of candidates) init[c.id] = !!c.flagged_for_curate;
    return init;
  });
  const [busy, setBusy] = useState(null);

  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  async function toggleFlag(id, ev) {
    ev.preventDefault(); ev.stopPropagation();
    const next = !flagged[id];
    setBusy(id);
    setFlagged((s) => ({ ...s, [id]: next })); // optimistic
    try {
      const res = await fetch(`/api/admin/news/candidates/${id}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: next }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      setFlagged((s) => ({ ...s, [id]: !next })); // revert on failure
      alert('Flag toggle failed: ' + e.message);
    } finally {
      setBusy(null);
    }
  }

  const filtered = useMemo(() => {
    let rows = candidates;
    if (filter === 'flagged') {
      rows = rows.filter((r) => flagged[r.id]);
    } else if (filter === 'cultural') {
      rows = rows.filter((r) => Array.isArray(r.topic_tags) && r.topic_tags.includes('cultural'));
    } else if (filter !== 'all') {
      rows = rows.filter((r) => r.status === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        r.title?.toLowerCase().includes(q) ||
        r.source_name?.toLowerCase().includes(q));
    }
    return rows;
  }, [candidates, filter, search, flagged]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map((f) => {
          const count = f.key === 'all'
            ? candidates.length
            : f.key === 'flagged'
              ? flaggedCount
              : f.key === 'cultural'
                ? candidates.filter((r) => Array.isArray(r.topic_tags) && r.topic_tags.includes('cultural')).length
                : candidates.filter((r) => r.status === f.key).length;
          const active = filter === f.key;
          const isFlaggedChip = f.key === 'flagged';
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '4px 10px',
                background: active ? '#1A1C22' : (isFlaggedChip && flaggedCount > 0 ? '#FEF3E0' : 'transparent'),
                color: active ? '#F4F2EE' : (isFlaggedChip && flaggedCount > 0 ? '#E07C24' : '#1A1C22'),
                border: isFlaggedChip && flaggedCount > 0 ? '1px solid #E07C24' : '1px solid rgba(0,0,0,0.16)',
                fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
              }}>
              {f.label} ({count}{isFlaggedChip ? '/3' : ''})
            </button>
          );
        })}
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or source…"
          style={{ padding: '4px 10px', fontSize: 12, border: '1px solid rgba(0,0,0,0.16)',
                   marginLeft: 'auto', minWidth: 220 }} />
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 18, color: '#7A7D88', fontStyle: 'italic', fontSize: 13 }}>
          No candidates match this filter.
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ border: '1px solid rgba(0,0,0,0.08)', maxHeight: 480, overflowY: 'auto' }}>
          {filtered.map((c, i) => {
            const isFlagged = !!flagged[c.id];
            return (
            <div key={c.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 14px',
                borderBottom: i === filtered.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                background: isFlagged ? '#FEF3E0' : (c.status === 'picked' ? '#F4F2EE' : '#fff'),
                borderLeft: isFlagged ? '3px solid #E07C24' : '3px solid transparent',
              }}>
              <button
                onClick={(ev) => toggleFlag(c.id, ev)}
                disabled={busy === c.id || c.status === 'picked'}
                title={c.status === 'picked' ? 'Already used by curator' : (isFlagged ? 'Unflag' : 'Flag for next curate')}
                style={{
                  flexShrink: 0, marginTop: 2,
                  width: 28, height: 28,
                  background: isFlagged ? '#E07C24' : 'transparent',
                  color: isFlagged ? '#fff' : '#7A7D88',
                  border: '1px solid ' + (isFlagged ? '#E07C24' : 'rgba(0,0,0,0.2)'),
                  fontSize: 14,
                  cursor: c.status === 'picked' ? 'not-allowed' : 'pointer',
                  opacity: c.status === 'picked' ? 0.3 : 1,
                }}>
                {isFlagged ? '★' : '☆'}
              </button>
              <a href={c.source_url} target="_blank" rel="noreferrer"
                 style={{ flex: 1, color: '#1A1C22', textDecoration: 'none',
                          display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#7A7D88', letterSpacing: 1, textTransform: 'uppercase' }}>
                <span style={{
                  background: TIER_BG[c.tier] || '#7A7D88', color: '#fff',
                  padding: '1px 6px', fontSize: 10, letterSpacing: 1.5,
                }}>{c.tier}</span>
                <span>{c.source_name}</span>
                <span>·</span>
                <span style={{ color: c.status === 'new' ? '#00A0A8' : c.status === 'picked' ? '#1A1C22' : '#7A7D88' }}>
                  {c.status}
                </span>
                {Array.isArray(c.topic_tags) && c.topic_tags.includes('cultural') && (
                  <span style={{ background: '#E07C24', color: '#fff', padding: '1px 6px', fontSize: 10 }}>cultural</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#7A7D88' }}>
                  {c.published_at ? new Date(c.published_at).toLocaleDateString() : ''}
                </span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.35 }}>{c.title}</div>
              </a>
            </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 11, color: '#7A7D88', letterSpacing: 1 }}>
        Showing {filtered.length} of {candidates.length} most-recent candidates · ★ flag = curator must include · click title to open source ↗
      </div>

      {flaggedCount > 3 && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#E07C24' }}>
          ⚠ {flaggedCount} flagged but only the 3 most-recently-flagged will be picked Sunday. The rest stay flagged for the next week.
        </div>
      )}
    </div>
  );
}
