'use client';
import { useState } from 'react';

export default function ApplicationCard({ app, mode }) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);

  async function action(name) {
    if (name === 'reject' && !confirm(`Reject application from ${app.first_name || app.email}?`)) return;
    if (name === 'approve' && !confirm(`Approve ${app.first_name || app.email}? This creates the ambassador and sends the welcome email.`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/recruitment-application-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: name, id: app.id, notes: editingNotes ? notes : undefined }),
      });
      if (!r.ok) { alert('Failed: ' + await r.text()); return; }
      location.reload();
    } finally { setBusy(false); }
  }

  const border = mode === 'pending' ? '#E07C24' : app.status === 'approved' ? '#00A0A8' : '#7A7D88';
  const fullName = [app.first_name, app.last_name].filter(Boolean).join(' ') || '(no name)';

  return (
    <div style={{ border: `1px solid ${border}`, padding: 18, background: '#fff', borderRadius: 4 }}>
      <div style={{ fontSize: 11, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        {new Date(app.created_at).toLocaleString()} &middot; {app.source} {app.source_touch ? `· touch ${app.source_touch}` : ''}
        {mode === 'reviewed' && <> &middot; <span style={{ color: app.status === 'approved' ? '#00A0A8' : '#E07C24' }}>{app.status}</span></>}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1C22', marginBottom: 2 }}>{fullName}</div>
      <div style={{ fontSize: 13, color: '#4A4F5C', marginBottom: 6 }}>{app.email} &middot; {app.phone || '—'} &middot; {app.company || '—'} &middot; {app.city || '—'}, {app.state || '—'}</div>
      {app.why_interested && <div style={{ fontSize: 14, fontStyle: 'italic', color: '#1A1C22', margin: '8px 0 12px', padding: '8px 12px', background: '#FAFBFC', borderLeft: '2px solid #00A0A8' }}>"{app.why_interested}"</div>}

      {mode === 'pending' && (
        <>
          {editingNotes ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Internal notes (optional)" style={{ width: '100%', padding: 8, fontSize: 13, border: '1px solid #E4E7EC', borderRadius: 3, marginBottom: 8 }} />
          ) : (
            <button onClick={() => setEditingNotes(true)} style={{ fontSize: 11, color: '#7A7D88', background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline', marginBottom: 8 }}>+ Add notes</button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => action('approve')} disabled={busy} style={{ padding: '8px 16px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE', border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Approve</button>
            <button onClick={() => action('reject')} disabled={busy} style={{ padding: '8px 16px', fontSize: 12, background: '#fff', color: '#E07C24', border: '1px solid #E07C24', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' }}>Reject</button>
          </div>
        </>
      )}
      {mode === 'reviewed' && app.notes && <div style={{ fontSize: 12, color: '#7A7D88', marginTop: 8 }}>Notes: {app.notes}</div>}
    </div>
  );
}
