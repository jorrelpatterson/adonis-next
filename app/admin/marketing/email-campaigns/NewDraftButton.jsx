'use client';
import { useState } from 'react';

export default function NewDraftButton({ compounds }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!slug) { alert('Choose a compound'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/compound-email-draft-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', compound_slug: slug }),
      });
      if (!r.ok) { alert('Create failed: ' + await r.text()); return; }
      location.reload();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '10px 20px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE',
        border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700,
      }}>+ New draft</button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#F4F2EE', padding: 32, borderRadius: 6, maxWidth: 480, width: '90%' }}>
            <h2 style={{ margin: 0, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>New compound dispatch</h2>
            <label style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#4A4F5C', display: 'block', marginBottom: 4 }}>Compound</label>
            <select value={slug} onChange={e => setSlug(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 14, marginBottom: 16, border: '1px solid #E4E7EC', borderRadius: 3 }}>
              <option value="">— select —</option>
              {compounds.map(c => (
                <option key={c.compound_slug} value={c.compound_slug}>
                  {c.compound_name} {c.category ? `(${c.category})` : ''}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '8px 16px', fontSize: 12, background: '#fff', border: '1px solid #1A1C22', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' }}>Cancel</button>
              <button onClick={create} disabled={busy || !slug} style={{ padding: '8px 16px', fontSize: 12, background: '#00A0A8', color: '#F4F2EE', border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
