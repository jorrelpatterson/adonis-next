// lib/news/curator.js
// Weekly curator. Calls Claude Sonnet 4.6 with cached system prompt
// + this week's candidates, returns 3 picks with full draft content.
// Inserts picks into post_drafts.

import Anthropic from '@anthropic-ai/sdk';
import { CURATOR_MODEL, buildSystemPrompt } from './curator-prompt.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sb(path, init = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export function nextAccentColor(prev) {
  if (prev === 'teal') return 'amber';
  if (prev === 'amber') return 'teal';
  return 'teal';
}

const REQUIRED_PICK_FIELDS = [
  'slot','candidate_id','compound','source_url','source_quality','citation',
  'accent_color','hook','highlight_words','slide_2_finding','slide_3_mechanism',
  'slide_3_citation','slide_4_takeaway','caption','hashtags','needs_legal_review',
];

export function validateCuratorOutput(out) {
  const errs = [];
  if (!out || typeof out !== 'object') return ['root not object'];
  if (!Array.isArray(out.picks)) errs.push('picks not array');
  if (Array.isArray(out.picks)) {
    out.picks.forEach((p, i) => {
      for (const k of REQUIRED_PICK_FIELDS) {
        if (!(k in p)) errs.push(`pick[${i}] missing field ${k}`);
      }
      if (p.accent_color && !['teal','amber'].includes(p.accent_color))
        errs.push(`pick[${i}] invalid accent_color: ${p.accent_color}`);
      if (p.slot && !['mon','wed','fri'].includes(p.slot))
        errs.push(`pick[${i}] invalid slot: ${p.slot}`);
      if (p.source_quality && !['A','B','C'].includes(p.source_quality))
        errs.push(`pick[${i}] invalid source_quality: ${p.source_quality}`);
      if (p.caption && (p.caption.length < 200 || p.caption.length > 600))
        errs.push(`pick[${i}] caption length ${p.caption.length} outside 200-600`);
      if (Array.isArray(p.hashtags) && (p.hashtags.length < 5 || p.hashtags.length > 12))
        errs.push(`pick[${i}] hashtag count ${p.hashtags.length} outside 5-12`);
      if (p.hook && p.hook.length > 80)
        errs.push(`pick[${i}] hook length ${p.hook.length} exceeds 80-char cap`);
    });
  }
  return errs;
}

async function fetchUnpickedCandidates() {
  const res = await sb('/news_candidates?status=eq.new&order=published_at.desc&limit=200');
  return res.json();
}

async function lastAccentColor() {
  const res = await sb('/post_drafts?select=accent_color&order=created_at.desc&limit=1');
  const rows = await res.json();
  return rows && rows[0] ? rows[0].accent_color : null;
}

function nextSlotDates(today = new Date()) {
  // Returns { mon, wed, fri } as YYYY-MM-DD for the upcoming Mon/Wed/Fri.
  // Curator runs Sunday 8pm PT — so "next" Monday is tomorrow.
  const dates = {};
  const day = today.getDay(); // 0=Sun..6=Sat
  const offsetMon = ((1 - day) + 7) % 7 || 7; // next Monday
  const monDate = new Date(today); monDate.setDate(today.getDate() + offsetMon);
  dates.mon = monDate.toISOString().slice(0, 10);
  const wedDate = new Date(monDate); wedDate.setDate(monDate.getDate() + 2);
  dates.wed = wedDate.toISOString().slice(0, 10);
  const friDate = new Date(monDate); friDate.setDate(monDate.getDate() + 4);
  dates.fri = friDate.toISOString().slice(0, 10);
  return dates;
}

export async function runCurator() {
  const candidates = await fetchUnpickedCandidates();
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { ok: true, picks: 0, skipped: ['mon','wed','fri'], note: 'no candidates' };
  }

  const lastColor = await lastAccentColor();
  const startColor = nextAccentColor(lastColor);
  const slotDates = nextSlotDates();

  // System prompt is cached (~3K tokens of editorial rules).
  // User message is the per-run candidate list.
  const userMessage = JSON.stringify({
    last_week_final_color: lastColor || 'none',
    suggested_first_color: startColor,
    slot_dates: slotDates,
    candidates: candidates.map((c) => ({
      candidate_id: c.id,
      title: c.title,
      source_url: c.source_url,
      source_name: c.source_name,
      tier: c.tier,
      topic_tags: c.topic_tags,
      raw_content: (c.raw_content || '').slice(0, 800),
      published_at: c.published_at,
    })),
  });

  const resp = await client.messages.create({
    model: CURATOR_MODEL,
    max_tokens: 8000,
    system: [
      { type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = resp.content.find((b) => b.type === 'text')?.text || '';

  async function quarantine(reason, raw) {
    // Surface curator failures in the admin queue instead of dying silently.
    // A render_failed draft for the Monday slot with the raw response stored
    // in citation_text so Jorrel can inspect what went wrong.
    await sb('/post_drafts', {
      method: 'POST',
      body: JSON.stringify({
        slot_date: slotDates.mon,
        status: 'render_failed',
        accent_color: startColor,
        hook: `[CURATOR FAILURE] ${reason}`,
        caption: '(no caption — curator output was rejected)',
        citation_text: String(raw).slice(0, 4000),
        curator_model: CURATOR_MODEL,
      }),
    });
  }

  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      await quarantine('curator returned non-JSON', text);
      return { ok: false, picks: 0, error: 'curator non-JSON', text: text.slice(0, 200) };
    }
    try { parsed = JSON.parse(m[0]); }
    catch (e2) {
      await quarantine('curator JSON parse error', text);
      return { ok: false, picks: 0, error: 'curator JSON parse error', text: text.slice(0, 200) };
    }
  }

  const errs = validateCuratorOutput(parsed);
  if (errs.length) {
    await quarantine('curator output invalid: ' + errs.slice(0, 3).join('; '), text);
    return { ok: false, picks: 0, error: 'curator output invalid', errs, text: text.slice(0, 200) };
  }

  // Insert each pick as a post_draft, mark candidate picked
  const insertedDraftIds = [];
  for (const pick of parsed.picks) {
    const slotDate = slotDates[pick.slot];
    const draftBody = {
      candidate_id: pick.candidate_id,
      slot_date: slotDate,
      status: pick.needs_legal_review ? 'needs_legal_review' : 'rendering',
      accent_color: pick.accent_color,
      hook: pick.hook,
      highlight_words: pick.highlight_words || [],
      slide_2_finding: pick.slide_2_finding,
      slide_3_mechanism: pick.slide_3_mechanism,
      slide_3_citation: pick.slide_3_citation,
      slide_4_takeaway: pick.slide_4_takeaway,
      caption: pick.caption,
      hashtags: pick.hashtags || [],
      needs_legal_review: !!pick.needs_legal_review,
      source_url: pick.source_url,
      citation_text: pick.citation,
      curator_model: CURATOR_MODEL,
    };
    const ins = await sb('/post_drafts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(draftBody),
    });
    if (!ins.ok) {
      const t = await ins.text();
      throw new Error(`insert draft failed: ${ins.status} ${t}`);
    }
    const [row] = await ins.json();
    insertedDraftIds.push(row.id);
    await sb(`/news_candidates?id=eq.${pick.candidate_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'picked' }),
    });
  }

  return {
    ok: true,
    picks: parsed.picks.length,
    skipped: parsed.skipped_slots || [],
    note: parsed.notes || null,
    draft_ids: insertedDraftIds,
    cache: { input_tokens: resp.usage?.input_tokens, cache_read: resp.usage?.cache_read_input_tokens },
  };
}
