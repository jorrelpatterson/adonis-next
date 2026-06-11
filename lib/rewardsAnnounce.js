// ADVNCE Rewards launch announcement: segmentation + per-recipient rendering.
// One-off campaign helpers used by /api/rewards-announce.
//
// Tier table MUST match the live program config in
// advnce-site/api/_lib/loyalty.js (LOYALTY_TIERS) — that file is the source
// of truth; this is a campaign-time mirror.

import fs from 'fs';
import path from 'path';
import { signUnsubToken } from './unsubToken.js';

export const PAID_STATUSES = ['confirmed', 'paid', 'processing', 'shipped', 'delivered'];

export const TIERS = [
  { name: 'MOMENTUM', threshold: 350,  pct: 5,  giftName: 'DSIP 5mg' },
  { name: 'VELOCITY', threshold: 1000, pct: 10, giftName: 'NAD+ 500mg' },
  { name: 'APEX',     threshold: 2500, pct: 15, giftName: 'SS-31 50mg' },
];

const TPL_DIR = path.join(process.cwd(), 'templates', 'email');
const CACHE = {};
function loadTemplate(file) {
  if (!CACHE[file]) CACHE[file] = fs.readFileSync(path.join(TPL_DIR, file), 'utf8');
  return CACHE[file];
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function render(file, fields) {
  return loadTemplate(file).replace(/\{\{(\w+)\}\}/g, (_, key) => (key in fields ? fields[key] : ''));
}

// Aggregate the orders table into per-email loyalty facts.
// rows: [{ email, total, status, tier_unlocked }]
// Returns Map(lowerEmail -> { spend, maxGrantedRank }).
// maxGrantedRank mirrors the live program's highestUnlockedRank semantics:
// orders.tier_unlocked stores only the HIGHEST tier crossed per order, but the
// crossing order shipped ALL gifts up to that tier — so every rank at/below
// the max has been granted. Pending orders count; cancelled don't.
export function aggregateOrders(rows) {
  const byEmail = new Map();
  for (const o of rows || []) {
    const email = String(o.email || '').trim().toLowerCase();
    if (!email) continue;
    let rec = byEmail.get(email);
    if (!rec) { rec = { spend: 0, maxGrantedRank: -1 }; byEmail.set(email, rec); }
    if (PAID_STATUSES.includes(o.status)) rec.spend += parseFloat(o.total) || 0;
    if (o.tier_unlocked && o.status !== 'cancelled') {
      const rank = TIERS.findIndex(t => t.name === o.tier_unlocked);
      if (rank > rec.maxGrantedRank) rec.maxGrantedRank = rank;
    }
  }
  for (const rec of byEmail.values()) rec.spend = Math.round(rec.spend * 100) / 100;
  return byEmail;
}

// Decide which email a recipient gets and with what personalization.
// Returns { segment: 'member' | 'intro_progress' | 'intro_plain', tier, spend, ... }
export function segmentRecipient(recipient, ordersByEmail) {
  const rec = ordersByEmail.get(recipient.email) || { spend: 0, maxGrantedRank: -1 };
  const spend = rec.spend;
  let tier = null;
  for (const t of TIERS) if (spend >= t.threshold) tier = t;

  if (tier) {
    const tierRank = TIERS.indexOf(tier);
    // Gifts they'll receive on their next order: every tier at/below theirs
    // above the highest already-granted rank (mirrors live giftsUnlocked).
    const giftNames = TIERS
      .filter((t, i) => i <= tierRank && i > rec.maxGrantedRank)
      .map(t => t.giftName);
    const next = TIERS[tierRank + 1] || null;
    return { segment: 'member', spend, tier, giftNames, next };
  }
  if (spend > 0) return { segment: 'intro_progress', spend, tier: null };
  return { segment: 'intro_plain', spend: 0, tier: null };
}

const PROGRESS_BLOCK_HTML = (lifetime, remaining) => `<div style="background:#1A1C22;padding:22px 24px;margin-bottom:28px;border-radius:3px;text-align:center">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(244,242,238,0.45);letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">Your head start</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#F4F2EE;line-height:2">Lifetime so far: <strong style="color:#00A0A8">$${lifetime}</strong><br>just <strong style="color:#E07C24">$${remaining}</strong> from MOMENTUM and your free DSIP vial</div>
  </div>`;

// Omitted entirely when every gift at/below the member's tier already shipped —
// never promise a vial that won't be in the box.
const GIFT_BLOCK_HTML = (giftNames) => `<div style="background:#FAFBFC;border:1px solid rgba(224,124,36,0.35);padding:20px 24px;margin:0 0 28px;border-radius:4px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#E07C24;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Your unlock gift</div>
        <p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1C22;line-height:1.6;margin:0">A free <strong>${escapeHtml(giftNames.join(' + '))}</strong> ships in the box with your next order — our thanks for being here early. No code needed; it's added automatically.</p>
      </div>`;

export const SUBJECTS = {
  member: 'You already earned this — your ADVNCE Rewards are active',
  intro: 'Every order counts now — introducing ADVNCE Rewards',
};

// Render the right email for one recipient. Returns { subject, html, segment }.
export function renderAnnouncement(recipient, seg, baseUrl) {
  const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email-unsub?t=${encodeURIComponent(signUnsubToken(recipient.email))}`;
  const firstName = escapeHtml((recipient.name || '').trim().split(/\s+/)[0] || 'there');

  if (seg.segment === 'member') {
    const html = render('advnce-rewards-announce-member.html', {
      FIRST_NAME: firstName,
      TIER: seg.tier.name,
      PCT: String(seg.tier.pct),
      GIFT_BLOCK: seg.giftNames.length ? GIFT_BLOCK_HTML(seg.giftNames) : '',
      LIFETIME: seg.spend.toFixed(2),
      NEXT_TIER_LINE: seg.next
        ? `<br>$${(seg.next.threshold - seg.spend).toFixed(2)} to ${seg.next.name} (${seg.next.pct}% off)`
        : '',
      UNSUBSCRIBE_URL: escapeHtml(unsubUrl),
    });
    return { subject: SUBJECTS.member, html, segment: seg.segment };
  }

  const html = render('advnce-rewards-announce-intro.html', {
    FIRST_NAME: firstName,
    PROGRESS_BLOCK: seg.segment === 'intro_progress'
      ? PROGRESS_BLOCK_HTML(seg.spend.toFixed(2), (350 - seg.spend).toFixed(2))
      : '',
    UNSUBSCRIBE_URL: escapeHtml(unsubUrl),
  });
  return { subject: SUBJECTS.intro, html, segment: seg.segment };
}
