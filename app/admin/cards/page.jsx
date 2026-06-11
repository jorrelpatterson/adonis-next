// app/admin/cards/page.jsx
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { refUrl } from '../../../lib/businessCard';
import { CardFront, CardBack } from './BusinessCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const s = {
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  sub: { color: '#8C919E', marginBottom: 24, fontSize: 14 },
  select: { padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, outline: 'none', background: '#FAFBFC', minWidth: 280 },
  btn: { padding: '8px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#00A0A8', color: '#fff' },
};

export default function CardsPage() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/ambassadors?select=id,name,code,status&order=name.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then(r => { if (!r.ok) throw new Error(`ambassadors fetch ${r.status}`); return r.json(); })
      .then(d => setAmbassadors(Array.isArray(d) ? d : []))
      .catch(e => { console.error(e); setLoadError(true); })
      .finally(() => setLoading(false));
  }, []);

  const amb = ambassadors.find(a => a.id === selectedId) || null;
  const ambCode = amb?.code || '';

  useEffect(() => {
    if (!ambCode) { setQrSvg(''); return; }
    let stale = false;
    QRCode.toString(refUrl(ambCode), {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 4,
      color: { dark: '#1A1C22', light: '#FFFFFF' },
    }).then(svg => { if (!stale) setQrSvg(svg); }).catch(console.error);
    return () => { stale = true; };
  }, [ambCode]);

  const printCards = async () => {
    await document.fonts.ready; // avoid printing with fallback fonts
    window.print();
  };

  return (
    <div>
      {/* Card fonts: ensure the exact weights exist regardless of layout-level fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" />
      <style>{`
        #print-cards .qr-box svg { width: 100%; height: 100%; display: block; }
        @media screen {
          #print-cards { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 24px; }
          #print-cards > div { box-shadow: 0 2px 14px rgba(0,0,0,0.18); }
        }
        @page { size: 3.625in 2.125in; margin: 0; }
        @media print {
          html, body { background: #fff; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #print-cards, #print-cards * { visibility: visible; }
          #print-cards { position: absolute; left: 0; top: 0; margin: 0; }
          #print-cards > div { page-break-after: always; box-shadow: none; }
          #print-cards > div:last-child { page-break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print">
        <h1 className="admin-page-h1" style={s.h1}>Business Cards</h1>
        <p style={s.sub}>Print-ready ambassador cards · 3.5″ × 2″ + bleed · Print → &quot;Save as PDF&quot; for the print shop</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">{loading ? 'Loading ambassadors…' : 'Select an ambassador…'}</option>
            {ambassadors.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {a.code}{a.status && a.status !== 'active' ? ` (${a.status})` : ''}</option>
            ))}
          </select>
          {amb && amb.code && <button style={{ ...s.btn, opacity: qrSvg ? 1 : 0.5 }} onClick={printCards} disabled={!qrSvg}>Print / Save PDF</button>}
          {amb && !amb.code && <span style={{ color: '#DC2626', fontSize: 13 }}>This ambassador has no code — set one on the Ambassadors page first.</span>}
          {loadError && <span style={{ color: '#DC2626', fontSize: 13 }}>Could not load ambassadors — refresh to retry.</span>}
        </div>
      </div>

      {amb && amb.code && (
        <div id="print-cards">
          <CardFront />
          <CardBack name={amb.name} code={amb.code} ambassadorId={amb.id} qrSvg={qrSvg} />
        </div>
      )}
    </div>
  );
}
