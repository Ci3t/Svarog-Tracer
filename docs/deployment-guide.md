# 🚀 Production Deployment Guide

## Problem We Solved

When you change banner display settings (like showing 4 banners instead of 2), the production site might still show old cached data even after rebuilding and deploying.

## The Solution: Automatic Cache Invalidation

We've implemented a **cache versioning system** that automatically clears old caches when you deploy banner-related changes.

---

## 📋 How to Deploy to Production (Recommended)

### Option 1: Auto-Bump Cache (Recommended)
```bash
npm run build:prod
```
This automatically:
1. ✅ Increments the cache version (invalidates old caches)
2. ✅ Builds the production bundle
3. ✅ Ensures fresh data on deployment

### Option 2: Manual Cache Bump
```bash
npm run cache:bump    # Bump cache version
npm run build         # Build normally
```

### Option 3: Regular Build (Use with caution)
```bash
npm run build
```
⚠️ **Warning**: This does NOT bump the cache version. Use only if you haven't changed banner logic.

---

## 🔧 When to Bump Cache Version

**Always bump when:**
- ✅ Changing banner display limits (2 → 4 banners)
- ✅ Modifying `src/config/bannerConfig.js`
- ✅ Updating banner fetching logic in `api/banners.js`
- ✅ Changing how banners are filtered or sorted

**No need to bump when:**
- ❌ Fixing UI bugs (CSS, layout)
- ❌ Adding new features unrelated to banners
- ❌ Updating documentation

---

## 🎯 Quick Reference

| Command | What It Does |
|---------|-------------|
| `npm run build:prod` | **Recommended**: Auto-bump cache + build |
| `npm run cache:bump` | Manually increment cache version |
| `npm run build` | Regular build (no cache bump) |

---

## 🔍 How It Works

1. **Cache Version**: Each API response includes a version number
2. **Version Check**: When cache version changes, old cache is invalidated
3. **Fresh Data**: Next API call fetches fresh banner data
4. **No Stale Cache**: Production always shows current banners

---

## 📝 Current Cache Version

Check `api/banners.js` → `CACHE_VERSION: X`

The version auto-increments each time you run `npm run build:prod` or `npm run cache:bump`.

---

## ⚡ Emergency Cache Clear

If production still shows old data after deployment:

1. Run manually:
   ```bash
   node scripts/bump-cache-version.js
   ```

2. Commit and push:
   ```bash
   git add api/banners.js
   git commit -m "Force cache refresh"
   git push
   ```

3. Vercel will auto-deploy with new cache version

---

## 🎓 For Future You

**Remember**: Always use `npm run build:prod` when deploying banner-related changes!

This prevents the "local works but production shows old data" issue.
