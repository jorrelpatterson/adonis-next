'use client';
import { useState } from 'react';
import SendButton from './SendButton';

export default function DraftCard({ draft, mode }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    hook: draft.hook || '',
    tagline: draft.tagline || '',
    layman_lead: draft.layman_lead || '',
    layman_bridge: draft.layman_bridge || '',
    bullet_1: draft.bullet_1 || '',
    bullet_2: draft.bullet_2 || '',
    bullet_3: draft.bullet_3 || '',
    citations_short: draft.citations_short || '',
    category_label: draft.category_label || '',
    show_stock_stamp: !!draft.show_stock_stamp,
    notes: draft.notes || '',
  });
  const [busy, setBusy] = useState(false);

  async function call(action, body) {
    setBusy(true);
    try {
      const r = await fetch('/api/compound-email-draft-write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: draft.id, ...body }),
      });
      if (!r.ok) { alert('Failed: ' + await r.text()); return false; }
      return true;
    } finally { setBusy(false); }
  }

  async function save() {
    const ok = await call('update', { fields });
    if (ok) { setEditing(false); location.reload(); }
  }
  async function markReady() {
    const ok = await call('update', { fields: { ...fields, status: 'ready' } });
    if (ok) location.reload();
  }
  async function unmarkReady() {
    const ok = await call('update', { fields: { status: 'draft' } });
    if (ok) location.reload();
  }
  async function deleteDraft() {
    if (!confirm(`Delete draft for ${draft.compound_name}?`)) return;
    const ok = await call('delete');
    if (ok) location.reload();
  }
  async function resume() {
    if (!confirm('Resume sending failed recipients?')) return;
    const r = await fetch('/api/compound-email-resume', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: draft.id }),
    });
    if (!r.ok) { alert('Resume failed'); return; }
    location.reload();
  }

  async function generate() {
    if (!confirm('Generate AI copy for tagline, layman lead/bridge, bullets, and citations? This overwrites existing values in those fields.')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/compound-email-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id }),
      });
      if (!r.ok) { alert('Generate failed: ' + await r.text()); return; }
      location.reload();
    } finally { setBusy(false); }
  }

  const cardStyle = {
    border: mode === 'needsCopy' ? '1px solid #E07C24' : '1px solid #E4E7EC',
    background: '#fff', padding: 18, borderRadius: 4,
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, fontSize: 11, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase', flexWrap: 'wrap' }}>
        <span style={{ color: '#00A0A8', fontWeight: 700 }}>Dispatch No. {draft.dispatch_no}</span>
        <span>&middot;</span>
        <span>{draft.compound_name}</span>
        <span>&middot;</span>
        <span>{draft.trigger}</span>
        {draft.scheduled_at && mode !== 'sent' && (
          <>
            <span>&middot;</span>
            <span>scheduled {new Date(draft.scheduled_at).toLocaleDateString()}</span>
          </>
        )}
        {mode === 'sent' && (
          <>
            <span>&middot;</span>
            <span>sent {new Date(draft.sent_at).toLocaleDateString()}</span>
            <span>&middot;</span>
            <span>{draft.recipient_count_sent} / {draft.recipient_count} delivered</span>
            {draft.recipient_count_failed > 0 && <span style={{ color: '#E07C24' }}>· {draft.recipient_count_failed} failed</span>}
          </>
        )}
      </div>

      <div style={{ fontSize: 18, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic', color: '#1A1C22', marginBottom: 4 }}>
        &ldquo;{draft.hook || '—'}&rdquo;
      </div>

      {!editing && (
        <div style={{ fontSize: 13, color: '#4A4F5C', lineHeight: 1.6, marginBottom: 12 }}>
          {draft.layman_lead || <span style={{ color: '#E07C24' }}>Needs layman lead copy.</span>}
        </div>
      )}

      {editing && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {[
            ['hook', 'Hook (italic Cormorant — e.g. "Lost the connection?")', false],
            ['tagline', 'Tagline (italic cyan — e.g. "The bonding nonapeptide.")', false],
            ['category_label', 'Category label (header eyebrow — e.g. "SOCIAL · BONDING")', false],
            ['layman_lead', 'Layman lead (plain-English para 1)', true],
            ['layman_bridge', 'Layman bridge (plain-English para 2)', true],
            ['bullet_1', 'Bullet 1', false],
            ['bullet_2', 'Bullet 2', false],
            ['bullet_3', 'Bullet 3', false],
            ['citations_short', 'Citations (short, uppercase — e.g. "CARTER 2014 · HEINRICHS 2003")', false],
            ['notes', 'Internal notes', true],
          ].map(([k, label, ta]) => (
            <label key={k} style={{ fontSize: 11, color: '#4A4F5C' }}>
              <span style={{ display: 'block', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</span>
              {ta
                ? <textarea value={fields[k]} onChange={e => setFields({ ...fields, [k]: e.target.value })} rows={2} style={{ width: '100%', fontSize: 13, padding: 8, border: '1px solid #E4E7EC', borderRadius: 3 }} />
                : <input value={fields[k]} onChange={e => setFields({ ...fields, [k]: e.target.value })} style={{ width: '100%', fontSize: 13, padding: 8, border: '1px solid #E4E7EC', borderRadius: 3 }} />}
            </label>
          ))}
          <label style={{ fontSize: 13, color: '#4A4F5C' }}>
            <input type="checkbox" checked={fields.show_stock_stamp} onChange={e => setFields({ ...fields, show_stock_stamp: e.target.checked })} />
            {' '}Show "Now in stock" stamp above the CTA
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!editing && (mode === 'draft' || mode === 'needsCopy' || mode === 'ready') && (
          <button onClick={generate} disabled={busy} style={btnPrimary}>✨ Generate copy</button>
        )}
        {!editing && mode !== 'sent' && (
          <button onClick={() => setEditing(true)} disabled={busy} style={btn}>Edit</button>
        )}
        {editing && <button onClick={save} disabled={busy} style={btnPrimary}>Save</button>}
        {editing && <button onClick={() => setEditing(false)} disabled={busy} style={btn}>Cancel</button>}

        <a href={`/api/compound-email-preview?id=${draft.id}`} target="_blank" rel="noreferrer" style={btnLink}>Preview &rarr;</a>

        {(mode === 'draft' || mode === 'needsCopy') && (
          <button onClick={markReady} disabled={busy || editing} style={btnPrimary}>Mark ready</button>
        )}
        {mode === 'ready' && (
          <>
            <button onClick={unmarkReady} disabled={busy} style={btn}>Move back to draft</button>
            <SendButton draftId={draft.id} compoundName={draft.compound_name} />
          </>
        )}
        {mode === 'inProgress' && (
          <>
            <SendButton draftId={draft.id} compoundName={draft.compound_name} resume />
            <button onClick={resume} disabled={busy} style={btn}>Re-queue failed</button>
          </>
        )}
        {mode !== 'sent' && mode !== 'inProgress' && (
          <button onClick={deleteDraft} disabled={busy} style={btnDanger}>Delete</button>
        )}
      </div>
    </div>
  );
}

const btn = { padding: '6px 12px', fontSize: 12, border: '1px solid #1A1C22', background: '#fff', cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase' };
const btnPrimary = { ...btn, background: '#00A0A8', color: '#F4F2EE', borderColor: '#00A0A8' };
const btnDanger = { ...btn, color: '#E07C24', borderColor: '#E07C24' };
const btnLink = { ...btn, textDecoration: 'none', color: '#1A1C22' };
