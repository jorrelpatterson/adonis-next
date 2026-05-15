// src/protocols/money/credit/cards-logic.js

import { CC_DB } from './cards-db.js';

export function calcFiveTwentyFour(wallet) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);
  return wallet.filter((c) => new Date(c.openDate) >= cutoff && c.countsFor524).length;
}

export function getBestCard(wallet, category, db = CC_DB) {
  let best = null, bestRate = 0;
  wallet.forEach((c) => {
    const card = db.find((d) => d.id === c.cardId);
    if (!card) return;
    const rate = card.cats[category] || card.cats.other || 1;
    if (rate > bestRate) {
      bestRate = rate;
      best = { ...c, card, rate };
    }
  });
  return best;
}

export function calcBonusProgress(walletCard) {
  if (!walletCard.openDate || !walletCard.card) return { pct: 0, remaining: 0, daysLeft: 0, dailyNeeded: 0, status: "none" };
  const card = walletCard.card;
  const spent = walletCard.spent || 0;
  const pct = card.minSpend > 0 ? Math.min(100, Math.round(spent / card.minSpend * 100)) : 100;
  const remaining = Math.max(0, card.minSpend - spent);
  const deadline = new Date(walletCard.openDate);
  deadline.setDate(deadline.getDate() + card.minDays);
  const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / 864e5));
  const dailyNeeded = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0;
  const status = pct >= 100 ? "complete" : daysLeft < 14 && pct < 80 ? "critical" : daysLeft < 30 && pct < 60 ? "behind" : "on_track";
  return { pct, remaining, daysLeft, dailyNeeded, status, deadline };
}
