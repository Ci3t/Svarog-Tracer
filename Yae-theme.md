# Evanescia — Hellfire Masquerade Theme

> **Theme Key**: `evanescia` | **CSS Class**: `evanescia-theme`  
> **Character**: Evanescia · ID 1505 · HSR Patch 4.3  
> **Path**: Elation (theatrical performance, joy through chaos)  
> **Element**: Physical (kinetic, precise, brutally direct)

---

## Character Research

### Who Is Evanescia?

Evanescia is a 5-star Physical character on the Path of **Elation** — the path of joy, theater, and performance. Her name comes from *evanescent* (Latin: *evanescere* — to vanish, to fade into nothing). She embodies the paradox of explosive physical presence that **disappears like smoke**.

**Equipment lore:**
- **Light Cone "Reforged in Hellfire"** — Intense transformation, CRIT amplification through fire. Imagery: a forge-blast of heat, rebirth in flame, a mask that melts and reforms.
- **Relic "Heart of Phagausa"** — Ancient, devouring energy. "Phagausa" evokes Greek *phagein* (to eat/consume). Her power feeds on destruction.
- **Relic "Lucid Awl"** — Piercing precision. A sharp tool that cuts through clarity.
- **Enemy "God-Devourer Offspring"** — She battles things born of mythological consumption.

### Visual Aesthetic Profile

Evanescia is a **dark theatrical phantom**. She performs on the burning stage of chaos — a phantom dancer at a Venetian hellfire masquerade. Key visual identifiers:

| Element | Visual Signature |
|---|---|
| **Mask** | Venetian half-eye mask, ornate, one side cracked with ember light leaking through |
| **Colors** | Deep void black + theatrical crimson + hellfire orange-amber + ghostly pearl white |
| **Motion** | Leaves dissolving ember trails; strikes that burn then vanish like smoke |
| **Atmosphere** | Dark baroque theater, burning stage curtains, phantom silhouettes |
| **Texture** | Velvet darkness + fractured flame patterns + translucent layered silk |

**Icon**: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/1505.png`  
**Portrait**: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/character_portrait/1505.png`

---

## Color Palette

```
VOID BACKGROUND     #050108    ← Deepest black with faint crimson-purple undertone
SURFACE CARD        #0e0618    ← Deep purple-black card surfaces
─────────────────────────────────────────────────────────────
PRIMARY CRIMSON     #c83050    ← Theatrical crimson (hellfire heart, stage curtains)
PRIMARY SOFT        rgba(200, 48, 80, 0.18)
PRIMARY BORDER      rgba(200, 48, 80, 0.26)
PRIMARY STRONG      rgba(224, 72, 104, 0.48)
─────────────────────────────────────────────────────────────
AMETHYST VIOLET     #8b3aaa    ← Elation path purple (theatrical depth)
HELLFIRE EMBER      #e07030    ← Hot orange-amber (fire transformation)
EMBER SOFT          rgba(224, 112, 48, 0.16)
─────────────────────────────────────────────────────────────
PEARL WHITE         #f8eeff    ← Ghostly pale lavender-white (evanescent quality)
SILVER ROSE         #d4c0dc    ← Rose-silver for secondary text
MUTED MAUVE         #7a6880    ← Dusty mauve (shadows, captions)
TEXT PRIMARY        #f0e8fa    ← Soft lavender-white
```

**Instant-recognition signal**: If you see **deep void black + theatrical rose-red + amber ember glow + pale ghost-white** together, you think Evanescia.

---

## SVG Design Motifs

### Motif 1 — Venetian Ember Mask (card corner decoration)
A half-eye theatrical mask, cracked at the edge with hellfire leaking through the fractures. Sits top-right or bottom-left of cards.

```svg
<!-- Evanescia Ember Mask — 120×80 viewBox -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
  <!-- Mask base shape -->
  <path d="M10,40 Q20,10 60,15 Q100,10 110,40 Q100,55 60,52 Q20,55 10,40 Z"
    fill="none" stroke="rgba(200,48,80,0.5)" stroke-width="1.2"/>
  <!-- Eye cutout -->
  <ellipse cx="60" cy="38" rx="18" ry="10" fill="none"
    stroke="rgba(200,48,80,0.35)" stroke-width="0.8"/>
  <!-- Fracture line left -->
  <path d="M25,35 L18,28 L22,20" fill="none"
    stroke="rgba(224,112,48,0.6)" stroke-width="0.7" stroke-linecap="round"/>
  <!-- Ember leak at fracture -->
  <circle cx="18" cy="28" r="1.8" fill="#e07030" opacity="0.7"/>
  <circle cx="18" cy="28" r="0.9" fill="#f8b060" opacity="0.9"/>
  <!-- Fracture line right -->
  <path d="M95,35 L102,28 L98,20" fill="none"
    stroke="rgba(224,112,48,0.5)" stroke-width="0.7" stroke-linecap="round"/>
  <circle cx="102" cy="28" r="1.5" fill="#e07030" opacity="0.65"/>
  <circle cx="102" cy="28" r="0.7" fill="#f8b060" opacity="0.85"/>
  <!-- Ornamental curls on mask edge -->
  <path d="M10,40 Q5,36 8,30" fill="none" stroke="rgba(200,48,80,0.4)" stroke-width="0.6"/>
  <path d="M110,40 Q115,36 112,30" fill="none" stroke="rgba(200,48,80,0.4)" stroke-width="0.6"/>
  <!-- Center gem / star on bridge -->
  <circle cx="60" cy="18" r="2.5" fill="#c83050" opacity="0.55"/>
  <circle cx="60" cy="18" r="1.2" fill="#f8eeff" opacity="0.8"/>
</svg>
```

### Motif 2 — Rising Ember Particle (card glow / background float)
Single flame droplet that dissolves upward. Used in the animated `EmbersEffect` component.

```svg
<!-- Ember drop — 8×16 viewBox, repeated N times in the component -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 16">
  <path d="M4,14 Q1,10 2,6 Q3,2 4,0 Q5,2 6,6 Q7,10 4,14 Z"
    fill="url(#emberGrad)" opacity="0.85"/>
  <defs>
    <linearGradient id="emberGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#e07030" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#c83050" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#f8eeff" stop-opacity="0"/>
    </linearGradient>
  </defs>
</svg>
```

### Motif 3 — Phantom Wisp (header / navbar decoration)
A sinuous curve that trails off and dissolves — the evanescent signature.

