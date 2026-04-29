// lib/news/render.js
// Render a draft into 4 PNG slides → upload to Supabase Storage →
// update post_drafts.image_urls + status=ready_for_review.

import { ImageResponse } from 'next/og';
import { loadNewsFonts } from './fonts.js';
import { buildCoverSlide } from './slide-cover.js';
import { buildFindingSlide } from './slide-finding.js';
import { buildMechanismSlide } from './slide-mechanism.js';
import { buildTakeawaySlide } from './slide-takeaway.js';
import { SLIDE_W, SLIDE_H } from './tokens.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'news-slides';

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

async function uploadSlide(draftId, idx, pngBuffer) {
  const path = `${draftId}/slide-${idx}.png`;
  const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: pngBuffer,
  });
  if (!upRes.ok) {
    const t = await upRes.text();
    throw new Error(`storage upload failed (slide ${idx}): ${upRes.status} ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function elementToPngBuffer(element, fonts) {
  const r = new ImageResponse(element, { width: SLIDE_W, height: SLIDE_H, fonts });
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}

function pickCompoundFromHook(hook) {
  // First all-caps token in the hook (handles "BPC-157", "GLP-1", "RFK")
  const m = String(hook || '').match(/[A-Z][A-Z0-9\-]{1,}/);
  return m ? m[0] : 'COMPOUND';
}

export async function renderDraft(draftId) {
  // 1. Load draft
  const dRes = await sb(`/post_drafts?id=eq.${draftId}&select=*`);
  const drafts = await dRes.json();
  if (!Array.isArray(drafts) || drafts.length === 0) throw new Error(`draft ${draftId} not found`);
  const d = drafts[0];

  if (d.needs_legal_review) {
    // Don't render — leave in needs_legal_review status
    return { ok: false, reason: 'needs_legal_review' };
  }

  // 2. Mark rendering
  await sb(`/post_drafts?id=eq.${draftId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'rendering' }),
  });

  try {
    const fonts = await loadNewsFonts();
    const compound = pickCompoundFromHook(d.hook);
    // Pull tier from candidate
    const cRes = await sb(`/news_candidates?id=eq.${d.candidate_id}&select=tier,source_name,topic_tags`);
    const cand = (await cRes.json())[0] || { tier: 'A' };
    const tierLabel = cand.topic_tags?.includes('regulatory') ? 'REGULATORY'
                    : cand.topic_tags?.includes('industry') ? 'INDUSTRY'
                    : cand.topic_tags?.includes('pulse') ? 'PULSE' : 'RESEARCH';

    const slide1 = buildCoverSlide({
      hook: d.hook, highlight_words: d.highlight_words,
      accent_color: d.accent_color, tier: tierLabel, source_quality: cand.tier,
    });
    const slide2 = buildFindingSlide({
      compound, sub: cand.source_name, finding: d.slide_2_finding,
    });
    const slide3 = buildMechanismSlide({
      mechanism: d.slide_3_mechanism, citation: d.slide_3_citation,
    });
    const slide4 = buildTakeawaySlide({ takeaway: d.slide_4_takeaway });

    // 3. Render each slide to PNG → upload
    const elements = [slide1, slide2, slide3, slide4];
    const urls = [];
    for (let i = 0; i < elements.length; i++) {
      const buf = await elementToPngBuffer(elements[i], fonts);
      const url = await uploadSlide(draftId, i + 1, buf);
      urls.push(url);
    }

    // 4. Update draft
    await sb(`/post_drafts?id=eq.${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ready_for_review', image_urls: urls }),
    });

    return { ok: true, urls };
  } catch (e) {
    await sb(`/post_drafts?id=eq.${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'render_failed' }),
    });
    throw e;
  }
}
