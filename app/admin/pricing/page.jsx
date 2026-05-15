'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

const cs = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', overflow: 'hidden' },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, outline: 'none', background: '#FAFBFC' },
  btn: { padding: '8px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};

export default function PricingPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editRetail, setEditRetail] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [marginTarget, setMarginTarget] = useState(95);  // percent

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').order('name');
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const avgMargin = useMemo(() => {
    const ns = products.filter(p => p.cat !== 'Supplies');
    if (!ns.length) return 0;
    return (ns.reduce((s, p) => s + ((Number(p.retail) - Number(p.cost) / 10) / Number(p.retail)), 0) / ns.length * 100).toFixed(1);
  }, [products]);

  const updatePrice = async (id, newRetail) => {
    setSaving(true);
    const { error } = await supabase.from('products').update({ retail: Number(newRetail), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Failed: ' + error.message);
    else setProducts(prev => prev.map(p => p.id === id ? { ...p, retail: Number(newRetail) } : p));
    setEditId(null);
    setSaving(false);
  };

  const bulkSetMargin = async (targetPct) => {
    if (targetPct <= 0 || targetPct >= 100) return;
    setSaving(true);
    const updates = products.filter(p => p.cat !== 'Supplies').map(p => {
      const costPerVial = Number(p.cost) / 10;
      const newRetail = Math.round(costPerVial / (1 - targetPct / 100));
      return { id: p.id, retail: newRetail };
    });
    for (const u of updates) {
      await supabase.from('products').update({ retail: u.retail, updated_at: new Date().toISOString() }).eq('id', u.id);
    }
    setProducts(prev => prev.map(p => {
      const u = updates.find(x => x.id === p.id);
      return u ? { ...p, retail: u.retail } : p;
    }));
    setSaving(false);
  };

  const [bulkMargin, setBulkMargin] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#8C919E' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>💰</div>Loading pricing...</div></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, gap:12, flexWrap:'wrap' }}>
        <div><h1 className="admin-page-h1" style={cs.h1}>Pricing</h1><p style={{ color:'#8C919E', fontSize:14 }}>Click any retail price to edit · <span style={{color:'#22C55E'}}>Saves to Supabase</span></p></div>
        <button onClick={()=>setShowBulk(!showBulk)} style={{ ...cs.btn, background:'#0072B5', color:'#fff', padding:'10px 20px' }}>Bulk Margin Tool</button>
      </div>

      <div className="admin-tile-row" style={{ marginBottom:24 }}>
        <div style={{ ...cs.card, padding:16 }}><div style={{ fontSize:22, fontWeight:700, color:'#22C55E', fontFamily:"'Barlow Condensed'" }}>{avgMargin}%</div><div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>Avg Margin</div></div>
        <div style={{ ...cs.card, padding:16 }}><div style={{ fontSize:22, fontWeight:700, color:'#0072B5', fontFamily:"'Barlow Condensed'" }}>{products.filter(p=>Number(p.retail)<Number(p.market_avg||0)).length}</div><div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>Below Market</div></div>
        <div style={{ ...cs.card, padding:16 }}><div style={{ fontSize:22, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed'" }}>{products.length}</div><div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>Products</div></div>
      </div>

      {showBulk&&<div style={{ ...cs.card, padding:20, marginBottom:20, borderLeft:'3px solid #0072B5' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Bulk Margin Calculator</div>
        <p style={{ fontSize:12, color:'#8C919E', marginBottom:12 }}>Set a target margin % — all non-supply products repriced instantly.</p>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input style={{ ...cs.input, width:80 }} type="number" placeholder="85" value={bulkMargin} onChange={e=>setBulkMargin(e.target.value)}/>
          <span style={{ fontSize:13 }}>%</span>
          <button onClick={()=>bulkSetMargin(Number(bulkMargin))} disabled={!bulkMargin||saving} style={{ ...cs.btn, background:'#0072B5', color:'#fff', opacity:bulkMargin&&!saving?1:0.4 }}>{saving?'Applying...':'Apply to All'}</button>
          <button onClick={()=>setShowBulk(false)} style={{ ...cs.btn, background:'#F7F8FA', color:'#6B7A94', border:'1px solid #E4E7EC' }}>Cancel</button>
        </div>
      </div>}

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}>
        <label style={{fontSize:12,color:'#8C919E'}}>Target margin %:</label>
        <input type="number" min="1" max="99" value={marginTarget} onChange={e=>setMarginTarget(Number(e.target.value)||95)} style={{width:60,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} />
      </div>
      <input style={{ ...cs.input, maxWidth:300, marginBottom:16 }} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>

      <div className="admin-table-scroll" style={cs.card}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#F7F8FA' }}>
            {['Product','Size','Category','Cost/Box','Cost/Vial','Retail','Market','Margin','vs Market','Suggested',''].map((h,i)=><th key={i} style={{ padding:'10px 12px', textAlign:i===9?'right':'left', fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #E4E7EC' }}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map(p=>{
            const cpv=(Number(p.cost)/10).toFixed(2);const mg=Number(p.retail)>0?((Number(p.retail)-Number(p.cost)/10)/Number(p.retail)*100).toFixed(1):'0';
            const mkt=Number(p.market_avg||0);const vs=Number(p.retail)-mkt;const ie=editId===p.id;
            return(
              <tr key={p.id} style={{ borderBottom:'1px solid #F0F1F4', background:ie?'#FFFBEB':'transparent' }}>
                <td style={{padding:'12px',fontWeight:600,color:'#0F1928',fontSize:13}}>{p.name}</td>
                <td style={{padding:'12px',fontSize:12,color:'#6B7A94'}}>{p.size}</td>
                <td style={{padding:'12px'}}><span style={{fontSize:10,fontWeight:600,color:'#0072B5',background:'#E8F4FB',padding:'3px 8px',borderRadius:3}}>{p.cat}</span></td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12,color:'#8C919E'}}>${p.cost}</td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12}}>${cpv}</td>
                <td style={{padding:'12px'}}>
                  {ie?<div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{color:'#8C919E'}}>$</span>
                    <input style={{...cs.input,width:70,padding:'4px 8px'}} type="number" value={editRetail} onChange={e=>setEditRetail(e.target.value)} autoFocus onKeyDown={e=>e.key==='Enter'&&updatePrice(p.id,editRetail)}/>
                    <button onClick={()=>updatePrice(p.id,editRetail)} disabled={saving} style={{...cs.btn,background:'#22C55E',color:'#fff',padding:'4px 10px',fontSize:11}}>✓</button>
                    <button onClick={()=>setEditId(null)} style={{...cs.btn,background:'#F7F8FA',color:'#8C919E',padding:'4px 10px',fontSize:11,border:'1px solid #E4E7EC'}}>✕</button>
                  </div>:<span onClick={()=>{setEditId(p.id);setEditRetail(String(p.retail))}} style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:700,color:'#0F1928',cursor:'pointer',padding:'4px 8px',borderRadius:4,background:'#F7F8FA',border:'1px solid #E4E7EC'}}>${p.retail}</span>}
                </td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12,color:'#8C919E'}}>{mkt>0?`$${mkt}`:'—'}</td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:Number(mg)>=85?'#22C55E':Number(mg)>=70?'#F59E0B':'#DC2626'}}>{mg}%</td>
                <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:11,fontWeight:600,color:mkt===0?'#8C919E':vs<0?'#22C55E':vs===0?'#8C919E':'#DC2626'}}>{mkt===0?'—':vs<0?`$${Math.abs(vs)} below`:vs===0?'At market':`$${vs} above`}</td>
                <td style={{padding:'8px 12px',textAlign:'right'}}>
                  {(() => {
                    const pv = Number(p.cost) / 10;
                    const sug = Math.round(pv / (1 - marginTarget / 100));
                    return <button onClick={()=>updatePrice(p.id, sug)} style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontFamily:'monospace',fontSize:12,textDecoration:'underline'}}>${sug}</button>;
                  })()}
                </td>
                <td style={{padding:'12px'}}>{!ie&&<button onClick={()=>{setEditId(p.id);setEditRetail(String(p.retail))}} style={{...cs.btn,background:'#F7F8FA',color:'#6B7A94',padding:'4px 12px',fontSize:11,border:'1px solid #E4E7EC'}}>Edit</button>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      <div style={{ ...cs.card, padding:20, marginTop:20 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Active Discount Tiers</div>
        <div className="admin-tile-row" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[{ r:'1-2 items', p:'0%', l:'No discount' },{ r:'3-4 items', p:'5%', l:'Starter Protocol' },{ r:'5-6 items', p:'10%', l:'Full Protocol' },{ r:'7+ items', p:'15%', l:'All-In' }].map((t,i)=>(
            <div key={i} style={{ padding:14, background:'#F7F8FA', borderRadius:6, textAlign:'center' }}>
              <div style={{ fontFamily:"'Barlow Condensed'", fontSize:22, fontWeight:700 }}>{t.p}</div>
              <div style={{ fontSize:11, fontWeight:600, color:'#4A4F5C', marginTop:2 }}>{t.l}</div>
              <div style={{ fontSize:10, color:'#8C919E', marginTop:2 }}>{t.r}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