```svg
<!-- Phantom wisp — 160×40 viewBox -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40">
  <path d="M0,20 Q40,5 80,20 Q120,35 160,20"
    fill="none"
    stroke="url(#wispGrad)"
    stroke-width="1.5"
    stroke-linecap="round"/>
  <defs>
    <linearGradient id="wispGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c83050" stop-opacity="0"/>
      <stop offset="30%" stop-color="#c83050" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#8b3aaa" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#e07030" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Trailing dots -->
  <circle cx="40" cy="11" r="1.2" fill="#c83050" opacity="0.5"/>
  <circle cx="80" cy="20" r="1.8" fill="#8b3aaa" opacity="0.65"/>
  <circle cx="80" cy="20" r="0.9" fill="#f8eeff" opacity="0.8"/>
  <circle cx="120" cy="29" r="1.2" fill="#e07030" opacity="0.45"/>
</svg>
```

---

## GSAP Animation Spec

### `ember-rise` — Floating ember particles
```js
// EmbersEffect.jsx — mirrors VoidPetals.jsx pattern
// Creates N ember nodes, each floats up and fades with random horizontal drift
gsap.fromTo(emberEl, {
  y: 0, x: 0, opacity: 0.7, scale: 1,
}, {
  y: -120,
  x: () => gsap.utils.random(-30, 30),
  opacity: 0,
  scale: 0.3,
  duration: gsap.utils.random(2.5, 5),
  ease: "power1.out",
  repeat: -1,
  delay: gsap.utils.random(0, 4),
  repeatDelay: gsap.utils.random(1, 3),
});
```

### `phantom-shimmer` — Card entry animation
```js
// On mount of each .theme-glass-card in evanescia-theme
// A diagonal light sweep that flares and fades (evanescent quality)
gsap.fromTo(".evanescia-theme .theme-glass-card", {
  "--shimmer-x": "-120%",
}, {
  "--shimmer-x": "220%",
  duration: 1.4,
  ease: "power2.inOut",
  stagger: 0.12,
  delay: 0.3,
});
```

### `mask-breathe` — Mask decoration on card corners
```js
// The SVG mask decoration pulses softly
gsap.to(".evanescia-mask-deco", {
  opacity: 0.7,
  filter: "drop-shadow(0 0 6px rgba(200, 48, 80, 0.5))",
  duration: 2.8,
  ease: "sine.inOut",
  yoyo: true,
  repeat: -1,
});
```

---

## Implementation Instructions

### Step 1 — Create the CSS file

Create `src/styles/evanescia-theme.css` with the full CSS from the **CSS Code** section below.

### Step 2 — Import in App.jsx

```jsx
// In src/App.jsx, after the other theme imports:
import "./styles/evanescia-theme.css"; // 🎭 Evanescia Theme
```

### Step 3 — Create the Embers particle component

Create `src/components/snow/EmbersEffect.jsx`:

```jsx
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const EMBER_COUNT = 18;

export default function EmbersEffect() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const embers = Array.from(container.querySelectorAll('.eva-ember-particle'));

    embers.forEach((ember) => {
      const startX = Math.random() * window.innerWidth;
      const startY = window.innerHeight + 20;

      gsap.set(ember, { x: startX, y: startY, opacity: 0 });

      gsap.to(ember, {
        y: startY - gsap.utils.random(100, 320),
        x: startX + gsap.utils.random(-60, 60),
        opacity: gsap.utils.random(0.4, 0.85),
        scale: gsap.utils.random(0.6, 1.4),
        duration: gsap.utils.random(3, 7),
        ease: 'power1.out',
        delay: gsap.utils.random(0, 5),
        repeat: -1,
        repeatDelay: gsap.utils.random(1, 4),
        onRepeat() {
          const nx = Math.random() * window.innerWidth;
          gsap.set(ember, { x: nx, y: startY, opacity: 0 });
        },
      });
    });

    return () => {
      gsap.killTweensOf(embers);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {Array.from({ length: EMBER_COUNT }).map((_, i) => (
        <div
          key={i}
          className="eva-ember-particle absolute"
          style={{ willChange: 'transform, opacity' }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <defs>
              <linearGradient id={`eg${i}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#e07030" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#c83050" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#f8eeff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M4,12 Q1,8 2,5 Q3,1 4,0 Q5,1 6,5 Q7,8 4,12 Z"
              fill={`url(#eg${i})`}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
```

### Step 4 — Add to App.jsx render logic

```jsx
// In src/App.jsx, import:
import EmbersEffect from "./components/snow/EmbersEffect";

