// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies
//
// CC_DB               — public/app.html lines 1188-1202 (dependency of getBestCard)
// calcFiveTwentyFour  — public/app.html lines 1205-1209
// getBestCard         — public/app.html lines 1210-1222

const CC_DB = [
  { id: "csp", name: "Chase Sapphire Preferred", issuer: "Chase", network: "Visa", af: 95, bonus: 6e4, bonusCur: "UR", bonusVal: 750, minSpend: 4e3, minDays: 90, cats: { travel: 5, dining: 3, streaming: 3, grocery: 1, gas: 1, other: 1 }, fivetwentyfour: true, rec: "Anchor card. 5x travel via portal, 3x dining. Transfer partners: Hyatt, United, Southwest.", tier: "starter", refUrl: "#", refPayout: 125 },
  { id: "csr", name: "Chase Sapphire Reserve", issuer: "Chase", network: "Visa", af: 550, bonus: 6e4, bonusCur: "UR", bonusVal: 900, minSpend: 4e3, minDays: 90, cats: { travel: 10, dining: 3, streaming: 3, grocery: 1, gas: 1, other: 1 }, fivetwentyfour: true, rec: "Premium travel. 10x hotels/car via portal, $300 travel credit, Priority Pass. Points worth 1.5cpp in portal.", tier: "premium", refUrl: "#", refPayout: 150 },
  { id: "cfu", name: "Chase Freedom Unlimited", issuer: "Chase", network: "Visa", af: 0, bonus: 2e4, bonusCur: "UR", bonusVal: 200, minSpend: 500, minDays: 90, cats: { travel: 5, dining: 3, drugstore: 3, grocery: 1, gas: 1, other: 1.5 }, fivetwentyfour: true, rec: "Daily driver. 1.5% everything + 3% dining/drugstore. Pairs with Sapphire for transfers.", tier: "starter", refUrl: "#", refPayout: 100 },
  { id: "cff", name: "Chase Freedom Flex", issuer: "Chase", network: "Mastercard", af: 0, bonus: 2e4, bonusCur: "UR", bonusVal: 200, minSpend: 500, minDays: 90, cats: { rotating: 5, travel: 5, dining: 3, drugstore: 3, grocery: 1, gas: 1, other: 1 }, fivetwentyfour: true, rec: "Rotating 5% categories ($1500/qtr). Stack with Sapphire for max value.", tier: "starter", refUrl: "#", refPayout: 100 },
  { id: "cic", name: "Chase Ink Cash", issuer: "Chase", network: "Visa", af: 0, bonus: 75e3, bonusCur: "UR", bonusVal: 937, minSpend: 6e3, minDays: 90, cats: { office: 5, phone: 5, internet: 5, gas: 2, dining: 2, other: 1 }, fivetwentyfour: false, rec: "Biz card \u2014 5% office supply/phone/internet. Not under 5/24 but requires <5/24 to get.", tier: "advanced", refUrl: "#", refPayout: 100 },
  { id: "cip", name: "Chase Ink Preferred", issuer: "Chase", network: "Visa", af: 95, bonus: 1e5, bonusCur: "UR", bonusVal: 1250, minSpend: 8e3, minDays: 90, cats: { travel: 3, shipping: 3, social: 3, phone: 3, internet: 3, other: 1 }, fivetwentyfour: false, rec: "Best UR signup bonus. 3x travel/shipping/social. Transfer to Sapphire for portal boost.", tier: "advanced", refUrl: "#", refPayout: 150 },
  { id: "amexgold", name: "Amex Gold", issuer: "Amex", network: "Amex", af: 250, bonus: 6e4, bonusCur: "MR", bonusVal: 720, minSpend: 6e3, minDays: 180, cats: { grocery: 4, dining: 4, travel: 3, other: 1 }, fivetwentyfour: false, rec: "Best grocery/dining card. 4x on both. $120 dining + $120 Uber credits offset AF.", tier: "starter", refUrl: "#", refPayout: 150 },
  { id: "amexplat", name: "Amex Platinum", issuer: "Amex", network: "Amex", af: 695, bonus: 8e4, bonusCur: "MR", bonusVal: 1120, minSpend: 8e3, minDays: 180, cats: { flights: 5, amextravel: 5, hotels_prepaid: 5, grocery: 1, dining: 1, other: 1 }, fivetwentyfour: false, rec: "Premium travel. 5x flights, Centurion lounges, $200 hotel/airline credits, Global Entry. Stack credits to offset $695 AF.", tier: "premium", refUrl: "#", refPayout: 200 },
  { id: "bcp", name: "Amex Blue Cash Preferred", issuer: "Amex", network: "Amex", af: 95, bonus: 350, bonusCur: "cash", bonusVal: 350, minSpend: 3e3, minDays: 180, cats: { grocery: 6, streaming: 6, transit: 3, gas: 3, other: 1 }, fivetwentyfour: false, rec: "Best cashback grocery card. 6% grocery ($6k/yr), 6% streaming. Simple.", tier: "starter", refUrl: "#", refPayout: 100 },
  { id: "citi_premier", name: "Citi Premier", issuer: "Citi", network: "Mastercard", af: 95, bonus: 6e4, bonusCur: "TYP", bonusVal: 720, minSpend: 4e3, minDays: 90, cats: { travel: 3, gas: 3, grocery: 3, dining: 3, other: 1 }, fivetwentyfour: false, rec: "3x on everything that matters. No transfer restrictions. Good JetBlue/AA transfers.", tier: "starter", refUrl: "#", refPayout: 100 },
  { id: "venture_x", name: "Capital One Venture X", issuer: "Capital One", network: "Visa", af: 395, bonus: 75e3, bonusCur: "miles", bonusVal: 750, minSpend: 4e3, minDays: 90, cats: { travel: 10, other: 2 }, fivetwentyfour: false, rec: "$300 travel portal credit + 10k anniversary bonus = effectively $0 AF. 10x travel portal, 2x everything.", tier: "premium", refUrl: "#", refPayout: 125 },
  { id: "wf_autograph", name: "Wells Fargo Autograph", issuer: "WF", network: "Visa", af: 0, bonus: 2e4, bonusCur: "points", bonusVal: 200, minSpend: 1e3, minDays: 90, cats: { travel: 3, dining: 3, gas: 3, transit: 3, streaming: 3, phone: 3, other: 1 }, fivetwentyfour: false, rec: "No AF, 3x on six categories. Solid beginner card. Stack with Autograph Journey for transfers.", tier: "starter", refUrl: "#", refPayout: 75 },
  { id: "discover", name: "Discover it", issuer: "Discover", network: "Discover", af: 0, bonus: 0, bonusCur: "cash", bonusVal: 0, minSpend: 0, minDays: 0, cats: { rotating: 5, other: 1 }, matchFirst: true, fivetwentyfour: false, rec: "Rotating 5% ($1500/qtr) + first year cash back match (effectively 10%). Great first card.", tier: "starter", refUrl: "#", refPayout: 50 }
];
function calcFiveTwentyFour(wallet) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setMonth(cutoff.getMonth() - 24);
  return wallet.filter((c) => new Date(c.openDate) >= cutoff && c.countsFor524).length;
}
function getBestCard(wallet, category) {
  let best = null, bestRate = 0;
  wallet.forEach((c) => {
    const card = CC_DB.find((d) => d.id === c.cardId);
    if (!card) return;
    const rate = card.cats[category] || card.cats.other || 1;
    if (rate > bestRate) {
      bestRate = rate;
      best = { ...c, card, rate };
    }
  });
  return best;
}

export { CC_DB, calcFiveTwentyFour, getBestCard };
