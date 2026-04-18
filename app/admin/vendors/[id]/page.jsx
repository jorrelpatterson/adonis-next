'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

export default function VendorDetailPage() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState({});
  const [editForm, setEditForm] = useState({});
  const [tab, setTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    async function load() {
      const [vRes, pRes, prRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/vendors?id=eq.${id}&select=*`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,size,sku,cat&order=name.asc`, { headers: H() }),
        fetch(`${SUPABASE_URL}/rest/v1/vendor_prices?vendor_id=eq.${id}&select=product_id,cost_per_kit`, { headers: H() }),
      ]);
      const [v] = await vRes.json();
      setVendor(v);
      setEditForm({ name: v.name, contact_email: v.contact_email||'', contact_phone: v.contact_phone||'', notes: v.notes||'', active: v.active });
      setProducts(await pRes.json());
      const pmap = {};
      (await prRes.json()).forEach(r => { pmap[r.product_id] = r.cost_per_kit; });
      setPrices(pmap);
    }
    load();
  }, [id]);

  const saveDetails = async () => {
    setSaving(true);
    const r = await fetch('/api/vendor-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id, fields: editForm }),
    });
    if (r.ok) { setVendor(v => ({...v, ...editForm})); alert('Saved'); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setSaving(false);
  };

  const setPrice = (product_id, cost) => {
    setPrices(prev => ({ ...prev, [product_id]: cost }));
  };

  const savePrice = async (product_id) => {
    const cost = parseFloat(prices[product_id]);
    if (isNaN(cost) || cost < 0) { alert('Invalid cost'); return; }
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'upsert', entries:[{ vendor_id: id, product_id, cost_per_kit: cost }] }),
    });
    if (!r.ok) { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  const removePrice = async (product_id) => {
    if (!confirm('Remove this product from this vendor?')) return;
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'delete', vendor_id: id, product_id }),
    });
    if (r.ok) setPrices(prev => { const n = {...prev}; delete n[product_id]; return n; });
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  const bulkUpdate = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const entries = [];
    const skuMap = Object.fromEntries(products.map(p => [p.sku, p.id]));
    const errors = [];
    for (const line of lines) {
      const [sku, costStr] = line.split(',').map(s => s.trim());
      const pid = skuMap[sku];
      const cost = parseFloat(costStr);
      if (!pid) { errors.push(`Unknown SKU: ${sku}`); continue; }
      if (isNaN(cost) || cost < 0) { errors.push(`Invalid cost for ${sku}: ${costStr}`); continue; }
      entries.push({ vendor_id: id, product_id: pid, cost_per_kit: cost });
    }
    if (errors.length) { alert('Errors:\n' + errors.join('\n')); return; }
    if (!entries.length) { alert('No valid entries'); return; }
    const r = await fetch('/api/vendor-prices-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'upsert', entries }),
    });
    if (r.ok) {
      setPrices(prev => { const n = {...prev}; entries.forEach(e => { n[e.product_id] = e.cost_per_kit; }); return n; });
      setBulkText('');
      alert(`Updated ${entries.length} prices`);
    } else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
  };

  if (!vendor) return <div style={{padding:32}}>Loading...</div>;

  return (
    <div>
      <Link href="/admin/vendors" style={{color:'#8C919E',fontSize:12,textDecoration:'none'}}>← All vendors</Link>
      <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,marginTop:8}}>{vendor.name}</h1>

      <div style={{display:'flex',gap:16,borderBottom:'1px solid #E4E7EC',marginBottom:24,marginTop:20}}>
        {['details','pricing'].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 4px',background:'none',border:'none',borderBottom:tab===t?'2px solid #0072B5':'2px solid transparent',color:tab===t?'#0072B5':'#8C919E',fontSize:13,fontWeight:tab===t?600:400,cursor:'pointer',textTransform:'capitalize'}}>{t === 'pricing' ? 'Pricing sheet' : t}</button>
        ))}
      </div>

      {tab === 'details' && (
        <div style={{maxWidth:500}}>
          {[
            {k:'name',l:'Name'},{k:'contact_email',l:'Contact email'},{k:'contact_phone',l:'Contact phone'},
          ].map(f => (
            <div key={f.k} style={{marginBottom:12}}>
              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>{f.l}</label>
              <input style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13}} value={editForm[f.k]||''} onChange={e=>setEditForm(prev=>({...prev,[f.k]:e.target.value}))} />
            </div>
          ))}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Notes</label>
            <textarea style={{width:'100%',padding:'8px 12px',border:'1px solid #E4E7EC',borderRadius:4,fontSize:13,minHeight:80}} value={editForm.notes||''} onChange={e=>setEditForm(prev=>({...prev,notes:e.target.value}))} />
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,fontSize:13}}>
            <input type="checkbox" checked={editForm.active!==false} onChange={e=>setEditForm(prev=>({...prev,active:e.target.checked}))} />
            Active (uncheck to hide vendor from new POs without losing history)
          </label>
          <button onClick={saveDetails} disabled={saving} style={{padding:'10px 24px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.5:1}}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {tab === 'pricing' && (
        <>
          <details style={{marginBottom:20}}>
            <summary style={{cursor:'pointer',fontSize:12,color:'#0072B5'}}>Bulk paste prices (one per line: SKU,cost)</summary>
            <textarea style={{width:'100%',marginTop:8,padding:8,fontFamily:'monospace',fontSize:12,minHeight:120,border:'1px solid #E4E7EC',borderRadius:4}} placeholder="BP10,25&#10;TB50,28" value={bulkText} onChange={e=>setBulkText(e.target.value)} />
            <button onClick={bulkUpdate} style={{marginTop:8,padding:'8px 16px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer'}}>Apply bulk update</button>
          </details>
          <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                {['SKU','Product','Size','Cat','Cost / kit',''].map((h,i)=>(<th key={i} style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                    <td style={{padding:'8px 12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{p.sku}</td>
                    <td style={{padding:'8px 12px'}}>{p.name}</td>
                    <td style={{padding:'8px 12px',color:'#7A7D88',fontSize:11}}>{p.size}</td>
                    <td style={{padding:'8px 12px',color:'#7A7D88',fontSize:11}}>{p.cat}</td>
                    <td style={{padding:'8px 12px'}}>
                      <input type="number" step="0.01" min="0" placeholder="—" style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}}
                        value={prices[p.id] ?? ''}
                        onChange={e => setPrice(p.id, e.target.value)}
                        onBlur={() => prices[p.id] !== undefined && prices[p.id] !== '' && savePrice(p.id)} />
                    </td>
                    <td style={{padding:'8px 12px'}}>{prices[p.id] !== undefined && <button onClick={()=>removePrice(p.id)} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:14}}>×</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
