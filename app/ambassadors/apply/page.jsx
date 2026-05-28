import ApplyForm from './ApplyForm';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

async function fetchPrefill(r) {
  if (!UUID_RE.test(String(r || ''))) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ambassador_recruitment_recipients?id=eq.${r}&select=email,first_name,last_name,phone,company,city,state&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' },
  );
  if (!res.ok) return null;
  const [row] = await res.json();
  return row || null;
}

export default async function ApplyPage({ searchParams }) {
  const r = searchParams?.r || '';
  const t = parseInt(searchParams?.t || '0', 10) || null;
  const prefill = await fetchPrefill(r);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ background: '#F4F2EE', borderRadius: 6, overflow: 'hidden' }}>

        <div style={{ padding: '18px 28px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 48 28" width="32" height="19" fill="none">
              <path d="M2 24L8 19L14 22L20 14L26 17L32 9L38 12L46 3" stroke="#00A0A8" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="32" cy="9" r="2" fill="#00A0A8" />
              <circle cx="38" cy="12" r="2" fill="#E07C24" />
              <circle cx="46" cy="3" r="2.5" fill="#E07C24" />
            </svg>
            <span style={{ font: "700 14px 'Barlow Condensed', sans-serif", letterSpacing: 3, textTransform: 'lowercase' }}>advnce <span style={{ color: '#7A7D88', fontWeight: 300 }}>labs</span></span>
          </div>
          <div style={{ font: "400 10px 'JetBrains Mono', monospace", color: '#00A0A8', letterSpacing: 3, textTransform: 'uppercase' }}>AMBASSADOR APPLICATION</div>
        </div>

        <div style={{ padding: '48px 36px 12px' }}>
          <h1 style={{ font: "900 44px 'Barlow Condensed', sans-serif", color: '#1A1C22', lineHeight: 0.95, letterSpacing: -1, textTransform: 'uppercase', margin: '0 0 8px' }}>You're in.</h1>
          <p style={{ font: "300 italic 22px 'Cormorant Garamond', serif", color: '#00A0A8', margin: '0 0 28px' }}>30 seconds. We review same-day.</p>

          <ApplyForm prefill={prefill} recipientId={UUID_RE.test(r) ? r : null} sourceTouch={t} />
        </div>

        <div style={{ background: '#1A1C22', padding: '18px 28px', textAlign: 'center', font: "400 8px 'JetBrains Mono', monospace", color: 'rgba(244,242,238,0.45)', letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.8 }}>
          advncelabs.com &middot; ambassadors@advncelabs.com<br />
          Research-grade compounds for in-vitro laboratory use only.
        </div>

      </div>
    </div>
  );
}
