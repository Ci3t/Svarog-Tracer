# Local AI Testing Guide

## Setup

To test AI locally, you need to run **TWO** servers:

### 1. Vercel Dev Server (API)
```bash
# Terminal 1 - Run Vercel dev for API routes
vercel dev --listen 3000
```

This starts the API at `http://localhost:3000/api/ai-analyze-warp`

### 2. Vite Dev Server (Frontend)
```bash
# Terminal 2 - Run Vite for React app
npm run dev
```

This starts the frontend at `http://localhost:5173`

## How It Works

The AI card automatically detects:
- **localhost** → Uses `http://localhost:3000/api/ai-analyze-warp`
- **Production** → Uses your deployed Vercel URL

## Testing Steps

1. Start both servers (see above)
2. Visit `http://localhost:5173`
3. Navigate to a banner page
4. AI card should call your local API

## Environment Variables

Make sure `.env.local` has:
```
GEMINI_API_KEY=AIzaSy...
```

Vercel dev will automatically load this file.

## Troubleshooting

**"404 Not Found":**
- Make sure Vercel dev is running on port 3000
- Check console: should show `http://localhost:3000/api/ai-analyze-warp`

**"AI Analysis Unavailable":**
- Check Vercel dev terminal for errors
- Verify `GEMINI_API_KEY` is in `.env.local`

---

**Quick Start:**
```bash
# Terminal 1
vercel dev --listen 3000

# Terminal 2  
npm run dev
```

Then visit `http://localhost:5173` and test!
