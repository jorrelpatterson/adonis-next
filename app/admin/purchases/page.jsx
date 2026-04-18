'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

const STATUS_BADGE = {
  draft:     { bg:'#F3F4F6', fg:'#6B7280' },
  submitted: { bg:'#DBEAFE', fg:'#1D4ED8' },
  partial:   { bg:'#FEF3C7', fg:'#A16207' },
  received:  { bg:'#DCFCE7', fg:'#16A34A' },
  cancelled: { bg:'#FEE2E2', fg:'#DC2626' },
};

export default function PurchasesPage() {
  const router = useRouter();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [prices, setPrices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newPo, setNewPo] = useState({ vendor_id: '', items: [], notes: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const [poRes, vRes, prRes, pRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?select=*,vendor:vendors(name)&order=created_at.desc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&active=is.true&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,sku,name,size`, { headers: H() }),
      ]);
      setPos(await poRes.json());
      setVendors(await vRes.json());
      setPrices(await prRes.json());
      setProducts(await pRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const vendorPrices = (vendor_id) => prices.filter(p => p.vendor_id === vendor_id);

  const addLine = () => setNewPo(p => ({ ...p, items: [...p.items, { product_id: '', qty_ordered: 1, unit_cost: 0 }] }));
  const removeLine = (i) => setNewPo(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const updateLine = (i, field, val) => setNewPo(p => {
    const items = [...p.items];
    items[i] = { ...items[i], [field]: val };
    if (field === 'product_id') {
      const vp = vendorPrices(p.vendor_id).find(x => x.product_id === parseInt(val, 10));
      if (vp) items[i].unit_cost = vp.cost_per_kit;
    }
    return { ...p, items };
  });

  const total = newPo.items.reduce((s, i) => s + (Number(i.qty_ordered) || 0) * (Number(i.unit_cost) || 0), 0);

  const create = async () => {
    if (!newPo.vendor_id) { alert('Pick a vendor'); return; }
    if (!newPo.items.length) { alert('Add at least one line'); return; }
    for (const i of newPo.items) {
      if (!i.product_id) { alert('Pick a product on every line'); return; }
      if (!i.qty_ordered || i.qty_ordered < 1) { alert('Qty must be ≥1'); return; }
    }
    setCreating(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', vendor_id: newPo.vendor_id, items: newPo.items, notes: newPo.notes }),
    });
    if (r.ok) {
      const { po } = await r.json();
      router.push(`/admin/purchases/${po.id}`);
    } else {
      const e = await r.json().catch(()=>({}));
      alert('Failed: ' + (e.error || r.status));
      setCreating(false);
    }
  };

  if (loading) return <div style={{padding:32}}>Loading...</div>;

  const allowedProducts = newPo.vendor_id ? products.filter(p => vendorPrices(newPo.vendor_id).some(vp => vp.product_id === p.id)) : [];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Purchases</h1>
          <p style={{color:'#8C919E',fontSize:14}}>{pos.length} purchase orders</p>
        </div>
        <button onClick={()=>setShowNew(s=>!s)} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>
          {showNew ? 'Cancel' : '+ New PO'}
        </button>
      </div>

      {showNew && (
        <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,padding:20,marginBottom:24}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Vendor</label>
            <select value={newPo.vendor_id} onChange={e=>setNewPo(p=>({...p,vendor_id:e.target.value,items:[]}))} style={{padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minWidth:240}}>
              <option value="">— pick vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {newPo.vendor_id && (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',marginBottom:12}}>
                <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                  {['Product','Qty (kits)','Unit cost','Line total',''].map((h,i)=>(<th key={i} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {newPo.items.map((line, i) => {
                    const lt = (Number(line.qty_ordered)||0) * (Number(line.unit_cost)||0);
                    return (
                      <tr key={i} style={{borderBottom:'1px solid #F0F1F4'}}>
                        <td style={{padding:'8px 12px'}}>
                          <select value={line.product_id} onChange={e=>updateLine(i,'product_id',e.target.value)} style={{padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:12,minWidth:240}}>
                            <option value="">—</option>
                            {allowedProducts.map(p => <option key={p.id} value={p.id}>{p.name} · {p.size} ({p.sku})</option>)}
                          </select>
                        </td>
                        <td style={{padding:'8px 12px'}}><input type="number" min="1" value={line.qty_ordered} onChange={e=>updateLine(i,'qty_ordered',e.target.value)} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                        <td style={{padding:'8px 12px'}}><input type="number" step="0.01" min="0" value={line.unit_cost} onChange={e=>updateLine(i,'unit_cost',e.target.value)} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                        <td style={{padding:'8px 12px',fontFamily:'monospace',fontSize:13}}>${lt.toFixed(2)}</td>
                        <td style={{padding:'8px 12px'}}><button onClick={()=>removeLine(i)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer'}}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr><td colSpan="3" style={{padding:'12px',textAlign:'right',fontWeight:700}}>Total</td><td style={{padding:'12px',fontFamily:'monospace',fontSize:15,color:'#0072B5',fontWeight:700}}>${total.toFixed(2)}</td><td></td></tr></tfoot>
              </table>
              <button onClick={addLine} style={{padding:'6px 14px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:4,fontSize:12,cursor:'pointer',marginBottom:16}}>+ Add line</button>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes (optional)</label>
                <textarea value={newPo.notes} onChange={e=>setNewPo(p=>({...p,notes:e.target.value}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:60}} />
              </div>
              <button onClick={create} disabled={creating} style={{padding:'10px 24px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:creating?0.5:1}}>
                {creating ? 'Creating...' : 'Save as Draft'}
              </button>
            </>
          )}
        </div>
      )}

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['PO #','Vendor','Status','Total','Created',''].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {pos.map(po => {
              const b = STATUS_BADGE[po.status] || { bg:'#eee', fg:'#666' };
              return (
                <tr key={po.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:12,color:'#0072B5'}}>{po.po_number}</td>
                  <td style={{padding:'12px',fontSize:13}}>{po.vendor?.name}</td>
                  <td style={{padding:'12px'}}><span style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:b.bg,color:b.fg,textTransform:'uppercase',letterSpacing:1}}>{po.status}</span></td>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:13}}>${Number(po.total_cost||0).toFixed(2)}</td>
                  <td style={{padding:'12px',fontSize:12,color:'#7A7D88'}}>{new Date(po.created_at).toLocaleDateString()}</td>
                  <td style={{padding:'12px',textAlign:'right'}}><Link href={`/admin/purchases/${po.id}`} style={{color:'#0072B5',fontSize:12,textDecoration:'none'}}>Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
