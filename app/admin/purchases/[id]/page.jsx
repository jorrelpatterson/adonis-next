'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

const STATUS_BADGE = {
  draft:{bg:'#F3F4F6',fg:'#6B7280'}, submitted:{bg:'#DBEAFE',fg:'#1D4ED8'},
  partial:{bg:'#FEF3C7',fg:'#A16207'}, received:{bg:'#DCFCE7',fg:'#16A34A'},
  cancelled:{bg:'#FEE2E2',fg:'#DC2626'},
};

export default function PoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [showReceive, setShowReceive] = useState(false);
  const [receipts, setReceipts] = useState({});
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [poRes, itRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/purchase_orders?id=eq.${id}&select=*,vendor:vendors(name,contact_email)`, { headers: H() }),
      fetch(`${SUPABASE_URL}/rest/v1/purchase_order_items?po_id=eq.${id}&select=*`, { headers: H() }),
    ]);
    const [p] = await poRes.json();
    const its = await itRes.json();
    setPo(p);
    setItems(its);
    const ids = its.map(i => i.product_id);
    if (ids.length) {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=in.(${ids.join(',')})&select=id,sku,name,size`, { headers: H() });
      const ps = await pRes.json();
      setProducts(Object.fromEntries(ps.map(p => [p.id, p])));
    }
  };
  useEffect(() => { reload(); }, [id]);

  const submit = async () => {
    if (!confirm('Submit this PO and email the vendor?')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'submit', id }),
    });
    if (r.ok) {
      const data = await r.json();
      if (data.whatsapp_only) {
        alert(`Submitted as ${data.po_number}. No email on file — use "Copy as WhatsApp text" to send manually.`);
      } else {
        alert(`Submitted as ${data.po_number}. Email sent.`);
      }
      reload();
    }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const resend = async () => {
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'resend', id }),
    });
    if (r.ok) { alert('PO email resent.'); reload(); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const cancel = async () => {
    if (!confirm('Cancel this PO?')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'cancel', id }),
    });
    if (r.ok) reload();
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const closeForce = async () => {
    if (!confirm('Force close this PO? Stock won\'t be auto-incremented for the remaining balance — only what was already received counts.')) return;
    setBusy(true);
    const r = await fetch('/api/purchase-write', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'close', id }),
    });
    if (r.ok) reload();
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  const copyWhatsApp = async () => {
    const lines = [];
    lines.push(`*PURCHASE ORDER ${po.po_number}*`);
    lines.push(`Vendor: ${po.vendor?.name || ''}`);
    lines.push(`Date: ${new Date(po.submitted_at || po.created_at).toLocaleDateString()}`);
    lines.push('');
    lines.push('*Items:*');
    items.forEach(i => {
      const p = products[i.product_id] || {};
      const lt = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
      lines.push(`• ${p.name} (${p.size}) — ${i.qty_ordered} kits @ $${Number(i.unit_cost).toFixed(2)} = $${lt}`);
    });
    lines.push('');
    lines.push(`*Total: $${Number(po.total_cost || 0).toFixed(2)}*`);
    lines.push('');
    lines.push('*Ship to:*');
    lines.push('Jorrel Patterson');
    lines.push('760 E. Princeton St');
    lines.push('Ontario, CA 91764');
    if (po.notes) {
      lines.push('');
      lines.push(`Notes: ${po.notes}`);
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('PO copied to clipboard. Paste into vendor\'s WhatsApp chat.');
    } catch (e) {
      // Fallback: show in a prompt the user can manually copy
      prompt('Copy this PO text:', text);
    }
  };

  const openReceive = () => {
    const init = {};
    items.forEach(i => {
      const remaining = Math.max(0, i.qty_ordered - (i.qty_received || 0));
      init[i.id] = { receive_now: remaining, unit_cost: i.unit_cost };
    });
    setReceipts(init);
    setShowReceive(true);
  };

  const submitReceipt = async () => {
    const arr = Object.entries(receipts).map(([item_id, r]) => ({
      item_id, receive_now: parseInt(r.receive_now, 10), unit_cost: Number(r.unit_cost),
    })).filter(r => r.receive_now > 0);
    if (!arr.length) { alert('Nothing to receive'); return; }
    setBusy(true);
    const r = await fetch('/api/purchase-receive', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ po_id: id, receipts: arr }),
    });
    if (r.ok) { setShowReceive(false); reload(); alert('Receipt recorded. Stock + cost updated.'); }
    else { const e = await r.json().catch(()=>({})); alert('Failed: '+(e.error||r.status)); }
    setBusy(false);
  };

  if (!po) return <div style={{padding:32}}>Loading...</div>;
  const b = STATUS_BADGE[po.status] || { bg:'#eee', fg:'#666' };

  return (
    <div>
      <Link href="/admin/purchases" style={{color:'#8C919E',fontSize:12,textDecoration:'none'}}>← All purchases</Link>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:8,marginBottom:24}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,color:'#0F1928',fontFamily:'monospace',letterSpacing:1}}>{po.po_number}</h1>
          <p style={{color:'#8C919E',fontSize:14}}>Vendor: <strong>{po.vendor?.name}</strong> · Created {new Date(po.created_at).toLocaleString()}</p>
          {po.submitted_at && <p style={{color:'#8C919E',fontSize:12}}>Submitted: {new Date(po.submitted_at).toLocaleString()}</p>}
          {po.received_at && <p style={{color:'#8C919E',fontSize:12}}>Fully received: {new Date(po.received_at).toLocaleString()}</p>}
          {po.last_emailed_at && <p style={{color:'#8C919E',fontSize:12}}>Last email: {new Date(po.last_emailed_at).toLocaleString()}</p>}
        </div>
        <span style={{padding:'4px 12px',borderRadius:6,fontSize:12,background:b.bg,color:b.fg,textTransform:'uppercase',letterSpacing:1,fontWeight:600}}>{po.status}</span>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:24}}>
        {po.status === 'draft' && <button onClick={submit} disabled={busy} style={{padding:'10px 20px',background:'#0072B5',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Submit + Email Vendor</button>}
        {['submitted','partial'].includes(po.status) && <>
          <button onClick={openReceive} disabled={busy} style={{padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Receive Shipment</button>
          <button onClick={resend} disabled={busy} style={{padding:'10px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Resend PO email</button>
          <button onClick={copyWhatsApp} disabled={busy} style={{padding:'10px 20px',background:'#25D366',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Copy as WhatsApp text</button>
          <button onClick={cancel} disabled={busy} style={{padding:'10px 20px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel PO</button>
        </>}
        {po.status === 'partial' && <button onClick={closeForce} disabled={busy} style={{padding:'10px 20px',background:'#FEF3C7',color:'#A16207',border:'1px solid #FDE68A',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Close PO (forced)</button>}
        {po.status === 'draft' && <button onClick={cancel} disabled={busy} style={{padding:'10px 20px',background:'#FEE2E2',color:'#DC2626',border:'1px solid #FECACA',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Discard draft</button>}
      </div>

      <div style={{background:'#fff',border:'1px solid #E4E7EC',borderRadius:8,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
            {['SKU','Product','Size','Ordered','Received','Unit cost','Line total'].map((h,i)=>(<th key={i} style={{padding:'12px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {items.map(i => {
              const p = products[i.product_id] || {};
              const lt = (Number(i.qty_ordered) * Number(i.unit_cost)).toFixed(2);
              const fully = (i.qty_received || 0) >= i.qty_ordered;
              return (
                <tr key={i.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                  <td style={{padding:'12px',fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5'}}>{p.sku}</td>
                  <td style={{padding:'12px',fontSize:13}}>{p.name}</td>
                  <td style={{padding:'12px',color:'#7A7D88',fontSize:11}}>{p.size}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13}}>{i.qty_ordered}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13,color:fully?'#16A34A':(i.qty_received?'#A16207':'#7A7D88')}}>{i.qty_received||0}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13}}>${Number(i.unit_cost).toFixed(2)}</td>
                  <td style={{padding:'12px',fontFamily:'monospace',fontSize:13,fontWeight:600}}>${lt}</td>
                </tr>
              );
            })}
            <tr><td colSpan="6" style={{padding:'12px',textAlign:'right',fontWeight:700}}>Total</td><td style={{padding:'12px',fontFamily:'monospace',fontSize:16,color:'#0072B5',fontWeight:700}}>${Number(po.total_cost||0).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>

      {po.notes && <div style={{marginTop:24,padding:16,background:'#FAFBFC',borderLeft:'3px solid #00A0A8',borderRadius:4}}><strong>Notes:</strong><br />{po.notes}</div>}

      {showReceive && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}} onClick={()=>setShowReceive(false)}>
          <div style={{background:'white',borderRadius:8,maxWidth:800,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24}} onClick={e=>e.stopPropagation()}>
            <h2 style={{fontSize:20,fontWeight:700,color:'#0F1928',marginBottom:16}}>Receive Shipment</h2>
            <p style={{color:'#7A7D88',fontSize:13,marginBottom:16}}>Enter what arrived per line. Edit the unit cost if the invoice differs from what was on the PO.</p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'#FAFBFC',borderBottom:'1px solid #E4E7EC'}}>
                {['Product','Ordered','So far','Receive now','Unit cost'].map((h,i)=>(<th key={i} style={{padding:'8px',textAlign:'left',fontSize:11,color:'#8C919E',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{h}</th>))}
              </tr></thead>
              <tbody>
                {items.map(i => {
                  const p = products[i.product_id] || {};
                  const r = receipts[i.id] || { receive_now: 0, unit_cost: i.unit_cost };
                  return (
                    <tr key={i.id} style={{borderBottom:'1px solid #F0F1F4'}}>
                      <td style={{padding:'8px'}}>{p.name} <span style={{color:'#7A7D88',fontSize:11}}>({p.size})</span></td>
                      <td style={{padding:'8px',fontFamily:'monospace'}}>{i.qty_ordered}</td>
                      <td style={{padding:'8px',fontFamily:'monospace',color:'#7A7D88'}}>{i.qty_received||0}</td>
                      <td style={{padding:'8px'}}><input type="number" min="0" value={r.receive_now} onChange={e=>setReceipts(prev=>({...prev,[i.id]:{...r,receive_now:e.target.value}}))} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                      <td style={{padding:'8px'}}><input type="number" step="0.01" min="0" value={r.unit_cost} onChange={e=>setReceipts(prev=>({...prev,[i.id]:{...r,unit_cost:e.target.value}}))} style={{width:80,padding:'4px 8px',border:'1px solid #E4E7EC',borderRadius:4,fontFamily:'monospace',fontSize:12}} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{display:'flex',gap:12,marginTop:20,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowReceive(false)} style={{padding:'10px 20px',background:'#F3F4F6',border:'1px solid #E4E7EC',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={submitReceipt} disabled={busy} style={{padding:'10px 20px',background:'#22C55E',color:'white',border:'none',borderRadius:6,fontSize:13,fontWeight:600,cursor:'pointer',opacity:busy?0.5:1}}>Submit Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
