'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

const POST_TYPE_BADGE = {
  compound_card: { color:'#0072B5', bg:'#EFF6FF', label:'Compound' },
  mechanism_diagram: { color:'#A16207', bg:'#FEF3C7', label:'Mechanism' },
  stack_carousel: { color:'#16A34A', bg:'#DCFCE7', label:'Stack' },
  research_quote: { color:'#A78BFA', bg:'#F5F3FF', label:'Quote' },
  standards_statement: { color:'#0F1928', bg:'#F3F4F6', label:'Standards' },
  wordmark_hero: { color:'#1A1C22', bg:'#F4F2EE', label:'Wordmark' },
  principles_carousel: { color:'#00A0A8', bg:'#E6FBFC', label:'Principles' },
  positioning_manifesto: { color:'#E07C24', bg:'#FDF3EB', label:'Positioning' },
  receipt_card: { color:'#A16207', bg:'#FEF3C7', label:'Receipt' },
};

const STATUS_BADGE = {
  draft:{bg:'#FEF3C7',fg:'#A16207'}, scheduled:{bg:'#F3F4F6',fg:'#6B7280'},
  posted:{bg:'#DCFCE7',fg:'#16A34A'}, archived:{bg:'#FEE2E2',fg:'#DC2626'},
};

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function fmtMonth(d) { return d.toLocaleString('default',{month:'long',year:'numeric'}); }
function dateKey(d) { return d.toISOString().slice(0,10); }

