# Adonis v2 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Vite + React, extract design system, implement protocol interface and registry, build state model with migration, and render a working app shell that looks identical to the current app.html but is modular.

**Architecture:** Vite + React with ES modules. Design system extracted to `src/design/`. Protocol interface defined as a contract in `src/protocols/`. State stored in a React context with localStorage persistence and 500ms debounce (same as current). One-time migration reads `adonis_v1` and maps to new structure.

**Tech Stack:** Vite 6, React 18, @supabase/supabase-js, vitest for testing.

**Spec:** `docs/superpowers/specs/2026-04-05-adonis-v2-protocol-engine-design.md`

**Plan Sequence:** This is Plan 1 of 3. Plan 2 covers the Goal Engine + Routine Assembler. Plan 3 covers individual protocol migrations.

---

## Task 1: Vite + React Scaffold

**Files:**
- Create: `vite.config.js`
- Create: `index.html` (Vite entry — NOT the landing page)
- Create: `src/main.jsx`
- Create: `src/app/App.jsx`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `vercel.json`

- [ ] **Step 1: Install Vite and React dependencies**

Run:
```bash
npm install react react-dom @supabase/supabase-js
npm install -D vite @vitejs/plugin-react vitest jsdom
```

- [ ] **Step 2: Create vite.config.js**

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 3: Create Vite entry HTML**

```html
<!-- index.html (project root — Vite entry point) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#060709" />
  <link rel="manifest" href="/manifest.json" />
  <title>Adonis</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.jsx**

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Create src/app/App.jsx (minimal shell)**

```jsx
// src/app/App.jsx
import React from 'react';

export default function App() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#060709", color: "#F5F5F7", position: "fixed", inset: 0 }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: 32, color: "#E8D5B7" }}>
          Adonis
        </h1>
        <p style={{ color: "#5C6070", fontSize: 13 }}>v2 Shell — Foundation loaded</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update package.json scripts**

Add to `scripts` in `package.json`:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Remove the old `"dev": "next dev"` and other next scripts. Keep `"lint"` if desired.

- [ ] **Step 7: Update .gitignore**

Add these lines to `.gitignore`:
```
dist/
node_modules/
.superpowers/
```

- [ ] **Step 8: Update vercel.json for Vite output**

```json
{
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/admin/$1" },
    { "source": "/app.html", "destination": "/public/app.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Note: The `app.html` rewrite keeps the old app accessible at its current URL during migration. The SPA fallback sends all other routes to the new Vite app.

- [ ] **Step 9: Verify the dev server starts**

Run: `npx vite --port 3000`
Expected: Browser at localhost:3000 shows "Adonis — v2 Shell — Foundation loaded" on dark background.

- [ ] **Step 10: Commit**

```bash
git add vite.config.js index.html src/main.jsx src/app/App.jsx package.json .gitignore vercel.json
git commit -m "feat: scaffold Vite + React project with minimal app shell"
```

---

## Task 2: Extract Design System — Theme & Styles

**Files:**
- Create: `src/design/theme.js`
- Create: `src/design/styles.js`
- Create: `src/design/animations.css`
- Test: `src/design/__tests__/theme.test.js`

- [ ] **Step 1: Write the failing test for theme**

```js
// src/design/__tests__/theme.test.js
import { describe, it, expect } from 'vitest';
import { P, FN, FD, FM, grad, gradSub } from '../theme';

