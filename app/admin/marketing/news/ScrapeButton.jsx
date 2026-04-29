'use client';

import { useState } from 'react';

export default function ScrapeButton() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch('/api/cron/news-scrape', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert('Scrape failed: ' + (data.error || res.status));
      } else {
        const errLine = data.errors?.length ? `\n\n${data.errors.length} sources errored — check Source health detail.` : '';
        alert(`Scrape complete: ${data.inserted} new candidates inserted.${errLine}`);
      }
      location.reload();
    } catch (e) {
      alert('Scrape failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={run} disabled={busy}
      style={{ padding: '10px 18px', background: '#1A1C22', color: '#F4F2EE',
               border: 0, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
               cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
      {busy ? 'Scraping…' : 'Run scrape now'}
    </button>
  );
}
