// src/protocols/body/peptides/injection.js
// Injection sites, syringe types, and syringe options
// Extracted from app.html lines ~295-532

export const INJECTION_SITES = [
  { id: "abdomen_l", name: "Abdomen (Left)", region: "abdomen", icon: "\u2B05\uFE0F" },
  { id: "abdomen_r", name: "Abdomen (Right)", region: "abdomen", icon: "\u27A1\uFE0F" },
  { id: "abdomen_bl", name: "Abdomen (Below Left)", region: "abdomen", icon: "\u2199\uFE0F" },
  { id: "abdomen_br", name: "Abdomen (Below Right)", region: "abdomen", icon: "\u2198\uFE0F" },
  { id: "thigh_l", name: "Thigh (Left)", region: "thigh", icon: "\u{1F9B5}" },
  { id: "thigh_r", name: "Thigh (Right)", region: "thigh", icon: "\u{1F9B5}" },
  { id: "deltoid_l", name: "Deltoid (Left)", region: "arm", icon: "\u{1F4AA}" },
  { id: "deltoid_r", name: "Deltoid (Right)", region: "arm", icon: "\u{1F4AA}" },
  { id: "glute_l", name: "Glute (Left)", region: "glute", icon: "\u{1F351}" },
  { id: "glute_r", name: "Glute (Right)", region: "glute", icon: "\u{1F351}" },
  { id: "love_handle_l", name: "Love Handle (Left)", region: "flank", icon: "\u25C0\uFE0F" },
  { id: "love_handle_r", name: "Love Handle (Right)", region: "flank", icon: "\u25B6\uFE0F" },
];

export const SYRINGE_TYPES = [
  { id: "insulin_100", name: "Insulin Syringe (100 unit / 1mL)", totalUnits: 100, mlPerUnit: 0.01 },
  { id: "insulin_50", name: "Insulin Syringe (50 unit / 0.5mL)", totalUnits: 50, mlPerUnit: 0.01 },
  { id: "insulin_30", name: "Insulin Syringe (30 unit / 0.3mL)", totalUnits: 30, mlPerUnit: 0.01 },
  { id: "tb_3ml", name: "TB Syringe (3mL)", totalUnits: 300, mlPerUnit: 0.01 },
];

export const SYRINGES = [
  { name: "0.3 mL (30u)", u: 30, ml: 0.3, color: "#E8D5B7" },
  { name: "0.5 mL (50u)", u: 50, ml: 0.5, color: "#D4C4AA" },
  { name: "1.0 mL (100u)", u: 100, ml: 1, color: "#B8C4D0" },
];
