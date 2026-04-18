'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

const s = {
  card: { background: '#fff', borderRadius: 8, border: '1px solid #E4E7EC', padding: 24 },
  stat: { fontSize: 32, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif" },
  label: { fontSize: 11, color: '#8C919E', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  h1: { fontSize: 28, fontWeight: 700, color: '#0F1928', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, lowStock: 0, openPos: 0, inTransitValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: products } = await supabase.from('products').select('*');
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: openPos } = await supabase.from('purchase_orders').select('total_cost').in('status', ['submitted','partial']);
      const p = products || [];
      const o = orders || [];
      setStats({
        products: p.length,
        orders: o.length,
        revenue: o.reduce((s, x) => s + Number(x.total || 0), 0),
        lowStock: p.filter(x => x.stock <= 3 && x.cat !== 'Supplies').length,
        openPos: (openPos || []).length,
        inTransitValue: (openPos || []).reduce((s, p) => s + Number(p.total_cost || 0), 0),
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 style={s.h1}>Dashboard</h1>
      <p style={{ color: '#8C919E', marginBottom: 32, fontSize: 14 }}>
        {loading ? 'Loading...' : 'Live from Supabase'} · Adonis Admin v3.0
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Products', value: stats.products, icon: '🧪', color: '#00A0A8' },
          { label: 'Protocol Stacks', value: 18, icon: '📋', color: '#E07C24' },
          { label: 'Orders', value: stats.orders, icon: '📦', color: '#0072B5' },
          { label: 'Low Stock', value: stats.lowStock, icon: '⚠️', color: stats.lowStock > 0 ? '#DC2626' : '#22C55E' },
          { label: 'Open POs',         value: stats.openPos,                                icon: '📥', color: '#A16207' },
          { label: 'In-transit value', value: '$' + (stats.inTransitValue || 0).toFixed(0), icon: '🚚', color: '#1D4ED8' },
        ].map((item, i) => (
          <div key={i} style={{ ...s.card, borderTop: `3px solid ${item.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ ...s.stat, color: item.color }}>{item.value}</div>
                <div style={s.label}>{item.label}</div>
              </div>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { href: '/admin/inventory', label: 'Manage Inventory', desc: 'Track stock, update quantities, add products', icon: '📦' },
          { href: '/admin/orders', label: 'View Orders', desc: 'Process and track customer orders', icon: '🛒' },
          { href: '/admin/pricing', label: 'Update Pricing', desc: 'Adjust retail prices and margins', icon: '💰' },
        ].map((item, i) => (
          <Link key={i} href={item.href} style={{ ...s.card, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F1928' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: '#8C919E', marginTop: 2 }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
