import ApplicationCard from './ApplicationCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) return [];
  return r.json();
}

export const dynamic = 'force-dynamic';

export default async function RecruitmentAdminPage() {
  const [pending, recent, recipients, sendsByTouch] = await Promise.all([
    sb('/ambassador_applications?status=eq.pending&order=created_at.desc'),
    sb('/ambassador_applications?status=in.(approved,rejected)&order=reviewed_at.desc&limit=20'),
    sb('/ambassador_recruitment_recipients?select=drip_status'),
    sb('/ambassador_recruitment_sends?select=touch_num,status&order=sent_at.desc&limit=2000'),
  ]);

  const dripCounts = recipients.reduce((a, r) => { a[r.drip_status] = (a[r.drip_status] || 0) + 1; return a; }, {});
  const touchCounts = sendsByTouch.reduce((a, r) => { const k = `${r.touch_num}_${r.status}`; a[k] = (a[k] || 0) + 1; return a; }, {});

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Recruitment Drip</h1>
        <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>Ambassador recruitment campaign &middot; solar rep wave</div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        {['queued','in_progress','paused','completed','applied','unsubscribed'].map(s => (
          <div key={s} style={{ border: '1px solid #E4E7EC', borderRadius: 4, padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 10, color: '#7A7D88', letterSpacing: 2, textTransform: 'uppercase' }}>{s.replace('_', ' ')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1A1C22', marginTop: 4 }}>{dripCounts[s] || 0}</div>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
        {[1,2,3,4,5].map(t => (
          <div key={t} style={{ border: '1px solid #E4E7EC', borderRadius: 4, padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 10, color: '#00A0A8', letterSpacing: 2, textTransform: 'uppercase' }}>TOUCH {t}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1C22', marginTop: 4 }}>{touchCounts[`${t}_sent`] || 0} sent</div>
            {(touchCounts[`${t}_failed`] || 0) > 0 && <div style={{ fontSize: 11, color: '#E07C24', marginTop: 2 }}>{touchCounts[`${t}_failed`]} failed</div>}
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 12px' }}>Pending applications ({pending.length})</h2>
        {pending.length === 0 && <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>No applications waiting.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(a => <ApplicationCard key={a.id} app={a} mode="pending" />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 12px' }}>Recent reviews (last 20)</h2>
        {recent.length === 0 && <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>None yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recent.map(a => <ApplicationCard key={a.id} app={a} mode="reviewed" />)}
        </div>
      </section>
    </div>
  );
}
