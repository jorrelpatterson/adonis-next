'use client';
export const dynamic = 'force-dynamic';
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
  const [filterStock, setFilterStock] = useState('all');
  const [pendingPOs, setPendingPOs] = useState([]);
  const [poCart, setPoCart] = useState({});  // { product_id: kits }
  const [lowStockCollapsed, setLowStockCollapsed] = useState(true);

  // Hydrate cart + collapsed pref from localStorage on mount
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem('po_cart') || '{}'); setPoCart(c); } catch {}
    try { const v = localStorage.getItem('low_stock_collapsed'); if (v !== null) setLowStockCollapsed(v === '1'); } catch {}
  }, []);
  // Persist on change
  useEffect(() => { localStorage.setItem('po_cart', JSON.stringify(poCart)); }, [poCart]);

  const addToCart = (product_id) => {
    setPoCart(prev => ({ ...prev, [product_id]: (prev[product_id] || 0) + 1 }));
  };
  const removeFromCart = (product_id) => {
    setPoCart(prev => { const n = { ...prev }; if (n[product_id] > 1) n[product_id]--; else delete n[product_id]; return n; });
  };
  const clearCart = () => { setPoCart({}); localStorage.removeItem('po_cart'); };
  const cartCount = Object.keys(poCart).length;
  const cartKits = Object.values(poCart).reduce((s,n)=>s+Number(n),0);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newP, setNewP] = useState({ name:'', size:'', cat:'Recovery', vendor:'Eve', cost:'', retail:'', stock:10, sku:'', risk:'\uD83D\uDFE1' });

  // New state for hide toggle, compare modal, content modal
  const [compareFor, setCompareFor] = useState(null);
  const [vendorPrices, setVendorPrices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [contentFor, setContentFor] = useState(null);
  const [contentForm, setContentForm] = useState({ description:'', specs:[], research:[] });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
    const [invRes, vRes, vpRes, poRes, poItemsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=name.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?select=id,po_number,status&status=in.(submitted,partial)`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?select=po_id,product_id,qty_ordered,qty_received`, { headers }),
    ]);
    setInventory(await invRes.json());
    setVendors(await vRes.json());
    setVendorPrices(await vpRes.json());
    const openPOs = await poRes.json();
    const allItems = await poItemsRes.json();
    const openIds = new Set(openPOs.map(p => p.id));
    const poByItem = openPOs.reduce((m, p) => { m[p.id] = p; return m; }, {});
    const pending = allItems
      .filter(i => openIds.has(i.po_id) && (i.qty_ordered - (i.qty_received || 0)) > 0)
      .map(i => ({ product_id: i.product_id, po_number: poByItem[i.po_id].po_number, kits_pending: i.qty_ordered - (i.qty_received || 0) }));
    setPendingPOs(pending);
    setLoading(false);
  };

  const categories = useMemo(() => ['all', ...new Set(inventory.map(p => p.cat))], [inventory]);

  const filtered = useMemo(() => {
    let items = inventory.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const mc = filterCat === 'all' || p.cat === filterCat;
      const inStock = (p.stock || 0) > 0;
      const isPending = pendingPOs.some(x => x.product_id === p.id);
      const stockMatch = filterStock === 'all'
        || (filterStock === 'in_stock' && inStock)
        || (filterStock === 'out_of_stock' && !inStock)
        || (filterStock === 'pending' && isPending);
      return ms && mc && stockMatch;
    });
    items.sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return items;
  }, [inventory, search, filterCat, filterStock, pendingPOs, sortBy, sortDir]);

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
    else { setInventory(prev => [...prev, ...data]); setNewP({ name:'', size:'', cat:'Recovery', vendor:'Eve', cost:'', retail:'', stock:10, sku:'', risk:'\uD83D\uDFE1' }); setShowAdd(false); }
    setSaving(false);
  };

  const handleSort = (col) => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('asc'); } };
  const SI = ({ col }) => sortBy === col ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#8C919E' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>\uD83D\uDCE6</div>Loading inventory...</div></div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div><h1 style={cs.h1}>Inventory</h1><p style={{ color:'#8C919E', fontSize:14 }}>{inventory.length} products · {inventory.reduce((s,p)=>s+p.stock,0)} vials · <span style={{color:'#22C55E'}}>Live</span></p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchProducts} style={{ ...cs.btn, background:'#F7F8FA', color:'#6B7A94', border:'1px solid #E4E7EC' }}>\u21BB Refresh</button>
          <button onClick={()=>setShowAdd(!showAdd)} style={{ ...cs.btn, background:'#0072B5', color:'#fff', padding:'10px 20px' }}>+ Add Product</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[{ l:'Wholesale', v:'$'+totalCost.toLocaleString(), c:'#0F1928' },{ l:'Retail Value', v:'$'+totalRetail.toLocaleString(), c:'#22C55E' },{ l:'Avg Margin', v:totalRetail>0?((1-totalCost/totalRetail)*100).toFixed(0)+'%':'0%', c:'#0072B5' },{ l:'Low Stock', v:lowStock.length, c:lowStock.length>0?'#DC2626':'#22C55E' }].map((x,i)=>(
          <div key={i} style={{ ...cs.card, padding:16 }}><div style={{ fontSize:22, fontWeight:700, color:x.c, fontFamily:"'Barlow Condensed'" }}>{x.v}</div><div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>{x.l}</div></div>
        ))}
      </div>

      {lowStock.length>0&&<div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:lowStockCollapsed?'10px 14px':16, marginBottom:20 }}>
        <div onClick={()=>{const n=!lowStockCollapsed; setLowStockCollapsed(n); try{localStorage.setItem('low_stock_collapsed', n?'1':'0');}catch{}}} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none' }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>\u26A0\uFE0F Low Stock <span style={{fontWeight:400,opacity:0.7,marginLeft:6}}>({lowStock.length})</span></div>
          <span style={{ fontSize:11, color:'#DC2626', fontWeight:600 }}>{lowStockCollapsed?'\u25BC Show':'\u25B2 Hide'}</span>
        </div>
        {!lowStockCollapsed && <div style={{ fontSize:12, color:'#7F1D1D', marginTop:8 }}>{lowStock.map(p=>`${p.name} (${p.stock})`).join(' \u00B7 ')}</div>}
      </div>}

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

      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input style={{ ...cs.input, maxWidth:260 }} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={{ display:'flex', gap:4 }}>
          {[
            {k:'all', l:'All', c:'#0072B5'},
            {k:'in_stock', l:'In stock', c:'#16A34A'},
            {k:'out_of_stock', l:'Out of stock', c:'#DC2626'},
            {k:'pending', l:'Pending', c:'#A16207'},
          ].map(f=>(
            <button key={f.k} onClick={()=>setFilterStock(f.k)} style={{...cs.btn, padding:'6px 12px', fontSize:11, background:filterStock===f.k?f.c:'#F7F8FA', color:filterStock===f.k?'#fff':'#6B7A94', border:'1px solid '+(filterStock===f.k?f.c:'#E4E7EC')}}>{f.l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {categories.map(c=><button key={c} onClick={()=>setFilterCat(c)} style={{ ...cs.btn, padding:'6px 12px', fontSize:11, background:filterCat===c?'#0072B5':'#F7F8FA', color:filterCat===c?'#fff':'#6B7A94', border:'1px solid '+(filterCat===c?'#0072B5':'#E4E7EC') }}>{c==='all'?'All':c}</button>)}
        </div>
      </div>

      <div style={{...cs.card, overflowX:'auto'}}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:980 }}>
          <thead><tr style={{ background:'#F7F8FA' }}>
            {[{k:'risk',l:'',w:28},{k:'name',l:'Product'},{k:'size',l:'Size',w:64},{k:'cat',l:'Category',w:96},{k:'vendor',l:'Vendor',w:54},{k:'cost',l:'Cost',w:58},{k:'retail',l:'Retail',w:58},{k:'stock',l:'Stock',w:56},{k:'margin',l:'Margin',w:58},{k:'actions',l:'',w:138}].map(c=>(
              <th key={c.k} onClick={()=>c.k!=='actions'&&c.k!=='risk'&&handleSort(c.k)} style={{ padding:'8px 8px', textAlign:'left', fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #E4E7EC', cursor:c.k!=='actions'?'pointer':'default', width:c.w||'auto', userSelect:'none' }}>{c.l}<SI col={c.k}/></th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(p=>{
              const ie=editId===p.id;const mg=Number(p.retail)>0?((Number(p.retail)-Number(p.cost)/10)/Number(p.retail)*100).toFixed(0):0;const sc=p.stock<=3?'#DC2626':p.stock<=10?'#F59E0B':'#22C55E';
              return(
                <tr key={p.id} style={{ borderBottom:'1px solid #F0F1F4', background:ie?'#FFFBEB':p.active===false?'#FAFAFA':'transparent' }}>
                  <td style={{padding:'6px 8px',fontSize:16}}>{p.risk}</td>

                  <td style={{padding:'6px 8px'}}>{ie?<><input style={{...cs.input,padding:'4px 6px',marginBottom:4}} value={editData.name} onChange={e=>setEditData(d=>({...d,name:e.target.value}))}/><input style={{...cs.input,padding:'4px 6px',fontFamily:"'JetBrains Mono'",fontSize:11}} value={editData.sku} onChange={e=>setEditData(d=>({...d,sku:e.target.value}))}/></>:<div style={{display:'flex',flexDirection:'column',gap:1}}><span style={{fontWeight:600,color:'#0F1928',fontSize:13,lineHeight:1.2}}>{p.name}</span><span style={{fontFamily:"'JetBrains Mono'",fontSize:10,color:'#8C919E'}}>{p.sku}{p.active===false&&<span style={{marginLeft:6,padding:'1px 5px',background:'#FEE2E2',color:'#DC2626',fontSize:9,borderRadius:3,letterSpacing:1}}>HIDDEN</span>}</span></div>}</td>
                  <td style={{padding:'6px 8px',fontSize:12,color:'#6B7A94'}}>{ie?<input style={{...cs.input,width:60,padding:'4px 6px'}} value={editData.size} onChange={e=>setEditData(d=>({...d,size:e.target.value}))}/>:p.size}</td>
                  <td style={{padding:'6px 8px'}}><span style={{...cs.badge,background:'#E8F4FB',color:'#0072B5'}}>{p.cat}</span></td>
                  <td style={{padding:'6px 8px',fontSize:12,color:p.vendor==='Eve'?'#00A0A8':'#E07C24',fontWeight:600}}>{p.vendor}</td>
                  <td style={{padding:'6px 8px',fontFamily:"'JetBrains Mono'",fontSize:12}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.cost} onChange={e=>setEditData(d=>({...d,cost:e.target.value}))}/>:`$${p.cost}`}</td>
                  <td style={{padding:'6px 8px',fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.retail} onChange={e=>setEditData(d=>({...d,retail:e.target.value}))}/>:`$${p.retail}`}</td>
                  <td style={{padding:'6px 8px'}}>{ie?<input style={{...cs.input,width:55,padding:'4px 6px'}} type="number" value={editData.stock} onChange={e=>setEditData(d=>({...d,stock:e.target.value}))}/>:(<div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-start'}}><span style={{fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:600,color:sc}}>{p.stock}</span>{(p.stock||0)===0 && (() => { const pend = pendingPOs.filter(x=>x.product_id===p.id); if(!pend.length) return null; const totalKits = pend.reduce((s,x)=>s+x.kits_pending,0); const poNums = [...new Set(pend.map(x=>x.po_number))].join(', '); return <span title={'Pending: '+poNums} style={{fontFamily:"'JetBrains Mono'",fontSize:9,fontWeight:600,padding:'1px 5px',background:'#FEF3C7',color:'#A16207',borderRadius:3,letterSpacing:0.5,whiteSpace:'nowrap'}}>PEND {totalKits*10}v</span>; })()}</div>)}</td>
                  <td style={{padding:'6px 8px',fontFamily:"'JetBrains Mono'",fontSize:11,color:Number(mg)>=80?'#22C55E':Number(mg)>=60?'#F59E0B':'#DC2626'}}>{mg}%</td>
                  <td style={{padding:'6px 8px'}}>
                    {ie?<div style={{display:'flex',gap:4}}><button onClick={saveEdit} disabled={saving} style={{...cs.btn,background:'#0072B5',color:'#fff',padding:'4px 10px',fontSize:11}}>{saving?'...':'Save'}</button><button onClick={()=>setEditId(null)} style={{...cs.btn,background:'#F7F8FA',color:'#6B7A94',padding:'4px 10px',fontSize:11,border:'1px solid #E4E7EC'}}>\u2715</button></div>
                    :<div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
                      <button onClick={(e)=>{e.stopPropagation(); addToCart(p.id);}} title={poCart[p.id]?`In PO draft: ${poCart[p.id]} kit`:'Add 1 kit to PO draft'} style={{...cs.btn,padding:'2px 6px',fontSize:11,background:poCart[p.id]?'#16A34A':'#0072B5',color:'#fff',border:'none',whiteSpace:'nowrap',lineHeight:1}}>🛒{poCart[p.id]?poCart[p.id]:'+'}</button><button onClick={()=>{setEditId(p.id);setEditData({...p})}} title="Edit" style={{background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'2px 4px',color:'#6B7A94',lineHeight:1}}>✎</button>
                      <button onClick={()=>deleteProduct(p.id)} title="Delete" style={{background:'none',border:'none',cursor:'pointer',fontSize:13,padding:'2px 4px',color:'#DC2626',lineHeight:1}}>\u2715</button>
                      <button onClick={async (e)=>{
                        e.stopPropagation();
                        const r = await fetch('/api/product-write', {
                          method:'POST', headers:{'Content-Type':'application/json'},
                          body: JSON.stringify({ action:'update', id: p.id, fields:{ active: p.active===false ? true : false } })
                        });
                        if (r.ok) setInventory(prev => prev.map(x => x.id===p.id ? { ...x, active: x.active===false ? true : false } : x));
                        else { const e2 = await r.json().catch(()=>({})); alert('Failed: '+(e2.error||r.status)); }
                      }} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,opacity:p.active===false?0.3:1,padding:'2px 4px',lineHeight:1}} title={p.active===false?'Show':'Hide'}>
                        {p.active===false ? '\uD83D\uDEAB' : '\uD83D\uDC41'}
                      </button>
                      <button onClick={(e)=>{e.stopPropagation(); setCompareFor(p);}} title="Compare vendors" style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontSize:13,padding:'2px 4px',lineHeight:1}}>⚖</button>
                      <button onClick={(e)=>{
                        e.stopPropagation();
                        setContentFor(p);
                        setContentForm({
                          description: p.description || '',
                          specs: Array.isArray(p.specs) ? p.specs : [],
                          research: Array.isArray(p.research) ? p.research : [],
                        });
                      }} title="Edit content" style={{background:'none',border:'none',color:'#0072B5',cursor:'pointer',fontSize:13,padding:'2px 4px',lineHeight:1}}>✏</button>
                    </div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {compareFor && (() => {
        const matches = vendorPrices.filter(vp => vp.product_id === compareFor.id);
        const minCost = matches.length ? Math.min(...matches.map(m => Number(m.cost_per_kit))) : 0;
        return (
          <div onClick={()=>setCompareFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:8,maxWidth:500,width:'100%',padding:24}}>
              <h2 style={{fontSize:18,fontWeight:700,color:'#0F1928',marginBottom:4}}>{compareFor.name}</h2>
              <p style={{color:'#7A7D88',fontSize:12,marginBottom:16}}>{compareFor.size} \u00B7 {compareFor.sku}</p>
              {matches.length === 0 && <p style={{color:'#7A7D88'}}>No vendors have priced this product yet.</p>}
              {matches.length > 0 && (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                    <th style={{padding:'8px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Vendor</th>
                    <th style={{padding:'8px',textAlign:'right',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Cost / kit</th>
                    <th style={{padding:'8px',textAlign:'right',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>Updated</th>
                  </tr></thead>
                  <tbody>
                    {matches.sort((a,b)=>Number(a.cost_per_kit)-Number(b.cost_per_kit)).map(m => {
                      const v = vendors.find(v => v.id === m.vendor_id);
                      const isMin = Number(m.cost_per_kit) === minCost;
                      return (
                        <tr key={m.id} style={{borderBottom:'1px solid #F0F1F4',background:isMin?'#F0FDF4':'transparent'}}>
                          <td style={{padding:'8px',fontWeight:isMin?700:400}}>{v?.name} {isMin && <span style={{color:'#16A34A',fontSize:10,marginLeft:6}}>\u2193 CHEAPEST</span>}</td>
                          <td style={{padding:'8px',textAlign:'right',fontFamily:'monospace',color:isMin?'#16A34A':'#0F1928',fontWeight:isMin?700:400}}>${Number(m.cost_per_kit).toFixed(2)}</td>
                          <td style={{padding:'8px',textAlign:'right',fontSize:11,color:'#7A7D88'}}>{new Date(m.last_updated).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <button onClick={()=>setCompareFor(null)} style={{marginTop:16,padding:'8px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Close</button>
            </div>
          </div>
        );
      })()}

      {contentFor && (
        <div onClick={()=>setContentFor(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:8,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24}}>
            <h2 style={{fontSize:20,fontWeight:700,color:'#0F1928',marginBottom:4}}>{contentFor.name}</h2>
            <p style={{color:'#7A7D88',fontSize:12,marginBottom:20}}>{contentFor.size} \u00B7 {contentFor.sku}</p>
            <p style={{fontSize:11,color:'#A16207',background:'#FEF3C7',padding:8,borderRadius:4,marginBottom:16}}>If left empty, the product page shows the generic template.</p>

            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Description</label>
            <textarea value={contentForm.description} onChange={e=>setContentForm(f=>({...f,description:e.target.value}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:120,marginBottom:4}} />
            <p style={{fontSize:10,color:'#7A7D88',marginBottom:16}}>{contentForm.description.length} characters</p>

            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Specs (one per line)</label>
            <textarea value={contentForm.specs.join('\n')} onChange={e=>setContentForm(f=>({...f,specs:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80,marginBottom:16,fontFamily:'monospace'}} placeholder={'\u226599% purity\nLyophilized form\nHPLC verified'} />

            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Research links (one per line: Title | URL)</label>
            <textarea value={contentForm.research.map(r=>`${r.title} | ${r.url}`).join('\n')} onChange={e=>{
              const lines = e.target.value.split('\n').map(l=>l.trim()).filter(Boolean);
              const arr = lines.map(l => {
                const [title, url] = l.split('|').map(s=>s.trim());
                return { title: title||'', url: url||'' };
              }).filter(r => r.title && r.url);
              setContentForm(f=>({...f,research:arr}));
            }} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80,marginBottom:20,fontFamily:'monospace'}} placeholder={'BPC-157 effects on tendon healing | https://pubmed.ncbi.nlm.nih.gov/...'} />

            <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
              <button onClick={()=>setContentFor(null)} style={{padding:'8px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={async ()=>{
                const r = await fetch('/api/product-write', {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ action:'update', id: contentFor.id, fields: contentForm }),
                });
                if (r.ok) {
                  setInventory(prev => prev.map(x => x.id===contentFor.id ? { ...x, ...contentForm } : x));
                  setContentFor(null);
                } else {
                  const e = await r.json().catch(()=>({}));
                  alert('Failed: '+(e.error||r.status));
                }
              }} style={{padding:'8px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Save Content</button>
            </div>
          </div>
        </div>
      )}

      {cartCount > 0 && (
        <div style={{position:'fixed',bottom:24,right:24,background:'#0F1928',color:'white',padding:'14px 20px',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.25)',display:'flex',alignItems:'center',gap:14,zIndex:50,fontSize:13}}>
          <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,letterSpacing:1,color:'#7A7D88',textTransform:'uppercase'}}>PO draft</span>
          <span style={{fontWeight:700}}>{cartCount} item{cartCount===1?'':'s'} · {cartKits} kit{cartKits===1?'':'s'}</span>
          <button onClick={clearCart} style={{background:'none',border:'1px solid #7A7D88',color:'#7A7D88',padding:'4px 10px',borderRadius:4,fontSize:11,cursor:'pointer'}}>Clear</button>
          <a href="/admin/purchases?from_cart=1" style={{background:'#00A0A8',color:'#fff',padding:'8px 14px',borderRadius:4,fontSize:12,fontWeight:700,textDecoration:'none',letterSpacing:1,textTransform:'uppercase'}}>Open in new PO →</a>
        </div>
      )}
    </div>
  );
}
