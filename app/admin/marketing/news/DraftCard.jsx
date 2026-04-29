// app/admin/marketing/news/DraftCard.jsx
'use client';

import { useState } from 'react';

export default function DraftCard({ draft, mode }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(draft.caption || '');
  const [busy, setBusy] = useState(null);

  async function call(path, opts = {}) {
    setBusy(path);
    try {
      const res = await fetch(path, { method: 'POST', ...opts });
      if (!res.ok) throw new Error(await res.text());
      return res;
    } finally { setBusy(null); }
  }

  // Wraps an action so failures surface to the user instead of silent rejections.
  function safe(fn) {
    return async () => {
      try { await fn(); }
      catch (e) { alert('Action failed: ' + (e.message || String(e))); }
    };
  }

  async function approveAndDownload() {
    const res = await call(`/api/admin/news/approve/${draft.id}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.slot_date}-${slugify(draft.hook)}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    // Caption to clipboard
    try { await navigator.clipboard.writeText(captionWithHashtags(draft)); }
    catch (e) { /* clipboard may fail without HTTPS in some browsers */ }
    alert('Downloaded zip + caption copied. Now post to IG.');
    location.reload();
  }

  async function saveCaption() {
    await fetch(`/api/admin/news/update-caption/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption }),
    });
    setEditing(false);
    location.reload();
  }

  const accentBg = draft.accent_color === 'amber' ? '#E07C24' : '#00A0A8';

  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', padding: 18, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#7A7D88' }}>
        <span>{draft.slot_date}</span>
        <span style={{ background: accentBg, color: '#fff', padding: '2px 8px' }}>{draft.accent_color}</span>
        {draft.needs_legal_review && <span style={{ color: '#E07C24' }}>· legal review</span>}
        <span>· status: {draft.status}</span>
      </div>

      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{draft.hook}</div>

      {draft.image_urls?.length === 4 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {draft.image_urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer">
              <img src={u} alt={`slide ${i+1}`} style={{ width: 100, height: 125, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.08)' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 8 }}>
        Source: {draft.source_url ? <a href={draft.source_url} target="_blank" rel="noreferrer" style={{ color: '#00A0A8' }}>{draft.source_url}</a> : '—'}
      </div>

      {editing ? (
        <div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
            rows={6} style={{ width: '100%', fontSize: 13, padding: 8, fontFamily: 'inherit' }} />
          <div style={{ marginTop: 8 }}>
            <button onClick={saveCaption} style={btnPrimary}>Save</button>
            <button onClick={() => { setEditing(false); setCaption(draft.caption || ''); }}
              style={btnGhost}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#1A1C22', marginBottom: 6, whiteSpace: 'pre-wrap' }}>
          {draft.caption}
        </div>
      )}

      {draft.hashtags?.length > 0 && (
        <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 12 }}>
          {draft.hashtags.join(' ')}
        </div>
      )}

      {mode === 'ready' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={safe(approveAndDownload)} disabled={busy} style={btnPrimary}>
            {busy === `/api/admin/news/approve/${draft.id}` ? 'Zipping…' : 'Approve & Download'}
          </button>
          <button onClick={() => setEditing(true)} disabled={busy} style={btnGhost}>Edit caption</button>
          <button onClick={safe(async () => { await call(`/api/admin/news/regenerate/${draft.id}`); location.reload(); })}
            disabled={busy} style={btnGhost}>Regenerate</button>
          <button onClick={safe(async () => { await call(`/api/admin/news/flip-color/${draft.id}`); location.reload(); })}
            disabled={busy} style={btnGhost}>Flip color</button>
          <button onClick={safe(async () => { await call(`/api/admin/news/skip/${draft.id}`); location.reload(); })}
            disabled={busy} style={btnGhost}>Skip</button>
          {draft.status === 'render_failed' && (
            <button onClick={safe(async () => { await call(`/api/admin/news/render/${draft.id}`); location.reload(); })}
              disabled={busy} style={btnGhost}>Retry render</button>
          )}
        </div>
      )}

      {mode === 'legal' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={safe(async () => { await call(`/api/admin/news/force-approve/${draft.id}`); location.reload(); })}
            style={btnPrimary}>Force-approve</button>
          <button onClick={safe(async () => { await call(`/api/admin/news/skip/${draft.id}`); location.reload(); })}
            style={btnGhost}>Drop</button>
        </div>
      )}
    </div>
  );
}

function captionWithHashtags(d) {
  return [(d.caption || '').trim(), (d.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
}

function slugify(s) {
  return String(s || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

const btnPrimary = { padding: '8px 14px', background: '#1A1C22', color: '#F4F2EE',
  border: 0, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' };

const btnGhost = { padding: '8px 14px', background: 'transparent', color: '#1A1C22',
  border: '1px solid rgba(0,0,0,0.16)', fontSize: 12, letterSpacing: 1,
  textTransform: 'uppercase', cursor: 'pointer' };