// In the render, alongside ArcticSnow / VoidPetals / AstralStars:
{sessionTheme === "evanescia" && <EmbersEffect />}
```

### Step 5 — Register in sessionThemeConfig.js

Add the following entry to the `themeOverrides` object:

```js
evanescia: {
  rootClassName: "evanescia-theme",
  cssVars: {
    "--font-sans": "Outfit, Inter, system-ui, sans-serif",
    "--theme-font-display": "var(--font-sans)",
    "--spacing": "0.25rem",
    "--theme-body-bg": "#050108",
    "--theme-body-gradient":
      "linear-gradient(160deg, #060009 0%, #100316 45%, #06010a 100%)",
    "--theme-text-primary": "#f0e8fa",
    "--theme-text-muted": "#9a8aaa",
    "--theme-text-soft": "#6a5878",
    "--theme-accent": "#c83050",
    "--theme-accent-strong": "#e04068",
    "--theme-accent-soft": "rgba(200, 48, 80, 0.18)",
    "--theme-accent-contrast": "#ffffff",
    "--theme-surface-1": "rgba(22, 10, 30, 0.78)",
    "--theme-surface-2": "rgba(16, 6, 22, 0.7)",
    "--theme-surface-3": "rgba(10, 4, 16, 0.92)",
    "--theme-surface-overlay": "rgba(5, 1, 8, 0.82)",
    "--theme-border-soft": "rgba(200, 48, 80, 0.2)",
    "--theme-border-strong": "rgba(224, 72, 104, 0.42)",
    "--theme-shadow-lg":
      "0 20px 52px rgba(0, 0, 0, 0.68), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    "--theme-shadow-accent": "0 12px 24px rgba(200, 48, 80, 0.24)",
    "--theme-input-bg": "rgba(16, 6, 22, 0.82)",
    "--theme-input-border": "rgba(200, 48, 80, 0.22)",
    "--theme-input-focus": "rgba(200, 48, 80, 0.4)",
    "--theme-modal-overlay": "rgba(5, 1, 8, 0.78)",
    "--theme-modal-surface":
      "linear-gradient(180deg, rgba(18, 8, 26, 0.97), rgba(8, 2, 14, 0.95))",
    "--theme-modal-border": "rgba(200, 48, 80, 0.26)",
    "--theme-modal-shadow":
      "0 32px 96px rgba(0, 0, 0, 0.82), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    "--theme-page-gap": "1.5rem",
    "--theme-section-gap": "1rem",
    "--theme-radius-card": "1rem",
    "--theme-radius-panel": "1.75rem",
    "--theme-radius-modal": "2rem",
    "--theme-page-shell-x": "0.75rem",
    "--theme-page-shell-y": "0.75rem",
    "--theme-card-pad": "1rem",
    "--theme-card-pad-lg": "1.5rem",
    "--theme-hero-pt": "0.5rem",
    "--theme-hero-pb": "0.25rem",
  },
  layout: {
    activeTabTextClass: "text-rose-200",
    inactiveTabTextClass: "text-slate-400 hover:text-rose-200",
    navIndicatorClass:
      "bg-gradient-to-r from-rose-700/45 to-fuchsia-700/45 shadow-lg shadow-rose-700/25",
    navShellStyle: {
      background: "rgba(22, 8, 30, 0.5)",
      borderColor: "rgba(200, 48, 80, 0.28)",
    },
    controlPillStyle: {
      background: "rgba(16, 6, 22, 0.8)",
      borderColor: "rgba(200, 48, 80, 0.32)",
    },
    themeButtonStyle: {
      background: "rgba(10, 4, 16, 0.8)",
      borderColor: "rgba(200, 48, 80, 0.36)",
      color: "#f4b8c8",
      boxShadow: "0 0 12px rgba(200, 48, 80, 0.24)",
    },
    themeMenuStyle: {
      background: "rgba(10, 4, 16, 0.97)",
      borderColor: "rgba(200, 48, 80, 0.28)",
    },
    themeOptionActiveStyles: {
      // Add to existing map:
      evanescia: {
        background: "rgba(200, 48, 80, 0.22)",
        color: "#fde4ec",
        borderColor: "rgba(244, 184, 200, 0.46)",
        boxShadow: "0 0 12px rgba(200, 48, 80, 0.3)",
      },
    },
    exportButtonClass:
      "bg-gradient-to-r from-rose-700 to-fuchsia-700 hover:from-rose-600 hover:to-fuchsia-600 text-white shadow-lg shadow-rose-700/20",
    footerVersionClass: "bg-rose-700/10 text-rose-400 border-rose-700/20",
  },
  liveStats: {
    bannerBackground: "rgba(10, 4, 16, 0.92)",
    borderColor: "rgba(200, 48, 80, 0.25)",
    labelColor: "#9a8aaa",
    onlineColor: "#e07030",
    onlineGlow: "0 0 10px rgba(224, 112, 48, 0.5)",
    activeColor: "#c83050",
    activeGlow: "0 0 10px rgba(200, 48, 80, 0.5)",
    todayColor: "#d4a0dc",
    todayGlow: "0 0 10px rgba(212, 160, 220, 0.4)",
    totalColor: "#f8eeff",
    totalGlow: "0 0 10px rgba(248, 238, 255, 0.3)",
  },
  debugPanel: {
    shellStyle: {
      background: "linear-gradient(to bottom right, rgba(18, 8, 26, 0.92), rgba(10, 4, 16, 0.92))",
      borderColor: "rgba(200, 48, 80, 0.28)",
    },
    headerHoverClass: "hover:bg-rose-900/20",
    titleIconColor: "#e07030",
    titleTextClass: "text-rose-200",
    countBadgeStyle: {
      background: "rgba(200, 48, 80, 0.18)",
      color: "#f4b8c8",
    },
    primaryButtonStyle: { background: "#059669", color: "#ffffff" },
    dangerButtonStyle: { background: "#dc2626", color: "#ffffff" },
    tabActiveStyle: {
      background: "linear-gradient(to right, #8b3aaa, #c83050)",
      color: "#ffffff",
      boxShadow: "0 10px 24px rgba(200, 48, 80, 0.26)",
    },
    tabInactiveStyle: {
      background: "rgba(22, 8, 30, 0.5)",
      color: "#9a8aaa",
    },
    panelSurfaceStyle: {
      background: "rgba(5, 1, 8, 0.5)",
      borderColor: "rgba(200, 48, 80, 0.18)",
    },
    panelTextMuted: "#9a8aaa",
    accentTimeColor: "#c83050",
    altColor: "#e07030",
    modeColor: "#d4a0dc",
    patternColor: "#8b3aaa",
    distributionColor: "#e07030",
    combinedSurfaceStyle: {
      background: "linear-gradient(to right, rgba(200, 48, 80, 0.1), rgba(139, 58, 170, 0.1))",
      borderColor: "rgba(200, 48, 80, 0.28)",
    },
    combinedValueClass: "bg-gradient-to-r from-rose-400 to-fuchsia-400 bg-clip-text text-transparent",
    stats: {
      main: { background: "rgba(34, 197, 94, 0.08)", borderColor: "rgba(34, 197, 94, 0.28)", value: "#4ade80", sub: "#86efac" },
      alt: { background: "rgba(224, 112, 48, 0.1)", borderColor: "rgba(224, 112, 48, 0.28)", value: "#e07030", sub: "#f4a060" },
      miss: { background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.26)", value: "#f87171", sub: "#fca5a5" },
    },
  },
  caverns: {
    toolbarShellStyle: {
      background: "rgba(16, 6, 22, 0.65)",
      borderColor: "rgba(200, 48, 80, 0.16)",
    },
    relicActiveClass: "bg-rose-800 text-white shadow-lg",
    traceActiveClass: "bg-fuchsia-800 text-white shadow-lg",
    inactiveChipClass: "text-slate-500 hover:text-rose-300 hover:bg-rose-900/20",
    addButtonClass:
      "bg-gradient-to-r from-rose-700 to-fuchsia-700 text-white shadow-xl hover:scale-[1.02]",
    rarityActiveClass: "bg-rose-700 text-white scale-105 shadow-md shadow-rose-700/30",
    gridOffsetClass: "mt-6",
  },
  home: {
    backgroundClass: "bg-[#050108] text-rose-50 selection:bg-rose-600/50 selection:text-white",
    backdropImage: "clara-2.png",
    backdropImageClass: "opacity-[0.06] saturate-0 blur-[3px] transform scale-105",
    overlayClass: "bg-gradient-to-b from-[#050108]/80 via-[#050108]/60 to-[#050108]",
    orbPrimaryClass: "bg-rose-800/8",
    orbSecondaryClass: "bg-fuchsia-900/8",
    statusBadgeClass: "bg-rose-950/40 border-rose-900/20 text-rose-100 shadow-[0_0_20px_rgba(200,48,80,0.15)]",
    statusDotClass: "bg-rose-500 shadow-[0_0_10px_#c83050]",
    heroTitleGradientClass: "from-white via-rose-100 to-rose-300",
    typeTextClass: "text-rose-200",
    typeCursorClass: "bg-rose-500/80",
    sublineClass: "text-rose-300/80",
    chipPrimaryClass: "bg-rose-950/30 border-rose-900/10 text-rose-400",
    chipSecondaryClass: "bg-rose-950/20 border-rose-700/20 text-rose-200",
    modeCardClass:
      "bg-rose-950/30 border-rose-900/15 hover:bg-rose-900/30 hover:border-rose-600/40 hover:shadow-[0_8px_32px_rgba(200,48,80,0.15)]",
    modeTitleClass: "text-rose-400",
    modeLabelClass: "text-white group-hover:text-rose-100",
    modeDescClass: "text-slate-400 group-hover:text-slate-300",
    modeGlowClass: "bg-rose-700/15",
    footerBorderClass: "border-rose-900/10",
    footerTextClass: "text-slate-500/80",
    footerMetaClass: "text-slate-400/70",
    footerMetaHoverClass: "hover:text-rose-400",
    footerDiscordClass:
      "bg-rose-950/20 border-rose-900/10 hover:border-rose-600/30 hover:bg-rose-900/30 text-rose-300",
    footerSocietyClass:
      "bg-fuchsia-950/15 border-fuchsia-800/20 hover:border-fuchsia-600/35 hover:bg-fuchsia-900/30 text-fuchsia-200",
    statsTheme: {
      loadingBackground: "linear-gradient(135deg, #100316 0%, #050108 100%)",
      loadingBorder: "1px solid rgba(200, 48, 80, 0.22)",
      loadingLabelColor: "#9a8aaa",
      loadingSpinnerTrack: "rgba(200, 48, 80, 0.1)",
      loadingSpinnerHead: "#c83050",
      cardBackground: "linear-gradient(180deg, rgba(18, 8, 26, 0.92) 0%, rgba(5, 1, 8, 1) 100%)",
      cardBorder: "rgba(200, 48, 80, 0.12)",
      cardShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
      labelColor: "#6a5878",
      valueBaseColor: "#f0e8fa",
      online: { themeColor: "rgba(224, 112, 48, 0.5)", glowColor: "rgba(224, 112, 48, 0.3)", borderColor: "#e07030", valueColor: "#f0904a" },
      prediction: { themeColor: "rgba(200, 48, 80, 0.5)", glowColor: "rgba(200, 48, 80, 0.3)", borderColor: "#c83050", valueColor: "#e06070" },
      today: { themeColor: "rgba(212, 160, 220, 0.5)", glowColor: "rgba(212, 160, 220, 0.3)", borderColor: "#d4a0dc", valueColor: "#e4b8ec" },
      total: { themeColor: "rgba(248, 238, 255, 0.4)", glowColor: "rgba(248, 238, 255, 0.2)", borderColor: "#f8eeff", valueColor: "#f8eeff" },
    },
  },
},
```

### Step 6 — Add to THEME_OPTIONS array

Find the `THEME_OPTIONS` array in `sessionThemeConfig.js` and add:

```js
{ value: "evanescia", label: "Evanescia", emoji: "🎭" },
```

### Step 7 — Add ThemeDecorator SVG

In `src/components/ThemeDecorator.jsx`, inside the `card-top` block, add after the astral section:

```jsx
{/* EVANESCIA EMBER MASK — Only visible in .evanescia-theme */}
<div className="hidden [.evanescia-theme_&]:block absolute inset-0 pointer-events-none z-30 overflow-hidden mix-blend-screen rounded-inherit">
  {/* Top-Right Mask */}
  <svg viewBox="0 0 120 80" className="absolute -top-3 -right-3 w-28 h-20 opacity-40 evanescia-mask-deco">
    <path d="M10,40 Q20,10 60,15 Q100,10 110,40 Q100,55 60,52 Q20,55 10,40 Z"
      fill="none" stroke="rgba(200,48,80,0.55)" strokeWidth="1.2"/>
    <ellipse cx="60" cy="38" rx="18" ry="10"
      fill="none" stroke="rgba(200,48,80,0.35)" strokeWidth="0.8"/>
    <path d="M25,35 L18,28 L22,20"
      fill="none" stroke="rgba(224,112,48,0.65)" strokeWidth="0.7" strokeLinecap="round"/>
    <circle cx="18" cy="28" r="1.8" fill="#e07030" opacity="0.7"/>
    <circle cx="18" cy="28" r="0.9" fill="#f8b060" opacity="0.9"/>
    <path d="M95,35 L102,28 L98,20"
      fill="none" stroke="rgba(224,112,48,0.55)" strokeWidth="0.7" strokeLinecap="round"/>
    <circle cx="102" cy="28" r="1.5" fill="#e07030" opacity="0.65"/>
    <circle cx="102" cy="28" r="0.7" fill="#f8b060" opacity="0.85"/>
    <circle cx="60" cy="18" r="2.5" fill="#c83050" opacity="0.55"/>
    <circle cx="60" cy="18" r="1.2" fill="#f8eeff" opacity="0.8"/>
  </svg>
  {/* Bottom-Left wisp accent */}
  <svg viewBox="0 0 80 50" className="absolute -bottom-2 -left-2 w-20 h-14 opacity-30">
    <path d="M5,40 Q25,15 50,25 Q65,30 75,15"
      fill="none" stroke="rgba(139,58,170,0.6)" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="50" cy="25" r="1.8" fill="#8b3aaa" opacity="0.6"/>
    <circle cx="50" cy="25" r="0.9" fill="#f8eeff" opacity="0.75"/>
    <circle cx="75" cy="15" r="1.2" fill="#e07030" opacity="0.5"/>
  </svg>
