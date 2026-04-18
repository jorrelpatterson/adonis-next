'use client';
export const dynamic = 'force-dynamic';
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
  const [newPo, setNewPo] = useState({ vendor_id: '', qtys: {}, notes: '' });
  const [creating, setCreating] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [pendingPOs, setPendingPOs] = useState([]);

  // If arrived via inventory cart, hydrate the New PO form (read window.location instead of useSearchParams to avoid Suspense requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('from_cart') === '1') {
      try {
        const cart = JSON.parse(localStorage.getItem('po_cart') || '{}');
        if (Object.keys(cart).length) {
          setNewPo(prev => ({ ...prev, qtys: cart }));
          setShowNew(true);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    async function load() {
      const [poRes, vRes, prRes, pRes, openItRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?select=*,vendor:vendors(name)&order=created_at.desc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendors?select=*&active=is.true&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,sku,name,size,stock`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?select=po_id,product_id,qty_ordered,qty_received,po:purchase_orders(po_number,status)`, { headers: H() }),
      ]);
      setPos(await poRes.json());
      setVendors(await vRes.json());
      setPrices(await prRes.json());
      setProducts(await pRes.json());
      const openItems = await openItRes.json();
      const pending = openItems
        .filter(i => i.po && ['submitted','partial'].includes(i.po.status) && (i.qty_ordered - (i.qty_received || 0)) > 0)
        .map(i => ({ product_id: i.product_id, po_number: i.po.po_number, kits_pending: i.qty_ordered - (i.qty_received || 0) }));
      setPendingPOs(pending);
      setLoading(false);
    }
    load();
  }, []);

  const vendorPrices = (vendor_id) => prices.filter(p => p.vendor_id === vendor_id);

  const create = async () => {
    if (!newPo.vendor_id) { alert('Pick a vendor'); return; }
    const vp = vendorPrices(newPo.vendor_id);
    const priceByPid = Object.fromEntries(vp.map(x => [x.product_id, x.cost_per_kit]));
    const items = Object.entries(newPo.qtys || {})
      .map(([pid, qty]) => ({ product_id: parseInt(pid,10), qty_ordered: parseInt(qty,10), unit_cost: priceByPid[parseInt(pid,10)] }))
      .filter(i => i.qty_ordered > 0 && i.unit_cost !== undefined);
    if (!items.length) { alert('Set qty on at least one row'); return; }
    setCreating(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', vendor_id: newPo.vendor_id, items, notes: newPo.notes }),
    });
    if (r.ok) {
      const { po } = await r.json();
      try { localStorage.removeItem('po_cart'); } catch {}
      router.push(`/admin/purchases/${po.id}`);
    } else {
      const e = await r.json().catch(()=>({}));
      alert('Failed: ' + (e.error || r.status));
      setCreating(false);
    }
  };

  if (loading) return <div style={{padding:32}}>Loading...</div>;

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
            <select value={newPo.vendor_id} onChange={e=>setNewPo(p=>({...p,vendor_id:e.target.value,qtys:{}}))} style={{padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minWidth:240}}>
              <option value="">— pick vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {newPo.vendor_id && (() => {
            const vp = vendorPrices(newPo.vendor_id);
            const priceByPid = Object.fromEntries(vp.map(x => [x.product_id, x.cost_per_kit]));
            const catalog = products.filter(p => priceByPid[p.id] !== undefined)
              .filter(p => !poSearch || p.name.toLowerCase().includes(poSearch.toLowerCase()) || p.sku.toLowerCase().includes(poSearch.toLowerCase()))
              .sort((a,b) => a.name.localeCompare(b.name));
            const lineCount = Object.values(newPo.qtys || {}).filter(q => Number(q) > 0).length;
            const total = Object.entries(newPo.qtys || {}).reduce((s, [pid, q]) => {
              const cost = priceByPid[parseInt(pid,10)] || 0;
              return s + (Number(q) || 0) * Number(cost);
            }, 0);

            return (
              <>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
                  <input type="text" placeholder="Search product or SKU..." value={poSearch} onChange={e=>setPoSearch(e.target.value)} style={{flex:1,padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} />
                  <div style={{fontSize:12,color:'#8C919E'}}>{catalog.length} products · {vp.length} total in vendor catalog</div>
                </div>

                <div style={{maxHeight:480,overflow:'auto',border:'1px solid #E4E7EC',borderRadius:6,marginBottom:16}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC',position:'sticky',top:0,zIndex:1}}>
                      {['Product','Size','SKU','On hand','Cost/kit','Qty (kits)','Line total'].map((h,i)=>(<th key={i} style={{padding:'8px 12px',textAlign:i>=3?'right':'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
                    </tr></thead>
                    <tbody>
                      {catalog.map(p => {
                        const cost = priceByPid[p.id];
                        const qty = newPo.qtys?.[p.id] || '';
                        const lt = (Number(qty) || 0) * Number(cost);
                        return (
                          <tr key={p.id} style={{borderBottom:'1px solid #F0F1F4',background:Number(qty) > 0 ? '#F0FDF4' : 'transparent'}}>
                            <td style={{padding:'8px 12px'}}>{p.name}</td>
                            <td style={{padding:'8px 12px',color:'#7A7D88',fontSize:11}}>{p.size}</td>
                            <td style={{padding:'8px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{p.sku}</td>
                            <td style={{padding:'8px 12px',textAlign:'right'}}>
                              {(() => {
                                const stock = p.stock || 0;
                                const pend = pendingPOs.filter(x => x.product_id === p.id);
                                const totalPending = pend.reduce((s,x) => s+x.kits_pending, 0);
                                return (
                                  <div style={{display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end'}}>
                                    <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,fontWeight:600,color:stock>0?'#16A34A':'#9CA3AF'}}>{stock}v</span>
                                    {totalPending > 0 && (
                                      <span title={'Pending: '+[...new Set(pend.map(x=>x.po_number))].join(', ')} style={{fontFamily:"'JetBrains Mono'",fontSize:9,fontWeight:600,padding:'1px 5px',background:'#FEF3C7',color:'#A16207',borderRadius:3,letterSpacing:0.5,whiteSpace:'nowrap'}}>PEND {totalPending*10}v</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace'}}>${Number(cost).toFixed(2)}</td>
                            <td style={{padding:'8px 12px',textAlign:'right'}}>
                              <input type="number" min="0" value={qty} onChange={e=>setNewPo(prev=>({...prev,qtys:{...(prev.qtys||{}),[p.id]:e.target.value}}))} style={{width:70,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12,textAlign:'right'}} />
                            </td>
                            <td style={{padding:'8px 12px',textAlign:'right',fontFamily:'monospace',color:Number(qty) > 0 ? '#16A34A' : '#9CA3AF',fontWeight:Number(qty) > 0 ? 600 : 400}}>${lt.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {!catalog.length && <tr><td colSpan="6" style={{padding:'24px',textAlign:'center',color:'#9CA3AF'}}>No products match (or vendor has no priced products yet — add prices on the vendor's Pricing tab first).</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'12px 16px',background:'#FAFBFC',borderRadius:6}}>
                  <div style={{fontSize:13,color:'#4A4F5C'}}>{lineCount} line{lineCount === 1 ? '' : 's'}</div>
                  <div style={{fontSize:18,fontFamily:'monospace',color:'#0072B5',fontWeight:700}}>Total: ${total.toFixed(2)}</div>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes (optional)</label>
                  <textarea value={newPo.notes} onChange={e=>setNewPo(p=>({...p,notes:e.target.value}))} style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:60}} />
                </div>
                <button onClick={create} disabled={creating || lineCount === 0} style={{padding:'10px 24px',background:lineCount === 0 ? '#9CA3AF' : '#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:lineCount === 0 ? 'not-allowed' : 'pointer',opacity:creating?0.5:1}}>
                  {creating ? 'Creating...' : `Save as Draft (${lineCount} line${lineCount === 1 ? '' : 's'})`}
                </button>
              </>
            );
          })()}
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