export default function ContentPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/social_posts?select=*&order=scheduled_date.asc`, { headers: H() });
    setPosts(await r.json());
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  // Build calendar grid
  const first = startOfMonth(month);
  const startWeekday = first.getDay();  // 0=Sun
  const daysInMonth = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  while (cells.length % 7) cells.push(null);

  const postsByDate = {};
  posts.forEach(p => {
    const k = p.scheduled_date;
    (postsByDate[k] = postsByDate[k] || []).push(p);
  });

  const openModal = (post) => {
    setSelected(post);
    setEditing(false);
    setEditForm({ caption: post.caption, scheduled_date: post.scheduled_date });
  };
  const closeModal = () => { setSelected(null); setEditing(false); };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard'));
  };

  const updatePost = async (fields) => {
    setBusy(true);
    const r = await fetch('/api/social-post-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id: selected.id, fields })
    });
    if (r.ok) { await reload(); setSelected(prev => prev ? { ...prev, ...fields } : null); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const markPosted = () => updatePost({ status:'posted', posted_at: new Date().toISOString() });
  const archive = () => { if (confirm('Archive this post?')) updatePost({ status:'archived' }); };
  const saveEdit = () => updatePost(editForm).then(() => setEditing(false));

  const downloadImage = (path, filename) => {
    const a = document.createElement('a');
    a.href = path; a.download = filename || path.split('/').pop();
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) return <div style={{padding:32,color:'#8C919E'}}>Loading content calendar...</div>;

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    posted: posts.filter(p => p.status === 'posted').length,
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Content Calendar</h1>
          <p style={{color:'#8C919E',fontSize:14}}>{stats.total} posts · {stats.scheduled} scheduled · {stats.posted} posted</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={async () => {
            if (!confirm('Send a digest email to all active ambassadors with the current share library?')) return;
            const r = await fetch('/api/ambassador-content-digest', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
            if (r.ok) { const j = await r.json(); alert('Digest sent to ' + j.sent + ' of ' + j.total + ' ambassadors.' + (j.failed && j.failed.length ? ' Failures: ' + j.failed.length : '')); }
            else { const e = await r.json().catch(()=>({})); alert('Failed: ' + (e.error || r.status)); }
          }} style={{padding:'8px 16px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>📣 Notify ambassadors</button>
          <button onClick={reload} style={{padding:'8px 16px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Refresh</button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}>
        <button onClick={()=>setMonth(addMonths(month,-1))} style={{padding:'6px 12px',background:'#fff',border:'1px solid #E4E7EC',borderRadius:6,fontSize:14,cursor:'pointer'}}>◀</button>
        <div style={{fontSize:18,fontWeight:600,color:'#0F1928',minWidth:200,textAlign:'center'}}>{fmtMonth(month)}</div>
        <button onClick={()=>setMonth(addMonths(month,1))} style={{padding:'6px 12px',background:'#fff',border:'1px solid #E4E7EC',borderRadius:6,fontSize:14,cursor:'pointer'}}>▶</button>
        <button onClick={()=>setMonth(startOfMonth(new Date()))} style={{padding:'6px 12px',background:'#fff',border:'1px solid #E4E7EC',borderRadius:6,fontSize:12,cursor:'pointer',marginLeft:8}}>Today</button>
      </div>

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{padding:'10px 12px',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{d}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {cells.map((d, i) => {
            const isToday = d && dateKey(d) === dateKey(new Date());
            const dayPosts = d ? (postsByDate[dateKey(d)] || []) : [];
            return (
              <div key={i} style={{
                minHeight:120,padding:8,borderRight:'1px solid #F0F1F4',borderBottom:'1px solid #F0F1F4',
                background: isToday ? '#FFFEF0' : (d ? '#fff' : '#FAFBFC'),
                opacity: d ? 1 : 0.4,
              }}>
                {d && (
                  <>
                    <div style={{fontSize:12,color:isToday?'#A16207':'#0F1928',fontWeight:isToday?700:500,marginBottom:6}}>{d.getDate()}</div>
                    {dayPosts.map(p => {
                      const t = POST_TYPE_BADGE[p.post_type] || { color:'#666', bg:'#eee', label:p.post_type };
                      const s = STATUS_BADGE[p.status] || { bg:'#eee', fg:'#666' };
                      return (
                        <div key={p.id} onClick={()=>openModal(p)} style={{
                          cursor:'pointer',marginBottom:4,padding:'6px 8px',
                          background: t.bg, color: t.color,
                          borderRadius:4,fontSize:10,letterSpacing:0.5,
                          display:'flex',alignItems:'center',gap:6,
                          opacity: p.status==='archived'?0.4:1,
                          textDecoration: p.status==='archived'?'line-through':'none',
                        }} title={p.caption?.slice(0,140)}>
                          <span style={{width:6,height:6,borderRadius:3,background:s.fg,flexShrink:0}}></span>
                          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600}}>{t.label}</span>
                          {p.source_compound && <span style={{fontFamily:"'JetBrains Mono'",fontSize:9}}>{p.source_compound}</span>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (() => {
        const t = POST_TYPE_BADGE[selected.post_type] || { color:'#666', bg:'#eee', label:selected.post_type };
        const s = STATUS_BADGE[selected.status] || { bg:'#eee', fg:'#666' };
        return (
          <div onClick={closeModal} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:8,maxWidth:720,width:'100%',maxHeight:'92vh',overflow:'auto',padding:24}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{padding:'3px 10px',borderRadius:4,fontSize:10,background:t.bg,color:t.color,letterSpacing:1,textTransform:'uppercase',fontWeight:600}}>{t.label}</span>
                  <span style={{padding:'3px 10px',borderRadius:4,fontSize:10,background:s.bg,color:s.fg,letterSpacing:1,textTransform:'uppercase',fontWeight:600}}>{selected.status}</span>
                  <span style={{fontSize:13,color:'#0F1928'}}>{new Date(selected.scheduled_date+'T00:00:00').toLocaleDateString('default',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</span>
                  {selected.source_compound && <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{selected.source_compound}</span>}
                </div>
                <button onClick={closeModal} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#8C919E'}}>×</button>
              </div>

              <div style={{marginBottom:16,textAlign:'center',background:'#FAFBFC',padding:12,borderRadius:6}}>
                <img src={selected.image_path} alt="post preview" style={{maxWidth:'100%',maxHeight:480,borderRadius:4,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}} onError={(e)=>{e.target.style.display='none';e.target.parentElement.innerHTML += '<div style="padding:40px;color:#9CA3AF;font-size:13px">Image not yet rendered: <code style="font-family:monospace">'+selected.image_path+'</code></div>';}} />
              </div>

              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Caption</label>
                {editing ? (
                  <textarea value={editForm.caption} onChange={e=>setEditForm(f=>({...f,caption:e.target.value}))} style={{width:'100%',padding:'10px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:140,fontFamily:'inherit',resize:'vertical'}} />
                ) : (
                  <div style={{padding:'10px 12px',background:'#FAFBFC',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,whiteSpace:'pre-wrap',lineHeight:1.6,maxHeight:240,overflow:'auto'}}>{selected.caption}</div>
                )}
              </div>

              {editing && (
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Scheduled date</label>
                  <input type="date" value={editForm.scheduled_date} onChange={e=>setEditForm(f=>({...f,scheduled_date:e.target.value}))} style={{padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} />
                </div>
              )}

              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}>
                <button onClick={()=>copy(selected.caption)} style={{padding:'10px 16px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>📋 Copy caption</button>
                <button onClick={()=>downloadImage(selected.image_path)} style={{padding:'10px 16px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>⬇ Download image</button>
                {selected.status !== 'posted' && <button onClick={markPosted} disabled={busy} style={{padding:'10px 16px',background:'#16A34A',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>✓ Mark as posted</button>}
                {!editing && <button onClick={()=>setEditing(true)} style={{padding:'10px 16px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>✏ Edit</button>}
                {editing && <button onClick={saveEdit} disabled={busy} style={{padding:'10px 16px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>{busy?'Saving...':'✓ Save'}</button>}
                {editing && <button onClick={()=>setEditing(false)} style={{padding:'10px 16px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Cancel</button>}
                {selected.status !== 'archived' && <button onClick={archive} disabled={busy} style={{padding:'10px 16px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>🗑 Archive</button>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
