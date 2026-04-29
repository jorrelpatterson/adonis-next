'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` });

const s = {
  card: { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', padding:24, textDecoration:'none', display:'block', transition:'transform 0.12s, box-shadow 0.12s' },
  stat: { fontSize:32, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif" },
  label: { fontSize:11, color:'#8C919E', letterSpacing:1, textTransform:'uppercase', marginTop:4 },
  h1: { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  sub: { color:'#8C919E', marginBottom:32, fontSize:14 },
  sectionLabel: { fontSize:11, color:'#8C919E', letterSpacing:2, textTransform:'uppercase', marginBottom:12, marginTop:8, fontWeight:600 },
  soon: { fontSize:9, padding:'2px 8px', background:'#FEF3C7', color:'#A16207', borderRadius:3, letterSpacing:1, textTransform:'uppercase', fontWeight:600 },
};

export default function MarketingHub() {
  const [stats, setStats] = useState({
    posts:{ scheduled:0, posted:0, total:0, nextDate:null },
    ambassadors:{ active:0, paused:0, total:0 },
    subs:{ total:0, stage2:0, stage3:0 },
    upcoming:[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0,10);
      const [pRes, aRes, uRes, sRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/social_posts?select=status,scheduled_date`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/ambassadors?select=status`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/social_posts?select=scheduled_date,post_type,source_compound,status&status=eq.scheduled&scheduled_date=gte.${today}&order=scheduled_date.asc&limit=3`, { headers: H() }),
        fetch('/api/subscribers-admin'),
      ]);
      const posts = await pRes.json();
      const ambs = await aRes.json();
      const upcoming = await uRes.json();
      const subData = sRes.ok ? await sRes.json() : { stats:{ total:0, welcome_2_sent:0, welcome_3_sent:0 } };

      const byStatus = { scheduled:0, posted:0, draft:0, archived:0 };
      posts.forEach(p => { byStatus[p.status] = (byStatus[p.status]||0)+1; });
      const ambByStatus = { active:0, paused:0, banned:0 };
      ambs.forEach(a => { ambByStatus[a.status||'active'] = (ambByStatus[a.status||'active']||0)+1; });

      setStats({
        posts:{ scheduled:byStatus.scheduled, posted:byStatus.posted, total:posts.length, nextDate: upcoming[0]?.scheduled_date || null },
        ambassadors:{ active:ambByStatus.active, paused:ambByStatus.paused, total:ambs.length },
        subs:{ total:subData.stats.total, stage2:subData.stats.welcome_2_sent, stage3:subData.stats.welcome_3_sent },
        upcoming,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    {
      href:'/admin/marketing/content',
      icon:'📅',
      color:'#0072B5',
      label:'Content',
      desc:'Instagram calendar + 24-post queue',
      stat: stats.posts.scheduled,
      statLabel: 'scheduled',
      tag: stats.posts.nextDate ? `Next: ${stats.posts.nextDate}` : null,
    },
    {
      href:'/admin/marketing/ambassadors',
      icon:'🤝',
      color:'#16A34A',
      label:'Ambassadors',
      desc:'Manage program, payouts, content digest',
      stat: stats.ambassadors.active,
      statLabel: 'active',
      tag: stats.ambassadors.paused > 0 ? `${stats.ambassadors.paused} paused` : null,
    },
    {
      href:'/admin/marketing/subscribers',
      icon:'📧',
      color:'#A78BFA',
      label:'Subscribers',
      desc:'Welcome-email drip + manual sends',
      stat: stats.subs.total,
      statLabel: 'total',
      tag: `W2: ${stats.subs.stage2} · W3: ${stats.subs.stage3}`,
    },
    {
      href:'/admin/marketing/post-builder',
      icon:'🎨',
      color:'#00A0A8',
      label:'Post Builder',
      desc:'Pre-built IG carousels — render & download',
      stat: 1,
      statLabel: 'available',
      tag: 'Long-Term Effects',
    },
    {
      href:'/admin/marketing/campaigns',
      icon:'🎯',
      color:'#E07C24',
      label:'Campaigns',
      desc:'"There\'s a peptide for that" + future series',
      stat: 1,
      statLabel: 'active',
      tag: '46 posts queued',
    },
  ];

  return (
    <div>
      <h1 className="admin-page-h1" style={s.h1}>Marketing</h1>
      <p style={s.sub}>{loading ? 'Loading…' : `${stats.posts.total} posts · ${stats.ambassadors.total} ambassadors · ${stats.subs.total} subscribers`} · advnce labs</p>

      <div className="admin-tile-row" style={{ marginBottom:32 }}>
        {cards.map((c, i) => {
          const Card = c.soon ? 'div' : Link;
          return (
            <Card key={i} href={c.soon ? undefined : c.href}
              style={{ ...s.card, borderTop:`3px solid ${c.color}`, opacity: c.soon ? 0.75 : 1, cursor: c.soon ? 'default' : 'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <span style={{ fontSize:24 }}>{c.icon}</span>
                {c.soon && <span style={s.soon}>Soon</span>}
              </div>
              <div style={{ ...s.stat, color: c.color }}>{c.stat}</div>
              <div style={s.label}>{c.statLabel}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F1928', marginTop:14 }}>{c.label}</div>
              <div style={{ fontSize:12, color:'#8C919E', marginTop:2 }}>{c.desc}</div>
              {c.tag && <div style={{ fontSize:10, color:'#4A4F5C', marginTop:8, fontFamily:"'JetBrains Mono',monospace" }}>{c.tag}</div>}
            </Card>
          );
        })}
      </div>

      {stats.upcoming.length > 0 && (
        <>
          <div style={s.sectionLabel}>Next up</div>
          <div className="admin-tile-row">
            {stats.upcoming.map((p, i) => (
              <Link key={i} href="/admin/marketing/content" style={{ ...s.card, padding:16 }}>
                <div style={{ fontSize:10, color:'#8C919E', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{p.post_type.replace(/_/g,' ')}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#0F1928' }}>{p.source_compound || 'Untitled'}</div>
                <div style={{ fontSize:11, color:'#8C919E', marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>{p.scheduled_date}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
