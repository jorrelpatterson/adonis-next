'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` });

const s = {
  back: { fontSize:12, color:'#0072B5', textDecoration:'none', marginBottom:16, display:'inline-block' },
  h1: { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  sub: { color:'#8C919E', marginBottom:24, fontSize:14, maxWidth:780 },
  kpiRow: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:32 },
  kpi: {
    background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', padding:18,
  },
  kpiNum: { fontSize:32, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif", color:'#0F1928' },
  kpiLabel: { fontSize:10, color:'#8C919E', letterSpacing:1.5, textTransform:'uppercase', marginTop:4 },
  sectionLabel: { fontSize:11, color:'#8C919E', letterSpacing:2, textTransform:'uppercase', marginBottom:12, marginTop:24, fontWeight:600 },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', border:'1px solid #E4E7EC', borderRadius:8, overflow:'hidden' },
  th: { padding:'12px 14px', textAlign:'left', borderBottom:'1px solid #E4E7EC', background:'#FAFBFC', fontSize:10, color:'#8C919E', letterSpacing:1.5, textTransform:'uppercase', fontWeight:600 },
  td: { padding:'12px 14px', borderBottom:'1px solid #F3F4F6', fontSize:13, color:'#0F1928', verticalAlign:'top' },
  hook: { fontWeight:700, fontSize:14 },
  status: { display:'inline-block', fontSize:9, padding:'2px 8px', borderRadius:3, letterSpacing:1, textTransform:'uppercase', fontWeight:600 },
  scheduled: { background:'#F3F4F6', color:'#6B7280' },
  posted: { background:'#DCFCE7', color:'#16A34A' },
  draft: { background:'#FEF3C7', color:'#A16207' },
  archived: { background:'#FEE2E2', color:'#DC2626' },
  modPill: { display:'inline-block', fontSize:9, padding:'1px 6px', borderRadius:3, marginLeft:8, letterSpacing:1, textTransform:'uppercase', fontWeight:600 },
  modLow: { background:'#DCFCE7', color:'#16A34A' },
  modMed: { background:'#FEF3C7', color:'#A16207' },
  modHigh: { background:'#FEE2E2', color:'#DC2626' },
};

// Hook library with mod-risk for visual reference. Order doesn't matter here —
// the table sorts by scheduled_date.
const HOOK_RISK = {
  "Dead bedroom?": "medium",
  "Belly won't budge?": "medium",
  "Workouts not landing?": "medium",
  "Body slowing down?": "medium",
  "Gym and sleep, both off?": "medium",
  "Lifting more, growing less?": "medium",
  "Not yourself?": "medium",
  "Can't eat enough?": "medium",
  "Gains plateau?": "high",
  "Same plateau, smaller doses?": "high",
  "T levels low?": "medium",
  "Can't tan, just burn?": "medium",
  "Always inflamed?": "medium",
};

function fmtDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('default', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

function getRiskLevel(hook) {
  return HOOK_RISK[hook] || 'low';
}

function getRiskStyle(level) {
  if (level === 'high') return s.modHigh;
  if (level === 'medium') return s.modMed;
  return s.modLow;
}

export default function PeptideForThatCampaign() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      // Filter on image_path — campaign uses ptt-* prefix
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/social_posts?select=*&image_path=like.${encodeURIComponent('/social-images/ptt-%')}&order=scheduled_date.asc`,
        { headers: H() }
      );
      setPosts(await r.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:32,color:'#8C919E'}}>Loading campaign...</div>;

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    posted: posts.filter(p => p.status === 'posted').length,
    upcoming: posts.filter(p => p.status === 'scheduled' && p.scheduled_date >= new Date().toISOString().slice(0,10)).length,
  };
  const next = posts.find(p => p.status === 'scheduled' && p.scheduled_date >= new Date().toISOString().slice(0,10));

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  return (
    <div>
      <Link href="/admin/marketing/campaigns" style={s.back}>← Campaigns</Link>
      <h1 className="admin-page-h1" style={s.h1}>There's a peptide for that</h1>
      <p style={s.sub}>
        Apple-riff Instagram series. 46 layman hooks → research-grade reveal slides covering every peptide in catalog (excluding PNC-27, Dermorphin, and the weight-loss queue which is email-only). Weekly Fridays.
      </p>
      <p style={{ ...s.sub, marginTop:-12 }}>
        See <Link href="/admin/marketing/content" style={{color:'#0072B5'}}>content calendar</Link> for full preview/edit · <Link href="/social-images/peptide-for-that-deadbedroom.html" style={{color:'#0072B5'}} target="_blank">design template (Dead bedroom mockup)</Link>
      </p>

      <div style={s.kpiRow}>
        <div style={s.kpi}>
          <div style={s.kpiNum}>{stats.total}</div>
          <div style={s.kpiLabel}>Total posts</div>
        </div>
        <div style={s.kpi}>
          <div style={{...s.kpiNum, color:'#0072B5'}}>{stats.upcoming}</div>
          <div style={s.kpiLabel}>Upcoming</div>
        </div>
        <div style={s.kpi}>
          <div style={{...s.kpiNum, color:'#16A34A'}}>{stats.posted}</div>
          <div style={s.kpiLabel}>Posted</div>
        </div>
        <div style={s.kpi}>
          <div style={{...s.kpiNum, color:'#0F1928', fontSize:18, lineHeight:1.2}}>
            {next ? fmtDate(next.scheduled_date) : '—'}
          </div>
          <div style={s.kpiLabel}>Next post</div>
          {next && <div style={{ fontSize:12, color:'#4A4F5C', marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>{next.caption.split('\n')[0]}</div>}
        </div>
      </div>

      <div style={{ marginBottom:14, display:'flex', gap:8 }}>
        {['all','scheduled','posted','draft','archived'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding:'6px 14px', fontSize:11, letterSpacing:1, textTransform:'uppercase',
              fontWeight:600,
              background: filter === f ? '#0F1928' : '#fff',
              color: filter === f ? '#fff' : '#0F1928',
              border:'1px solid #E4E7EC', borderRadius:4, cursor:'pointer',
            }}
          >
            {f === 'all' ? `All (${posts.length})` : `${f} (${posts.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Date</th>
            <th style={s.th}>Hook</th>
            <th style={s.th}>Compound</th>
            <th style={s.th}>Status</th>
            <th style={s.th}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const hook = p.caption.split('\n')[0];
            const risk = getRiskLevel(hook);
            const compoundLine = (p.caption.match(/(?:^|\n)([A-Z][^.\n]{0,80})\s+(?:is|has|are)/m) || [])[1];
            return (
              <tr key={p.id}>
                <td style={s.td}>
                  <div style={{ fontWeight:600 }}>{fmtDate(p.scheduled_date)}</div>
                  <div style={{ fontSize:11, color:'#8C919E', fontFamily:"'JetBrains Mono',monospace" }}>{p.scheduled_date}</div>
                </td>
                <td style={s.td}>
                  <div style={s.hook}>
                    {hook}
                    {risk !== 'low' && <span style={{...s.modPill, ...getRiskStyle(risk)}}>{risk} mod risk</span>}
                  </div>
                </td>
                <td style={s.td}>
                  <span style={{ fontSize:12, color:'#4A4F5C', fontFamily:"'JetBrains Mono',monospace" }}>
                    {p.source_compound || '—'}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{...s.status, ...(s[p.status] || s.scheduled)}}>{p.status}</span>
                </td>
                <td style={s.td}>
                  <Link
                    href={`/admin/marketing/content`}
                    style={{ color:'#0072B5', fontSize:12, textDecoration:'none' }}
                  >
                    edit →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop:32, padding:18, background:'#F9FAFB', border:'1px solid #E4E7EC', borderRadius:6, fontSize:13, color:'#4A4F5C', lineHeight:1.6 }}>
        <strong style={{ color:'#0F1928' }}>How this works</strong>
        <div style={{ marginTop:8 }}>
          The campaign posts use <code style={{ background:'#fff', padding:'1px 4px', borderRadius:2, fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>ptt-[slug]-1.png</code> image paths. Slide 2 of each carousel uses <code style={{ background:'#fff', padding:'1px 4px', borderRadius:2, fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>ptt-[slug]-2.png</code>.
          Both slides need to be rendered before publishing — see the <Link href="/admin/marketing/post-builder" style={{color:'#0072B5'}}>Post Builder</Link> for the campaign template (coming).
        </div>
        <div style={{ marginTop:12, fontSize:12, color:'#8C919E' }}>
          Full hook library, captions, citations, and mod-risk notes live in <code style={{ background:'#fff', padding:'1px 4px', borderRadius:2, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>docs/marketing/peptide-for-that-campaign.md</code>.
        </div>
      </div>
    </div>
  );
}
