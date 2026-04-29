// app/admin/marketing/news/page.jsx
// Server component: fetches drafts grouped by status + source health, then
// hands per-draft data to <DraftCard /> client component.

import DraftCard from './DraftCard';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    cache: 'no-store',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function loadData() {
  const [ready, legal, recent, health] = await Promise.all([
    sb('/post_drafts?status=eq.ready_for_review&order=slot_date.asc'),
    sb('/post_drafts?status=eq.needs_legal_review&order=created_at.desc'),
    sb('/post_drafts?status=in.(posted,skipped,render_failed)&order=created_at.desc&limit=30'),
    sb('/source_health?order=source_name.asc'),
  ]);
  return { ready, legal, recent, health };
}

export const dynamic = 'force-dynamic';

export default async function NewsAdminPage() {
  const { ready, legal, recent, health } = await loadData();
  const downCount = health.filter((h) => h.consecutive_failures >= 3).length;
  const totalSources = health.length;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>News Queue</h1>
          <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>
            Source health: {totalSources - downCount} / {totalSources} ✓ {downCount > 0 ? `· ${downCount} down` : ''}
          </div>
        </div>
        <form action="/api/cron/news-scrape" method="POST">
          <button type="submit"
            style={{ padding: '10px 18px', background: '#1A1C22', color: '#F4F2EE',
                     border: 0, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer' }}>
            Run scrape now
          </button>
        </form>
      </header>

      <Section title={`Ready for review (${ready.length})`}>
        {ready.length === 0 && <Empty>No drafts queued. Run curator to populate.</Empty>}
        {ready.map((d) => <DraftCard key={d.id} draft={d} mode="ready" />)}
      </Section>

      <Section title={`Needs legal review (${legal.length})`}>
        {legal.length === 0 && <Empty>None.</Empty>}
        {legal.map((d) => <DraftCard key={d.id} draft={d} mode="legal" />)}
      </Section>

      <Section title={`Recent (last 30)`}>
        {recent.length === 0 && <Empty>None yet.</Empty>}
        {recent.map((d) => <DraftCard key={d.id} draft={d} mode="recent" />)}
      </Section>

      <details style={{ marginTop: 32, fontSize: 12, color: '#7A7D88' }}>
        <summary style={{ cursor: 'pointer' }}>Source health detail</summary>
        <table style={{ marginTop: 12, fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr><th align="left">Source</th><th align="left">Last success</th><th align="left">Failures</th></tr></thead>
          <tbody>
            {health.map((h) => (
              <tr key={h.source_name} style={{ color: h.consecutive_failures >= 3 ? '#E07C24' : '#1A1C22' }}>
                <td style={{ padding: '4px 12px' }}>{h.source_name}</td>
                <td style={{ padding: '4px 12px' }}>{h.last_success_at ? new Date(h.last_success_at).toLocaleString() : '—'}</td>
                <td style={{ padding: '4px 12px' }}>{h.consecutive_failures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 2, textTransform: 'uppercase',
                   color: '#7A7D88', marginBottom: 14, borderBottom: '1px solid rgba(0,0,0,0.08)',
                   paddingBottom: 6 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 18, color: '#7A7D88', fontStyle: 'italic', fontSize: 13 }}>{children}</div>;
}
