'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',              label: 'Dashboard',    icon: '📊' },
  { href: '/admin/inventory',    label: 'Inventory',    icon: '📦' },
  { href: '/admin/vendors',      label: 'Vendors',      icon: '🏪' },
  { href: '/admin/purchases',    label: 'Purchases',    icon: '📥' },
  { href: '/admin/orders',       label: 'Orders',       icon: '🛒' },
  { href: '/admin/pricing',      label: 'Pricing',      icon: '💰' },
  { href: '/admin/marketing',    label: 'Marketing',    icon: '📣' },
  { href: '/admin/distributors', label: 'Distributors', icon: '🏭' },
  { href: '/admin/discount-codes', label: 'Discount Codes', icon: '🎫' },
  { href: '/admin/pre-sell',     label: 'Pre-sell',     icon: '⏳' },
  { href: '/admin/invoices',     label: 'Invoices',     icon: '📄' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (pathname === '/admin/login') return children;

  const handleLogout = async () => {
    await fetch('/api/admin-auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  };

  return (
    <div className="admin-layout" style={{ display:'flex', minHeight:'100vh' }}>
      <aside style={{
        width: collapsed ? 60 : 220, background:'#0F1928', color:'#fff',
        padding:'20px 0', display:'flex', flexDirection:'column',
        transition:'width 0.2s', flexShrink:0, position:'sticky', top:0, height:'100vh'
      }}>
        <div style={{ padding:'0 16px', marginBottom:28, display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background:'none', border:'none', color:'#6B7A94', cursor:'pointer', fontSize:18 }}>☰</button>
          {!collapsed && (
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, letterSpacing:2 }}>
                ADONIS <span style={{ fontWeight:300, opacity:0.5 }}>ADMIN</span>
              </div>
              <div style={{ fontSize:9, color:'#6B7A94', letterSpacing:1 }}>v3.1.0</div>
            </div>
          )}
        </div>

        <nav style={{ flex:1 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{
                display:'flex', alignItems:'center', gap:12,
                padding: collapsed ? '12px 18px' : '12px 20px',
                color:      active ? '#E8D5B7' : '#6B7A94',
                background: active ? 'rgba(232,213,183,0.06)' : 'transparent',
                borderLeft: active ? '3px solid #E8D5B7' : '3px solid transparent',
                textDecoration:'none', fontSize:13, fontWeight: active ? 600 : 400,
                transition:'all 0.15s',
              }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div style={{ padding:'16px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', gap:8 }}>
            <a href="https://advncelabs.com" target="_blank"
              style={{ fontSize:11, color:'#6B7A94', textDecoration:'none' }}>↗ advncelabs.com</a>
            <Link href="/app" style={{ fontSize:11, color:'#6B7A94', textDecoration:'none' }}>← Back to App</Link>
            <button onClick={handleLogout}
              style={{ fontSize:11, color:'#EF4444', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
              Sign Out
            </button>
          </div>
        )}
      </aside>

      <main style={{ flex:1, padding:'24px 28px', minWidth:0, overflow:'auto' }}>
        {children}
      </main>
    </div>
  );
}