</div>
```

### Step 8 — Live Predictor Responsive Checks

In any page that contains the live predictor panel, make sure these Tailwind classes are applied for small screens:

```jsx
// Predictor container — always add these responsive classes:
// grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3
// min-w-0 overflow-hidden
// text-xs sm:text-sm leading-tight
// p-2 sm:p-3 lg:p-4

// For data tables inside predictor:
// overflow-x-auto -mx-1 px-1
// table-auto w-full min-w-[280px]
// [&_td]:py-1 [&_td]:px-2 [&_td]:text-xs sm:[&_td]:text-sm

// Stat pills / confidence badges:
// flex flex-wrap gap-1
// text-[10px] sm:text-xs
```

The `evanescia-theme` CSS also includes responsive overrides for the live predictor panel under `@media (max-width: 640px)`.

---

## Full CSS Code

Save as `src/styles/evanescia-theme.css`:

```css
/* ════════════════════════════════════════════════════════════════
   EVANESCIA — HELLFIRE MASQUERADE THEME
   "Reforged in Hellfire, vanishing like a phantom"
   Character: Evanescia · Path: Elation · Element: Physical
   HSR Patch 4.3 · Theme key: evanescia · Body class: evanescia-theme
   ════════════════════════════════════════════════════════════════ */

/* ── Color Tokens ─────────────────────────────────────────────── */
.evanescia-theme {
  --eva-void:           #050108;
  --eva-surface:        rgba(16, 8, 24, 0.92);
  --eva-crimson:        #c83050;
  --eva-crimson-soft:   rgba(200, 48, 80, 0.18);
  --eva-crimson-border: rgba(200, 48, 80, 0.26);
  --eva-crimson-strong: rgba(224, 72, 104, 0.5);
  --eva-violet:         #8b3aaa;
  --eva-ember:          #e07030;
  --eva-ember-soft:     rgba(224, 112, 48, 0.16);
  --eva-pearl:          #f8eeff;
  --eva-silver:         #d4c0dc;
  --eva-muted:          #7a6880;
  --eva-text:           #f0e8fa;
}

