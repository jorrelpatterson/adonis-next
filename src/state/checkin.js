export const CHECKIN_FIELDS = [
  { id: "mood", label: "Mood", emoji: ["😞", "😕", "😐", "🙂", "😁"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] },
  { id: "energy", label: "Energy", emoji: ["🪫", "🔋", "⚡", "🔥", "💥"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] },
  { id: "sleep", label: "Sleep Quality", emoji: ["😴", "😪", "🛏️", "😌", "🌙"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] },
  { id: "stress", label: "Stress", emoji: ["😱", "😰", "😤", "😮‍💨", "😎"], colors: ["#34D399", "#E8D5B7", "#D4C4AA", "#9CA3AF", "#6B7280"], inverted: true },
  { id: "appetite", label: "Appetite", emoji: ["🚫", "📉", "😐", "📈", "🍽️"], colors: ["#A8BCD0", "#A8BCD0", "#D4C4AA", "#FBBF24", "#FBBF24"] },
  { id: "skin", label: "Skin Quality", emoji: ["😣", "😕", "😐", "😊", "✨"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] },
  { id: "focus", label: "Mental Clarity", emoji: ["🌫️", "😶‍🌫️", "🤔", "🎯", "🧠"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] },
  { id: "soreness", label: "Soreness", emoji: ["😵", "😣", "😬", "👍", "💪"], colors: ["#6B7280", "#9CA3AF", "#D4C4AA", "#E8D5B7", "#34D399"] }
];

// CHECKIN_METRICS: same data, normalized shape for UI components
export const CHECKIN_METRICS = CHECKIN_FIELDS.map(f => ({
  id: f.id,
  label: f.label,
  emojis: f.emoji,
  colors: f.colors,
  inverted: f.inverted || false,
}));
