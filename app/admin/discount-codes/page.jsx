'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` });

const cs = {
  card: { background:'#fff', border:'1px solid #E4E7EC', borderRadius:8 },
  h1:   { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  input:{ width:'100%', padding:'8px 12px', border:'1px solid #E4E7EC', borderRadius:4, fontSize:13, outline:'none', background:'#FAFBFC' },
  btn:  { padding:'8px 16px', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' },
};

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | inactive
  const [newC, setNewC] = useState({ code:'', type:'percent', amount:'', expires_at:'', usage_limit:'', min_order:'', max_discount:'', notes:'' });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/discount_codes?select=*&order=created_at.desc`, { headers: H() });
    setCodes(r.ok ? await r.json() : []);
    setLoading(false);
  };

  const filtered = useMemo(() => codes.filter(c => {
    const ms = !search || c.code.toLowerCase().includes(search.toLowerCase()) || (c.notes||'').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' || (filter === 'active' && c.active) || (filter === 'inactive' && !c.active);
    return ms && mf;
  }), [codes, search, filter]);

  const create = async () => {
    setSaving(true);
    const fields = {
      type: newC.type, amount: newC.amount, active: true,
      expires_at: newC.expires_at || null,
      usage_limit: newC.usage_limit || null,
      min_order: newC.min_order || null,
      max_discount: newC.max_discount || null,
      notes: newC.notes || null,
    };
    const r = await fetch('/api/discount-code-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', code: newC.code, fields }),
    });
    const j = await r.json();
    if (r.ok) { setShowAdd(false); setNewC({ code:'', type:'percent', amount:'', expires_at:'', usage_limit:'', min_order:'', max_discount:'', notes:'' }); load(); }
    else alert('Failed: ' + (j.error || r.status));
    setSaving(false);
  };

  const toggleActive = async (c) => {
    const r = await fetch('/api/discount-code-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id: c.id, fields: { active: !c.active } }),
    });
    if (r.ok) setCodes(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
    else { const j = await r.json().catch(()=>({})); alert('Failed: ' + (j.error || r.status)); }
  };

  const deleteCode = async (c) => {
    if (!confirm(`Delete code ${c.code}?`)) return;
    const r = await fetch('/api/discount-code-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'delete', id: c.id }),
    });
    if (r.ok) setCodes(prev => prev.filter(x => x.id !== c.id));
    else { const j = await r.json().catch(()=>({})); alert('Failed: ' + (j.error || r.status)); }
  };

  if (loading) return <div style={{padding:32}}>Loading...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={cs.h1}>Discount Codes</h1>
          <p style={{color:'#8C919E',fontSize:13,marginTop:4}}>{codes.length} codes · {codes.filter(c=>c.active).length} active · {codes.reduce((s,c)=>s+(c.used_count||0),0)} total uses</p>
          <p style={{color:'#A0A4AE',fontSize:11,marginTop:6}}>Standalone promo codes. (Ambassador codes are managed on the Ambassadors page; they auto-give 15% off to first-time customers.)</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{...cs.btn, background:'#0072B5', color:'#fff', padding:'10px 20px'}}>{showAdd ? 'Cancel' : '+ New Code'}</button>
      </div>

      {showAdd && (
        <div style={{...cs.card, padding:20, marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:'#0F1928',marginBottom:14}}>New Discount Code</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Code (UPPERCASE)</label><input style={{...cs.input,textTransform:'uppercase'}} value={newC.code} onChange={e=>setNewC(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="LAUNCH25"/></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Type</label><select style={cs.input} value={newC.type} onChange={e=>setNewC(p=>({...p,type:e.target.value}))}><option value="percent">% off</option><option value="fixed">$ off</option></select></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Amount {newC.type==='percent'?'(%)':'($)'}</label><input style={cs.input} type="number" step="0.01" value={newC.amount} onChange={e=>setNewC(p=>({...p,amount:e.target.value}))} placeholder={newC.type==='percent'?'25':'10.00'}/></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Usage limit (optional)</label><input style={cs.input} type="number" value={newC.usage_limit} onChange={e=>setNewC(p=>({...p,usage_limit:e.target.value}))} placeholder="100"/></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Min order ($, optional)</label><input style={cs.input} type="number" step="0.01" value={newC.min_order} onChange={e=>setNewC(p=>({...p,min_order:e.target.value}))} placeholder="50"/></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Max discount ($, optional)</label><input style={cs.input} type="number" step="0.01" value={newC.max_discount} onChange={e=>setNewC(p=>({...p,max_discount:e.target.value}))} placeholder="50"/></div>
            <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Expires at (optional)</label><input style={cs.input} type="datetime-local" value={newC.expires_at} onChange={e=>setNewC(p=>({...p,expires_at:e.target.value}))}/></div>
            <div style={{gridColumn:'span 4'}}><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Notes (admin reference)</label><input style={cs.input} value={newC.notes} onChange={e=>setNewC(p=>({...p,notes:e.target.value}))} placeholder="Black Friday 2026 campaign"/></div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:14}}>
            <button onClick={create} disabled={!newC.code||!newC.amount||saving} style={{...cs.btn, background:'#0072B5', color:'#fff', opacity:(newC.code&&newC.amount&&!saving)?1:0.4}}>{saving?'Saving...':'Create Code'}</button>
            <button onClick={()=>setShowAdd(false)} style={{...cs.btn, background:'#F7F8FA', color:'#6B7A94', border:'1px solid #E4E7EC'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        <input style={{...cs.input,maxWidth:280}} placeholder="Search code or notes..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{display:'flex',gap:4}}>
          {[{k:'all',l:'All'},{k:'active',l:'Active'},{k:'inactive',l:'Inactive'}].map(f => (
            <button key={f.k} onClick={()=>setFilter(f.k)} style={{...cs.btn, padding:'6px 12px', fontSize:11, background:filter===f.k?'#0072B5':'#F7F8FA', color:filter===f.k?'#fff':'#6B7A94', border:'1px solid '+(filter===f.k?'#0072B5':'#E4E7EC')}}>{f.l}</button>
          ))}
        </div>
      </div>

      <div style={{...cs.card, overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead><tr style={{background:'#F7F8FA'}}>
            {['Code','Type','Amount','Used','Limit','Min order','Max disc.','Expires','Notes',''].map((h,i)=>(
              <th key={i} style={{padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #E4E7EC'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{borderBottom:'1px solid #F0F1F4', opacity:c.active?1:0.55}}>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:700,color:'#0F1928'}}>{c.code}</td>
                <td style={{padding:'8px 10px',fontSize:11,color:'#6B7A94'}}>{c.type==='percent'?'% off':'$ off'}</td>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600}}>{c.type==='percent' ? `${c.amount}%` : `$${Number(c.amount).toFixed(2)}`}</td>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#6B7A94'}}>{c.used_count || 0}</td>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#6B7A94'}}>{c.usage_limit || '—'}</td>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#6B7A94'}}>{c.min_order ? `$${Number(c.min_order).toFixed(2)}` : '—'}</td>
                <td style={{padding:'8px 10px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#6B7A94'}}>{c.max_discount ? `$${Number(c.max_discount).toFixed(2)}` : '—'}</td>
                <td style={{padding:'8px 10px',fontSize:11,color:'#6B7A94'}}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                <td style={{padding:'8px 10px',fontSize:11,color:'#7A7D88',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.notes || '—'}</td>
                <td style={{padding:'8px 10px',display:'flex',gap:6,alignItems:'center'}}>
                  <button onClick={()=>toggleActive(c)} title={c.active?'Deactivate':'Activate'} style={{background:'none',border:'1px solid '+(c.active?'#22C55E':'#E4E7EC'),color:c.active?'#22C55E':'#6B7A94',padding:'3px 8px',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer'}}>{c.active?'ACTIVE':'INACTIVE'}</button>
                  <button onClick={()=>deleteCode(c)} title="Delete" style={{background:'none',border:'none',color:'#DC2626',fontSize:13,cursor:'pointer',padding:'2px 4px'}}>🗑</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan="10" style={{padding:24,textAlign:'center',color:'#9CA3AF'}}>No codes match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