/* ── Root Background ──────────────────────────────────────────── */
body.evanescia-theme,
.evanescia-theme {
  background:
    radial-gradient(ellipse at 15% 12%, rgba(200, 48, 80, 0.08), transparent 28%),
    radial-gradient(ellipse at 85% 8%, rgba(139, 58, 170, 0.07), transparent 22%),
    radial-gradient(ellipse at 50% 90%, rgba(224, 112, 48, 0.05), transparent 30%),
    linear-gradient(160deg, #060009 0%, #100316 45%, #06010a 100%) !important;
  color: var(--eva-text);
  min-height: 100vh;
}

.evanescia-theme .min-h-screen,
.evanescia-theme main,
.evanescia-theme .max-w-\[1920px\],
.evanescia-theme .Layout_wrapper,
.evanescia-theme .modern-kiyo-page {
  background: transparent !important;
  position: relative;
  z-index: 10;
}

/* ── Typography ───────────────────────────────────────────────── */
.evanescia-theme h1,
.evanescia-theme h2,
.evanescia-theme h3,
.evanescia-theme h4,
.evanescia-theme h5,
.evanescia-theme h6 {
  letter-spacing: 0.03em;
  color: var(--eva-pearl);
}

/* ── Glass Cards ──────────────────────────────────────────────── */
.evanescia-theme .theme-glass-card,
.evanescia-theme .glacial-header-glass,
.evanescia-theme .eva-panel {
  background:
    linear-gradient(180deg, rgba(22, 8, 32, 0.94), rgba(10, 3, 18, 0.92)) !important;
  border: 1px solid var(--eva-crimson-border) !important;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 0 1px rgba(200, 48, 80, 0.04) !important;
  color: var(--eva-text);
  position: relative;
}

.evanescia-theme .theme-glass-card > div[class*="bg-gradient-to-br"],
.evanescia-theme .theme-glass-card > div[class*="bg-slate-900/90"],
.evanescia-theme .theme-glass-card > div[class*="from-slate-900/90"],
.evanescia-theme .theme-glass-card > div[class*="to-slate-800/90"] {
  background:
    linear-gradient(180deg, rgba(18, 6, 28, 0.97), rgba(8, 2, 14, 0.95)) !important;
  border-color: rgba(200, 48, 80, 0.18) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 10px 28px rgba(0, 0, 0, 0.32) !important;
  border-radius: calc(1.5rem - 6px) !important;
  margin: 0 !important;
}

/* ── Card Corner Mask SVG Decoration ──────────────────────────── */
.evanescia-theme .theme-glass-card::before,
.evanescia-theme .eva-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'%3E%3Cpath d='M10,40 Q20,10 60,15 Q100,10 110,40 Q100,55 60,52 Q20,55 10,40 Z' fill='none' stroke='rgba(200,48,80,0.45)' stroke-width='1.2'/%3E%3Cellipse cx='60' cy='38' rx='18' ry='10' fill='none' stroke='rgba(200,48,80,0.3)' stroke-width='0.8'/%3E%3Cpath d='M25,35 L18,28 L22,20' fill='none' stroke='rgba(224,112,48,0.6)' stroke-width='0.7' stroke-linecap='round'/%3E%3Ccircle cx='18' cy='28' r='1.8' fill='%23e07030' opacity='0.7'/%3E%3Ccircle cx='18' cy='28' r='0.9' fill='%23f8b060' opacity='0.9'/%3E%3Ccircle cx='60' cy='18' r='2.5' fill='%23c83050' opacity='0.5'/%3E%3Ccircle cx='60' cy='18' r='1.2' fill='%23f8eeff' opacity='0.75'/%3E%3C/svg%3E"),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 50'%3E%3Cpath d='M5,40 Q25,15 50,25 Q65,30 75,15' fill='none' stroke='rgba(139,58,170,0.45)' stroke-width='0.9' stroke-linecap='round'/%3E%3Ccircle cx='50' cy='25' r='1.6' fill='%238b3aaa' opacity='0.55'/%3E%3Ccircle cx='50' cy='25' r='0.8' fill='%23f8eeff' opacity='0.7'/%3E%3C/svg%3E"),
    radial-gradient(circle at top right, rgba(200, 48, 80, 0.1), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 35%);
  opacity: 0.75;
  background-position: top -4px right -4px, bottom -4px left -4px, top right, center;
  background-size: 128px 86px, 88px 56px, auto, auto;
  background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;
}

/* ── Card Hover ───────────────────────────────────────────────── */
.evanescia-theme .theme-glass-card:hover {
  border-color: var(--eva-crimson-strong) !important;
  box-shadow:
    0 22px 58px rgba(0, 0, 0, 0.68),
    0 0 26px rgba(200, 48, 80, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
}

/* ── Sub-panels ───────────────────────────────────────────────── */
.evanescia-theme .theme-panel-surface,
.evanescia-theme .theme-subpanel {
  background: rgba(16, 6, 24, 0.75) !important;
  border-color: rgba(200, 48, 80, 0.16) !important;
}

/* ── Header / Navbar ──────────────────────────────────────────── */
.evanescia-theme .glacial-header-glass {
  background:
    linear-gradient(180deg, rgba(12, 4, 20, 0.96), rgba(8, 2, 14, 0.92)) !important;
  border-bottom: 1px solid rgba(200, 48, 80, 0.28) !important;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.025) !important;
}

