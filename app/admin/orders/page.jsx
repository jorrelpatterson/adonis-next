'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

const STATUS = {
  confirmed: { color: '#60A5FA', bg: '#EFF6FF', label: 'Confirmed' },
  processing: { color: '#F59E0B', bg: '#FFFBEB', label: 'Processing' },
  shipped: { color: '#34D399', bg: '#ECFDF5', label: 'Shipped' },
  delivered: { color: '#22C55E', bg: '#F0FDF4', label: 'Delivered' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled' },
};

const cs = {
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', overflow: 'hidden' },
  btn: { padding: '8px 16px', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #E4E7EC', borderRadius: 4, fontSize: 13, outline: 'none', background: '#FAFBFC' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const ms = o.id.toLowerCase().includes(search.toLowerCase()) || (o.customer||'').toLowerCase().includes(search.toLowerCase());
      return ms && (filterStatus === 'all' || o.status === filterStatus);
    });
  }, [orders, search, filterStatus]);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length;

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (!error) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#8C919E' }}><div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>🛒</div>Loading orders...</div></div>;

  return (
    <div>
      <h1 style={cs.h1}>Orders</h1>
      <p style={{ color: '#8C919E', fontSize: 14, marginBottom: 24 }}>{orders.length} orders · ${totalRevenue.toLocaleString()} revenue · <span style={{color:'#22C55E'}}>Live</span></p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { l: 'Total Orders', v: orders.length, c: '#0F1928' },
          { l: 'Revenue', v: '$' + totalRevenue.toLocaleString(), c: '#22C55E' },
          { l: 'Pending', v: pendingCount, c: '#F59E0B' },
          { l: 'Avg Order', v: '$' + (orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0), c: '#0072B5' },
        ].map((x, i) => (
          <div key={i} style={{ ...cs.card, padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: x.c, fontFamily: "'Barlow Condensed'" }}>{x.v}</div>
            <div style={{ fontSize: 10, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input style={{ ...cs.input, maxWidth: 260 }} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', ...Object.keys(STATUS)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              ...cs.btn, padding: '6px 12px', fontSize: 11,
              background: filterStatus === s ? '#0072B5' : '#F7F8FA',
              color: filterStatus === s ? '#fff' : '#6B7A94',
              border: '1px solid ' + (filterStatus === s ? '#0072B5' : '#E4E7EC')
            }}>{s === 'all' ? 'All' : STATUS[s].label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...cs.card, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 14, color: '#8C919E' }}>No orders {filterStatus !== 'all' ? 'with status "' + filterStatus + '"' : 'yet'}</div>
          <div style={{ fontSize: 12, color: '#B0B4BC', marginTop: 4 }}>Orders from the Adonis app will appear here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(order => {
            const ie = expandedId === order.id;
            const sc = STATUS[order.status] || STATUS.confirmed;
            const items = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
            const shipping = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : (order.shipping || {});

            return (
              <div key={order.id} style={cs.card}>
                <div onClick={() => setExpandedId(ie ? null : order.id)} style={{
                  padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: 500, color: '#0072B5' }}>{order.id}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600, color: '#0F1928' }}>{order.customer}</div><div style={{ fontSize: 11, color: '#8C919E' }}>{order.email}</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 14, fontWeight: 700 }}>${order.total}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 4, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    <div style={{ fontSize: 12, color: '#8C919E', transform: ie ? 'rotate(90deg)' : '', transition: 'transform 0.15s' }}>▶</div>
                  </div>
                </div>

                {ie && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F0F1F4' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Items</div>
                        {items.map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F1F4', fontSize: 13 }}>
                            <span style={{ color: '#4A4F5C' }}>{item.name} × {item.qty}</span>
                            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: 500, color: item.price === 0 ? '#22C55E' : '#0F1928' }}>
                              {item.price === 0 ? 'FREE' : `$${item.price * item.qty}`}
                            </span>
                          </div>
                        ))}
                        {Number(order.discount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 12, color: '#F59E0B', fontWeight: 600 }}><span>{order.discount_label}</span><span>-${order.discount}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '2px solid #E4E7EC', marginTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
                          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 16, fontWeight: 700 }}>${order.total}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Shipping</div>
                        <div style={{ fontSize: 13, color: '#4A4F5C', lineHeight: 1.8 }}>
                          {shipping.name || '—'}<br/>{shipping.address || ''}<br/>{shipping.city || ''}{shipping.state ? ', ' + shipping.state : ''} {shipping.zip || ''}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#8C919E', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10 }}>Update Status</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {Object.entries(STATUS).map(([k, cfg]) => (
                            <button key={k} onClick={() => updateStatus(order.id, k)} style={{
                              ...cs.btn, padding: '6px 12px', fontSize: 11,
                              background: order.status === k ? cfg.color : cfg.bg,
                              color: order.status === k ? '#fff' : cfg.color,
                              border: `1px solid ${cfg.color}33`
                            }}>{cfg.label}</button>
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
