'use client';
import { useState, useEffect } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const H = () => ({ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` });

async function sbFetch(table, params='') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: H() });
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}
async function sbPatch(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:'PATCH', headers:{...H(),'Content-Type':'application/json','Prefer':'return=minimal'},
    body: JSON.stringify(body)
  });
}
async function sbDelete(table, id) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method:'DELETE', headers:{...H(),'Prefer':'return=minimal'}
  });
}

const TIER_COLOR = { starter:'#60A5FA', builder:'#A78BFA', elite:'#F59E0B' };
const cs = {
  h1:   { fontSize:28, fontWeight:700, color:'#0F1928', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 },
  card: { background:'#fff', borderRadius:8, border:'1px solid #E4E7EC', overflow:'hidden' },
  btn:  { padding:'8px 16px', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' },
  input:{ padding:'8px 12px', border:'1px solid #E4E7EC', borderRadius:4, fontSize:13, outline:'none', background:'#FAFBFC' },
};

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [expandedId, setExpanded]     = useState(null);
  const [editMode, setEditMode]       = useState({});
  const [editForm, setEditForm]       = useState({});
  const [saving, setSaving]           = useState({});
  const [deleting, setDeleting]       = useState({});
  const [payout, setPayout]           = useState({});
  const [sendingPayout, setSendingPayout] = useState({});
  const [period, setPeriod]           = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-1);
    return d.toLocaleString('default',{month:'long',year:'numeric'});
  });

  useEffect(() => {
    async function load() {
      try {
        const [ambs, comms] = await Promise.all([
          sbFetch('ambassadors', 'select=*&order=created_at.desc'),
          sbFetch('referral_commissions', 'select=*'),
        ]);
        setAmbassadors(ambs);
        setCommissions(comms);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const getEarnings = (id) => ({
    l1: commissions.filter(c=>c.l1_ambassador_id===id).reduce((s,c)=>s+parseFloat(c.l1_amount||0),0),
    l2: commissions.filter(c=>c.l2_ambassador_id===id).reduce((s,c)=>s+parseFloat(c.l2_amount||0),0),
    l3: commissions.filter(c=>c.l3_ambassador_id===id).reduce((s,c)=>s+parseFloat(c.l3_amount||0),0),
  });

  const filtered = ambassadors.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid   = ambassadors.reduce((s,a)=>s+parseFloat(a.total_earned||0),0);
  const totalOrders = ambassadors.reduce((s,a)=>s+(a.total_orders||0),0);

  const startEdit = (amb) => {
    setEditMode(prev=>({...prev,[amb.id]:true}));
    setEditForm(prev=>({...prev,[amb.id]:{ name:amb.name, email:amb.email, phone:amb.phone||'', code:amb.code, tier:amb.tier||'starter' }}));
  };

  const saveEdit = async (amb) => {
    setSaving(prev=>({...prev,[amb.id]:true}));
    const f = editForm[amb.id];
    await sbPatch('ambassadors', amb.id, { name:f.name, email:f.email, phone:f.phone||null, code:f.code.toUpperCase(), tier:f.tier });
    setAmbassadors(prev=>prev.map(a=>a.id===amb.id?{...a,...f,code:f.code.toUpperCase()}:a));
    setEditMode(prev=>({...prev,[amb.id]:false}));
    setSaving(prev=>({...prev,[amb.id]:false}));
  };

  const deleteAmb = async (amb) => {
    if (!confirm(`Delete ${amb.name} (${amb.code})? This cannot be undone.`)) return;
    setDeleting(prev=>({...prev,[amb.id]:true}));
    await sbDelete('ambassadors', amb.id);
    setAmbassadors(prev=>prev.filter(a=>a.id!==amb.id));
    setDeleting(prev=>({...prev,[amb.id]:false}));
  };

  const sendPayout = async (amb) => {
    const l1=parseFloat(payout[amb.id]?.l1||0), l2=parseFloat(payout[amb.id]?.l2||0), l3=parseFloat(payout[amb.id]?.l3||0);
    if (l1+l2+l3===0) { alert('Enter payout amounts first'); return; }
    setSendingPayout(prev=>({...prev,[amb.id]:true}));
    try {
      const res = await fetch('/api/ambassador-payout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ambassador:{name:amb.name,email:amb.email,code:amb.code,period,l1_amount:l1,l2_amount:l2,l3_amount:l3}})});
      if (res.ok) { alert('Payout email sent to '+amb.email); setPayout(prev=>({...prev,[amb.id]:{}})); }
      else alert('Failed — check Resend logs');
    } catch(e) { alert('Error: '+e.message); }
    setSendingPayout(prev=>({...prev,[amb.id]:false}));
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh',color:'#8C919E'}}><div style={{textAlign:'center'}}><div style={{fontSize:32,marginBottom:8}}>🤝</div>Loading ambassadors...</div></div>;

  return (
    <div>
      <h1 style={cs.h1}>Ambassadors</h1>
      <p style={{color:'#8C919E',fontSize:14,marginBottom:24}}>{ambassadors.length} ambassadors · ${totalPaid.toFixed(2)} total earned · {totalOrders} referral orders</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          {l:'Total Ambassadors',v:ambassadors.length,c:'#0F1928'},
          {l:'Referral Orders',v:totalOrders,c:'#0072B5'},
          {l:'Total Commissions',v:'$'+totalPaid.toFixed(2),c:'#22C55E'},
          {l:'Avg Earnings',v:ambassadors.length>0?'$'+(totalPaid/ambassadors.length).toFixed(2):'$0',c:'#A78BFA'},
        ].map((x,i)=>(
          <div key={i} style={{...cs.card,padding:16}}>
            <div style={{fontSize:22,fontWeight:700,color:x.c,fontFamily:"'Barlow Condensed'"}}>{x.v}</div>
            <div style={{fontSize:10,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginTop:2}}>{x.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16}}>
        <input style={{...cs.input,width:260}} placeholder="Search name, email, code..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:'auto'}}>
          <span style={{fontSize:12,color:'#8C919E'}}>Payout period:</span>
          <input style={{...cs.input,width:180}} value={period} onChange={e=>setPeriod(e.target.value)} />
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtered.map(amb => {
          const ie = expandedId === amb.id;
          const earn = getEarnings(amb.id);
          const tc = TIER_COLOR[amb.tier]||'#8C919E';
          const isEditing = editMode[amb.id];
          const f = editForm[amb.id]||{};
          return (
            <div key={amb.id} style={cs.card}>
              <div onClick={()=>setExpanded(ie?null:amb.id)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:20,alignItems:'center'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'#EFF6FF',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#0072B5',flexShrink:0}}>{(amb.name||'?').charAt(0).toUpperCase()}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:'#0F1928'}}>{amb.name}</div><div style={{fontSize:11,color:'#8C919E'}}>{amb.email}</div></div>
                  <span style={{fontFamily:"'JetBrains Mono'",fontSize:11,color:'#0072B5',background:'#EFF6FF',padding:'2px 8px',borderRadius:4}}>{amb.code}</span>
                  <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4,background:tc+'22',color:tc,textTransform:'uppercase',letterSpacing:1}}>{amb.tier}</span>
                </div>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700,color:'#22C55E'}}>${parseFloat(amb.total_earned||0).toFixed(2)}</div>
                    <div style={{fontSize:11,color:'#8C919E'}}>{amb.total_orders||0} orders</div>
                  </div>
                  <div style={{fontSize:11,color:'#8C919E'}}>{new Date(amb.created_at).toLocaleDateString()}</div>
                  <div style={{fontSize:12,color:'#8C919E',transform:ie?'rotate(90deg)':'',transition:'transform 0.15s'}}>▶</div>
                </div>
              </div>

              {ie && (
                <div style={{padding:'0 20px 20px',borderTop:'1px solid #F0F1F4'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,marginTop:16}}>

                    {/* LEFT: Edit form or details */}
                    <div>
                      {isEditing ? (
                        <>
                          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Edit Ambassador</div>
                          {[
                            {label:'Name',key:'name',type:'text'},
                            {label:'Email',key:'email',type:'email'},
                            {label:'Phone',key:'phone',type:'text'},
                            {label:'Code',key:'code',type:'text'},
                          ].map(({label,key,type})=>(
                            <div key={key} style={{marginBottom:10}}>
                              <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>{label}</label>
                              <input style={{...cs.input,width:'100%',textTransform:key==='code'?'uppercase':'none'}}
                                type={type} value={f[key]||''}
                                onChange={e=>setEditForm(prev=>({...prev,[amb.id]:{...f,[key]:key==='code'?e.target.value.toUpperCase():e.target.value}}))} />
                            </div>
                          ))}
                          <div style={{marginBottom:16}}>
                            <label style={{fontSize:11,color:'#8C919E',display:'block',marginBottom:4}}>Tier</label>
                            <select style={{...cs.input,width:'100%'}} value={f.tier||'starter'}
                              onChange={e=>setEditForm(prev=>({...prev,[amb.id]:{...f,tier:e.target.value}}))}>
                              <option value="starter">Starter (10%)</option>
                              <option value="builder">Builder (15%)</option>
                              <option value="elite">Elite (20%)</option>
                            </select>
                          </div>
                          <div style={{display:'flex',gap:8}}>
                            <button onClick={()=>saveEdit(amb)} disabled={saving[amb.id]}
                              style={{...cs.btn,background:'#0072B5',color:'#fff',flex:1,opacity:saving[amb.id]?0.5:1}}>
                              {saving[amb.id]?'Saving...':'✓ Save Changes'}
                            </button>
                            <button onClick={()=>setEditMode(prev=>({...prev,[amb.id]:false}))}
                              style={{...cs.btn,background:'#F7F8FA',color:'#6B7A94',border:'1px solid #E4E7EC'}}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Details</div>
                          {[
                            {l:'Name',v:amb.name},
                            {l:'Email',v:amb.email},
                            {l:'Phone',v:amb.phone||'—'},
                            {l:'Code',v:amb.code},
                            {l:'Tier',v:amb.tier},
                            {l:'Joined',v:new Date(amb.created_at).toLocaleDateString()},
                          ].map((x,i)=>(
                            <div key={i} style={{display:'flex',gap:12,padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                              <span style={{color:'#8C919E',width:60,flexShrink:0}}>{x.l}</span>
                              <span style={{color:'#0F1928',fontFamily:x.l==='Code'?"'JetBrains Mono'":'inherit'}}>{x.v}</span>
                            </div>
                          ))}
                          <div style={{marginTop:16}}>
                            <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Earnings</div>
                            {[{l:'Direct (L1)',v:earn.l1},{l:'L2 override',v:earn.l2},{l:'L3 override',v:earn.l3}].map((x,i)=>(
                              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F0F1F4',fontSize:13}}>
                                <span style={{color:'#4A4F5C'}}>{x.l}</span>
                                <span style={{fontFamily:"'JetBrains Mono'",fontSize:12,color:'#22C55E'}}>${x.v.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{marginTop:16,display:'flex',gap:8}}>
                            <button onClick={(e)=>{e.stopPropagation();startEdit(amb);}}
                              style={{...cs.btn,background:'#EFF6FF',color:'#0072B5',border:'1px solid #BFDBFE',flex:1}}>
                              ✏ Edit
                            </button>
                            <button onClick={(e)=>{e.stopPropagation();deleteAmb(amb);}} disabled={deleting[amb.id]}
                              style={{...cs.btn,background:'#FEF2F2',color:'#EF4444',border:'1px solid #FECACA',opacity:deleting[amb.id]?0.5:1}}>
                              {deleting[amb.id]?'Deleting...':'🗑 Delete'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* RIGHT: Payout + links */}
                    <div>
                      <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Send Payout Email</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
                        {[{key:'l1',label:'L1 amount ($)'},{key:'l2',label:'L2 amount ($)'},{key:'l3',label:'L3 amount ($)'}].map(f2=>(
                          <div key={f2.key} style={{display:'flex',gap:8,alignItems:'center'}}>
                            <label style={{fontSize:12,color:'#8C919E',width:120}}>{f2.label}</label>
                            <input style={{...cs.input,width:100}} type="number" step="0.01" min="0" placeholder="0.00"
                              value={payout[amb.id]?.[f2.key]||''}
                              onChange={e=>setPayout(prev=>({...prev,[amb.id]:{...(prev[amb.id]||{}),[f2.key]:e.target.value}}))} />
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:12,color:'#8C919E',marginBottom:12}}>
                        Total: <strong style={{color:'#22C55E'}}>${(parseFloat(payout[amb.id]?.l1||0)+parseFloat(payout[amb.id]?.l2||0)+parseFloat(payout[amb.id]?.l3||0)).toFixed(2)}</strong> · Period: {period}
                      </div>
                      <button onClick={()=>sendPayout(amb)} disabled={sendingPayout[amb.id]}
                        style={{...cs.btn,background:'#22C55E',color:'#fff',opacity:sendingPayout[amb.id]?0.5:1}}>
                        {sendingPayout[amb.id]?'Sending...':'💸 Send Payout Email'}
                      </button>
                      <div style={{marginTop:8,fontSize:11,color:'#8C919E',lineHeight:1.6}}>Sends payout breakdown to {amb.email}. Send Zelle separately.</div>
                      <div style={{marginTop:20}}>
                        <div style={{fontSize:10,fontWeight:600,color:'#8C919E',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Links</div>
                        <div style={{fontSize:13,color:'#4A4F5C',lineHeight:2.2}}>
                          <div>🔗 advncelabs.com?ref={amb.code}</div>
                          <div>📊 <a href={`https://advncelabs.com/advnce-dashboard.html?code=${amb.code}`} target="_blank" rel="noreferrer" style={{color:'#0072B5'}}>Ambassador dashboard</a></div>
                        </div>
                      </div>
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