.evanescia-theme .glacial-header-glass nav {
  background: linear-gradient(180deg, rgba(40, 14, 50, 0.28), rgba(12, 4, 20, 0.94)) !important;
  border-color: rgba(200, 48, 80, 0.24) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 28px rgba(0, 0, 0, 0.28) !important;
}

.evanescia-theme .glacial-header-glass .bg-slate-800\/80,
.evanescia-theme .glacial-header-glass .bg-slate-900\/70,
.evanescia-theme .glacial-header-glass .bg-slate-900\/95 {
  background: linear-gradient(180deg, rgba(40, 14, 50, 0.24), rgba(10, 4, 18, 0.94)) !important;
  border-color: rgba(200, 48, 80, 0.22) !important;
}

.evanescia-theme .glacial-header-glass select,
.evanescia-theme .glacial-header-glass option {
  color: var(--eva-silver) !important;
}

/* ── Modal Overlay ────────────────────────────────────────────── */
.evanescia-theme .modal-overlay {
  background: rgba(5, 1, 8, 0.78) !important;
  backdrop-filter: blur(20px) !important;
}

/* ── Cavern Entry Modal ───────────────────────────────────────── */
.evanescia-theme .cavern-entry-modal {
  background: linear-gradient(180deg, rgba(18, 6, 28, 0.97), rgba(8, 2, 14, 0.95)) !important;
  border: 1px solid rgba(200, 48, 80, 0.28) !important;
  box-shadow:
    0 28px 90px rgba(0, 0, 0, 0.78),
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 40px rgba(200, 48, 80, 0.12) !important;
}

.evanescia-theme .cavern-entry-modal::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'%3E%3Cpath d='M10,40 Q20,10 60,15 Q100,10 110,40 Q100,55 60,52 Q20,55 10,40 Z' fill='none' stroke='rgba(200,48,80,0.42)' stroke-width='1.2'/%3E%3Cellipse cx='60' cy='38' rx='18' ry='10' fill='none' stroke='rgba(200,48,80,0.28)' stroke-width='0.8'/%3E%3Cpath d='M25,35 L18,28 L22,20' fill='none' stroke='rgba(224,112,48,0.58)' stroke-width='0.7' stroke-linecap='round'/%3E%3Ccircle cx='18' cy='28' r='1.8' fill='%23e07030' opacity='0.68'/%3E%3Ccircle cx='18' cy='28' r='0.9' fill='%23f8b060' opacity='0.88'/%3E%3Ccircle cx='60' cy='18' r='2.5' fill='%23c83050' opacity='0.48'/%3E%3Ccircle cx='60' cy='18' r='1.2' fill='%23f8eeff' opacity='0.72'/%3E%3C/svg%3E"),
    radial-gradient(circle at top right, rgba(200, 48, 80, 0.08), transparent 32%);
  background-position: top -6px right -6px, top right;
  background-size: 148px 100px, auto;
  background-repeat: no-repeat, no-repeat;
  opacity: 0.82;
}

.evanescia-theme .cavern-entry-modal > * {
  position: relative;
  z-index: 1;
}

.evanescia-theme .cavern-entry-modal > .bg-white\/5,
.evanescia-theme .cavern-entry-modal [class*="bg-white/[0.03]"],
.evanescia-theme .cavern-entry-modal [class*="bg-white/[0.05]"],
.evanescia-theme .cavern-entry-modal [class*="bg-white/[0.08]"],
.evanescia-theme .cavern-entry-modal [class*="bg-black/40"],
.evanescia-theme .cavern-entry-modal [class*="bg-black/35"],
.evanescia-theme .cavern-entry-modal [class*="bg-black/30"],
.evanescia-theme .cavern-entry-modal [class*="bg-black/25"] {
  background: rgba(14, 5, 22, 0.88) !important;
  border-color: rgba(200, 48, 80, 0.18) !important;
}

.evanescia-theme .cavern-entry-modal .modal-section {
  background: rgba(12, 4, 20, 0.82) !important;
  border-color: rgba(200, 48, 80, 0.15) !important;
}

.evanescia-theme .cavern-entry-modal input,
.evanescia-theme .cavern-entry-modal select,
.evanescia-theme .cavern-entry-modal textarea {
  background: rgba(12, 4, 20, 0.92) !important;
  border-color: rgba(200, 48, 80, 0.22) !important;
  color: var(--eva-text) !important;
}

.evanescia-theme .cavern-entry-modal input::placeholder,
.evanescia-theme .cavern-entry-modal textarea::placeholder {
  color: rgba(122, 104, 128, 0.7) !important;
}

.evanescia-theme .cavern-entry-modal input:focus,
.evanescia-theme .cavern-entry-modal select:focus,
.evanescia-theme .cavern-entry-modal textarea:focus {
  border-color: rgba(200, 48, 80, 0.5) !important;
  box-shadow: 0 0 0 4px rgba(200, 48, 80, 0.12) !important;
}

/* Color overrides in modal */
.evanescia-theme .cavern-entry-modal .text-cyan-300,
.evanescia-theme .cavern-entry-modal .text-cyan-400,
.evanescia-theme .cavern-entry-modal .text-blue-300,
.evanescia-theme .cavern-entry-modal .text-blue-400,
.evanescia-theme .cavern-entry-modal .text-indigo-300,
.evanescia-theme .cavern-entry-modal .text-indigo-400,
.evanescia-theme .cavern-entry-modal .text-purple-300,
.evanescia-theme .cavern-entry-modal .text-purple-400 {
  color: var(--eva-crimson) !important;
}

.evanescia-theme .cavern-entry-modal [class*="bg-cyan-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-cyan-500/20"],
.evanescia-theme .cavern-entry-modal [class*="bg-blue-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-blue-500/20"],
.evanescia-theme .cavern-entry-modal [class*="bg-indigo-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-indigo-500/20"],
.evanescia-theme .cavern-entry-modal [class*="bg-purple-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-purple-500/20"],
.evanescia-theme .cavern-entry-modal [class*="bg-emerald-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-emerald-500/20"] {
  background: rgba(200, 48, 80, 0.14) !important;
  border-color: rgba(200, 48, 80, 0.28) !important;
  box-shadow: none !important;
}

