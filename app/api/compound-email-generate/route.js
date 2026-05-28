import { NextResponse } from 'next/server';
import { requireRole } from '../../../lib/requireAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BRAND_VOICE = `ADVNCE LABS BRAND VOICE — apply rigorously:
- Editorial, principled, restrained. No exclamation marks. No superlatives ("amazing", "breakthrough", "game-changer").
- NEVER use outcome words: cures, treats, heals, fixes, fights, prevents.
- NEVER use marketing words: miracle, secret, anti-aging, weight-loss product, natural, supplement.
- Always frame as research, not therapy: "Research has investigated", "Studies show", "Animal models examined", "The literature describes".
- Audience: research-grade peptide buyers. Layman-accessible but never patronizing.
- Use "we" (first-person plural for the company) sparingly.
- Italics-for-emphasis (the word, not styling) used sparingly.
- "Full stop." sentence closer is on-brand and elegant when used once.
- Restrained, NOT salesy.`;

const FIELD_RULES = `Generate ONLY these 7 fields. Match each constraint exactly.

- tagline: 4-8 words, sentence case, ends with period. Reads as an italic single-line subtitle. Examples: "The bonding nonapeptide." / "A regenerative tissue compound." / "An α-MSH analog." Avoid generic adjectives.
- layman_lead: 2-3 sentences in plain everyday English. What the compound is / where it occurs / why a non-scientist would care. Concrete and sensory, never clinical. Often opens "In plain terms:" or similar. NEVER promise outcomes.
- layman_bridge: 2 sentences. Pivots from layman framing to the research lens. Pattern: "Researchers have been studying it for [decades / years]. What they're examining isn't [common misperception] — it's [the actual mechanism/scope]."
- bullet_1, bullet_2, bullet_3: each 1 sentence (max ~22 words). Research-grade voice. Each makes ONE point: structure/mechanism, key finding, scope of study. Include parenthetical author-year citations where natural, e.g. "(Carter 2014)".
- citations_short: ALL-CAPS, " · " (space-middot-space) separated author-year tokens. 1-4 tokens. Examples: "CARTER 2014" or "CARTER 2014 · HEINRICHS 2003".

OUTPUT FORMAT: strictly a single JSON object with exactly those 7 keys. No prose, no markdown fence, no preamble. Just the JSON.`;

export async function POST(request) {
  const unauth = requireRole(request, 'admin', 'va');
  if (unauth) return unauth;
  if (!ANTHROPIC) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { draft_id } = body || {};
  if (!UUID_RE.test(String(draft_id || ''))) return NextResponse.json({ error: 'Invalid draft_id' }, { status: 400 });

  const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

  const dRes = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${draft_id}&select=*&limit=1`, { headers: sbHeaders, cache: 'no-store' });
  if (!dRes.ok) return NextResponse.json({ error: 'Draft lookup failed' }, { status: 500 });
  const [draft] = await dRes.json();
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });

  const cmRes = await fetch(`${SUPABASE_URL}/rest/v1/compound_marketing?compound_slug=eq.${encodeURIComponent(draft.compound_slug)}&select=*&limit=1`, { headers: sbHeaders, cache: 'no-store' });
  const [cm] = cmRes.ok ? await cmRes.json() : [];

  const userMsg = `Compound name: ${draft.compound_name}
Hook (the email's italic subject question — do NOT regenerate, use this as the entry point): "${draft.hook || cm?.hook || ''}"
Research angle (what the literature studies): ${cm?.research_angle || '(none provided — infer from compound name)'}
Primary citation we already have: ${cm?.citation_primary || '(none provided)'}
Category: ${cm?.category || ''}${cm?.subcategory ? ' · ' + cm.subcategory : ''}

Generate the missing email body fields per the rules.`;

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: BRAND_VOICE + '\n\n' + FIELD_RULES,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!ar.ok) {
    return NextResponse.json({ error: 'Anthropic call failed', detail: await ar.text() }, { status: 500 });
  }

  const aiResp = await ar.json();
  const text = aiResp.content?.[0]?.text || '';

  // Extract JSON object — model might emit a code fence anyway, be forgiving
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: 'AI response did not contain JSON', raw: text }, { status: 500 });

  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch { return NextResponse.json({ error: 'Invalid JSON in AI response', raw: text }, { status: 500 }); }

  const expectedKeys = ['tagline', 'layman_lead', 'layman_bridge', 'bullet_1', 'bullet_2', 'bullet_3', 'citations_short'];
  const patch = {};
  for (const k of expectedKeys) if (typeof parsed[k] === 'string') patch[k] = parsed[k].trim();
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'No valid fields in AI response', raw: text }, { status: 500 });

  const upd = await fetch(`${SUPABASE_URL}/rest/v1/compound_email_drafts?id=eq.${draft_id}`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(patch),
  });
  if (!upd.ok) return NextResponse.json({ error: 'Update failed', detail: await upd.text() }, { status: 500 });

  return NextResponse.json({ success: true, fields: patch });
}

export async function GET() {
  return NextResponse.json({ status: 'compound-email-generate route is live' });
}
