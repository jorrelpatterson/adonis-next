'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sbFetch(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}

async function sbPatch(table, match, body) {
  const [key, val] = Object.entries(match)[0];
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${key}=eq.${val}`, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

const STATUS_COLOR = {
  pending:  { color:'#F59E0B', bg:'#FFFBEB', label:'Pending' },
  approved: { color:'#22C55E', bg:'#F0FDF4', label:'Approved' },
  rejected: { color:'#EF4444', bg:'#FEF2F2', label:'Rejected' },
  suspended:{ color:'#8C919E', bg:'#F7F8FA', label:'Suspended' },
};
const TIER_DISC = { entry:'50%', standard:'55%', volume:'60%', wholesale:'65%' };
const cs = {
  h1:   { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  card: { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', overflow:'hidden' },
  btn:  { padding:'8px 16px', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' },
  input:{ padding:'8px 12px', border:'1px solid #E4E7EC', borderRadius:4, fontSize:13, outline:'none', background:'#FAFBFC' },
};

export default function DistributorsPage() {
  const [distributors, setDistributors] = useState([]);
  const [distOrders, setDistOrders]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilter]       = useState('all');
  const [expandedId, setExpanded]       = useState(null);
  const [approveForm, setApproveForm]   = useState({});
  const [saving, setSaving]             = useState({});
  const [sendingApproval, setSendingApproval] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const [dists, orders] = await Promise.all([
          sbFetch('distributors', 'select=*&order=created_at.desc'),
          sbFetch('distributor_orders', 'select=*&order=created_at.desc'),
        ]);
        setDistributors(dists);
        setDistOrders(orders);
      } catch(e) {
        console.error('Distributors load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getDistOrders = (distId) => distOrders.filter(o => o.distributor_id === distId);

  const filtered = distributors.filter(d => {
    const ms = d.business_name?.toLowerCase().includes(search.toLowerCase()) ||
               d.email?.toLowerCase().includes(search.toLowerCase()) ||
               d.contact_name?.toLowerCase().includes(search.toLowerCase());
    return ms && (filterStatus === 'all' || d.status === filterStatus);
  });

  const approve = async (dist) => {
    const form = approveForm[dist.id] || {};
    if (!form.login_code) { alert('Enter a login code first'); return; }
    setSaving(prev => ({ ...prev, [dist.id]: true }));
    const updates = { status:'approved', tier:form.tier||'entry', login_code:form.login_code.toUpperCase(), approved_at:new Date().toISOString() };
    await sbPatch('distributors', { id: dist.id }, updates);
    setDistributors(prev => prev.map(d => d.id === dist.id ? { ...d, ...updates } : d));
    setSaving(prev => ({ ...prev, [dist.id]: false }));
  };

  const sendApprovalEmail = async (dist) => {
    setSendingApproval(prev => ({ ...prev, [dist.id]: true }));
    try {
      const res = await fetch('/api/distributor-approval', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ distributor: { business_name:dist.business_name, contact_name:dist.contact_name, email:dist.email, login_code:dist.login_code, tier:dist.tier||'entry' }})
      });
      if (res.ok) alert('Approval email sent to ' + dist.email);
      else alert('Failed — check Resend logs');
    } catch(e) { alert('Error: '+e.message); }
    setSendingApproval(prev => ({ ...prev, [dist.id]: false }));
  };

  const updateStatus = async (distId, newStatus) => {
    await sbPatch('distributors', { id: distId }, { status: newStatus });
    setDistributors(prev => prev.map(d => d.id === distId ? { ...d, status: newStatus } : d));
  };

  const pending  = distributors.filter(d => d.status === 'pending').length;
  const approved = distributors.filter(d => d.status === 'approved').length;
  const totalSpent = distOrders.reduce((s,o) => s + parseFloat(o.subtotal||0), 0);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#8C919E'}}><div style={{textAlign:'center'}}><div style={{fontSize:32,marginBottom:8}}>🏭</div>Loading distributors...</div></div>;

  return (
    <div>
      <h1 style={cs.h1}>Distributors</h1>
      <p style={{color:'#8C919E',fontSize:14,marginBottom:24}}>{distributors.length} applications · {approved} approved · {pending} pending</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          {l:'Total Applications',v:distributors.length,c:'#0F1928'},
          {l:'Approved',v:approved,c:'#22C55E'},
          {l:'Pending Review',v:pending,c:'#F59E0B'},
          {l:'Dist. Revenue',v:'$'+totalSpent.toFixed(2),c:'#0072B5'},
        ].map((x,i)=>(
          <div key={i} style={{...cs.card,padding:16}}>
            <div style={{fontSize:22,fontWeight:700,color:x.c,fontFamily:"'Barlow Condensed'"}}>{x.v}</div>
            <div style={{fontSize:10,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
        <input style={{...cs.input,width:260}} placeholder="Search business, email, contact..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{display:'flex',gap:4}}>
          {['all',...Object.keys(STATUS_COLOR)].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:filterStatus===s?'#0072B5':'#F7F8FA',color:filterStatus===s?'#fff':'#6B7A94',border:'1px solid '+(filterStatus===s?'#0072B5':'#E4E7EC')}}>{s==='all'?'All':STATUS_COLOR[s].label}</button>
          ))}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(dist => {
          const ie = expandedId === dist.id;
          const sc = STATUS_COLOR[dist.status] || STATUS_COLOR.pending;
          const myOrders = getDistOrders(dist.id);
          const myRevenue = myOrders.reduce((s,o)=>s+parseFloat(o.subtotal||0),0);
          const form = approveForm[dist.id] || {};
          const isApproved = dist.status === 'approved';
          return (
            <div key={dist.id} style={{...cs.card,border:dist.status==='pending'?'1px solid #FCD34D':'1px solid #E4E7EC'}}>
              <div onClick={()=>setExpanded(ie?null:dist.id)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:20,alignItems:'center'}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#22C55E',flexShrink:0}}>{(dist.business_name||'?').charAt(0).toUpperCase()}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:'#0F1928'}}>{dist.business_name}</div><div style={{fontSize:11,color:'#8C919E'}}>{dist.contact_name} · {dist.email}</div></div>
                  <span style={{fontSize:10,color:'#8C919E',background:'#F7F8FA',padding:'2px 8px',borderRadius:4}}>{dist.market}</span>
                  {isApproved&&dist.tier&&<span style={{fontSize:10,fontWeight:600,background:'#EFF6FF',color:'#0072B5',padding:'2px 8px',borderRadius:4}}>{dist.tier.charAt(0).toUpperCase()+dist.tier.slice(1)} · {TIER_DISC[dist.tier]}</span>}
                </div>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  {isApproved&&<div style={{textAlign:'right'}}><div style={{fontFamily:"'JetBrains Mono'",fontSize:13,fontWeight:700,color:'#0072B5'}}>${myRevenue.toFixed(2)}</div><div style={{fontSize:11,color:'#8C919E'}}>{myOrders.length} orders</div></div>}
                  <span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:4,background:sc.bg,color:sc.color}}>{sc.label}</span>
                  <div style={{fontSize:11,color:'#8C919E'}}>{new Date(dist.created_at).toLocaleDateString()}</div>
                  <div style={{fontSize:12,color:'#8C919E',transform:ie?'rotate(90deg)':'',transition:'transform 0.15s'}}>▶</div>
                </div>
              </div>
              {ie && (
                <div style={{padding:'0 20px 20px',borderTop:'1px solid #F0F1F4'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:16}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Application Details</div>
                      {[{l:'Business',v:dist.business_name},{l:'Contact',v:dist.contact_name},{l:'Email',v:dist.email},{l:'Phone',v:dist.phone},{l:'Market',v:dist.market},{l:'Expected Vol.',v:dist.expected_volume+'+ vials/mo'},{l:'Website',v:dist.website||'—'}].map((x,i)=>(
                        <div key={i} style={{display:'flex',gap:12,padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                          <span style={{color:'#8C919E',width:100,flexShrink:0}}>{x.l}</span>
                          <span style={{color:'#0F1928'}}>{x.v}</span>
                        </div>
                      ))}
                      {dist.notes&&<div style={{marginTop:12,padding:'10px 12px',background:'#F7F8FA',borderRadius:4,fontSize:13,color:'#4A4F5C',lineHeight:1.7}}><strong>Notes:</strong> {dist.notes}</div>}
                      {myOrders.length>0&&(
                        <div style={{marginTop:20}}>
                          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Order History</div>
                          {myOrders.slice(0,5).map((o,i)=>(
                            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F0F1F4',fontSize:12}}>
                              <span style={{fontFamily:"'JetBrains Mono'",color:'#0072B5',fontSize:11}}>{o.order_id}</span>
                              <span style={{color:'#8C919E'}}>{o.total_vials} vials</span>
                              <span style={{fontWeight:600}}>${parseFloat(o.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      {!isApproved ? (
                        <>
                          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Approve Application</div>
                          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
                            <div>
                              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Login Code</label>
                              <input style={{...cs.input,width:'100%',textTransform:'uppercase'}} placeholder="e.g. ACME2026"
                                value={form.login_code||''} onChange={e=>setApproveForm(prev=>({...prev,[dist.id]:{...form,login_code:e.target.value.toUpperCase()}}))} />
                            </div>
                            <div>
                              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Starting Tier</label>
                              <select style={{...cs.input,width:'100%'}} value={form.tier||'entry'} onChange={e=>setApproveForm(prev=>({...prev,[dist.id]:{...form,tier:e.target.value}}))}>
                                <option value="entry">Entry — 50% off</option>
                                <option value="standard">Standard — 55% off</option>
                                <option value="volume">Volume — 60% off</option>
                                <option value="wholesale">Wholesale — 65% off</option>
                              </select>
                            </div>
                          </div>
                          <button onClick={()=>approve(dist)} disabled={saving[dist.id]} style={{...cs.btn,background:'#22C55E',color:'#fff',width:'100%',marginBottom:8,opacity:saving[dist.id]?0.5:1}}>
                            {saving[dist.id]?'Saving...':'✓ Approve & Save'}
                          </button>
                          <button onClick={()=>updateStatus(dist.id,'rejected')} style={{...cs.btn,background:'#FEF2F2',color:'#EF4444',width:'100%',border:'1px solid #FCA5A5'}}>✗ Reject</button>
                        </>
                      ) : (
                        <>
                          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Account Details</div>
                          {[{l:'Login Code',v:dist.login_code||'—'},{l:'Tier',v:dist.tier?dist.tier.charAt(0).toUpperCase()+dist.tier.slice(1):'—'},{l:'Discount',v:TIER_DISC[dist.tier]||'—'},{l:'Approved',v:dist.approved_at?new Date(dist.approved_at).toLocaleDateString():'—'},{l:'Total Orders',v:dist.total_orders||0},{l:'Total Spent',v:'$'+parseFloat(dist.total_spent||0).toFixed(2)}].map((x,i)=>(
                            <div key={i} style={{display:'flex',gap:12,padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                              <span style={{color:'#8C919E',width:100,flexShrink:0}}>{x.l}</span>
                              <span style={{color:'#0F1928',fontFamily:x.l==='Login Code'?"'JetBrains Mono'":'inherit',fontWeight:x.l==='Login Code'?600:400}}>{x.v}</span>
                            </div>
                          ))}
                          <button onClick={()=>sendApprovalEmail(dist)} disabled={sendingApproval[dist.id]} style={{...cs.btn,background:'#0072B5',color:'#fff',width:'100%',marginTop:16,opacity:sendingApproval[dist.id]?0.5:1}}>
                            {sendingApproval[dist.id]?'Sending...':'✉ Resend Approval Email'}
                          </button>
                          <div style={{marginTop:16}}>
                            <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Change Tier</div>
                            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                              {Object.entries(TIER_DISC).map(([k,v])=>(
                                <button key={k} onClick={async()=>{await sbPatch('distributors',{id:dist.id},{tier:k});setDistributors(prev=>prev.map(d=>d.id===dist.id?{...d,tier:k}:d));}} style={{...cs.btn,padding:'6px 12px',fontSize:11,background:dist.tier===k?'#0072B5':'#F7F8FA',color:dist.tier===k?'#fff':'#6B7A94',border:'1px solid '+(dist.tier===k?'#0072B5':'#E4E7EC')}}>{k.charAt(0).toUpperCase()+k.slice(1)} ({v})</button>
                              ))}
                            </div>
                          </div>
                          <button onClick={()=>updateStatus(dist.id,'suspended')} style={{...cs.btn,background:'#F7F8FA',color:'#8C919E',width:'100%',marginTop:12,border:'1px solid #E4E7EC'}}>Suspend Account</button>
                        </>
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