.evanescia-theme .cavern-entry-modal [class*="bg-amber-500/10"],
.evanescia-theme .cavern-entry-modal [class*="bg-orange-500/10"] {
  background: linear-gradient(180deg, #e8743a, #b84e18) !important;
  color: #150802 !important;
  border-color: rgba(248, 180, 96, 0.6) !important;
  box-shadow:
    0 10px 22px rgba(180, 80, 24, 0.26),
    inset 0 1px 0 rgba(255, 248, 240, 0.38) !important;
}

.evanescia-theme .cavern-entry-modal .bg-blue-600,
.evanescia-theme .cavern-entry-modal .bg-indigo-600,
.evanescia-theme .cavern-entry-modal .bg-cyan-500,
.evanescia-theme .cavern-entry-modal .bg-purple-500,
.evanescia-theme .cavern-entry-modal .bg-emerald-500 {
  background: linear-gradient(180deg, #e04068, #9a1c38) !important;
  color: #ffffff !important;
  border-color: rgba(240, 128, 160, 0.55) !important;
}

/* ── Archive Modal ────────────────────────────────────────────── */
.evanescia-theme .archive-modal-shell {
  background: linear-gradient(180deg, rgba(18, 6, 28, 0.98), rgba(6, 1, 12, 0.96)) !important;
  border-color: rgba(200, 48, 80, 0.26) !important;
  box-shadow:
    0 30px 96px rgba(0, 0, 0, 0.82),
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 0 38px rgba(200, 48, 80, 0.12) !important;
}

.evanescia-theme .archive-modal-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, rgba(200, 48, 80, 0.1), transparent 32%),
    radial-gradient(circle at bottom left, rgba(139, 58, 170, 0.07), transparent 26%);
  opacity: 0.9;
}

.evanescia-theme .archive-modal-shell > * {
  position: relative;
  z-index: 1;
}

.evanescia-theme .archive-modal-shell .text-indigo-400,
.evanescia-theme .archive-modal-shell .text-indigo-300,
.evanescia-theme .archive-modal-shell .text-cyan-300,
.evanescia-theme .archive-modal-shell .text-cyan-100,
.evanescia-theme .archive-modal-shell .text-cyan-200,
.evanescia-theme .archive-modal-shell .text-cyan-400,
.evanescia-theme .archive-modal-shell .text-purple-400,
.evanescia-theme .archive-modal-shell .text-blue-400 {
  color: var(--eva-crimson) !important;
}

.evanescia-theme .archive-modal-shell .bg-indigo-600,
.evanescia-theme .archive-modal-shell .bg-cyan-500,
.evanescia-theme .archive-modal-shell .bg-cyan-400 {
  background: linear-gradient(180deg, #e04068, #9a1c38) !important;
  color: #ffffff !important;
  box-shadow:
    0 10px 22px rgba(200, 48, 80, 0.26),
    inset 0 1px 0 rgba(255, 200, 200, 0.3) !important;
}

.evanescia-theme .archive-modal-shell .archive-team-card,
.evanescia-theme .archive-modal-shell .archive-team-stats,
.evanescia-theme .archive-modal-shell [class*="rounded-[1.5rem]"],
.evanescia-theme .archive-modal-shell [class*="rounded-[2rem]"] {
  background: linear-gradient(180deg, rgba(18, 6, 28, 0.94), rgba(10, 3, 18, 0.92)) !important;
  border-color: rgba(200, 48, 80, 0.18) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 14px 28px rgba(0, 0, 0, 0.36) !important;
}

.evanescia-theme .archive-modal-header,
.evanescia-theme .archive-modal-shell .bg-slate-950\/50,
.evanescia-theme .archive-modal-shell .bg-black\/30,
.evanescia-theme .archive-modal-shell .bg-black\/35,
.evanescia-theme .archive-modal-shell .bg-black\/25,
.evanescia-theme .archive-modal-shell .bg-white\/5,
.evanescia-theme .archive-modal-shell .bg-white\/10 {
  background: rgba(12, 4, 20, 0.9) !important;
  border-color: rgba(200, 48, 80, 0.16) !important;
}

/* ── Buttons ──────────────────────────────────────────────────── */
.evanescia-theme .bg-blue-600,
.evanescia-theme .bg-indigo-600,
.evanescia-theme .bg-violet-600,
.evanescia-theme .bg-purple-600 {
  background: linear-gradient(135deg, #8b3aaa, #c83050) !important;
  box-shadow: 0 8px 20px rgba(200, 48, 80, 0.28) !important;
}

.evanescia-theme .bg-cyan-500,
.evanescia-theme .bg-sky-500,
.evanescia-theme .bg-teal-500 {
  background: var(--eva-crimson) !important;
}

/* ── Text Color Overrides ─────────────────────────────────────── */
.evanescia-theme .text-cyan-400,
.evanescia-theme .text-blue-400,
.evanescia-theme .text-indigo-400 {
  color: var(--eva-crimson) !important;
}

.evanescia-theme .text-purple-400,
.evanescia-theme .text-violet-400 {
  color: var(--eva-violet) !important;
}

.evanescia-theme .text-amber-400,
.evanescia-theme .text-orange-400 {
  color: var(--eva-ember) !important;
}

/* ── Border Overrides ─────────────────────────────────────────── */
.evanescia-theme .border-cyan-500\/30,
.evanescia-theme .border-blue-500\/30,
.evanescia-theme .border-indigo-500\/30,
.evanescia-theme .border-purple-500\/30 {
  border-color: var(--eva-crimson-border) !important;
}

/* ── Input / Form Elements ────────────────────────────────────── */
.evanescia-theme input,
.evanescia-theme select,
.evanescia-theme textarea {
  background: rgba(14, 5, 22, 0.82) !important;
  border-color: rgba(200, 48, 80, 0.22) !important;
  color: var(--eva-text) !important;
}

.evanescia-theme input:focus,
.evanescia-theme select:focus,
.evanescia-theme textarea:focus {
  border-color: rgba(200, 48, 80, 0.52) !important;
  box-shadow: 0 0 0 3px rgba(200, 48, 80, 0.14) !important;
  outline: none !important;
}

.evanescia-theme input::placeholder,
.evanescia-theme textarea::placeholder {
  color: var(--eva-muted) !important;
}

/* ── Live Predictor Panel — Responsive ────────────────────────── */
.evanescia-theme .kiyo-predictor-panel,
.evanescia-theme [class*="live-predictor"],
.evanescia-theme [class*="predictor-"] {
  min-width: 0 !important;
  overflow-x: hidden !important;
}

@media (max-width: 640px) {
  .evanescia-theme .kiyo-predictor-panel,
  .evanescia-theme [class*="live-predictor"] {
    padding: 0.5rem !important;
    font-size: 0.75rem !important;
    line-height: 1.3 !important;
  }

  .evanescia-theme .kiyo-predictor-panel table,
  .evanescia-theme [class*="live-predictor"] table {
    font-size: 0.7rem !important;
    width: 100% !important;
  }

  .evanescia-theme .kiyo-predictor-panel td,
  .evanescia-theme .kiyo-predictor-panel th,
  .evanescia-theme [class*="live-predictor"] td,
  .evanescia-theme [class*="live-predictor"] th {
    padding: 0.2rem 0.35rem !important;
    font-size: 0.7rem !important;
    white-space: nowrap !important;
  }

  .evanescia-theme .debug-log-entry {
    flex-direction: column !important;
    gap: 0.2rem !important;
  }

  .evanescia-theme .prediction-badge,
  .evanescia-theme [class*="confidence-badge"] {
    font-size: 0.65rem !important;
    padding: 0.15rem 0.4rem !important;
  }
}

/* ── Scrollbar Styling ────────────────────────────────────────── */
.evanescia-theme ::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.evanescia-theme ::-webkit-scrollbar-track {
  background: rgba(10, 3, 18, 0.5);
}

.evanescia-theme ::-webkit-scrollbar-thumb {
  background: rgba(200, 48, 80, 0.35);
  border-radius: 3px;
}

.evanescia-theme ::-webkit-scrollbar-thumb:hover {
  background: rgba(200, 48, 80, 0.6);
}

/* ── Animations ───────────────────────────────────────────────── */

/* Ember particle float */
@keyframes eva-ember-rise {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(-140px) translateX(var(--drift-x, 20px)) scale(0.3); opacity: 0; }
}

/* Phantom shimmer sweep */
@keyframes eva-shimmer-sweep {
  0%   { background-position: -200% center; }
  100% { background-position: 300% center; }
}

/* Mask pulse breathe */
@keyframes eva-mask-breathe {
  0%, 100% { opacity: 0.35; filter: drop-shadow(0 0 3px rgba(200, 48, 80, 0.3)); }
  50%       { opacity: 0.65; filter: drop-shadow(0 0 8px rgba(200, 48, 80, 0.55)); }
}

/* Subtle crimson glow pulse on active accent elements */
@keyframes eva-glow-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(200, 48, 80, 0.2); }
  50%       { box-shadow: 0 0 18px rgba(200, 48, 80, 0.4), 0 0 32px rgba(139, 58, 170, 0.18); }
}

