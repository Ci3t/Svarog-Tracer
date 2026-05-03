# Feature: Guides

> Route: `/guides`  
> Page: `src/pages/ModernGuidesPage.jsx`

---

## What It Does

The Guides page is a curated knowledge base of articles and guides about relic manipulation, HSR team building, and Svarog usage. It is admin-authored content stored in Supabase and rendered to all users.

Clara (the AI companion) can answer guide-related questions via the ClaraChat panel.

---

## Guide Content

Guides are stored in Supabase as a single JSON document fetched via `api/guides.js`:
- `getGuidesDocument()` — fetch all guides
- `getStaticCreators()` — return list of guide authors/contributors
- `upsertGuidesDocument()` — admin-only write

Each guide has:
- Title
- Author
- Content (markdown)
- Category tags

---

## Clara FAQ Integration

`api/ai-analyze-warp.js` and the Clara chat system include a knowledge base search:
- `matchClaraFAQ(query)` — find the best-matching FAQ entry
- `scoreQuery(query, entry)` — relevance scoring
- `formatClaraFaqAnswer(entry)` — format the answer for display
- Rate-limited by IP and tracked with `trackFaqAnalytic()`.

---

## Guide Components

| Component | Role |
|-----------|------|
| `GuideModal.jsx` (guides/) | Renders a guide in a modal with markdown |
| `GuideModal.jsx` (kiyo/) | Kiyo-specific guide modal |
| `KiyoGuide.jsx` | Inline Kiyo mode guide content |
| `LiveModeGuide.jsx` | Inline Live Mode guide content |
| `LongStringGuide.jsx` | Inline Long String guide content |
| `WarpGuide.jsx` | Inline Warp guide content |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/pages/ModernGuidesPage.jsx` | Guides listing page |
| `api/guides.js` | Guide CRUD API (GET + admin write) |
| `src/components/guides/GuideModal.jsx` | Guide reader modal |
| `discord-bot/commands/guides.js` (via `api/guides.js`) | Discord guide fetch |
