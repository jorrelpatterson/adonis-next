'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newV, setNewV] = useState({ name:'', contact_email:'', contact_phone:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
      const [vRes, cRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&order=name.asc`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=vendor_id`, { headers }),
      ]);
      const vs = await vRes.json();
      const cs = await cRes.json();
      const cmap = {};
      cs.forEach(r => { cmap[r.vendor_id] = (cmap[r.vendor_id] || 0) + 1; });
      setVendors(Array.isArray(vs) ? vs : []);
      setCounts(cmap);
      setLoading(false);
    }
    load();
  }, []);

  const addVendor = async () => {
    if (!newV.name.trim()) { alert('Name required'); return; }
    setSaving(true);
    const r = await fetch('/api/vendor-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', fields: newV }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); setSaving(false); return; }
    const { vendor } = await r.json();
    setVendors(prev => [...prev, vendor].sort((a,b) => a.name.localeCompare(b.name)));
    setNewV({ name:'', contact_email:'', contact_phone:'', notes:'' });
    setShowAdd(false);
    setSaving(false);
  };

  if (loading) return <div style={{padding:32,color:'#8C919E'}}>Loading vendors...</div>;

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Vendors</h1>
          <p style={{color:'#8C919E',fontSize:14}}>{vendors.length} vendors</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {showAdd ? 'Cancel' : '+ Add Vendor'}
        </button>
      </div>

      {showAdd && (
        <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,padding:20,marginBottom:20,display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
          {[
            {k:'name',l:'Name *',ph:'Eve'},
            {k:'contact_email',l:'Contact email',ph:'orders@vendor.com'},
            {k:'contact_phone',l:'Contact phone',ph:'+1-555-...'},
          ].map(f => (
            <div key={f.k}>
              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>{f.l}</label>
              <input style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} placeholder={f.ph} value={newV[f.k]} onChange={e=>setNewV(p=>({...p,[f.k]:e.target.value}))} />
            </div>
          ))}
          <div style={{gridColumn:'1 / -1'}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes</label>
            <textarea style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:60}} value={newV.notes} onChange={e=>setNewV(p=>({...p,notes:e.target.value}))} />
          </div>
          <button onClick={addVendor} disabled={saving} style={{gridColumn:'1 / -1',padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.5:1}}>
            {saving ? 'Saving...' : 'Save Vendor'}
          </button>
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['Name','Active','Contact','# Priced products',''].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                <td style={{padding:'12px',fontSize:14,fontWeight:600,color:'#0F1928'}}>{v.name}</td>
                <td style={{padding:'12px',fontSize:12}}><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:v.active?'#DCFCE7':'#FEE2E2',color:v.active?'#16A34A':'#DC2626'}}>{v.active?'Active':'Inactive'}</span></td>
                <td style={{padding:'12px',fontSize:12,color:'#4A4F5C'}}>{v.contact_email || '—'}</td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:13,color:'#0072B5'}}>{counts[v.id] || 0}</td>
                <td style={{padding:'12px',textAlign:'right'}}><Link href={`/admin/vendors/${v.id}`} style={{color:'#0072B5',fontSize:12,textDecoration:'none'}}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