/* Evanescent fade-in for page entry */
@keyframes eva-fade-in {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Apply enter animation to main content */
.evanescia-theme main > * {
  animation: eva-fade-in 0.5s ease-out both;
}

/* SVG mask decorations on cards */
.evanescia-theme .evanescia-mask-deco {
  animation: eva-mask-breathe 3.5s ease-in-out infinite;
}

/* Shimmer on hover for glass cards */
.evanescia-theme .theme-glass-card:hover::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(200, 48, 80, 0.06) 40%,
    rgba(248, 238, 255, 0.08) 50%,
    rgba(200, 48, 80, 0.06) 60%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: eva-shimmer-sweep 1.2s ease-out forwards;
  z-index: 4;
}

/* ── Cavern Domain Cards ──────────────────────────────────────── */
.evanescia-theme .cavern-domain-card {
  background: linear-gradient(180deg, rgba(18, 6, 28, 0.9), rgba(10, 3, 18, 0.88)) !important;
  border-color: rgba(200, 48, 80, 0.2) !important;
}

/* ── Zone Tracker ─────────────────────────────────────────────── */
.evanescia-theme .zone-session-card,
.evanescia-theme .zone-entry-row {
  background: rgba(14, 5, 22, 0.72) !important;
  border-color: rgba(200, 48, 80, 0.18) !important;
}

/* ── BBP / Predictor Stat Badges ──────────────────────────────── */
.evanescia-theme .hit-badge,
.evanescia-theme [class*="hit-indicator"] {
  color: #4ade80 !important;
}

.evanescia-theme .miss-badge,
.evanescia-theme [class*="miss-indicator"] {
  color: #f87171 !important;
}

.evanescia-theme .confidence-high {
  color: var(--eva-ember) !important;
}

.evanescia-theme .confidence-med {
  color: var(--eva-crimson) !important;
}

.evanescia-theme .confidence-low {
  color: var(--eva-muted) !important;
}

/* ── Selection Color ──────────────────────────────────────────── */
.evanescia-theme ::selection {
  background: rgba(200, 48, 80, 0.38);
  color: #ffffff;
}
```

---

## Responsiveness Checklist

Before shipping, verify on each breakpoint (320px, 640px, 768px, 1024px, 1440px):

- [ ] Live predictor columns collapse correctly on mobile (1 col < 640px, 2 cols < 1024px)
- [ ] Debug log table scrolls horizontally on small screens, no overflow clipping
- [ ] Modal overlays are full-screen and closeable on touch (z-index 400+, portal rendered)
- [ ] Navbar theme button doesn't overlap content on 320px width
- [ ] Confidence badges wrap into rows (not single line overflow) on < 400px
- [ ] Card SVG decorations don't bleed outside card boundaries (overflow-hidden)
- [ ] All GSAP animations respect `prefers-reduced-motion` (wrap in media query check)

```js
// In EmbersEffect.jsx / any GSAP animation — add this guard:
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReduced) {
  // run gsap animations
}
```

---

## Notes & Known Gotchas

1. **GSAP stacking context** — If modals appear behind content, confirm they use `createPortal(content, document.body)` in their JSX. The astral/evanescia themes both have `::before` decorations that can create stacking contexts.

2. **Tailwind arbitrary variant purging** — The `[.evanescia-theme_&]:block` selector in ThemeDecorator must remain as-is; don't split into two classes or Tailwind may purge it.

3. **EmbersEffect z-index** — Set to `z-0` on the fixed wrapper so it stays behind all UI but above the page background gradient.

4. **Dark mode compatibility** — This theme is inherently dark. If your app has a light-mode toggle, exclude `evanescia-theme` from that toggle's logic.

5. **Live predictor table on 320px** — The 3-column predictor grid must use `grid-cols-1` on xs. Add `overflow-x-auto` to the scroll container and `min-w-[260px]` to the inner table wrapper.
