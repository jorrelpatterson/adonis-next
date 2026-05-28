'use client';
import { useState } from 'react';

export default function SendButton({ draftId, compoundName, resume = false }) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);

  async function send() {
    const label = resume ? `Resume sending ${compoundName}?` : `Send ${compoundName} dispatch now? This blasts the full subscriber + ambassador + customer list.`;
    if (!confirm(label)) return;
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: null, calls: 0 });
    try {
      let remaining = 1;
      while (remaining > 0) {
        const r = await fetch('/api/compound-email-send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft_id: draftId, chunk_size: 500 }),
        });
        if (!r.ok) {
          alert('Send failed: ' + await r.text());
          break;
        }
        const data = await r.json();
        remaining = data.remaining;
        setProgress(p => ({
          sent: data.sent_total,
          failed: data.failed_total,
          total: data.sent_total + data.failed_total + data.remaining,
          calls: (p?.calls || 0) + 1,
        }));
        if (data.status === 'sent') break;
      }
      alert('Send complete.');
      location.reload();
    } finally {
      setSending(false);
    }
  }

  const label = resume ? 'Resume sending' : 'Send now';

  return (
    <>
      <button onClick={send} disabled={sending} style={{
        padding: '6px 12px', fontSize: 12, background: '#E07C24', color: '#F4F2EE',
        border: 0, cursor: 'pointer', borderRadius: 3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
      }}>
        {sending ? 'Sending…' : label}
      </button>
      {sending && progress && (
        <span style={{ fontSize: 11, color: '#7A7D88', letterSpacing: 1 }}>
          {progress.sent} sent {progress.failed > 0 && `· ${progress.failed} failed`} / {progress.total ?? '?'} · call {progress.calls}
        </span>
      )}
    </>
  );
}
