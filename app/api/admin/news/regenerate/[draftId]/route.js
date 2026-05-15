// app/api/admin/news/regenerate/[draftId]/route.js
// Snapshot current draft to history, then re-run curator on the same
// candidate (without affecting other drafts).

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../../../../../../lib/requireAdmin';
import { CURATOR_MODEL, buildSystemPrompt } from '../../../../../../lib/news/curator-prompt';
import { validateCuratorOutput } from '../../../../../../lib/news/curator';
import { renderDraft } from '../../../../../../lib/news/render';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export const maxDuration = 180;

export async function POST(request, { params }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  // 1. Load draft + candidate
  const dRes = await sb(`/post_drafts?id=eq.${params.draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const d = drafts[0];
  if (!d.candidate_id) {
    return NextResponse.json({ error: 'no candidate to regenerate from' }, { status: 400 });
  }
  const cRes = await sb(`/news_candidates?id=eq.${d.candidate_id}&select=*`);
  const cand = (await cRes.json())[0];
  if (!cand) return NextResponse.json({ error: 'candidate missing' }, { status: 400 });

  // 2. Snapshot current draft
  await sb('/post_drafts_history', {
    method: 'POST',
    body: JSON.stringify({ draft_id: d.id, snapshot: d }),
  });

  // 3. Re-run curator on this single candidate
  const userMessage = JSON.stringify({
    last_week_final_color: d.accent_color === 'teal' ? 'amber' : 'teal',
    suggested_first_color: d.accent_color,
    slot_dates: { [slotName(d.slot_date)]: d.slot_date },
    candidates: [{
      candidate_id: cand.id,
      title: cand.title,
      source_url: cand.source_url,
      source_name: cand.source_name,
      tier: cand.tier,
      topic_tags: cand.topic_tags,
      raw_content: (cand.raw_content || '').slice(0, 800),
      published_at: cand.published_at,
    }],
    instruction: 'Regenerate this single pick with a fresh angle. Keep the same slot.',
  });

  const resp = await client.messages.create({
    model: CURATOR_MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
  });
  const text = resp.content.find((b) => b.type === 'text')?.text || '';
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return NextResponse.json({ error: 'curator non-JSON' }, { status: 502 });
    parsed = JSON.parse(m[0]);
  }
  const errs = validateCuratorOutput(parsed);
  if (errs.length || parsed.picks.length !== 1) {
    return NextResponse.json({ error: 'curator output invalid', detail: errs }, { status: 502 });
  }
  const p = parsed.picks[0];

  // 4. Update the draft in place + clear images
  await sb(`/post_drafts?id=eq.${d.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: p.needs_legal_review ? 'needs_legal_review' : 'rendering',
      accent_color: p.accent_color,
      hook: p.hook,
      highlight_words: p.highlight_words || [],
      slide_2_finding: p.slide_2_finding,
      slide_3_mechanism: p.slide_3_mechanism,
      slide_3_citation: p.slide_3_citation,
      slide_4_takeaway: p.slide_4_takeaway,
      caption: p.caption,
      hashtags: p.hashtags || [],
      needs_legal_review: !!p.needs_legal_review,
      citation_text: p.citation,
      image_urls: null,
    }),
  });

  // 5. Re-render unless legal-review
  if (!p.needs_legal_review) await renderDraft(d.id);

  return NextResponse.json({ ok: true });
}

function slotName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  if (dow === 1) return 'mon';
  if (dow === 3) return 'wed';
  if (dow === 5) return 'fri';
  return 'mon';
}
