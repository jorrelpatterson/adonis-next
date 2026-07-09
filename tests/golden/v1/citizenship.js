// source: public/app.html (lines noted per function), commit 3cf8214 — VERBATIM v1 extraction, do not edit bodies

// public/app.html lines 1616-1761: CZ_COUNTRIES
// public/app.html lines 1762-1799: CZ_QUESTIONS
const CZ_COUNTRIES = [
  {
    id: "italy",
    name: "Italy",
    flag: "\u{1F1EE}\u{1F1F9}",
    pathway: "descent",
    eligible: "Italian ancestor who emigrated after 1861, unbroken citizenship line",
    timeline: "24-48 mo (consulate) / 12-24 mo (court)",
    cost: "$500-15,000",
    visaFree: 191,
    docs: ["Birth certs (full lineage)", "Marriage certs (full lineage)", "Death certs (deceased)", "USCIS naturalization search", "Italian ancestor BC from Comune", "Apostille all US docs", "Certified Italian translations", "Consulate appointment"],
    tips: ["USCIS searches take 6-12 months \u2014 file FIRST", "Book consulate appointment NOW, 2+ year waits", "Join Italian Citizenship Facebook groups for alerts", "1948 court case faster for maternal line but costs $5-15K"],
    benefits: ["EU citizenship \u2014 live/work anywhere in EU", "191 visa-free countries", "EU healthcare access", "Pass to children automatically"]
  },
  {
    id: "ireland",
    name: "Ireland",
    flag: "\u{1F1EE}\u{1F1EA}",
    pathway: "descent",
    eligible: "Irish-born grandparent (or parent born in Ireland)",
    timeline: "12-18 mo",
    cost: "$300-500",
    visaFree: 190,
    docs: ["Your birth certificate", "Parent's birth certificate", "Irish grandparent's birth certificate", "Marriage certificates in lineage", "Photo ID + proof of address", "Foreign Birth Registration form"],
    tips: ["One of the easiest descent claims", "Processing ~12-18 months due to backlog", "Irish passport = full EU citizenship", "Common Travel Area with UK"],
    benefits: ["EU citizenship", "Common Travel Area with UK", "190 visa-free countries", "Pass to children"]
  },
  {
    id: "poland",
    name: "Poland",
    flag: "\u{1F1F5}\u{1F1F1}",
    pathway: "descent",
    eligible: "Polish ancestor \u2014 no generational limit, back to 1920",
    timeline: "6-18 mo",
    cost: "$500-3,000",
    visaFree: 188,
    docs: ["Polish ancestor documents (birth/passport/military)", "Full lineage documentation", "Naturalization records check", "Sworn Polish translations", "Application to Voivode"],
    tips: ["No generational limit \u2014 great-great-grandparents work", "Polish archives survived WWII well", "Polish attorney can handle remotely ($1-3K)"],
    benefits: ["EU citizenship", "Schengen zone", "Growing economy", "No wealth tax"]
  },
  {
    id: "germany",
    name: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    pathway: "descent",
    eligible: "German ancestor, especially persecution victims (Article 116)",
    timeline: "12-36 mo",
    cost: "$200-2,000",
    visaFree: 190,
    docs: ["Proof of ancestor's German citizenship", "Persecution proof (if Article 116)", "Complete lineage documentation", "BVA application form"],
    tips: ["Article 116 is very generous \u2014 covers Jewish, political persecution", "2021 law changes expanded eligibility", "Free application for Article 116 cases"],
    benefits: ["EU citizenship", "Top 5 passport globally", "Free university education", "Excellent healthcare"]
  },
  {
    id: "portugal_gv",
    name: "Portugal Golden Visa",
    flag: "\u{1F1F5}\u{1F1F9}",
    pathway: "investment",
    eligible: "\u20AC500K+ fund investment",
    timeline: "5-6 years to passport",
    cost: "\u20AC500,000+",
    visaFree: 191,
    docs: ["Proof of qualifying investment", "Criminal background check", "Portuguese health insurance", "NIF (tax number)", "A2 Portuguese language cert"],
    tips: ["Fund investments most popular \u2014 hands-off", "Only 7 days/year in Portugal required", "Real estate route eliminated in 2024", "A2 language test is easy \u2014 3 months study"],
    benefits: ["EU citizenship", "Low residency requirement", "NHR tax regime", "Excellent quality of life"]
  },
  {
    id: "caribbean",
    name: "Caribbean CBI",
    flag: "\u{1F3DD}\uFE0F",
    pathway: "investment",
    eligible: "Donation or investment from $100K",
    timeline: "3-6 months",
    cost: "$100K-250K",
    visaFree: 157,
    docs: ["CBI application form", "Proof of funds", "Enhanced due diligence", "Medical examination", "Bank reference letter"],
    tips: ["Fastest path to second passport", "No residency requirement", "Grenada has US E-2 treaty access", "Dominica cheapest at $100K"],
    benefits: ["3-6 month processing", "No residency required", "Tax advantages", "Geographic diversification"],
    subOptions: [{ name: "Dominica", cost: "$100K", visaFree: 146 }, { name: "Grenada", cost: "$150K", visaFree: 148 }, { name: "St. Kitts", cost: "$250K", visaFree: 157 }, { name: "Antigua", cost: "$230K", visaFree: 151 }]
  },
  {
    id: "malta",
    name: "Malta",
    flag: "\u{1F1F2}\u{1F1F9}",
    pathway: "investment",
    eligible: "\u20AC690K+ contribution + property",
    timeline: "12-36 months",
    cost: "\u20AC690,000+",
    visaFree: 190,
    docs: ["National contribution (\u20AC600-750K)", "Property purchase/rental", "Philanthropic donation (\u20AC10K+)", "Four-tier due diligence"],
    tips: ["Most expensive EU CBI but fastest EU passport", "Very strict due diligence", "English-speaking"],
    benefits: ["EU citizenship", "Top passport globally", "English-speaking", "Favorable tax regime"]
  },
  {
    id: "mexico",
    name: "Mexico",
    flag: "\u{1F1F2}\u{1F1FD}",
    pathway: "residency",
    eligible: "4 years residency",
    timeline: "4-5 years",
    cost: "$1,000-3,000",
    visaFree: 161,
    docs: ["Temporary resident visa", "Proof of income/savings", "Background check", "Spanish proficiency test", "Mexican history exam"],
    tips: ["Temporary \u2192 Permanent \u2192 Naturalize", "Spanish proficiency required", "Culture/history exam is easy with study"],
    benefits: ["161 visa-free countries", "Low cost of living", "No worldwide income tax (with planning)"]
  },
  {
    id: "panama",
    name: "Panama",
    flag: "\u{1F1F5}\u{1F1E6}",
    pathway: "residency",
    eligible: "5 years residency",
    timeline: "5-6 years",
    cost: "$2,000-5,000",
    visaFree: 143,
    docs: ["Friendly Nations Visa application", "Bank account with $5K+", "Background check", "Health certificate"],
    tips: ["Friendly Nations Visa easy for US citizens", "No language requirement", "USD is legal tender"],
    benefits: ["Territorial tax system", "USD economy", "Strategic location", "No language requirement"]
  },
  {
    id: "argentina",
    name: "Argentina",
    flag: "\u{1F1E6}\u{1F1F7}",
    pathway: "residency",
    eligible: "2 years residency",
    timeline: "2-3 years",
    cost: "$500-2,000",
    visaFree: 171,
    docs: ["Residency visa application", "Background check (FBI apostilled)", "Proof of income", "2 years residency proof"],
    tips: ["One of fastest naturalizations globally", "Spanish helpful but not required", "Strong passport (171 visa-free)"],
    benefits: ["Fast naturalization (2 years)", "171 visa-free countries", "Rich culture", "Low cost of living"]
  },
  {
    id: "paraguay",
    name: "Paraguay",
    flag: "\u{1F1F5}\u{1F1FE}",
    pathway: "residency",
    eligible: "3 years residency",
    timeline: "3-4 years",
    cost: "$1,000-3,000",
    visaFree: 142,
    docs: ["Permanent residency application", "Bank deposit ($5K+)", "Background check", "Paraguayan ID (cedula)"],
    tips: ["Doesn't require physical presence full-time", "Very low cost of living", "Easy residency process"],
    benefits: ["Territorial tax system", "Low enforcement of presence", "Low cost of living"]
  }
];
const CZ_QUESTIONS = [
  {
    id: "ancestry",
    q: "Do you have ancestry from any of these countries?",
    type: "multi",
    opts: [{ id: "italy", l: "\u{1F1EE}\u{1F1F9} Italy" }, { id: "ireland", l: "\u{1F1EE}\u{1F1EA} Ireland" }, { id: "poland", l: "\u{1F1F5}\u{1F1F1} Poland" }, { id: "germany", l: "\u{1F1E9}\u{1F1EA} Germany" }, { id: "none", l: "None / Not sure" }]
  },
  {
    id: "budget",
    q: "What's your budget?",
    type: "single",
    opts: [{ id: "free", l: "Minimal ($0-500)", tier: 0 }, { id: "low", l: "Low ($500-5K)", tier: 1 }, { id: "mid", l: "Medium ($5K-50K)", tier: 2 }, { id: "high", l: "High ($50K-250K)", tier: 3 }, { id: "premium", l: "Premium ($250K+)", tier: 4 }]
  },
  {
    id: "timeline",
    q: "How fast do you need this?",
    type: "single",
    opts: [{ id: "asap", l: "ASAP (3-6 months)" }, { id: "soon", l: "1-2 years" }, { id: "medium", l: "3-5 years" }, { id: "no_rush", l: "No rush" }]
  },
  {
    id: "relocate",
    q: "Would you live abroad?",
    type: "single",
    opts: [{ id: "yes", l: "Yes, full-time" }, { id: "part", l: "Part-time / split" }, { id: "minimal", l: "Minimal visits" }, { id: "no", l: "No relocation" }]
  },
  {
    id: "purpose",
    q: "Why do you want a second passport?",
    type: "multi",
    opts: [{ id: "travel", l: "\u{1F30D} Travel access" }, { id: "eu", l: "\u{1F1EA}\u{1F1FA} EU access" }, { id: "planb", l: "\u{1F6E1}\uFE0F Plan B / safety" }, { id: "tax", l: "\u{1F4B0} Tax optimization" }, { id: "children", l: "\u{1F476} Pass to children" }, { id: "business", l: "\u{1F4BC} Business" }]
  },
  {
    id: "languages",
    q: "Do you speak any of these?",
    type: "multi",
    opts: [{ id: "spanish", l: "\u{1F1EA}\u{1F1F8} Spanish" }, { id: "portuguese", l: "\u{1F1F5}\u{1F1F9} Portuguese" }, { id: "italian", l: "\u{1F1EE}\u{1F1F9} Italian" }, { id: "german", l: "\u{1F1E9}\u{1F1EA} German" }, { id: "none", l: "English only" }]
  }
];

