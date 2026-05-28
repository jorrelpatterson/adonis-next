// Server component: fetches drafts grouped by status, renders sections,
// passes per-draft data to <DraftCard /> client component.

import DraftCard from './DraftCard';
import NewDraftButton from './NewDraftButton';

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

export const dynamic = 'force-dynamic';

export default async function EmailCampaignsPage() {
  const [drafts, compounds] = await Promise.all([
    sb('/compound_email_drafts?status=in.(draft,ready,sending,failed,sent)&order=created_at.desc&limit=50'),
    sb('/compound_marketing?select=compound_slug,compound_name,category&order=compound_name.asc'),
  ]);

  const needsCopy = drafts.filter(d =>
    d.status === 'draft' && (!d.layman_lead || !d.bullet_1 || !d.bullet_2 || !d.bullet_3 || !d.tagline)
  );
  const draftReady = drafts.filter(d => d.status === 'draft' && !needsCopy.includes(d));
  const readyToSend = drafts.filter(d => d.status === 'ready');
  const inProgress = drafts.filter(d => d.status === 'sending' || d.status === 'failed');
  const sentRecent = drafts.filter(d => d.status === 'sent').slice(0, 30);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, textTransform: 'uppercase' }}>Email Campaigns</h1>
          <div style={{ marginTop: 6, fontSize: 12, color: '#7A7D88', letterSpacing: 1 }}>
            Compound spotlight dispatches &middot; "There's a peptide for that"
          </div>
        </div>
        <NewDraftButton compounds={compounds} />
      </header>

      <Section title={`Needs copy (${needsCopy.length})`} hint="Auto-drafted from restocks. Author the layman lead/bridge and bullets before sending.">
        {needsCopy.length === 0 && <Empty>None.</Empty>}
        {needsCopy.map(d => <DraftCard key={d.id} draft={d} mode="needsCopy" />)}
      </Section>

      <Section title={`Drafts (${draftReady.length})`}>
        {draftReady.length === 0 && <Empty>None.</Empty>}
        {draftReady.map(d => <DraftCard key={d.id} draft={d} mode="draft" />)}
      </Section>

      <Section title={`Ready to send (${readyToSend.length})`}>
        {readyToSend.length === 0 && <Empty>None.</Empty>}
        {readyToSend.map(d => <DraftCard key={d.id} draft={d} mode="ready" />)}
      </Section>

      <Section title={`In progress / failed (${inProgress.length})`}>
        {inProgress.length === 0 && <Empty>None.</Empty>}
        {inProgress.map(d => <DraftCard key={d.id} draft={d} mode="inProgress" />)}
      </Section>

      <Section title={`Sent (last 30)`}>
        {sentRecent.length === 0 && <Empty>None.</Empty>}
        {sentRecent.map(d => <DraftCard key={d.id} draft={d} mode="sent" />)}
      </Section>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 14, letterSpacing: 3, textTransform: 'uppercase', color: '#1A1C22', margin: '0 0 6px' }}>{title}</h2>
      {hint && <div style={{ fontSize: 12, color: '#7A7D88', marginBottom: 12 }}>{hint}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 16, color: '#7A7D88', fontSize: 13, fontStyle: 'italic', border: '1px dashed #E4E7EC', borderRadius: 4 }}>{children}</div>;
}