describe('theme', () => {
  it('exports color palette P with required keys', () => {
    expect(P.bg).toBe('#060709');
    expect(P.gW).toBe('#E8D5B7');
    expect(P.ok).toBe('#34D399');
    expect(P.err).toBe('#EF4444');
    expect(P.txS).toBeDefined();
    expect(P.txM).toBeDefined();
    expect(P.txD).toBeDefined();
  });

  it('exports font stacks', () => {
    expect(FN).toContain('Outfit');
    expect(FD).toContain('Cormorant Garamond');
    expect(FM).toContain('JetBrains Mono');
  });

  it('exports gradient strings', () => {
    expect(grad).toContain('linear-gradient');
    expect(gradSub).toContain('linear-gradient');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/__tests__/theme.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/design/theme.js**

```js
// src/design/theme.js
// Adonis Design System — Color Palette, Fonts, Gradients
// Extracted from app.html lines 2455-2521

export const FN = "'Outfit', sans-serif";
export const FD = "'Cormorant Garamond', serif";
export const FM = "'JetBrains Mono', monospace";

export const P = {
  bg:   "#060709",
  bgC:  "rgba(14,16,22,0.65)",
  bgE:  "#0F1117",
  bgH:  "#171A24",
  bgA:  "#1E2130",
  bd:   "rgba(232,213,183,0.06)",
  tx:   "#F5F5F7",
  txS:  "#E0E0E4",
  txM:  "#9CA3AF",
  txD:  "#5C6070",
  gW:   "#E8D5B7",
  gM:   "#D4C4AA",
  gC:   "#B8C4D0",
  gI:   "#A8BCD0",
  ok:   "#34D399",
  warn: "#FBBF24",
  info: "#60A5FA",
  err:  "#EF4444",
};

export const grad = "linear-gradient(135deg,#E8D5B7 0%,#C9B89A 40%,#B8C4D0 100%)";
export const gradSub = "linear-gradient(135deg,rgba(232,213,183,0.06),rgba(184,196,208,0.03))";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design/__tests__/theme.test.js`
Expected: PASS

- [ ] **Step 5: Create src/design/styles.js**

```js
// src/design/styles.js
// Adonis Design System — Shared Component Styles
// Extracted from app.html lines 4030-4039

import { P, FN, FM, grad } from './theme';

export const s = {
  card: {
    background: "rgba(14,16,22,0.55)",
    backdropFilter: "blur(40px)",
    WebkitBackdropFilter: "blur(40px)",
    borderRadius: 18,
    border: "1px solid rgba(232,213,183,0.05)",
    padding: 22,
    boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 1px 0 0 rgba(255,255,255,0.02) inset, 0 0 0 0.5px rgba(232,213,183,0.03)",
    transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
  },
  btn: {
    fontFamily: FN,
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    borderRadius: 12,
    padding: "13px 24px",
    cursor: "pointer",
    transition: "all .35s cubic-bezier(0.34,1.56,0.64,1)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    letterSpacing: 0.4,
    minHeight: 44,
  },
  pri: {
    background: grad,
    color: "#0A0B0E",
    fontWeight: 700,
  },
  out: {
    background: "rgba(232,213,183,0.03)",
    color: P.txS,
    border: "1px solid rgba(232,213,183,0.08)",
    backdropFilter: "blur(20px)",
  },
  inp: {
    fontFamily: FM,
    fontSize: 13,
    background: "rgba(12,14,20,0.9)",
    border: "1.5px solid rgba(232,213,183,0.06)",
    borderRadius: 14,
    padding: "14px 18px",
    color: P.tx,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "all .35s cubic-bezier(0.34,1.56,0.64,1)",
    letterSpacing: 0.5,
    minHeight: 44,
  },
  lab: {
    fontFamily: FN,
    fontSize: 8,
    fontWeight: 700,
    color: P.txD,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    display: "block",
  },
  tag: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 2,
    padding: "4px 10px",
    borderRadius: 100,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  sel: {
    fontFamily: FN,
    fontSize: 13,
    background: "rgba(12,14,20,0.9)",
    border: "1.5px solid rgba(232,213,183,0.06)",
    borderRadius: 14,
    padding: "14px 18px",
    color: P.tx,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "all .35s",
    letterSpacing: 0.3,
    minHeight: 44,
    WebkitAppearance: "none",
  },
};
```

- [ ] **Step 6: Create src/design/animations.css**

```css
/* src/design/animations.css */
/* Adonis Design System — Animations & Micro-Interactions */
/* Extracted from app.html TRANSITION_CSS (lines 2540-2619) */

@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

* { touch-action: manipulation; }
input, select, textarea { font-size: 16px !important; -webkit-text-size-adjust: 100%; }
@media (min-width: 420px) { input, select, textarea { font-size: inherit !important; } }

@keyframes springIn {
  0% { opacity:0; transform:translateY(32px) scale(0.96); }
  40% { opacity:1; transform:translateY(-4px) scale(1.005); }
  70% { transform:translateY(2px) scale(0.998); }
  100% { opacity:1; transform:translateY(0) scale(1); }
}

@keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(232,213,183,0); } 50% { box-shadow: 0 0 20px 4px rgba(232,213,183,0.08); } }
@keyframes countUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
@keyframes slideInLeft { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
@keyframes ripple { 0% { transform:scale(0.8); opacity:0.5; } 100% { transform:scale(2.5); opacity:0; } }
@keyframes breathe { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
@keyframes popIn { 0% { transform:scale(0); opacity:0; } 60% { transform:scale(1.15); } 100% { transform:scale(1); opacity:1; } }
@keyframes checkDraw { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }

.adn-stat-pop { animation: countUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.adn-stat-pop:nth-child(2) { animation-delay: 0.08s; }
.adn-stat-pop:nth-child(3) { animation-delay: 0.16s; }
.adn-stat-pop:nth-child(4) { animation-delay: 0.24s; }

.adn-card-press { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
.adn-card-press:active { transform: scale(0.97); filter: brightness(0.95); }

.adn-check-draw svg polyline { stroke-dasharray: 20; stroke-dashoffset: 20; animation: checkDraw 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }

.adn-check-ripple { position: relative; overflow: hidden; }
.adn-check-ripple::after { content:''; position:absolute; inset:0; background:radial-gradient(circle at var(--rx,50%) var(--ry,50%), rgba(52,211,153,0.08) 0%, transparent 60%); opacity:0; transition: opacity 0.5s; pointer-events:none; }
.adn-check-ripple.checked::after { opacity:1; }

.adn-shimmer { background: linear-gradient(90deg, transparent, rgba(232,213,183,0.04), transparent); background-size: 200% 100%; animation: shimmer 2s ease-in-out infinite; }

.adn-nav-item { position: relative; }
.adn-nav-item.active::before { content:''; position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:32px; height:32px; border-radius:50%; background:radial-gradient(circle, rgba(232,213,183,0.06) 0%, transparent 70%); pointer-events:none; animation: breathe 3s ease-in-out infinite; }

.adn-tab-indicator { position: relative; }
.adn-tab-indicator::after { content:''; position:absolute; bottom:0; left:15%; right:15%; height:2.5px; border-radius:2px; background:var(--tab-color, rgba(232,213,183,0.4)); box-shadow: 0 0 12px var(--tab-glow, rgba(232,213,183,0.15)); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }

.adn-reveal { animation: slideInRight 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.adn-reveal:nth-child(odd) { animation-name: slideInLeft; }

.adn-ambient-orb { position:fixed; border-radius:50%; pointer-events:none; filter:blur(60px); transition:background 1.2s ease; will-change:transform; }

.adn-parallax-slow { will-change: transform; transition: transform 0.1s linear; }

@keyframes particleFloat { 0%,100% { transform: translateY(0) translateX(0); opacity:0.4; } 25% { transform: translateY(-30px) translateX(15px); opacity:0.85; } 50% { transform: translateY(-12px) translateX(-12px); opacity:0.5; } 75% { transform: translateY(-35px) translateX(8px); opacity:0.7; } }
@keyframes particleDrift { 0%,100% { transform: translateY(0) rotate(0deg); opacity:0.35; } 50% { transform: translateY(-40px) rotate(180deg); opacity:0.8; } }
@keyframes orbFloat { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(25px,-30px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(0.9); } }

.adn-particle { position:fixed; border-radius:50%; pointer-events:none; box-shadow: 0 0 6px currentColor; }
.adn-particle-1 { width:5px; height:5px; animation: particleFloat 8s ease-in-out infinite; }
.adn-particle-2 { width:4px; height:4px; animation: particleFloat 12s ease-in-out infinite 2s; }
.adn-particle-3 { width:6px; height:6px; animation: particleDrift 15s ease-in-out infinite 1s; }
.adn-particle-4 { width:4px; height:4px; animation: particleFloat 10s ease-in-out infinite 4s; }
.adn-particle-5 { width:5px; height:5px; animation: particleDrift 11s ease-in-out infinite 3s; }

/* Noise texture overlay */
.adn-noise::before { content:''; position:fixed; inset:0; z-index:9999; pointer-events:none; opacity:0.015; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

/* Celebration mode */
.adn-celebrate { animation: pulseGlow 2s ease-in-out 3; }
```

- [ ] **Step 7: Commit**

```bash
git add src/design/
git commit -m "feat: extract design system — theme, styles, animations from app.html"
```

---

## Task 3: Extract Design System — Shared Components

**Files:**
- Create: `src/design/components/GradText.jsx`
- Create: `src/design/components/H.jsx`
- Create: `src/design/components/index.js`
- Test: `src/design/__tests__/components.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/design/__tests__/components.test.jsx
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GradText, H } from '../components';

describe('GradText', () => {
  it('renders children with gradient text style', () => {
    const html = renderToStaticMarkup(<GradText>Hello</GradText>);
    expect(html).toContain('Hello');
    expect(html).toContain('linear-gradient');
  });
});

describe('H (section header)', () => {
  it('renders title', () => {
    const html = renderToStaticMarkup(<H t="My Title" />);
    expect(html).toContain('My Title');
  });

  it('renders subtitle when provided', () => {
    const html = renderToStaticMarkup(<H t="Title" sub="Subtitle" />);
    expect(html).toContain('Subtitle');
  });

  it('omits subtitle when not provided', () => {
    const html = renderToStaticMarkup(<H t="Title" />);
    expect(html).not.toContain('<p');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/__tests__/components.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create GradText component**

```jsx
// src/design/components/GradText.jsx
import React from 'react';

export default function GradText({ children, style = {} }) {
  return (
    <span style={{
      background: "linear-gradient(135deg,#E8D5B7 0%,#D4C4AA 35%,#C0B8A0 60%,#B8C4D0 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      ...style,
    }}>
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Create H (section header) component**

```jsx
// src/design/components/H.jsx
import React from 'react';
import { FD, P } from '../theme';

export default function H({ t, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontFamily: FD,
        fontSize: 28,
        fontWeight: 300,
        margin: "0 0 6px",
        letterSpacing: 0.5,
        lineHeight: 1.15,
      }}>
        {t}
      </h2>
      {sub && (
        <p style={{
          color: P.txD,
          margin: 0,
          fontSize: 12,
          letterSpacing: 0.4,
          fontWeight: 300,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create barrel export**

```js
// src/design/components/index.js
export { default as GradText } from './GradText';
export { default as H } from './H';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/design/__tests__/components.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/design/components/ src/design/__tests__/components.test.jsx
git commit -m "feat: extract GradText and H shared components from app.html"
```

---

## Task 4: Constants — Domains, Categories, Days

**Files:**
- Create: `src/design/constants.js`
- Test: `src/design/__tests__/constants.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/design/__tests__/constants.test.js
import { describe, it, expect } from 'vitest';
import { DOMAINS, DAYS, DS, CAT_COLORS, CAT_ICONS, TAB_VIBES, SUB_TIERS } from '../constants';

describe('DOMAINS', () => {
  it('has 8 domains', () => {
    expect(DOMAINS).toHaveLength(8);
  });

  it('includes travel domain (not citizenship)', () => {
    const travel = DOMAINS.find(d => d.id === 'travel');
    expect(travel).toBeDefined();
    expect(travel.name).toBe('Travel');
    const citizenship = DOMAINS.find(d => d.id === 'citizenship');
    expect(citizenship).toBeUndefined();
  });

  it('each domain has id, icon, name, sub, desc', () => {
    for (const d of DOMAINS) {
      expect(d.id).toBeDefined();
      expect(d.icon).toBeDefined();
      expect(d.name).toBeDefined();
      expect(d.sub).toBeDefined();
      expect(d.desc).toBeDefined();
    }
  });
});

describe('DAYS', () => {
  it('has 7 full day names starting with Sunday', () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0]).toBe('Sunday');
    expect(DAYS[6]).toBe('Saturday');
  });
});

describe('DS (short days)', () => {
  it('has 7 single-letter abbreviations', () => {
    expect(DS).toHaveLength(7);
    expect(DS[0]).toBe('S');
    expect(DS[1]).toBe('M');
  });
});

describe('SUB_TIERS', () => {
  it('has free, pro, elite tiers with price and features', () => {
    expect(SUB_TIERS.free).toBeDefined();
    expect(SUB_TIERS.pro.price).toBe(14.99);
    expect(SUB_TIERS.elite.price).toBe(29.99);
    expect(SUB_TIERS.pro.features.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/__tests__/constants.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/design/constants.js**

```js
// src/design/constants.js
// Adonis constants — domains, days, categories, tiers
// Extracted from app.html lines 176-185, 666-684, 1504-1505, 667-683

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
    name: "Free",
    price: 0,
    color: "#9CA3AF",
    features: ["1 active goal (Body)", "Basic workout protocol", "Food logging", "Weight tracking"],
  },
  pro: {
    name: "Pro",
    price: 14.99,
    color: "#E8D5B7",
    features: ["All domains unlocked", "Unlimited goals", "Guided tasks", "Product recommendations", "Cross-domain goals", "Smart load balancing", "Ambassador access"],
  },
  elite: {
    name: "Elite",
    price: 29.99,
    color: "#B8C4D0",
    features: ["Everything in Pro", "Automated actions", "AI-generated goals", "Premium peptide protocols", "Adaptive intensity", "Bucket list AI", "Priority support"],
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/design/__tests__/constants.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/design/constants.js src/design/__tests__/constants.test.js
git commit -m "feat: extract constants — domains, days, categories, tiers from app.html"
```

---

## Task 5: Protocol Interface & Registry

**Files:**
- Create: `src/protocols/protocol-interface.js`
- Create: `src/protocols/registry.js`
- Test: `src/protocols/__tests__/registry.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/protocols/__tests__/registry.test.js
import { describe, it, expect } from 'vitest';
import { registerProtocol, matchProtocols, getByDomain, getAllProtocols } from '../registry';
import { validateProtocol } from '../protocol-interface';

const mockProtocol = {
  id: 'test-workout',
  domain: 'body',
  name: 'Test Workout',
  icon: '\u{1F4AA}',
  canServe: (goal) => goal.domain === 'body' && goal.title.toLowerCase().includes('lose'),
  getState: () => ({ phase: 'foundation', progress: 0, weekNumber: 1 }),
  getTasks: () => [],
  getAutomations: () => [],
  getRecommendations: () => [],
  getUpsells: () => [],
  View: () => null,
};

describe('validateProtocol', () => {
  it('returns true for a valid protocol', () => {
    expect(validateProtocol(mockProtocol)).toBe(true);
  });

  it('returns false if id is missing', () => {
    const bad = { ...mockProtocol, id: undefined };
    expect(validateProtocol(bad)).toBe(false);
  });

  it('returns false if getTasks is missing', () => {
    const bad = { ...mockProtocol, getTasks: undefined };
    expect(validateProtocol(bad)).toBe(false);
  });
});

describe('registry', () => {
  it('registers and retrieves protocols', () => {
    registerProtocol(mockProtocol);
    const all = getAllProtocols();
    expect(all.find(p => p.id === 'test-workout')).toBeDefined();
  });

  it('matches protocols to goals', () => {
    registerProtocol(mockProtocol);
    const goal = { domain: 'body', title: 'Lose 30lbs' };
    const matches = matchProtocols(goal);
    expect(matches.find(p => p.id === 'test-workout')).toBeDefined();
  });

  it('does not match protocols to unrelated goals', () => {
    registerProtocol(mockProtocol);
    const goal = { domain: 'money', title: 'Build credit' };
    const matches = matchProtocols(goal);
    expect(matches.find(p => p.id === 'test-workout')).toBeUndefined();
  });

  it('gets protocols by domain', () => {
    registerProtocol(mockProtocol);
    const body = getByDomain('body');
    expect(body.find(p => p.id === 'test-workout')).toBeDefined();
    const money = getByDomain('money');
    expect(money.find(p => p.id === 'test-workout')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/protocols/__tests__/registry.test.js`
Expected: FAIL — modules not found

- [ ] **Step 3: Create src/protocols/protocol-interface.js**

```js
// src/protocols/protocol-interface.js
// The contract every Adonis protocol must implement.

/**
 * Required fields for a valid protocol:
 *
 * id: string              — unique identifier
 * domain: string          — which domain (body, money, travel, etc.)
 * name: string            — display name
 * icon: string            — emoji or icon
 * canServe(goal): bool    — can this protocol help with this goal?
 * getState(profile, logs, goal): object — current state relative to goal
 * getTasks(state, profile, day): Task[] — today's tasks
 * getAutomations(state, profile): Automation[] — background automations
 * getRecommendations(state, profile, goal): Recommendation[] — products/services
 * getUpsells(state, profile, goal): Upsell[] — upgrade triggers
 * View: React component   — the domain tab UI
 */

const REQUIRED_FIELDS = ['id', 'domain', 'name', 'icon'];
const REQUIRED_METHODS = ['canServe', 'getState', 'getTasks', 'getAutomations', 'getRecommendations', 'getUpsells'];

export function validateProtocol(protocol) {
  if (!protocol) return false;
  for (const field of REQUIRED_FIELDS) {
    if (!protocol[field]) return false;
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof protocol[method] !== 'function') return false;
  }
  return true;
}
```

- [ ] **Step 4: Create src/protocols/registry.js**

```js
// src/protocols/registry.js
// Protocol registry — collects all protocols, matches them to goals.

import { validateProtocol } from './protocol-interface';

const protocols = [];

export function registerProtocol(protocol) {
  if (!validateProtocol(protocol)) {
    console.error(`Invalid protocol: ${protocol?.id || 'unknown'} — missing required fields or methods.`);
    return;
  }
  if (protocols.find(p => p.id === protocol.id)) return;
  protocols.push(protocol);
}

export function getAllProtocols() {
  return protocols;
}

export function matchProtocols(goal) {
  return protocols.filter(p => p.canServe(goal));
}

export function getByDomain(domainId) {
  return protocols.filter(p => p.domain === domainId);
}

export function getProtocol(id) {
  return protocols.find(p => p.id === id) || null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/protocols/__tests__/registry.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/protocols/
git commit -m "feat: implement protocol interface contract and registry"
```

---

## Task 6: State Model & Store

**Files:**
- Create: `src/state/store.jsx`
- Create: `src/state/defaults.js`
- Test: `src/state/__tests__/store.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/state/__tests__/store.test.jsx
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { StateProvider, useAppState } from '../store';
import { DEFAULT_STATE } from '../defaults';

// Need to install @testing-library/react for this
// npm install -D @testing-library/react

function wrapper({ children }) {
  return <StateProvider>{children}</StateProvider>;
}

describe('useAppState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default state when localStorage is empty', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.profile.tier).toBe('free');
    expect(result.current.state.goals).toEqual([]);
  });

  it('updates profile via setProfile', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setProfile({ name: 'Jorrel', weight: '210' });
    });
    expect(result.current.state.profile.name).toBe('Jorrel');
    expect(result.current.state.profile.weight).toBe('210');
  });

  it('adds a goal via addGoal', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.addGoal({
        title: 'Lose 30lbs',
        domain: 'body',
        type: 'template',
        target: { metric: 'weight', from: 210, to: 180 },
        deadline: '2026-08-01',
      });
    });
    expect(result.current.state.goals).toHaveLength(1);
    expect(result.current.state.goals[0].title).toBe('Lose 30lbs');
    expect(result.current.state.goals[0].status).toBe('active');
    expect(result.current.state.goals[0].id).toBeDefined();
  });

  it('updates protocol state via setProtocolState', () => {
    const { result } = renderHook(() => useAppState(), { wrapper });
    act(() => {
      result.current.setProtocolState('workout', { phase: 'hypertrophy', weekNumber: 5 });
    });
    expect(result.current.state.protocolState.workout.phase).toBe('hypertrophy');
  });
});
```

- [ ] **Step 2: Install test dependency and run to verify it fails**

Run:
```bash
npm install -D @testing-library/react
npx vitest run src/state/__tests__/store.test.jsx
```
Expected: FAIL — modules not found

- [ ] **Step 3: Create src/state/defaults.js**

```js
// src/state/defaults.js
// Default state for a new Adonis user.

export const DEFAULT_STATE = {
  profile: {
    name: '',
    age: '',
    gender: '',
    weight: '',
    goalW: '',
    hFt: '',
    hIn: '',
    activity: '',
    trainPref: 'morning',
    equipment: 'gym',
    domains: ['body'],
    tier: 'free',
  },

  goals: [],

  protocolState: {},

  logs: {
    checkins: {},
    weight: [],
    food: {},
    exercise: [],
    routine: {},
  },

  automations: {},

  revenue: {
    lifetime: 0,
    thisMonth: 0,
    byGoal: {},
    byType: { direct: 0, affiliate: 0 },
  },

  settings: {
    workSchedule: { enabled: false, mode: 'employee', schedule: {} },
    notifications: true,
    routineCapacity: 'normal',
  },
};
```

- [ ] **Step 4: Create src/state/store.jsx**

```jsx
// src/state/store.jsx
// Central state store with React context + localStorage persistence.
// Replaces the adonis_v1 localStorage blob and setProf() pattern.

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_STATE } from './defaults';

const STORAGE_KEY = 'adonis_v2';
const DEBOUNCE_MS = 500;

const StateContext = createContext(null);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, profile: { ...DEFAULT_STATE.profile, ...parsed.profile }, logs: { ...DEFAULT_STATE.logs, ...parsed.logs }, settings: { ...DEFAULT_STATE.settings, ...parsed.settings } };
  } catch {
    return DEFAULT_STATE;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };

    case 'ADD_GOAL':
      return { ...state, goals: [...state.goals, {
        id: 'goal_' + Date.now().toString(36),
        status: 'active',
        priority: state.goals.length + 1,
        activeProtocols: [],
        progress: { percent: 0, current: null, trend: 'on_track', projectedCompletion: null },
        revenue: { total: 0, items: [] },
        createdAt: new Date().toISOString().slice(0, 10),
        ...action.payload,
      }]};

    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g) };

    case 'REMOVE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };

    case 'SET_PROTOCOL_STATE':
      return { ...state, protocolState: { ...state.protocolState, [action.payload.id]: { ...state.protocolState[action.payload.id], ...action.payload.data } } };

    case 'LOG':
      return { ...state, logs: { ...state.logs, [action.payload.key]: action.payload.merge ? { ...state.logs[action.payload.key], ...action.payload.data } : action.payload.data } };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'REPLACE_STATE':
      return { ...DEFAULT_STATE, ...action.payload };

    default:
      return state;
  }
}

export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [state]);

  const setProfile = useCallback((data) => dispatch({ type: 'SET_PROFILE', payload: data }), []);
  const addGoal = useCallback((data) => dispatch({ type: 'ADD_GOAL', payload: data }), []);
  const updateGoal = useCallback((data) => dispatch({ type: 'UPDATE_GOAL', payload: data }), []);
  const removeGoal = useCallback((id) => dispatch({ type: 'REMOVE_GOAL', payload: id }), []);
  const setProtocolState = useCallback((id, data) => dispatch({ type: 'SET_PROTOCOL_STATE', payload: { id, data } }), []);
  const log = useCallback((key, data, merge = false) => dispatch({ type: 'LOG', payload: { key, data, merge } }), []);
  const setSettings = useCallback((data) => dispatch({ type: 'SET_SETTINGS', payload: data }), []);
  const replaceState = useCallback((data) => dispatch({ type: 'REPLACE_STATE', payload: data }), []);

  const value = {
    state,
    setProfile,
    addGoal,
    updateGoal,
    removeGoal,
    setProtocolState,
    log,
    setSettings,
    replaceState,
  };

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within StateProvider');
  return ctx;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/state/__tests__/store.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/state/
git commit -m "feat: implement state store with React context, reducer, localStorage persistence"
```

---

## Task 7: State Migration (adonis_v1 → adonis_v2)

**Files:**
- Create: `src/state/migration.js`
- Test: `src/state/__tests__/migration.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/state/__tests__/migration.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { migrateV1ToV2 } from '../migration';

const MOCK_V1 = {
  prof: {
    name: 'Jorrel',
    age: '40',
    gender: 'Male',
    weight: '210',
    goalW: '185',
    hFt: '5',
    hIn: '10',
    activity: 'active',
    primary: 'Muscle Gain',
    secondary: 'Fat Loss',
    goals: ['Muscle Gain', 'Fat Loss'],
    domains: ['body', 'money', 'image'],
    trainPref: 'morning',
  },
  subTier: 'pro',
  wkLogs: { 'Muscle Gain|7|1|Bench Press|0': { weight: '225', reps: '5' } },
  wkPRs: { 'Muscle Gain|Bench Press': { weight: 225, reps: 5 } },
  foodLogs: { '2026-04-04': [{ name: 'Chicken Breast', cal: 280, p: 53, c: 0, f: 6 }] },
  weightLog: [{ date: '2026-04-04', weight: 210 }],
  checkins: { '2026-04-04': { mood: 4, energy: 3 } },
  checkedR: { '4-peptide-0': true, '4-morning-1': true },
  activePeps: [{ id: 9, name: 'Tirzepatide 30mg' }],
};

describe('migrateV1ToV2', () => {
  beforeEach(() => { localStorage.clear(); });

  it('migrates profile fields', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.profile.name).toBe('Jorrel');
    expect(v2.profile.weight).toBe('210');
    expect(v2.profile.tier).toBe('pro');
    expect(v2.profile.domains).toEqual(['body', 'money', 'image']);
  });

  it('migrates weight log', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.weight).toEqual([{ date: '2026-04-04', weight: 210 }]);
  });

  it('migrates food logs', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.food['2026-04-04']).toHaveLength(1);
    expect(v2.logs.food['2026-04-04'][0].name).toBe('Chicken Breast');
  });

  it('migrates checkins', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.logs.checkins['2026-04-04'].mood).toBe(4);
  });

  it('migrates active peptides to protocol state', () => {
    const v2 = migrateV1ToV2(MOCK_V1);
    expect(v2.protocolState.peptides.activePeptides).toHaveLength(1);
    expect(v2.protocolState.peptides.activePeptides[0].name).toBe('Tirzepatide 30mg');
  });

  it('returns null if no v1 data exists', () => {
    const v2 = migrateV1ToV2(null);
    expect(v2).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/__tests__/migration.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/state/migration.js**

```js
// src/state/migration.js
// One-time migration from adonis_v1 localStorage blob to adonis_v2 structure.

import { DEFAULT_STATE } from './defaults';

export function migrateV1ToV2(v1) {
  if (!v1) return null;

  const prof = v1.prof || {};

  const v2 = {
    ...DEFAULT_STATE,

    profile: {
      ...DEFAULT_STATE.profile,
      name: prof.name || '',
      age: prof.age || '',
      gender: prof.gender || '',
      weight: prof.weight || '',
      goalW: prof.goalW || '',
      hFt: prof.hFt || '',
      hIn: prof.hIn || '',
      activity: prof.activity || '',
      trainPref: prof.trainPref || 'morning',
      equipment: prof.equipment || 'gym',
      domains: prof.domains || ['body'],
      tier: v1.subTier || 'free',
    },

    goals: [],

    protocolState: {},

    logs: {
      checkins: v1.checkins || {},
      weight: v1.weightLog || [],
      food: v1.foodLogs || {},
      exercise: migrateExerciseLogs(v1.wkLogs, v1.wkPRs),
      routine: migrateRoutineChecks(v1.checkedR),
    },
  };

  if (v1.activePeps && v1.activePeps.length > 0) {
    v2.protocolState.peptides = {
      activePeptides: v1.activePeps,
    };
  }

  return v2;
}

function migrateExerciseLogs(wkLogs, wkPRs) {
  if (!wkLogs) return [];
  const logs = [];
  for (const [key, data] of Object.entries(wkLogs)) {
    const parts = key.split('|');
    if (parts.length >= 4) {
      logs.push({
        goal: parts[0],
        week: parseInt(parts[1]) || 0,
        dayIdx: parseInt(parts[2]) || 0,
        exercise: parts[3],
        setIdx: parseInt(parts[4]) || 0,
        weight: data.weight,
        reps: data.reps,
      });
    }
  }
  return logs;
}

function migrateRoutineChecks(checkedR) {
  if (!checkedR) return {};
  return checkedR;
}

/**
 * Call this once on app startup.
 * Checks if v1 data exists and v2 doesn't, then migrates.
 */
export function runMigrationIfNeeded() {
  const hasV2 = localStorage.getItem('adonis_v2');
  if (hasV2) return null;

  const v1Raw = localStorage.getItem('adonis_v1');
  if (!v1Raw) return null;

  try {
    const v1 = JSON.parse(v1Raw);
    const v2 = migrateV1ToV2(v1);
    if (v2) {
      localStorage.setItem('adonis_v2', JSON.stringify(v2));
      return v2;
    }
  } catch {
    return null;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/__tests__/migration.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/migration.js src/state/__tests__/migration.test.js
git commit -m "feat: implement v1 to v2 state migration"
```

---

## Task 8: Wire Up App Shell with State + Design System

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/app/App.jsx`

- [ ] **Step 1: Update src/main.jsx to import animations and run migration**

```jsx
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { StateProvider } from './state/store';
import { runMigrationIfNeeded } from './state/migration';
import App from './app/App';
import './design/animations.css';

runMigrationIfNeeded();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StateProvider>
      <App />
    </StateProvider>
  </React.StrictMode>
);
```

- [ ] **Step 2: Update App.jsx to use state and design system**

```jsx
// src/app/App.jsx
import React from 'react';
import { useAppState } from '../state/store';
import { P, FN, FD } from '../design/theme';
import { s } from '../design/styles';
import { GradText, H } from '../design/components';
import { DOMAINS, SUB_TIERS } from '../design/constants';

export default function App() {
  const { state, setProfile } = useAppState();
  const { profile } = state;
  const tierInfo = SUB_TIERS[profile.tier] || SUB_TIERS.free;

  return (
    <div className="adn-noise" style={{
      fontFamily: FN,
      background: P.bg,
      color: P.tx,
      position: "fixed",
      inset: 0,
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(14,16,22,0.7)",
            border: "1px solid rgba(232,213,183,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, fontStyle: "italic" }}>
              <GradText>A</GradText>
            </span>
          </div>
          <div>
            <span style={{ fontFamily: FD, fontSize: 16, fontWeight: 300, color: P.txS, fontStyle: "italic" }}>
              Adonis
            </span>
            <div style={{ fontSize: 7, color: P.gW, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 700, opacity: 0.7 }}>
              v2 Foundation
            </div>
          </div>
        </div>

        <H t="Foundation Loaded" sub={`${profile.name || 'New User'} \u00B7 ${tierInfo.name} \u00B7 ${state.goals.length} goals`} />

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Active Domains</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DOMAINS.filter(d => profile.domains.includes(d.id)).map(d => (
              <div key={d.id} style={{ ...s.tag, background: "rgba(232,213,183,0.04)", color: P.txM }}>
                {d.icon} {d.name}
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ ...s.lab }}>Goals</div>
          {state.goals.length === 0 ? (
            <p style={{ color: P.txD, fontSize: 12, margin: 0 }}>No goals yet. Protocol engine ready.</p>
          ) : (
            state.goals.map(g => (
              <div key={g.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.bd}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.txS }}>{g.title}</div>
                <div style={{ fontSize: 10, color: P.txD }}>{g.domain} \u00B7 {g.status}</div>
              </div>
            ))
          )}
        </div>

        <div style={{ ...s.card }}>
          <div style={{ ...s.lab }}>System Status</div>
          <div style={{ fontSize: 11, color: P.txM, lineHeight: 1.8 }}>
            Design system: extracted<br />
            Protocol interface: defined<br />
            State model: active (adonis_v2)<br />
            Migration: {localStorage.getItem('adonis_v1') ? 'v1 data available' : 'no v1 data'}<br />
            Protocols registered: 0 (ready for Plan 2)
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the app renders**

Run: `npx vite --port 3000`
Expected: Browser at localhost:3000 shows the Adonis v2 foundation shell with dark luxury styling, header with "A" logo, domain tags, empty goals card, and system status. Should look visually consistent with the current app's design language.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (theme, components, constants, registry, store, migration).

- [ ] **Step 5: Commit**

```bash
git add src/main.jsx src/app/App.jsx
git commit -m "feat: wire up app shell with state provider, design system, migration"
```

---

## Task 9: Supabase Service

**Files:**
- Create: `src/services/supabase.js`

- [ ] **Step 1: Create src/services/supabase.js**

```js
// src/services/supabase.js
// Supabase client for auth and database sync.
// Credentials are the same as the current app.html.

import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://efuxqrvdkrievbpljlaf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXhxcnZka3JpZXZicGxqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyNjAsImV4cCI6MjA4ODYxNzI2MH0.68LnOw8EvvTx_UUgHo1cuQ-7WuEre7L46AMyDFNAq30';

export const supabase = createClient(SUPA_URL, SUPA_KEY);
```

- [ ] **Step 2: Commit**

```bash
git add src/services/supabase.js
git commit -m "feat: add Supabase client service"
```

---

## Task 10: Final Verification & Clean Up

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run a production build**

Run: `npx vite build`
Expected: Build succeeds, output in `dist/` directory.

- [ ] **Step 3: Preview the production build**

Run: `npx vite preview --port 4000`
Expected: localhost:4000 shows the same foundation shell as dev mode.

- [ ] **Step 4: Verify old app.html is still accessible**

Confirm that `public/app.html` still exists and would be accessible at `/app.html` in production. This ensures existing users aren't broken during migration.

- [ ] **Step 5: Final commit with all files**

```bash
git status
git add -A
git commit -m "chore: foundation plan complete — Vite scaffold, design system, protocol interface, state model, migration"
```
