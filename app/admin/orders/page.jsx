'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sbFetch(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

const STATUS = {
  pending_payment: { color:'#F59E0B', bg:'#FFFBEB', label:'Pending Payment' },
  confirmed:       { color:'#60A5FA', bg:'#EFF6FF', label:'Confirmed' },
  processing:      { color:'#A78BFA', bg:'#F5F3FF', label:'Processing' },
  shipped:         { color:'#34D399', bg:'#ECFDF5', label:'Shipped' },
  delivered:       { color:'#22C55E', bg:'#F0FDF4', label:'Delivered' },
  cancelled:       { color:'#EF4444', bg:'#FEF2F2', label:'Cancelled' },
};

const cs = {
  h1:   { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  card: { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', overflow:'hidden' },
  btn:  { padding:'8px 16px', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' },
  input:{ padding:'8px 12px', border:'1px solid #E4E7EC', borderRadius:4, fontSize:13, outline:'none', background:'#FAFBFC' },
};

export default function OrdersPage() {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [expandedId, setExpanded] = useState(null);
  const [tracking, setTracking]   = useState({});
  const [sending, setSending]     = useState({});

  useEffect(() => {
    async function load() {
      try {
        const data = await sbFetch('orders', 'select=*&order=created_at.desc');
        setOrders(data);
      } catch(e) {
        console.error('Orders load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => orders.filter(o => {
    const name = `${o.first_name||''} ${o.last_name||''}`.toLowerCase();
    const ms = (o.order_id||'').toLowerCase().includes(search.toLowerCase()) ||
               name.includes(search.toLowerCase()) ||
               (o.email||'').toLowerCase().includes(search.toLowerCase());
    return ms && (filterStatus === 'all' || o.status === filterStatus);
  }), [orders, search, filterStatus]);

  const totalRevenue = orders.reduce((s,o) => s + Number(o.total||0), 0);
  const pending = orders.filter(o => o.status === 'pending_payment' || o.status === 'confirmed').length;

  const updateStatus = async (orderId, newStatus) => {
    await fetch(`${SUPABASE_URL}/rest/v1/orders?order_id=eq.${orderId}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
    });
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
  };

  const sendShipping = async (order) => {
    const tn = tracking[order.order_id];
    if (!tn) { alert('Enter a tracking number first'); return; }
    setSending(prev => ({ ...prev, [order.order_id]: true }));
    try {
      const res = await fetch('/api/shipping-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: {
          first_name: order.first_name, email: order.email, order_id: order.order_id,
          items: order.items || [], total: order.total, tracking_number: tn, carrier: 'USPS',
          ship_address: order.address, ship_city: order.city, ship_state: order.state, ship_zip: order.zip,
        }})
      });
      if (res.ok) { await updateStatus(order.order_id, 'shipped'); alert('Shipping confirmation sent to ' + order.email); }
      else alert('Email failed — check Resend logs');
    } catch(e) { alert('Error: ' + e.message); }
    setSending(prev => ({ ...prev, [order.order_id]: false }));
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#8C919E'}}><div style={{textAlign:'center'}}><div style={{fontSize:32,marginBottom:8}}>🛒</div>Loading orders...</div></div>;

  return (
    <div>
      <h1 className="admin-page-h1" style={cs.h1}>advnce labs Orders</h1>
      <p style={{color:'#8C919E',fontSize:14,marginBottom:24}}>{orders.length} orders · ${totalRevenue.toLocaleString('en-US',{minimumFractionDigits:2})} revenue · <span style={{color:'#22C55E'}}>Live</span></p>
      <div className="admin-tile-row" style={{marginBottom:24}}>
        {[
          {l:'Total Orders',v:orders.length,c:'#0F1928'},
          {l:'Revenue',v:'$'+totalRevenue.toLocaleString('en-US',{minimumFractionDigits:2}),c:'#22C55E'},
          {l:'Pending',v:pending,c:'#F59E0B'},
          {l:'Avg Order',v:'$'+(orders.length>0?Math.round(totalRevenue/orders.length):0),c:'#0072B5'},
        ].map((x,i)=>(
          <div key={i} style={{...cs.card,padding:16}}>
            <div className="admin-tile-val" style={{fontSize:22,fontWeight:700,color:x.c,fontFamily:"'Barlow Condensed'"}}>{x.v}</div>
            <div className="admin-tile-label" style={{fontSize:10,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
        <input style={{...cs.input,flex:'1 1 240px',minWidth:0}} placeholder="Search by name, email, order ID..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div className="admin-filter-row" style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:0}}>
          {['all',...Object.keys(STATUS)].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:filterStatus===s?'#0072B5':'#F7F8FA',color:filterStatus===s?'#fff':'#6B7A94',border:'1px solid '+(filterStatus===s?'#0072B5':'#E4E7EC')}}>{s==='all'?'All':STATUS[s].label}</button>
          ))}
        </div>
      </div>
      {filtered.length===0 ? (
        <div style={{...cs.card,padding:48,textAlign:'center'}}><div style={{fontSize:32,marginBottom:8}}>📦</div><div style={{fontSize:14,color:'#8C919E'}}>No orders yet</div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map(order => {
            const ie = expandedId === order.order_id;
            const sc = STATUS[order.status] || STATUS.pending_payment;
            const items = Array.isArray(order.items) ? order.items : [];
            const customerName = `${order.first_name||''} ${order.last_name||''}`.trim();
            return (
              <div key={order.order_id} className="admin-row-card" style={{...cs.card,border:order.price_mismatch?'1px solid #FCA5A5':'1px solid #E4E7EC',padding:0}}>
                <div onClick={()=>setExpanded(ie?null:order.order_id)} className="admin-row-head" style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap',minWidth:0}}>
                    <div style={{fontFamily:"'JetBrains Mono'",fontSize:12,fontWeight:500,color:'#0072B5',minWidth:160}}>{order.order_id}</div>
                    <div><div style={{fontSize:13,fontWeight:600,color:'#0F1928'}}>{customerName}</div><div style={{fontSize:11,color:'#8C919E'}}>{order.email}</div></div>
                    {order.price_mismatch && <span style={{fontSize:10,background:'#FEF2F2',color:'#EF4444',padding:'2px 8px',borderRadius:4,fontWeight:600}}>⚠ Price mismatch</span>}
                    {order.discount_type === 'ambassador_first' && <span title="First sale to this customer — 15% off + 15% commission" style={{fontSize:10,background:'#FEF3C7',color:'#A16207',padding:'2px 8px',borderRadius:4,fontWeight:600}}>🎉 First Sale {order.discount_code}</span>}
                    {order.discount_type === 'ambassador_repeat' && order.ref_code && <span title="Repeat customer — commission to original ambassador" style={{fontSize:10,background:'#EFF6FF',color:'#0072B5',padding:'2px 8px',borderRadius:4}}>↻ {order.ref_code}</span>}
                    {order.discount_type === 'promo' && <span style={{fontSize:10,background:'#F0FDF4',color:'#16A34A',padding:'2px 8px',borderRadius:4,fontWeight:600}}>🎫 {order.discount_code}</span>}
                    {!order.discount_type && order.ref_code && <span style={{fontSize:10,background:'#EFF6FF',color:'#0072B5',padding:'2px 8px',borderRadius:4}}>ref: {order.ref_code}</span>}
                  </div>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    <div style={{fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700}}>${parseFloat(order.total||0).toFixed(2)}</div>
                    <span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:4,background:sc.bg,color:sc.color}}>{sc.label}</span>
                    <div style={{fontSize:11,color:'#8C919E'}}>{new Date(order.created_at).toLocaleDateString()}</div>
                    <div style={{fontSize:12,color:'#8C919E',transform:ie?'rotate(90deg)':'',transition:'transform 0.15s'}}>▶</div>
                  </div>
                </div>
                {ie && (
                  <div style={{padding:'0 20px 20px',borderTop:'1px solid #F0F1F4'}}>
                    <div className="admin-split" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:16}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Items</div>
                        {items.map((item,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                            <span style={{color:'#4A4F5C'}}>{item.name} {item.size} × {item.qty}</span>
                            <span style={{fontFamily:"'JetBrains Mono'",fontSize:12}}>${(item.price*item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.discount_amount > 0 && (() => {
                          const total = parseFloat(order.total||0);
                          const disc = parseFloat(order.discount_amount||0);
                          const sub = total + disc;
                          return (
                            <>
                              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0 0',borderTop:'1px solid #E4E7EC',marginTop:4,fontSize:12,color:'#7A7D88'}}>
                                <span>Subtotal</span>
                                <span style={{fontFamily:"'JetBrains Mono'"}}>${sub.toFixed(2)}</span>
                              </div>
                              <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,color:'#16A34A'}}>
                                <span>Discount {order.discount_code ? '('+order.discount_code+')' : ''}</span>
                                <span style={{fontFamily:"'JetBrains Mono'"}}>-${disc.toFixed(2)}</span>
                              </div>
                            </>
                          );
                        })()}
                        <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0 0',borderTop:'2px solid #E4E7EC',marginTop:4}}>
                          <span style={{fontSize:13,fontWeight:700}}>Total</span>
                          <span style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700}}>${parseFloat(order.total||0).toFixed(2)}</span>
                        </div>
                        {order.notes && <div style={{marginTop:12,padding:'8px 12px',background:'#FFFBEB',borderRadius:4,fontSize:12,color:'#78716C'}}><strong>Note:</strong> {order.notes}</div>}
                      </div>
                      <div>
                        <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Ship To</div>
                        <div style={{fontSize:13,color:'#4A4F5C',lineHeight:1.8,marginBottom:20}}>{customerName}<br/>{order.address}<br/>{order.city}, {order.state} {order.zip}{order.phone&&<><br/>{order.phone}</>}</div>
                        <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Ship Order</div>
                        <div style={{display:'flex',gap:8,marginBottom:16}}>
                          <input style={{...cs.input,flex:1}} placeholder="Tracking number"
                            value={tracking[order.order_id]||''}
                            onChange={e=>setTracking(prev=>({...prev,[order.order_id]:e.target.value}))} />
                          <button onClick={()=>sendShipping(order)} disabled={sending[order.order_id]}
                            style={{...cs.btn,background:'#0072B5',color:'#fff',opacity:sending[order.order_id]?0.5:1}}>
                            {sending[order.order_id]?'Sending...':'Send & Ship'}
                          </button>
                        </div>
                        <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Update Status</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {Object.entries(STATUS).map(([k,cfg])=>(
                            <button key={k} onClick={()=>updateStatus(order.order_id,k)} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:order.status===k?cfg.color:cfg.bg,color:order.status===k?'#fff':cfg.color,border:`1px solid ${cfg.color}44`}}>{cfg.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
