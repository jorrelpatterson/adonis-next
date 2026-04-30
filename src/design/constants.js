// src/design/constants.js
export const DOMAINS = [
  { id: "body",          icon: "\u{1F3CB}\uFE0F", name: "Body",        sub: "Peptides, fitness, nutrition, longevity",          desc: "Peptide protocols, workouts, nutrition, weight tracking, body recomposition, and biohacking tools \u2014 all adapting to your deadline.", tabs: ["checkin", "routine", "stack", "food", "insights", "tools"] },
  { id: "money",         icon: "\u{1F4B0}",       name: "Money",       sub: "Credit, income, investing",                        desc: "Credit card stacking, signup bonuses, spend optimization, 5/24 tracking, credit repair, income targets, referral pipeline, and financial automation.", tabs: ["cards"] },
  { id: "travel",        icon: "\u{1F30D}",       name: "Travel",      sub: "Passports, trips, visas, global access",           desc: "Track your path to a second passport. Plan trips, check visa requirements, time travel card signups, and build your global mobility." },
  { id: "mind",          icon: "\u{1F9E0}",       name: "Mind",        sub: "Focus, clarity, mental health",                    desc: "Focus blocks, meditation tracking, cognitive protocols, nootropic stacks, stress management, and mental performance scoring." },
  { id: "image",         icon: "\u2728",           name: "Image",       sub: "Skincare, grooming, wardrobe, presence",           desc: "Skincare protocols, wardrobe capsule, grooming schedules, fragrance rotation, and personal brand optimization.", tabs: ["image"] },
  { id: "community",     icon: "\u{1F91D}",       name: "Community",   sub: "Accountability partners, masterminds",             desc: "Get matched with someone pursuing the same goals. See each other's streaks, share wins, and stay accountable.", tabs: ["social"] },
  { id: "environment",   icon: "\u{1F3E0}",       name: "Environment", sub: "Space, ergonomics, digital life",                  desc: "Living space optimization, workspace ergonomics, sleep environment, air quality, and digital wellness.", tabs: ["environment"] },
  { id: "purpose",       icon: "\u{1F9ED}",       name: "Purpose",     sub: "Meaning, growth, experiences",                     desc: "Bucket list tracker, travel planning, values clarification, life goals, education tracking, and experience logging." },
];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DS = ["S", "M", "T", "W", "T", "F", "S"];

export const CAT_COLORS = {
  morning: "#F59E0B", peptide: "#A855F7", peptide_rec: "#A855F744", skincare: "#EC4899",
  nutrition: "#3B82F6", supplement: "#06B6D4", training: "#E8D5B7", evening: "#D4C4AA",
  work: "#60A5FA", cycle: "#EC4899", income: "#22C55E", travel: "#8B5CF6",
  mind: "#8B5CF6", purpose: "#F59E0B", credit: "#34D399",
};

export const CAT_ICONS = {
  morning: "\u2600\uFE0F", peptide: "\u{1F489}", skincare: "\u2728", nutrition: "\u{1F37D}\uFE0F",
  supplement: "\u{1F48A}", training: "\u{1F3CB}\uFE0F", evening: "\u{1F319}", work: "\u{1F4BC}",
  cycle: "\u{1F319}", income: "\u{1F4B5}", travel: "\u{1F30D}", mind: "\u{1F9E0}",
};

export const TAB_VIBES = {
  checkin:     { glow: "rgba(232,213,183,0.07)", accent: "#E8D5B7", orbColor: "radial-gradient(circle,rgba(232,213,183,0.03),transparent)" },
  routine:     { glow: "rgba(232,213,183,0.07)", accent: "#E8D5B7", orbColor: "radial-gradient(circle,rgba(232,213,183,0.03),transparent)" },
  stack:       { glow: "rgba(168,85,247,0.07)",  accent: "#A855F7", orbColor: "radial-gradient(circle,rgba(168,85,247,0.03),transparent)" },
  workout:     { glow: "rgba(232,213,183,0.07)", accent: "#E8D5B7", orbColor: "radial-gradient(circle,rgba(232,213,183,0.03),transparent)" },
  food:        { glow: "rgba(59,130,246,0.07)",  accent: "#3B82F6", orbColor: "radial-gradient(circle,rgba(59,130,246,0.03),transparent)" },
  tools:       { glow: "rgba(168,85,247,0.07)",  accent: "#A855F7", orbColor: "radial-gradient(circle,rgba(168,85,247,0.03),transparent)" },
  cards:       { glow: "rgba(52,211,153,0.07)",  accent: "#34D399", orbColor: "radial-gradient(circle,rgba(52,211,153,0.03),transparent)" },
  income:      { glow: "rgba(34,197,94,0.07)",   accent: "#22C55E", orbColor: "radial-gradient(circle,rgba(34,197,94,0.03),transparent)" },
  travel:      { glow: "rgba(139,92,246,0.07)",  accent: "#8B5CF6", orbColor: "radial-gradient(circle,rgba(139,92,246,0.03),transparent)" },
  mind:        { glow: "rgba(139,92,246,0.07)",  accent: "#8B5CF6", orbColor: "radial-gradient(circle,rgba(139,92,246,0.03),transparent)" },
  purpose:     { glow: "rgba(245,158,11,0.07)",  accent: "#F59E0B", orbColor: "radial-gradient(circle,rgba(245,158,11,0.03),transparent)" },
  image:       { glow: "rgba(236,72,153,0.07)",  accent: "#EC4899", orbColor: "radial-gradient(circle,rgba(236,72,153,0.03),transparent)" },
  environment: { glow: "rgba(96,165,250,0.07)",  accent: "#60A5FA", orbColor: "radial-gradient(circle,rgba(96,165,250,0.03),transparent)" },
  social:      { glow: "rgba(251,191,36,0.07)",  accent: "#FBBF24", orbColor: "radial-gradient(circle,rgba(251,191,36,0.03),transparent)" },
  insights:    { glow: "rgba(232,213,183,0.07)", accent: "#E8D5B7", orbColor: "radial-gradient(circle,rgba(232,213,183,0.03),transparent)" },
  profile:     { glow: "rgba(232,213,183,0.05)", accent: "#9CA3AF", orbColor: "radial-gradient(circle,rgba(156,163,175,0.02),transparent)" },
};

export const SUB_TIERS = {
  free: {
    name: "Free", price: 0, color: "#9CA3AF",
    features: ["1 active goal (Body)", "Basic workout protocol", "Food logging", "Weight tracking"],
  },
  pro: {
    name: "Pro", price: 14.99, color: "#E8D5B7",
    features: ["All domains unlocked", "Unlimited goals", "Guided tasks", "Product recommendations", "Cross-domain goals", "Smart load balancing", "Ambassador access"],
  },
  elite: {
    name: "Elite", price: 29.99, color: "#B8C4D0",
    features: ["Everything in Pro", "Automated actions", "AI-generated goals", "Premium peptide protocols", "Adaptive intensity", "Bucket list AI", "Priority support"],
  },
};
