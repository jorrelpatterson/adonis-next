'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

const cs = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', overflow: 'hidden' },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, outline: 'none', background: '#FAFBFC' },
  btn: { padding: '8px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  badge: { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 3, display: 'inline-block' },
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newP, setNewP] = useState({ name:'', size:'', cat:'Recovery', vendor:'Eve', cost:'', retail:'', stock:10, sku:'', risk:'🟡' });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    setInventory(data || []);
    setLoading(false);
  };

  const categories = useMemo(() => ['all', ...new Set(inventory.map(p => p.cat))], [inventory]);

  const filtered = useMemo(() => {
    let items = inventory.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      return ms && (filterCat === 'all' || p.cat === filterCat);
    });
    items.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return items;
  }, [inventory, search, filterCat, sortBy, sortDir]);

  const totalCost = inventory.reduce((s, p) => s + Number(p.cost) * (p.stock / 10), 0);
  const totalRetail = inventory.reduce((s, p) => s + Number(p.retail) * p.stock, 0);
  const lowStock = inventory.filter(p => p.stock <= 3 && p.cat !== 'Supplies');

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase.from('products').update({
      name: editData.name, size: editData.size, sku: editData.sku,
      cost: Number(editData.cost), retail: Number(editData.retail), stock: Number(editData.stock),
      updated_at: new Date().toISOString()
    }).eq('id', editId);
    if (error) alert('Save failed: ' + error.message);
    else { setInventory(prev => prev.map(p => p.id === editId ? { ...p, ...editData, cost: Number(editData.cost), retail: Number(editData.retail), stock: Number(editData.stock) } : p)); setEditId(null); }
    setSaving(false);
  };

  const deleteProduct = async (id) => {
    if (!confirm('Remove this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setInventory(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('products').insert({
      name: newP.name, size: newP.size, cat: newP.cat, vendor: newP.vendor,
      cost: Number(newP.cost), retail: Number(newP.retail), stock: Number(newP.stock), sku: newP.sku, risk: newP.risk
    }).select();
    if (error) alert('Add failed: ' + error.message);
    else { setInventory(prev => [...prev, ...data]); setNewP({ name:'', size:'', cat:'Recovery', vendor:'Eve', cost:'', retail:'', stock:10, sku:'', risk:'🟡' }); setShowAdd(false); }
    setSaving(false);
  };

  const handleSort = (col) => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } };
  const SI = ({ col }) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#8C919E' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>📦</div>Loading inventory...</div></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div><h1 style={cs.h1}>Inventory</h1><p style={{ color:'#8C919E', fontSize:14 }}>{inventory.length} products · {inventory.reduce((s,p)=>s+p.stock,0)} vials · <span style={{color:'#22C55E'}}>Live</span></p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchProducts} style={{ ...cs.btn, background:'#F7F8FA', color:'#6B7A94', border:'1px solid #E4E7EC' }}>↻ Refresh</button>
          <button onClick={()=>setShowAdd(!showAdd)} style={{ ...cs.btn, background:'#0072B5', color:'#fff', padding:'10px 20px' }}>+ Add Product</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[{ l:'Wholesale', v:'$'+totalCost.toLocaleString(), c:'#0F1928' },{ l:'Retail Value', v:'$'+totalRetail.toLocaleString(), c:'#22C55E' },{ l:'Avg Margin', v:totalRetail>0?((1-totalCost/totalRetail)*100).toFixed(0)+'%':'0%', c:'#0072B5' },{ l:'Low Stock', v:lowStock.length, c:lowStock.length>0?'#DC2626':'#22C55E' }].map((x,i)=>(
          <div key={i} style={{ ...cs.card, padding:16 }}><div style={{ fontSize:22, fontWeight:700, color:x.c, fontFamily:"'Barlow Condensed'" }}>{x.v}</div><div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>{x.l}</div></div>
        ))}
      </div>

      {lowStock.length>0&&<div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:16, marginBottom:20 }}><div style={{ fontSize:13, fontWeight:700, color:'#DC2626', marginBottom:6 }}>⚠️ Low Stock</div><div style={{ fontSize:12, color:'#7F1D1D' }}>{lowStock.map(p=>`${p.name} (${p.stock})`).join(' · ')}</div></div>}

      {showAdd&&<div style={{ ...cs.card, padding:20, marginBottom:20 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0F1928', marginBottom:14 }}>Add New Product</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[['name','Name','BPC-157'],['size','Size','10mg'],['sku','SKU','BC10']].map(([k,l,ph])=><div key={k}><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>{l}</label><input style={cs.input} value={newP[k]} onChange={e=>setNewP(p=>({...p,[k]:e.target.value}))} placeholder={ph}/></div>)}
          <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Category</label><select style={cs.input} value={newP.cat} onChange={e=>setNewP(p=>({...p,cat:e.target.value}))}>{['Weight Loss','Recovery','Growth Hormone','Longevity','Cognitive','Sleep','Skin','Immune','Hormonal','Supplies'].map(c=><option key={c}>{c}</option>)}</select></div>
          {[['cost','Cost/Box','68'],['retail','Retail/Vial','49'],['stock','Stock','10']].map(([k,l,ph])=><div key={k}><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>{l}</label><input style={cs.input} type="number" value={newP[k]} onChange={e=>setNewP(p=>({...p,[k]:e.target.value}))} placeholder={ph}/></div>)}
          <div><label style={{fontSize:10,color:'#8C919E',display:'block',marginBottom:4}}>Vendor</label><select style={cs.input} value={newP.vendor} onChange={e=>setNewP(p=>({...p,vendor:e.target.value}))}><option>Eve</option><option>Weak</option></select></div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={addProduct} disabled={!newP.name||!newP.sku||saving} style={{ ...cs.btn, background:'#0072B5', color:'#fff', opacity:newP.name&&newP.sku&&!saving?1:0.4 }}>{saving?'Saving...':'Add Product'}</button>
          <button onClick={()=>setShowAdd(false)} style={{ ...cs.btn, background:'#F7F8FA', color:'#6B7A94', border:'1px solid #E4E7EC' }}>Cancel</button>
        </div>
      </div>}

      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <input style={{ ...cs.input, maxWidth:260 }} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {categories.map(c=><button key={c} onClick={()=>setFilterCat(c)} style={{ ...cs.btn, padding:'6px 12px', fontSize:11, background:filterCat===c?'#0072B5':'#F7F8FA', color:filterCat===c?'#fff':'#6B7A94', border:'1px solid '+(filterCat===c?'#0072B5':'#E4E7EC') }}>{c==='all'?'All':c}</button>)}
        </div>
      </div>

      <div style={cs.card}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#F7F8FA' }}>
            {[{k:'risk',l:'',w:36},{k:'sku',l:'SKU',w:70},{k:'name',l:'Product'},{k:'size',l:'Size',w:70},{k:'cat',l:'Category',w:110},{k:'vendor',l:'Vendor',w:60},{k:'cost',l:'Cost',w:65},{k:'retail',l:'Retail',w:65},{k:'stock',l:'Stock',w:60},{k:'margin',l:'Margin',w:65},{k:'actions',l:'',w:100}].map(c=>(
              <th key={c.k} onClick={()=>c.k!=='actions'&&c.k!=='risk'&&handleSort(c.k)} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #E4E7EC', cursor:c.k!=='actions'?'pointer':'default', width:c.w||'auto', userSelect:'none' }}>{c.l}<SI col={c.k}/></th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(p=>{
              const ie=editId===p.id;const mg=Number(p.retail)>0?((Number(p.retail)-Number(p.cost)/10)/Number(p.retail)*100).toFixed(0):0;const sc=p.stock<=3?'#DC2626':p.stock<=10?'#F59E0B':'#22C55E';
              return(
                <tr key={p.id} style={{ borderBottom:'1px solid #F0F1F4', background:ie?'#FFFBEB':'transparent' }}>
                  <td style={{padding:'10px 12px',fontSize:16}}>{p.risk}</td>
                  <td style={{padding:'10px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#8C919E'}}>{ie?<input style={{...cs.input,width:60,padding:'4px 6px'}} value={editData.sku} onChange={e=>setEditData(d=>({...d,sku:e.target.value}))}/>:p.sku}</td>
                  <td style={{padding:'10px 12px'}}>{ie?<input style={{...cs.input,padding:'4px 6px'}} value={editData.name} onChange={e=>setEditData(d=>({...d,name:e.target.value}))}/>:<span style={{fontWeight:600,color:'#0F1928',fontSize:13}}>{p.name}</span>}</td>
                  <td style={{padding:'10px 12px',fontSize:12,color:'#6B7A94'}}>{ie?<input style={{...cs.input,width:60,padding:'4px 6px'}} value={editData.size} onChange={e=>setEditData(d=>({...d,size:e.target.value}))}/>:p.size}</td>
                  <td style={{padding:'10px 12px'}}><span style={{...cs.badge,background:'#E8F4FB',color:'#0072B5'}}>{p.cat}</span></td>
                  <td style={{padding:'10px 12px',fontSize:12,color:p.vendor==='Eve'?'#00A0A8':'#E07C24',fontWeight:600}}>{p.vendor}</td>
                  <td style={{padding:'10px 12px',fontFamily:"'JetBrains Mono'",fontSize:12}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.cost} onChange={e=>setEditData(d=>({...d,cost:e.target.value}))}/>:`$${p.cost}`}</td>
                  <td style={{padding:'10px 12px',fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.retail} onChange={e=>setEditData(d=>({...d,retail:e.target.value}))}/>:`$${p.retail}`}</td>
                  <td style={{padding:'10px 12px'}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.stock} onChange={e=>setEditData(d=>({...d,stock:e.target.value}))}/>:<span style={{fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:sc}}>{p.stock}</span>}</td>
                  <td style={{padding:'10px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:Number(mg)>=80?'#22C55E':Number(mg)>=60?'#F59E0B':'#DC2626'}}>{mg}%</td>
                  <td style={{padding:'10px 12px'}}>
                    {ie?<div style={{display:'flex',gap:4}}><button onClick={saveEdit} disabled={saving} style={{...cs.btn,background:'#0072B5',color:'#fff',padding:'4px 10px',fontSize:11}}>{saving?'...':'Save'}</button><button onClick={()=>setEditId(null)} style={{...cs.btn,background:'#F7F8FA',color:'#6B7A94',padding:'4px 10px',fontSize:11,border:'1px solid #E4E7EC'}}>✕</button></div>
                    :<div style={{display:'flex',gap:4}}><button onClick={()=>{setEditId(p.id);setEditData({...p})}} style={{...cs.btn,background:'#F7F8FA',color:'#6B7A94',padding:'4px 10px',fontSize:11,border:'1px solid #E4E7EC'}}>Edit</button><button onClick={()=>deleteProduct(p.id)} style={{...cs.btn,background:'#FEE2E2',color:'#DC2626',padding:'4px 10px',fontSize:11,border:'1px solid #FECACA'}}>✕</button></div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
