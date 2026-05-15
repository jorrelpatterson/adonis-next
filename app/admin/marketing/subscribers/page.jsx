'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const s = {
  h1: { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  sub: { color:'#8C919E', marginBottom:24, fontSize:14 },
  card: { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', padding:20 },
  stat: { fontSize:28, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif" },
  label: { fontSize:10, color:'#8C919E', letterSpacing:1, textTransform:'uppercase', marginTop:4 },
  th: { textAlign:'left', padding:'10px 12px', fontSize:10, color:'#8C919E', letterSpacing:1, textTransform:'uppercase', borderBottom:'1px solid #E4E7EC', background:'#FAFBFC' },
  td: { padding:'10px 12px', fontSize:13, color:'#1A1C22', borderBottom:'1px solid #F3F4F6' },
  btn: { fontSize:11, padding:'4px 10px', border:'1px solid #E4E7EC', borderRadius:3, background:'#fff', cursor:'pointer' },
  btnPrimary: { fontSize:12, padding:'8px 16px', border:'none', borderRadius:4, background:'#00A0A8', color:'#fff', cursor:'pointer', fontWeight:600, letterSpacing:1 },
  badge: (bg, fg) => ({ fontSize:9, padding:'2px 8px', background:bg, color:fg, borderRadius:3, letterSpacing:1, textTransform:'uppercase', fontWeight:600, display:'inline-block' }),
};

const STATUS_BADGE = {
  none:    s.badge('#F3F4F6','#6B7280'),
  sent:    s.badge('#DCFCE7','#16A34A'),
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0,10);
}
function daysSince(iso) {
  if (!iso) return null;
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  return days >= 1 ? Math.floor(days) + 'd ago' : 'today';
}

export default function SubscribersPage() {
  const [data, setData] = useState({ subscribers: [], stats: { total:0, welcome_1_only:0, welcome_2_sent:0, welcome_3_sent:0 } });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sending, setSending] = useState({});
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/subscribers-admin');
    if (r.ok) setData(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sendOne = async (id, template) => {
    const key = `${id}-${template}`;
    setSending(prev => ({ ...prev, [key]: true }));
    const r = await fetch('/api/subscribers-admin', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'send', id, template }),
    });
    setSending(prev => ({ ...prev, [key]: false }));
    if (!r.ok) { const e = await r.json().catch(()=>({})); alert('Send failed: ' + (e.error || r.status)); return; }
    await load();
  };

  const runCron = async () => {
    if (!confirm('Run the welcome-email cron now? This will send welcome 2 and welcome 3 to all eligible subscribers.')) return;
    setCronRunning(true);
    setCronResult(null);
    const r = await fetch('/api/subscribers-admin', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'run-cron' }),
    });
    const data = await r.json();
    setCronRunning(false);
    setCronResult(data);
    await load();
  };

  const filtered = data.subscribers.filter(sub => {
    if (filter === 'all') return true;
    if (filter === 'welcome_1') return !sub.welcome_2_sent_at && !sub.welcome_3_sent_at;
    if (filter === 'welcome_2') return sub.welcome_2_sent_at && !sub.welcome_3_sent_at;
    if (filter === 'welcome_3') return sub.welcome_3_sent_at;
    return true;
  });

  return (
    <div>
      <h1 className="admin-page-h1" style={s.h1}>Subscribers</h1>
      <p style={s.sub}>{loading ? 'Loading…' : `${data.stats.total} subscribers · welcome-email drip`}</p>

      <div className="admin-tile-row" style={{ marginBottom:24 }}>
        {[
          { label:'Total',          value:data.stats.total,          color:'#0F1928', key:'all' },
          { label:'Welcome 1 only', value:data.stats.welcome_1_only, color:'#A78BFA', key:'welcome_1' },
          { label:'Welcome 2 sent', value:data.stats.welcome_2_sent, color:'#0072B5', key:'welcome_2' },
          { label:'Welcome 3 sent', value:data.stats.welcome_3_sent, color:'#16A34A', key:'welcome_3' },
        ].map(c => (
          <div key={c.key} onClick={()=>setFilter(c.key)}
            style={{ ...s.card, borderTop:`3px solid ${c.color}`, cursor:'pointer', outline: filter === c.key ? `2px solid ${c.color}` : 'none' }}>
            <div style={{ ...s.stat, color:c.color }}>{c.value}</div>
            <div style={s.label}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button style={s.btnPrimary} disabled={cronRunning} onClick={runCron}>
          {cronRunning ? 'Running cron…' : '⏱ Run cron now'}
        </button>
        <span style={{ fontSize:12, color:'#8C919E' }}>
          Scheduled daily at 10am PT · welcome 2 on day 3 · welcome 3 on day 8
        </span>
      </div>

      {cronResult && (
        <div style={{ ...s.card, padding:14, marginBottom:16, fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:'#4A4F5C', background:'#F9FAFB' }}>
          <div style={{ fontWeight:600, marginBottom:6 }}>Last run: {cronResult.ran_at?.slice(0,19).replace('T',' ')}</div>
          {cronResult.welcome_2 && (
            <div>W2: attempted {cronResult.welcome_2.attempted} · sent {cronResult.welcome_2.sent} · failed {cronResult.welcome_2.failed}</div>
          )}
          {cronResult.welcome_3 && (
            <div>W3: attempted {cronResult.welcome_3.attempted} · sent {cronResult.welcome_3.sent} · failed {cronResult.welcome_3.failed}</div>
          )}
        </div>
      )}

      <div className="admin-table-scroll" style={{ ...s.card, padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={s.th}>Email</th>
              <th style={s.th}>Source</th>
              <th style={s.th}>Signed up</th>
              <th style={s.th}>Welcome 2</th>
              <th style={s.th}>Welcome 3</th>
              <th style={{ ...s.th, textAlign:'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign:'center', color:'#8C919E', padding:'32px 12px' }}>No subscribers in this filter.</td></tr>
            )}
            {filtered.map(sub => (
              <tr key={sub.id}>
                <td style={s.td}><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{sub.email}</span></td>
                <td style={s.td}><span style={{ fontSize:11, color:'#8C919E' }}>{sub.source || '—'}</span></td>
                <td style={s.td}><span style={{ fontSize:12 }}>{fmtDate(sub.subscribed_at)}</span> <span style={{ fontSize:10, color:'#8C919E' }}>({daysSince(sub.subscribed_at)})</span></td>
                <td style={s.td}>
                  {sub.welcome_2_sent_at
                    ? <span style={STATUS_BADGE.sent}>sent {fmtDate(sub.welcome_2_sent_at)}</span>
                    : <span style={STATUS_BADGE.none}>—</span>}
                </td>
                <td style={s.td}>
                  {sub.welcome_3_sent_at
                    ? <span style={STATUS_BADGE.sent}>sent {fmtDate(sub.welcome_3_sent_at)}</span>
                    : <span style={STATUS_BADGE.none}>—</span>}
                </td>
                <td style={{ ...s.td, textAlign:'right' }}>
                  {!sub.welcome_2_sent_at && (
                    <button style={s.btn} disabled={sending[`${sub.id}-2`]}
                      onClick={()=>sendOne(sub.id, 2)}>
                      {sending[`${sub.id}-2`] ? '…' : 'Send W2'}
                    </button>
                  )}
                  {sub.welcome_2_sent_at && !sub.welcome_3_sent_at && (
                    <button style={{ ...s.btn, marginLeft:6 }} disabled={sending[`${sub.id}-3`]}
                      onClick={()=>sendOne(sub.id, 3)}>
                      {sending[`${sub.id}-3`] ? '…' : 'Send W3'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