// public/app.html lines 1804-1881: scoreCitizenshipPaths
function scoreCitizenshipPaths(answers) {
  return CZ_COUNTRIES.map((c) => {
    let score = 0;
    const reasons = [];
    if (c.pathway === "descent" && answers.ancestry?.includes(c.id)) {
      score += 40;
      reasons.push("Ancestry match");
    } else if (c.pathway === "descent" && !answers.ancestry?.includes(c.id) && !answers.ancestry?.includes("none")) score -= 30;
    else if (c.pathway === "descent" && answers.ancestry?.includes("none")) score -= 40;
    const budgetTier = CZ_QUESTIONS[1].opts.find((o) => o.id === answers.budget)?.tier ?? 1;
    if (c.pathway === "descent") score += budgetTier >= 0 ? 20 : 10;
    else if (c.pathway === "investment") {
      if (c.id === "caribbean" && budgetTier >= 3) {
        score += 20;
        reasons.push("Within budget");
      } else if (c.id === "portugal_gv" && budgetTier >= 4) {
        score += 20;
        reasons.push("Within budget");
      } else if (c.id === "malta" && budgetTier >= 4) {
        score += 15;
        reasons.push("Within budget");
      } else score -= 20;
    } else if (c.pathway === "residency") score += budgetTier >= 1 ? 18 : 10;
    const tl = answers.timeline;
    if (tl === "asap") {
      if (c.id === "caribbean") score += 20;
      else if (c.pathway === "residency") score -= 10;
      else if (c.pathway === "descent") score += 5;
    } else if (tl === "soon") {
      if (c.pathway === "descent") score += 15;
      else if (c.id === "caribbean") score += 15;
      else score += 8;
    } else if (tl === "medium") {
      score += 15;
    } else {
      score += 18;
    }
    const rel = answers.relocate;
    if (c.pathway === "residency") {
      if (rel === "yes" || rel === "part") score += 10;
      else if (rel === "minimal") {
        score += c.id === "paraguay" ? 8 : 3;
      } else score -= 5;
    } else if (c.pathway === "investment") {
      score += rel === "no" ? 10 : 8;
    } else {
      score += 10;
    }
    const purp = answers.purpose || [];
    if (purp.includes("eu") && c.visaFree >= 188) score += 10;
    if (purp.includes("travel") && c.visaFree >= 170) score += 8;
    if (purp.includes("planb")) score += 5;
    if (purp.includes("tax") && ["panama", "paraguay", "caribbean"].includes(c.id)) score += 8;
    if (purp.includes("children") && c.pathway === "descent") score += 8;
    const langs = answers.languages || [];
    if (c.id === "mexico" && langs.includes("spanish")) {
      score += 5;
      reasons.push("Speaks Spanish");
    }
    if (c.id === "argentina" && langs.includes("spanish")) {
      score += 5;
      reasons.push("Speaks Spanish");
    }
    if (c.id === "portugal_gv" && langs.includes("portuguese")) {
      score += 5;
      reasons.push("Speaks Portuguese");
    }
    if (c.id === "italy" && langs.includes("italian")) {
      score += 5;
      reasons.push("Speaks Italian");
    }
    if (c.id === "germany" && langs.includes("german")) {
      score += 5;
      reasons.push("Speaks German");
    }
    return { ...c, score: Math.max(0, Math.min(100, score)), reasons };
  }).sort((a, b) => b.score - a.score);
}

export { CZ_COUNTRIES, CZ_QUESTIONS, scoreCitizenshipPaths };
