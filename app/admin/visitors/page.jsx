'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const s = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', padding: 24 },
  stat: { fontSize: 32, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" },
  label: { fontSize: 11, color: '#8C919E', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  section: { fontSize: 13, fontWeight: 700, color: '#0F1928', textTransform: 'uppercase', letterSpacing: 1, margin: '32px 0 12px' },
  th: { textAlign: 'left', fontSize: 10, color: '#8C919E', letterSpacing: 1, textTransform: 'uppercase', padding: '8px 12px', borderBottom: '1px solid #E4E7EC' },
  td: { fontSize: 13, color: '#0F1928', padding: '10px 12px', borderBottom: '1px solid #F1F3F7', whiteSpace: 'nowrap' },
};

const TYPE_COLOR = {
  pageview: '#8C919E', product_view: '#0072B5', add_to_cart: '#E07C24',
  checkout_start: '#A16207', identify: '#00A0A8',
};

function fmt(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Badge({ text, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
      color, background: color + '18', padding: '2px 8px', borderRadius: 4,
    }}>{text}</span>
  );
}

export default function VisitorsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visitors: 0, identified: 0, events24: 0, candidates: 0, optouts: 0 });
  const [events, setEvents] = useState([]);
  const [identified, setIdentified] = useState([]);
  const [sends, setSends] = useState([]);
  const [liveMode, setLiveMode] = useState(null); // inferred from recovery_sends statuses

  useEffect(() => {
    async function load() {
      const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      try {
        const [vTotal, vId, ev24, recvAll, optTotal, recentEv, idList, recentSends] = await Promise.all([
          supabase.from('visitors').select('vid', { count: 'exact', head: true }),
          supabase.from('visitors').select('vid', { count: 'exact', head: true }).not('identified_email', 'is', null),
          supabase.from('visitor_events').select('id', { count: 'exact', head: true }).gte('created_at', since24),
          supabase.from('recovery_sends').select('id', { count: 'exact', head: true }),
          supabase.from('email_optout').select('email', { count: 'exact', head: true }),
          supabase.from('visitor_events').select('created_at,type,email,product,url').order('created_at', { ascending: false }).limit(40),
          supabase.from('visitors').select('identified_email,first_seen,last_seen').not('identified_email', 'is', null).order('last_seen', { ascending: false }).limit(50),
          supabase.from('recovery_sends').select('sent_at,status,trigger_type,email').order('sent_at', { ascending: false }).limit(40),
        ]);

        setStats({
          visitors: vTotal.count ?? 0,
          identified: vId.count ?? 0,
          events24: ev24.count ?? 0,
          candidates: recvAll.count ?? 0,
          optouts: optTotal.count ?? 0,
        });
        setEvents(recentEv.data || []);
        setIdentified(idList.data || []);
        setSends(recentSends.data || []);

        const statuses = (recentSends.data || []).map(r => r.status);
        if (statuses.length === 0) setLiveMode(null);
        else setLiveMode(statuses.some(st => st === 'sent') ? 'live' : 'dryrun');
      } catch (e) {
        // leave defaults on error
      }
      setLoading(false);
    }
    load();
  }, []);

  const tiles = [
    { label: 'Total visitors', value: stats.visitors, color: '#00A0A8' },
    { label: 'Identified', value: stats.identified, color: '#0072B5' },
    { label: 'Events (24h)', value: stats.events24, color: '#E07C24' },
    { label: 'Recovery candidates', value: stats.candidates, color: '#A16207' },
    { label: 'Opt-outs', value: stats.optouts, color: stats.optouts > 0 ? '#DC2626' : '#22C55E' },
  ];

  return (
    <div>
      <h1 className="admin-page-h1" style={s.h1}>Visitor Recovery</h1>
      <p style={{ color: '#8C919E', marginBottom: 20, fontSize: 14 }}>
        {loading ? 'Loading…' : 'Live first-party tracking'} · advncelabs.com
      </p>

      {liveMode === 'dryrun' && (
        <div style={{ ...s.card, borderLeft: '3px solid #A16207', background: '#FFFBF2', marginBottom: 24, padding: 16 }}>
          <strong style={{ color: '#A16207' }}>Dry-run mode.</strong>{' '}
          <span style={{ fontSize: 13, color: '#5A4A2A' }}>
            The recovery cron is logging candidates but <strong>not sending emails</strong>. Set{' '}
            <code style={{ background: '#F1E9D5', padding: '1px 5px', borderRadius: 3 }}>RECOVERY_LIVE=true</code>{' '}
            in the advnce-site Vercel project to go live.
          </span>
        </div>
      )}
      {liveMode === 'live' && (
        <div style={{ ...s.card, borderLeft: '3px solid #22C55E', background: '#F2FBF5', marginBottom: 24, padding: 16 }}>
          <strong style={{ color: '#15803D' }}>Live.</strong>{' '}
          <span style={{ fontSize: 13, color: '#2A5A3A' }}>Recovery emails are being sent to abandoning visitors.</span>
        </div>
      )}

      <div className="admin-tile-row" style={{ marginBottom: 8 }}>
        {tiles.map((item, i) => (
          <div key={i} style={{ ...s.card, borderTop: `3px solid ${item.color}` }}>
            <div className="admin-tile-val" style={{ ...s.stat, color: item.color }}>{loading ? '—' : item.value}</div>
            <div className="admin-tile-label" style={s.label}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Recovery candidates */}
      <div style={s.section}>Recovery candidates</div>
      <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={s.th}>When</th><th style={s.th}>Status</th><th style={s.th}>Trigger</th><th style={s.th}>Email</th>
          </tr></thead>
          <tbody>
            {sends.length === 0 && (
              <tr><td style={{ ...s.td, color: '#8C919E' }} colSpan={4}>No recovery candidates yet. They appear when an identified visitor abandons a checkout (30m) or cart (60m).</td></tr>
            )}
            {sends.map((r, i) => (
              <tr key={i}>
                <td style={s.td}>{fmt(r.sent_at)}</td>
                <td style={s.td}>{r.status === 'sent'
                  ? <Badge text="sent" color="#22C55E" />
                  : <Badge text="dry-run" color="#A16207" />}</td>
                <td style={s.td}>{r.trigger_type === 'abandoned_checkout' ? 'Abandoned checkout' : 'Cart'}</td>
                <td style={s.td}>{r.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Identified visitors */}
      <div style={s.section}>Identified visitors ({stats.identified})</div>
      <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={s.th}>Email</th><th style={s.th}>First seen</th><th style={s.th}>Last seen</th>
          </tr></thead>
          <tbody>
            {identified.length === 0 && (
              <tr><td style={{ ...s.td, color: '#8C919E' }} colSpan={3}>No identified visitors yet. A visitor is identified when they subscribe or enter their email at checkout.</td></tr>
            )}
            {identified.map((v, i) => (
              <tr key={i}>
                <td style={s.td}>{v.identified_email}</td>
                <td style={s.td}>{fmt(v.first_seen)}</td>
                <td style={s.td}>{fmt(v.last_seen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent activity */}
      <div style={s.section}>Recent activity</div>
      <div style={{ ...s.card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={s.th}>When</th><th style={s.th}>Event</th><th style={s.th}>Email</th><th style={s.th}>Product / Page</th>
          </tr></thead>
          <tbody>
            {events.length === 0 && (
              <tr><td style={{ ...s.td, color: '#8C919E' }} colSpan={4}>No events yet.</td></tr>
            )}
            {events.map((e, i) => (
              <tr key={i}>
                <td style={s.td}>{fmt(e.created_at)}</td>
                <td style={s.td}><Badge text={e.type} color={TYPE_COLOR[e.type] || '#8C919E'} /></td>
                <td style={s.td}>{e.email || '—'}</td>
                <td style={{ ...s.td, color: '#5A6273' }}>{e.product || e.url || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
