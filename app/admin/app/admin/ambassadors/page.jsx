'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const TIER_COLOR = { starter:'#60A5FA', builder:'#A78BFA', elite:'#F59E0B' };

const cs = {
  h1:    { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  card:  { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', overflow:'hidden' },
  btn:   { padding:'8px 16px', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' },
  input: { padding:'8px 12px', border:'1px solid #E4E7EC', borderRadius:4, fontSize:13, outline:'none', background:'#FAFBFC' },
};

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [expandedId, setExpanded]     = useState(null);
  const [payout, setPayout]           = useState({});
  const [sending, setSending]         = useState({});
  const [period, setPeriod]           = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-1);
    return d.toLocaleString('default',{month:'long',year:'numeric'});
  });

  useEffect(() => {
    async function load() {
      const [{ data: ambs }, { data: comms }] = await Promise.all([
        supabase.from('ambassadors').select('*').order('created_at', { ascending: false }),
        supabase.from('referral_commissions').select('*'),
      ]);
      setAmbassadors(ambs || []);
      setCommissions(comms || []);
      setLoading(false);
    }
    load();
  }, []);

  const getCommissions = (ambId) => commissions.filter(c =>
    c.l1_ambassador_id === ambId || c.l2_ambassador_id === ambId || c.l3_ambassador_id === ambId
  );

  const getEarnings = (ambId) => {
    const myComms = commissions.filter(c => c.l1_ambassador_id === ambId);
    const l2 = commissions.filter(c => c.l2_ambassador_id === ambId);
    const l3 = commissions.filter(c => c.l3_ambassador_id === ambId);
    return {
      l1: myComms.reduce((s,c) => s + parseFloat(c.l1_amount||0), 0),
      l2: l2.reduce((s,c) => s + parseFloat(c.l2_amount||0), 0),
      l3: l3.reduce((s,c) => s + parseFloat(c.l3_amount||0), 0),
    };
  };

  const filtered = ambassadors.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid  = ambassadors.reduce((s,a) => s + parseFloat(a.total_earned||0), 0);
  const totalOrders = ambassadors.reduce((s,a) => s + (a.total_orders||0), 0);

  const sendPayout = async (amb) => {
    const l1 = parseFloat(payout[amb.id]?.l1 || 0);
    const l2 = parseFloat(payout[amb.id]?.l2 || 0);
    const l3 = parseFloat(payout[amb.id]?.l3 || 0);
    if (l1+l2+l3 === 0) { alert('Enter payout amounts first'); return; }
    setSending(prev => ({ ...prev, [amb.id]: true }));
    try {
      const res = await fetch('/api/ambassador-payout', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ ambassador: {
          name: amb.name, email: amb.email, code: amb.code,
          period, l1_amount: l1, l2_amount: l2, l3_amount: l3
        }})
      });
      if (res.ok) {
        alert(`Payout email sent to ${amb.email}`);
        setPayout(prev => ({ ...prev, [amb.id]: {} }));
      } else {
        alert('Failed — check Resend logs');
      }
    } catch(e) { alert('Error: '+e.message); }
    setSending(prev => ({ ...prev, [amb.id]: false }));
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', color:'#8C919E' }}>
      <div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:8 }}>🤝</div>Loading ambassadors...</div>
    </div>
  );

  return (
    <div>
      <h1 style={cs.h1}>Ambassadors</h1>
      <p style={{ color:'#8C919E', fontSize:14, marginBottom:24 }}>
        {ambassadors.length} ambassadors · ${totalPaid.toFixed(2)} total earned · {totalOrders} referral orders
      </p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { l:'Total Ambassadors', v: ambassadors.length,                c:'#0F1928' },
          { l:'Total Referral Orders', v: totalOrders,                   c:'#0072B5' },
          { l:'Total Commissions Paid', v: '$'+totalPaid.toFixed(2),     c:'#22C55E' },
          { l:'Avg Earnings',    v: ambassadors.length > 0 ? '$'+(totalPaid/ambassadors.length).toFixed(2) : '$0', c:'#A78BFA' },
        ].map((x,i) => (
          <div key={i} style={{ ...cs.card, padding:16 }}>
            <div style={{ fontSize:22, fontWeight:700, color:x.c, fontFamily:"'Barlow Condensed'" }}>{x.v}</div>
            <div style={{ fontSize:10, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginTop:2 }}>{x.l}</div>
          </div>
        ))}
      </div>

      {/* Payout period */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <input style={{ ...cs.input, width:260 }} placeholder="Search name, email, code..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto' }}>
          <span style={{ fontSize:12, color:'#8C919E' }}>Payout period:</span>
          <input style={{ ...cs.input, width:180 }} value={period} onChange={e=>setPeriod(e.target.value)} />
        </div>
      </div>

      {/* Ambassador list */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(amb => {
          const ie  = expandedId === amb.id;
          const earn = getEarnings(amb.id);
          const myComms = getCommissions(amb.id);
          const tierColor = TIER_COLOR[amb.tier] || '#8C919E';

          return (
            <div key={amb.id} style={cs.card}>
              <div onClick={() => setExpanded(ie ? null : amb.id)}
                style={{ padding:'16px 20px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#0072B5', flexShrink:0 }}>
                    {(amb.name||'?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F1928' }}>{amb.name}</div>
                    <div style={{ fontSize:11, color:'#8C919E' }}>{amb.email}</div>
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono'", fontSize:11, color:'#0072B5', background:'#EFF6FF', padding:'2px 8px', borderRadius:4 }}>{amb.code}</span>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:tierColor+'22', color:tierColor, textTransform:'uppercase', letterSpacing:1 }}>{amb.tier}</span>
                </div>
                <div style={{ display:'flex', gap:20, alignItems:'center' }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'JetBrains Mono'", fontSize:14, fontWeight:700, color:'#22C55E' }}>${parseFloat(amb.total_earned||0).toFixed(2)}</div>
                    <div style={{ fontSize:11, color:'#8C919E' }}>{amb.total_orders||0} orders</div>
                  </div>
                  <div style={{ fontSize:11, color:'#8C919E' }}>{new Date(amb.created_at).toLocaleDateString()}</div>
                  <div style={{ fontSize:12, color:'#8C919E', transform:ie?'rotate(90deg)':'', transition:'transform 0.15s' }}>▶</div>
                </div>
              </div>

              {ie && (
                <div style={{ padding:'0 20px 20px', borderTop:'1px solid #F0F1F4' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginTop:16 }}>
                    {/* Left: earnings breakdown + commission history */}
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Earnings Breakdown</div>
                      {[
                        { l:'Direct sales (L1)', v: earn.l1 },
                        { l:'Recruit sales (L2)', v: earn.l2 },
                        { l:'L3 overrides',       v: earn.l3 },
                      ].map((x,i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F0F1F4', fontSize:13 }}>
                          <span style={{ color:'#4A4F5C' }}>{x.l}</span>
                          <span style={{ fontFamily:"'JetBrains Mono'", fontSize:12, fontWeight:500, color:'#22C55E' }}>${x.v.toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', borderTop:'2px solid #E4E7EC', marginTop:4 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>Total earned</span>
                        <span style={{ fontFamily:"'JetBrains Mono'", fontSize:16, fontWeight:700, color:'#22C55E' }}>${(earn.l1+earn.l2+earn.l3).toFixed(2)}</span>
                      </div>

                      <div style={{ marginTop:20 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Info</div>
                        <div style={{ fontSize:13, color:'#4A4F5C', lineHeight:2 }}>
                          {amb.phone && <div>📞 {amb.phone}</div>}
                          <div>🔗 advncelabs.com?ref={amb.code}</div>
                          <div>📊 <a href={`https://advncelabs.com/advnce-dashboard.html?code=${amb.code}`} target="_blank" style={{ color:'#0072B5' }}>Dashboard link</a></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: payout */}
                    <div>
                      <div style={{ fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Send Payout Email</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                        {[
                          { key:'l1', label:'L1 amount ($)' },
                          { key:'l2', label:'L2 amount ($)' },
                          { key:'l3', label:'L3 amount ($)' },
                        ].map(f => (
                          <div key={f.key} style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <label style={{ fontSize:12, color:'#8C919E', width:120 }}>{f.label}</label>
                            <input
                              style={{ ...cs.input, width:100 }}
                              type="number" step="0.01" min="0"
                              placeholder="0.00"
                              value={payout[amb.id]?.[f.key] || ''}
                              onChange={e => setPayout(prev => ({
                                ...prev,
                                [amb.id]: { ...(prev[amb.id]||{}), [f.key]: e.target.value }
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:12, color:'#8C919E', marginBottom:12 }}>
                        Total: <strong style={{ color:'#22C55E' }}>
                          ${(parseFloat(payout[amb.id]?.l1||0)+parseFloat(payout[amb.id]?.l2||0)+parseFloat(payout[amb.id]?.l3||0)).toFixed(2)}
                        </strong> · Period: {period}
                      </div>
                      <button
                        onClick={() => sendPayout(amb)}
                        disabled={sending[amb.id]}
                        style={{ ...cs.btn, background:'#22C55E', color:'#fff', opacity: sending[amb.id] ? 0.5 : 1 }}
                      >
                        {sending[amb.id] ? 'Sending...' : '💸 Send Payout Email'}
                      </button>
                      <div style={{ marginTop:8, fontSize:11, color:'#8C919E', lineHeight:1.6 }}>
                        Sends payout breakdown email to {amb.email}.<br/>Send Zelle separately.
                      </div>

                      {myComms.length > 0 && (
                        <div style={{ marginTop:20 }}>
                          <div style={{ fontSize:10, fontWeight:600, color:'#8C919E', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Recent Commissions ({myComms.length})</div>
                          {myComms.slice(0,5).map((c,i) => (
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F0F1F4', fontSize:12 }}>
                              <span style={{ fontFamily:"'JetBrains Mono'", color:'#0072B5', fontSize:11 }}>{c.order_id}</span>
                              <span style={{ color:'#22C55E' }}>+${parseFloat(c.l1_amount||0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
