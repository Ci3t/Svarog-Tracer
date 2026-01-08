<p align="center">
  <img src="https://img.shields.io/badge/Svarog-Tracer-8b5cf6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEyIDIgMTUuMDkgOC4yNiAyMiA5LjI3IDE3IDE0LjE0IDE4LjE4IDIxLjAyIDEyIDE3Ljc3IDUuODIgMjEuMDIgNyAxNC4xNCAyIDkuMjcgOC45MSA4LjI2IDEyIDIiPjwvcG9seWdvbj48L3N2Zz4=" alt="Svarog Tracer">
  <br>
  <strong>Gacha Upgrade Pattern Analyzer</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## 🎯 What is this?

A **pattern analysis tool** for gacha games with equipment/relic upgrade systems. It uses real-time session tracking and statistical models to predict which sub-stat slot is most likely to roll next during upgrades.

> **Disclaimer:** This is a statistical analyzer, not a cheat. RNG is still RNG.

---

## ✨ Features

### 🔮 BBP Mode (Beast Binary Predictor)
- **80%+ accuracy** on 2-string predictions
- Pair transition matrix analysis
- Wave flip detection & momentum scoring
- Commons/Noise identification

### 📊 Live Session Tracking
- Real-time roll logging
- Session timer with auto-save
- Export/Import debug logs
- Historical accuracy stats

### 🌌 Warp Analyzer
- Pull data from [StarRailStation.com](https://starrailstation.com)
- Z-Score peak detection
- "Lucky String" shortcut generation
- Soft pity visualization

### 🧪 Long String Lab
- Paste historical roll sequences
- Deep pattern analysis
- Transition probability matrix

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/HSR_PatternRecord.git
cd HSR_PatternRecord

# Install
npm install

# Dev
npm run dev

# Build
npm run build
```

---

## 📖 How to Read the Predictor

| Metric | Meaning |
|--------|---------|
| **Commons** | Top 2 most frequent values (your "safe bets") |
| **Noise** | Rare outliers (skip unless rising) |
| **Run Len** | Consecutive same-value streak |
| **Flip Prob** | Chance the pattern will switch |
| **Momentum** | Recency-weighted frequency score |

### Momentum Color Guide
- 🟠 **1.0+** = Nuclear (trust blindly)
- 🟡 **0.5+** = Hot (solid pick)
- 🔵 **0.2+** = Active (watching)
- ⬛ **<0.2** = Cold (skip)

---

## 🧠 Core Logic

The predictor uses a multi-step strategy cascade:

1. **Overdue Wave** – Value hasn't appeared in 5+ rolls
2. **Pattern Shift** – Commons flipping mid-session
3. **Run Break** – 3+ consecutive same value = expect switch
4. **Pair Matrix** – "After X, Y usually follows"
5. **Frequency Fallback** – Default to highest % value

---

## 📂 Project Structure

```
src/
├── components/modern/   # UI components
├── pages/               # Route pages
├── utils/
│   ├── pairTransitionPredictor.js  # Core prediction engine
│   ├── bbp-mode-2str.js            # BBP mode wrapper
│   └── warpDataService.js          # Warp API integration
└── App.jsx
```

---

## 🤝 Credits

- Warp data sourced from [StarRailStation.com](https://starrailstation.com)
- Not affiliated with Cognosphere/HoYoverse

---

<p align="center">
  <em>May your Commons stay common.</em> ✨
</p>
