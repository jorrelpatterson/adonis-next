'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';

const s = {
  back: { fontSize:12, color:'#0072B5', textDecoration:'none', marginBottom:16, display:'inline-block' },
  h1: { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  sub: { color:'#8C919E', marginBottom:32, fontSize:14 },
  card: {
    background:'#fff', borderRadius:8, border:'1px solid #E4E7EC',
    padding:24, textDecoration:'none', display:'block',
  },
  title: { fontSize:18, fontWeight:700, color:'#0F1928', marginBottom:6 },
  desc: { fontSize:13, color:'#8C919E', lineHeight:1.5, marginBottom:14 },
  meta: { fontSize:10, fontFamily:"'JetBrains Mono',monospace", color:'#4A4F5C', letterSpacing:1, textTransform:'uppercase' },
  status: { display:'inline-block', fontSize:9, padding:'2px 8px', borderRadius:3, letterSpacing:1, textTransform:'uppercase', fontWeight:600 },
  active: { background:'#DCFCE7', color:'#16A34A' },
  draft: { background:'#FEF3C7', color:'#A16207' },
};

const campaigns = [
  {
    id: 'peptide-for-that',
    href: '/admin/marketing/campaigns/peptide-for-that',
    title: "There's a peptide for that",
    desc: 'Apple-riff Instagram series. Layman hooks ("Knees hurt?", "Wake up tired?") → research-grade reveal slides on 46 peptides. Weekly Fridays.',
    posts: 46,
    cadence: 'Mon + Fri (Wed = routine)',
    runtime: '2026-05-04 → 2026-10-09',
    status: 'active',
  },
];

export default function CampaignsHub() {
  return (
    <div>
      <Link href="/admin/marketing" style={s.back}>← Marketing</Link>
      <h1 className="admin-page-h1" style={s.h1}>Campaigns</h1>
      <p style={s.sub}>Multi-post Instagram series organized as campaigns. Each campaign has its own hook library, schedule, and status tracking.</p>

      <div className="admin-tile-row">
        {campaigns.map(c => (
          <Link key={c.id} href={c.href} style={s.card}>
            <div style={s.title}>{c.title}</div>
            <div style={s.desc}>{c.desc}</div>
            <div style={s.meta}>
              {c.posts} posts · {c.cadence} · {c.runtime}
            </div>
            <div style={{ marginTop:12 }}>
              <span style={{...s.status, ...s.active}}>{c.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
