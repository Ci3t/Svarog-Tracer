/**
 * AI Warp Analyzer Endpoint
 * Explains "lucky peaks" in banner data using Gemini AI
 * Uses admin key (shared service for all users)
 */


// AI Configuration
import { AI_CONFIG } from '../src/config/ai.config.js'
import Fuse from 'fuse.js'


// Rate limit helper
const requestCounts = new Map()
async function checkRateLimit(userId) {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const key = `${userId}:${minute}`
  const count = requestCounts.get(key) || 0
  requestCounts.set(key, count + 1)
  return { ok: count < 15, retryAfter: 60 }
}

// â”€â”€â”€ Clara Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CLARA_FAQ = [
  {
    id: 'getting_started',
    label: 'How should a beginner start?',
    aliases: ['beginner', 'how do i start', 'where do i start', 'what should i do first', 'start learning'],
    keywords: ['tutorial first', 'drills after tutorial', 'challenge later', 'beginner path', 'new user path'],
    answer: 'Start with the tutorial, then use drills to lock in the language. Tutorial teaches the board logic step by step. Drills turn that into quick recognition. After that, move into live mode or challenge mode once the board stops feeling random.',
  },
  {
    id: 'caesar_shift',
    label: 'What is Caesar shift?',
    aliases: ['caesar shift', 'what is caesar shift', 'caesar', 'shift'],
    keywords: ['same visible read', 'same 41', 'different raw pairs', 'force route', 'landing line'],
    answer: 'Caesar shift means the same visible read can come from different raw paths depending on where you were sitting first. In practice, you force the route before each upgrade so the same visible number keeps landing on the stat you want. Stage 16 exists just to teach that idea cleanly.',
  },
  {
    id: 'svarog_eye',
    label: 'Svarog Eye vs main predictor',
    aliases: ['svarog eye', 'eye vs main', 'main predictor vs eye', 'difference between eye and main predictor'],
    keywords: ['faster pressure reader', 'slower lane memory', 'agree', 'split read', 'override'],
    answer: 'The main predictor is the slower lane-memory read. Svarog Eye is the faster pressure read. If both agree, the board is confirming itself. If Eye splits off first, it usually means pressure is changing before the main lane has fully flipped.',
  },
  {
    id: 'commons_noise',
    label: 'What are commons and noise?',
    aliases: ['commons', 'noise', 'commons and noise', 'what is noise', 'what are commons'],
    keywords: ['dominant pair', 'lane', 'interruption', 'break the lane', 'board rhythm'],
    answer: 'Commons are the values that keep owning the board and forming the lane you actually want to follow. Noise is the pressure that interrupts that lane. Read commons first, then ask whether the noise is weak enough to ignore or strong enough to break safety.',
  },
  {
    id: 'line_indicator',
    label: 'What line am I on?',
    aliases: ['what line am i on', 'current line', 'line id', 'line indicator'],
    keywords: ['control point', 'start line', 'landing line', 'current sitting line'],
    answer: 'Your current line is the line you are sitting on before the next result happens. In a read like 42, the 4 is the control point you started from and the 2 is where the hit landed. The current line matters because it changes which raw path is available next.',
  },
  {
    id: 'translate_lines',
    label: 'How do I translate a number across lines?',
    aliases: ['translate lines', 'how do i translate a number', 'raw vs 4x', 'translate 4', '4x read'],
    keywords: ['raw pair', '13 to 42', '23 to 41', 'visible read', 'landing line'],
    answer: 'The visible 4x read is just the translated version of a raw pair. Example: raw 13 can show up as visible 42, and raw 23 can show up as visible 41. That is why the visible number alone is not enough. You also care about the raw path and the line it lands on.',
  },
  {
    id: 'force_line',
    label: 'What does force line do?',
    aliases: ['force line', 'setup relic', 'what does force line do', 'why use setup relic'],
    keywords: ['change route first', 'prime line', 'setup relic', 'control point'],
    answer: 'Force line changes the route before the real hit happens. You use a setup relic to sit on the line you want, then take the real upgrade from there. It does not create a better commons pair. It makes the same pair land where you want it to land.',
  },
  {
    id: 'pair_safety',
    label: 'What is pair safety?',
    aliases: ['pair safety', 'trusted pair', 'pair at risk', 'break danger'],
    keywords: ['safe enough to trust', 'may break', 'break danger', 'warning language'],
    answer: 'Pair safety answers one question: is the commons lane still safe enough to trust right now? Trusted pair means the lane is still holding. Pair at risk means noise is starting to pressure it. Break danger means the board is actively warning you that the lane can fail if you keep pushing.',
  },
  {
    id: 'trend_types',
    label: 'Explain all trend types',
    aliases: ['trend types', 'what do trends mean', 'share trust freshness'],
    keywords: ['share', 'trust', 'freshness', 'held', 'stale', 'trends panel'],
    answer: 'The trends panel is describing how strong and how old a push is. Share is how much screen space that value owns in the recent sample. Trust is how believable that push is. Freshness tells you whether the move just started, is being held, or is getting stale.',
  },
  {
    id: 'freshness_stale',
    label: 'Fresh vs held vs stale',
    aliases: ['fresh vs stale', 'fresh held stale', 'freshness', 'stale'],
    keywords: ['fresh start', 'held trend', 'old push', 'aging move'],
    answer: 'Fresh means the push just started. Held means it is still alive and carrying momentum. Stale means it has been running long enough that you should expect it to weaken, get challenged, or break soon. Stale is not useless, but it should make you more cautious.',
  },
  {
    id: 'deciding_trends',
    label: 'How do I decide which trend to trust?',
    aliases: ['decide trend', 'which trend to trust', 'how do i decide on a trend', 'trust trend'],
    keywords: ['agreement', 'safety first', 'eye vs main', 'fresh high trust', 'route matches relic'],
    answer: 'Use this order. First check pair safety and warning language. Then check whether Main Predictor and Svarog Eye agree or split. Then read the trends: fresh or held high-trust pressure matters more than stale noise. Finally, only act if that board read can actually land on the stat you want.',
  },
  {
    id: 'skip_signal',
    label: 'When should I skip a signal?',
    aliases: ['skip signal', 'when should i skip', 'when do i wait', 'should i skip'],
    keywords: ['break danger', 'eye split without stable route', 'bad route', 'do nothing'],
    answer: 'Skip when the board is warning you harder than it is guiding you. Break danger, unstable Eye splits, stale pressure, or a route that does not map cleanly onto your relic are all good reasons to wait. Doing nothing is part of the system. You do not need to force every board.',
  },
  {
    id: 'drills',
    label: 'What do drills teach me?',
    aliases: ['drills', 'what do drills teach', 'why use drills', 'drills mode'],
    keywords: ['tutorial follow-up', 'quick recognition', 'commons noise', 'trends', 'scenario judgment'],
    answer: 'Drills teach quick recognition. They cover basics like live mode purpose, commons vs noise, raw vs 4x translation, force-line logic, pair safety, trend reading, and scenario judgment. Think of drills as the place where tutorial knowledge turns into fast pattern recognition.',
  },
  {
    id: 'tutorial',
    label: 'What does the tutorial teach?',
    aliases: ['tutorial', 'what does tutorial teach', 'tutorial explain'],
    keywords: ['lines', 'control point', 'force line', 'commons', 'noise', 'eye', 'trends'],
    answer: 'The tutorial starts from zero. It teaches lines, control points, visible reads, force line, commons, noise, pair safety, Main Predictor vs Svarog Eye, and finally the trends panel. It is meant to explain the system slowly before drills start testing recognition.',
  },
  {
    id: 'challenge_mode',
    label: 'What is challenge mode?',
    aliases: ['challenge mode', 'what is challenge mode', 'challenge'],
    keywords: ['guided solve', 'harder scenarios', 'apply board reads', 'challenge ladder'],
    answer: 'Challenge mode is where the board knowledge gets applied to guided scenarios and harder routes. It is less about definitions and more about making the right read under pressure. If tutorial explains and drills train recognition, challenge mode is where you start proving the logic.',
  },
  {
    id: 'relic_manipulation',
    label: 'What is relic manipulation?',
    aliases: ['relic manipulation', 'how does relic manipulation work', 'is relic manipulation fake', 'manipulate relic', 'relic route control'],
    keywords: ['pathfinding', 'route control', 'relic upgrades', 'same pair different landing', 'board under the board'],
    answer: 'Relic manipulation in this project means reading the board first, then controlling the route a relic upgrade will take. You are not magically changing the visible number itself. You are using current line, force line, raw pairs, and translated reads to make a visible result land on the stat you want. That is why the tutorial treats it like pathfinding, not guessing.',
  },
  {
    id: 'live_mode',
    label: 'What is live mode?',
    aliases: ['live mode', 'what is live mode', 'live'],
    keywords: ['track rng live', 'real-time board', 'predict next roll', 'session feed'],
    answer: 'Live mode is the real-time board. You feed the current rolls in, and Svarog tries to map the active lane, pressure, safety, and route before you touch your relic. It is the place you use once tutorial and drills stop feeling abstract.',
  },
  {
    id: 'free_mode',
    label: 'What is free mode?',
    aliases: ['free mode', 'what is free mode', 'free playground'],
    keywords: ['sandbox', 'practice route', 'test relic', 'learn clicks'],
    answer: 'Free mode is your sandbox. It lets you practice line movement, force-line setup, raw vs 4x reading, and upgrade routes without the pressure of a guided challenge. Use it when you want to test an idea slowly.',
  },
  {
    id: 'pattern_lab',
    label: 'What is pattern lab?',
    aliases: ['pattern lab', 'what is pattern lab'],
    keywords: ['study sequences', 'inspect patterns', 'pattern training', 'lab'],
    answer: 'Pattern Lab is for studying board behavior more deliberately. It is where you look at sequence shapes, pressure changes, and route behavior without the faster pace of drills or live mode.',
  },
  {
    id: 'relic_races',
    label: 'What are relic races?',
    aliases: ['relic races', 'what are relic races', 'races'],
    keywords: ['pvp', 'versus', 'head to head', 'duel roster'],
    answer: 'Relic Races is the competitive side. You are still reading routes and board state, but now you are doing it against another player. It is for people who already understand the system and want to perform under pressure.',
  },
  {
    id: 'four_x_control',
    label: 'What is 4x control?',
    aliases: ['4x control', 'what is 4x control', 'full cycle awareness'],
    keywords: ['all four lines', 'full map', 'full cycle', 'every line seen'],
    answer: '4x control means the system has enough line information to see the whole cycle instead of only fragments. Once the board has mapped the four-line space cleanly, your route planning becomes much more reliable.',
  },
  {
    id: 'may_break',
    label: 'What does may break mean?',
    aliases: ['may break', 'what does may break mean'],
    keywords: ['warning strip', 'soft warning', 'lane pressure', 'pair not fully safe'],
    answer: 'May break is the early warning. The commons lane is still alive, but noise is pushing hard enough that you should stop treating it like a free hit. It is the board telling you to slow down and re-check the route.',
  },
  {
    id: 'break_danger',
    label: 'What does break danger mean?',
    aliases: ['break danger', 'what does break danger mean'],
    keywords: ['hard warning', 'danger state', 'lane can fail', 'noise pressure high'],
    answer: 'Break danger is the stronger warning. At that point the board is telling you the commons lane can fail if you keep pushing it. It does not mean every click is doomed, but it does mean your old calm read is no longer safe by default.',
  },
  {
    id: 'eye_override',
    label: 'When should Svarog Eye override?',
    aliases: ['when should eye override', 'eye override', 'when should i trust eye'],
    keywords: ['split read', 'eye faster', 'main lags', 'pressure rising'],
    answer: 'Svarog Eye matters most when it splits early and the board warnings support that split. If Main Predictor still looks calm but Eye and the warning language both say pressure is changing, that is when Eye becomes the read you pay attention to first.',
  },
  {
    id: 'why_miss',
    label: 'Why did my relic miss even though the pair looked good?',
    aliases: ['why did my relic miss', 'pair looked good but missed', 'why miss even though pair good'],
    keywords: ['bad route', 'line mismatch', 'same pair wrong landing', 'force line missing'],
    answer: 'A good pair is not enough by itself. The pair can be correct while the route is still wrong for your relic. That usually means the landing line did not match the stat you wanted, or noise changed the route before the hit landed.',
  },
  {
    id: 'raw_pair',
    label: 'What is a raw pair?',
    aliases: ['raw pair', 'what is raw pair', 'what does raw pair mean', 'raw 13'],
    keywords: ['start line', 'landing slot', '13 means', 'line to slot path'],
    answer: 'A raw pair is the actual line-to-slot path behind the visible read. In raw 13, you started from line 1 and landed on slot 3. Raw pairs matter because different raw paths can collapse into the same visible 4x number.',
  },
  {
    id: 'control_point',
    label: 'What is the control point?',
    aliases: ['control point', 'what is control point', 'first digit meaning'],
    keywords: ['first digit', 'start on line 4', 'where you were sitting'],
    answer: 'The control point is the line you were sitting on before the result happened. In a read like 42, the 4 is the control point and the 2 is the line you landed on. If you change the control point, you change which route is possible next.',
  },
  {
    id: 'trusted_pair',
    label: 'What does trusted pair mean?',
    aliases: ['trusted pair', 'what does trusted pair mean'],
    keywords: ['lane still stable', 'safe pair', 'board calm'],
    answer: 'Trusted pair means the commons lane is still holding together and the board is not warning you yet. It does not mean every click is guaranteed, but it does mean the lane is still calm enough to plan around.',
  },
  {
    id: 'pair_at_risk',
    label: 'What does pair at risk mean?',
    aliases: ['pair at risk', 'what does pair at risk mean'],
    keywords: ['warning rising', 'noise pressure building', 'lane less safe'],
    answer: 'Pair at risk means the commons lane is still there, but noise is pushing hard enough that you should stop treating it like a free solve. It is the middle state between calm trust and full break danger.',
  },
  {
    id: 'trend_share',
    label: 'What does trend share mean?',
    aliases: ['trend share', 'share meaning', 'what does share mean'],
    keywords: ['how much of recent board', 'screen space', 'recent window'],
    answer: 'Trend share tells you how much of the recent board a value owns. It is a visibility number, not a promise. A value can have strong share and still be less trustworthy than a fresher or cleaner push.',
  },
  {
    id: 'trend_trust',
    label: 'What does trend trust mean?',
    aliases: ['trend trust', 'what does trust mean', 'trust meaning'],
    keywords: ['believability', 'confidence in push', 'conviction'],
    answer: 'Trend trust is about how believable the push is, not just how visible it is. High trust means the board really believes that move. Low trust means the value may be showing up, but the push is still fragile or noisy.',
  },
  {
    id: 'trend_freshness',
    label: 'What does freshness mean?',
    aliases: ['freshness', 'what does freshness mean'],
    keywords: ['age of the move', 'new push', 'signal age'],
    answer: 'Freshness tells you how old the move is. Fresh means it just started. Held means it is still alive. Stale means it has been around long enough that you should expect resistance, weakness, or a break soon.',
  },
  {
    id: 'calm_board',
    label: 'What is a calm board?',
    aliases: ['calm board', 'what is a calm board', 'stable board'],
    keywords: ['clean commons', 'low noise', 'trusted pair', 'repeatable lane'],
    answer: 'A calm board is one where the commons lane is clear, noise is not fighting it hard, and the route feels repeatable. It is the easiest kind of board to learn from because the predictor and relic tend to stay in sync.',
  },
  {
    id: 'noise_high_percent',
    label: 'What does high noise percent mean?',
    aliases: ['high noise', 'noise percent', 'what does high noise percent mean'],
    keywords: ['contaminated lane', 'session messy', 'safety dropping'],
    answer: 'High noise percent means the board is getting contaminated by values outside the calm lane. The higher that pressure gets, the less safe your commons route becomes. That is why safety and warning language matter so much before a real hit.',
  },
]

const CLARA_SYSTEM_PROMPT = `You are Clara, the in-project Svarog assistant for HSR PatternRecord.

Your job:
- Answer beginner questions about this project's systems as accurately as possible.
- Be practical, clear, and calm.
- Keep answers short: usually 2 to 5 sentences.
- Do not roleplay too hard. Do not add fluff, stuttering, or vague anime-style filler.

Core project language you must use correctly:
- line / current line / control point
- raw pair vs visible 4x read
- force line / setup relic
- Caesar shift
- relic manipulation / relic route control
- commons / noise
- pair safety / trusted pair / pair at risk / break danger / may break
- Main Predictor vs Svarog Eye
- trends / share / trust / freshness / held / stale
- tutorial / drills / challenge mode / live mode / free mode / pattern lab / relic races

Important accuracy rules:
- Do not invent mechanics that are not part of this project.
- Do not talk about generic gacha, stats, or RNG theory unless it directly helps explain this project's system.
- If the user asks whether something is fake, explain the project feature directly instead of giving a philosophical answer.
- If you are not sure, say so clearly and point the user to the tutorial or drills instead of bluffing.
- Prefer concrete explanations over abstract ones.
- If a question is about how to decide, give the decision order, not just definitions.

Teaching rules:
- Assume the user may be brand new.
- If a concept depends on another concept, explain the dependency briefly.
- When useful, explain in this order:
  1. what it is
  2. why it matters
  3. how to use it
- Keep terminology consistent with the tutorial.
- If the user asks about relic manipulation, explain it as route control and pathfinding on relic upgrades.

Project grounding:
- A read like 42 means start on line 4 and land on line 2.
- Force line changes the route before the real hit.
- Caesar shift is about making the same visible read land on the line you want by controlling the route.
- Relic manipulation means reading the board, then controlling the relic route so the visible result lands on the stat you want.
- Commons are the dominant lane values; noise is the pressure that interrupts that lane.
- Main Predictor is the slower lane-memory read.
- Svarog Eye is the faster pressure read.
- Trends describe how strong and how old a push is.

Style:
- Friendly, but direct.
- No markdown lists unless the answer needs a short ordered checklist.
- No markdown bold unless needed for clarity.
- No references to being an AI model.
- Avoid robotic words like "tactical transmission", "optimization", "neural link", "secure link", or "processing query".
- Sound like a patient project guide, not a sci-fi terminal.
- Prefer plain wording such as "board", "route", "lane", "read", "warning", and "trend".

If the question is outside this project's systems, answer briefly that you are not sure and suggest the tutorial or drills.`

function normalizeClaraText(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const CLARA_FAQ_DOCS = CLARA_FAQ.map((entry) => ({
  id: entry.id,
  text: [entry.label, ...(entry.aliases || []), ...(entry.keywords || []), entry.answer].join(' '),
}))

const claraFuse = new Fuse(CLARA_FAQ_DOCS, {
  keys: ['text'],
  threshold: 0.34,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 3,
})

function getClaraFaqById(faqId) {
  return CLARA_FAQ.find((entry) => entry.id === faqId) || null
}

function matchClaraFAQ(message) {
  const normalized = normalizeClaraText(message)
  if (!normalized) return null

  for (const entry of CLARA_FAQ) {
    const phrases = [entry.label, ...(entry.aliases || []), ...(entry.keywords || [])]
    if (phrases.some((phrase) => normalizeClaraText(phrase) === normalized)) {
      return entry
    }
    if (phrases.some((phrase) => {
      const normalizedPhrase = normalizeClaraText(phrase)
      return normalizedPhrase.length >= 6 && (normalized.includes(normalizedPhrase) || normalizedPhrase.includes(normalized))
    })) {
      return entry
    }
  }

  const results = claraFuse.search(message)
  if (!results.length) return null
  const best = results[0]
  if (typeof best.score === 'number' && best.score > 0.34) return null
  return CLARA_FAQ.find((entry) => entry.id === best.item.id) || null
}

async function handleClara(req, res) {
  const { message, history = [], faqId } = req.body || {}
  const isDevRuntime = process.env.NODE_ENV !== 'production'

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: { message: 'message is required' } })
  }

  const safeMessage = message.slice(0, 500).replace(/<[^>]*>/g, '')

  const faqMatch = getClaraFaqById(faqId) || matchClaraFAQ(safeMessage)
  if (faqMatch) {
    return res.status(200).json({
      success: true,
      answer: faqMatch.answer,
      source: 'faq',
      faqId: faqMatch.id,
    })
  }

  const apiKey = process.env.GEMINI_API_KEY_ANALYZER || process.env.GEMINI_API_KEY
  if (!apiKey) {
    const detail = 'No Gemini API key found in GEMINI_API_KEY_ANALYZER or GEMINI_API_KEY.'
    return res.status(200).json({
      success: true,
      answer: isDevRuntime
        ? `Clara FAQ miss, then fallback failed. Reason: ${detail}`
        : 'I could not find an exact FAQ match right now. Check the tutorial for the full walkthrough, or try asking about lines, Caesar shift, commons, noise, pair safety, Svarog Eye, or trends.',
      source: 'error',
      detail,
    })
  }

  const trimmedHistory = (Array.isArray(history) ? history : []).slice(-6)

  let fullPrompt = CLARA_SYSTEM_PROMPT + '\n\n'
  for (const turn of trimmedHistory) {
    const speaker = turn.role === 'model' ? 'Clara' : 'User'
    fullPrompt += `${speaker}: ${turn.parts?.[0]?.text ?? ''}\n`
  }
  fullPrompt += `User: ${safeMessage}\nClara:`

  const MODEL_NAME = process.env.GEMINI_CLARA_MODEL || 'gemini-2.5-flash-lite'
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`

  try {
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 220,
          topP: AI_CONFIG.TOP_P,
        },
      }),
    })

    const rawText = await fetchResponse.text()

    if (!fetchResponse.ok) {
      const preview = rawText.slice(0, 220)
      throw new Error(`Gemini responded with ${fetchResponse.status}: ${preview}`)
    }

    const data = JSON.parse(rawText)
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`)
    }

    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'I am not sure right now. Try the tutorial or ask in a more direct way.'
    return res.status(200).json({ success: true, answer, source: 'gemini' })
  } catch (err) {
    console.error('[Clara] Gemini call failed:', err.message)
    const detail = err?.message || 'Unknown Gemini fallback error.'
    return res.status(200).json({
      success: true,
      answer: isDevRuntime
        ? `Clara FAQ miss, then Gemini fallback failed. Reason: ${detail}`
        : 'I could not find a solid FAQ match, and the fallback answer failed too. Try asking in a simpler way, or check the tutorial and drills for the detailed walkthrough.',
      source: 'error',
      detail,
    })
  }
}
// â”€â”€â”€ Warp Analyzer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { message: 'Only POST allowed' } })

  if (req.body?.action === 'clara') return handleClara(req, res)

  const startTime = Date.now()
  const { userId, bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances } = req.body
 
  if (!userId || !bannerId || !luckyPeaks) {
    return res.status(400).json({ success: false, error: { message: 'Missing required fields' } })
  }
  
  try {
    const rateLimit = await checkRateLimit(userId)
    if (!rateLimit.ok) return res.status(429).json({ success: false, error: { message: 'Rate limit exceeded' } })
    
    console.log('[API] Distribution received:', distribution ? `${Object.keys(distribution).length} rolls` : 'NULL/UNDEFINED')
    console.log('[API] Win Chances received:', winChances ? `${Object.keys(winChances).length} rolls` : 'NULL/UNDEFINED')
    console.log('[API] Banner Type:', bannerType)
    
    const prompt = buildWarpAnalyzerPrompt({ bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances })
    // FALLBACK: gemini-pro (legacy stable model, universally available)
    const MODEL_NAME = 'gemini-pro' 
    console.log(`[API] calling AI (Model: ${MODEL_NAME})...`)
    
    // Use the new key first, then fallback to old standard key
    const apiKey = process.env.GEMINI_API_KEY_ANALYZER || process.env.GEMINI_API_KEY
    
    console.log(`[API] Key Source: ${process.env.GEMINI_API_KEY_ANALYZER ? 'GEMINI_API_KEY_ANALYZER' : (process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'NONE')}`)
    // Removed sensitive key logging

    if (!apiKey) {
        throw new Error('No Gemini API Key found in environment variables')
    }

    // DIRECT REST CALL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`
    
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Force determinism
          maxOutputTokens: 512, // Reduced from 4096 (Optimization)
          responseMimeType: "application/json"
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
        ]
      })
    })
    
    const rawText = await fetchResponse.text()
    
    // HACK: Strip anything after the last } (ignoring Windows crash logs)
    const lastBrace = rawText.lastIndexOf('}')
    const cleanedText = lastBrace !== -1 ? rawText.substring(0, lastBrace + 1) : rawText
    
    let resultData
    try {
      resultData = JSON.parse(cleanedText)
    } catch (e) {
      console.error('[API] Parse Error. Raw:', cleanedText)
      return res.status(500).json({
        success: false,
        error: { 
          code: 'INVALID_JSON', 
          message: 'API response was not valid JSON', 
          debug: cleanedText.substring(0, 100)
        }
      })
    }
    
    // Check for upstream API error (e.g. Rate Limit 429)
    if (resultData.error) {
      console.warn('[API] Gemini Upstream Error:', resultData.error)
      const isRateLimit = resultData.error.code === 429 || resultData.error.status === 'RESOURCE_EXHAUSTED'
      
      if (isRateLimit) {
        // MOCK FALLBACK for 429 (Quota Exceeded)
        // Instead of erroring, return a "Simulation" so the app stays usable.
        return res.status(200).json({
          success: true,
          data: {
             explanation: `[AI LIMIT REACHED] The Google Gemini API quota is temporarily exhausted for this key. 
             
             SIMULATED ANALYSIS:
             Based on standard probability, repeated hits at ${luckyPeaks.slice(0,3).join(', ')} suggest a strong seed pattern. 
             Usually this indicates a "clumped" distribution favoring early pity.
             
             (Please wait for quota reset or try another key to get real-time AI insights.)`,
             recommendations: [
               "Wait for API Cooldown (daily quota)",
               "Try again tomorrow for fresh AI insights",
               "Rely on the manual probability chart above"
             ],
             confidence: 0.99
          },
          meta: { latency: 0, modelUsed: 'MOCK_FALLBACK_DUE_TO_QUOTA' }
        })
      }
      
      throw new Error(`Gemini API Error: ${resultData.error.message}`)
    }
    
    // Extract text from Gemini structure
    const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiText) {
      throw new Error(`Gemini Error (No Candidates): ${JSON.stringify(resultData)}`)
    }
    
    let aiPayload
    try {
      aiPayload = JSON.parse(aiText)
    } catch (e) {
      aiPayload = { explanation: aiText, recommendations: [], confidence: 0.5 }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        peakRolls: aiPayload.peakRolls || peaksStr,
        luckyString: aiPayload.luckyString || peaksStr,
        pullStrategy: aiPayload.pullStrategy || 'Focus on suggested peak zones',
        reason: aiPayload.reason || 'Based on historical win distribution patterns',
        // Legacy fields for compatibility
        explanation: aiPayload.pullStrategy || aiPayload.reason || aiText,
        recommendations: [aiPayload.pullStrategy || 'Target peak zones'],
        confidence: aiPayload.confidence || 0.8
      },
      meta: { latency: Date.now() - startTime, modelUsed: MODEL_NAME }
    })
    
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } })
  }
}

function buildWarpAnalyzerPrompt({ bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances }) {
  // Determine soft pity threshold based on banner type
  const softPityThreshold = bannerType === 'character' ? 74 : 64
  const hardPity = bannerType === 'character' ? 90 : 80
  
  // Build COMPLETE dataset for AI (all rolls 1-90)
  const allRolls = []
  for (let roll = 1; roll <= hardPity; roll++) {
    const count = distribution?.[roll] || 0
    const chance = winChances?.[roll] || 0
    allRolls.push({ 
      roll, 
      count, 
      chance: (chance * 100).toFixed(2),
      zone: roll <= softPityThreshold ? 'pre-pity' : 'soft/hard-pity'
    })
  }
  
  // Format for AI (show ALL data)
  const dataLines = allRolls
    .filter(d => d.count > 0)
    .map(d => `Roll ${d.roll}: ${d.count} wins, ${d.chance}% chance [${d.zone}]`)
    .join('\n')
  
  return `Banner: ${bannerName || bannerId} (${bannerType === 'character' ? 'Character' : 'Weapon'})
Total Data: ${winLossData.wins + winLossData.losses} pulls analyzed

COMPLETE DISTRIBUTION DATA (all rolls with wins):
${dataLines || 'No data'}

CURRENT ALGORITHM EXAMPLE (for reference):
Our algorithm uses Z-Score analysis:
1. Calculate average win chance across all rolls
2. Calculate standard deviation
3. Find rolls where: (roll_chance - average) / std_dev > threshold (e.g., 0.5)
4. These are "statistical outliers" - rolls with anomalously high win rates

YOUR TASK - CREATE YOUR OWN MATHEMATICAL APPROACH:
1. Analyze ALL rolls from 1-${softPityThreshold} (pre-pity zone)
2. Use your own statistical method to find 6-8 rolls with the HIGHEST win probability
3. You can use: z-score, percentile ranking, win rate clustering, or any valid statistical approach
4. IMPORTANT: Don't just pick the highest counts - look for rolls with HIGH CHANCE % too
5. After selecting pre-pity peaks, you MAY add 1-2 soft/hard pity rolls (${softPityThreshold + 1}-${hardPity}) at the END if they're significant
6. Sort your final list in ASCENDING order

EXAMPLE OUTPUT:
If you find pre-pity peaks at 8, 37, 68 and soft pity at 83:
peakRolls = "8,37,68,83"

STRICT JSON OUTPUT:
{
  "peakRolls": "8,12,25,37,55,68,83",
  "luckyString": "${shortcutString || '---'}",
  "pullStrategy": "One sentence about optimal pulling strategy",
  "reason": "One sentence explaining your statistical method and findings"
}

CRITICAL RULES:
- Analyze the FULL range (1-${hardPity}), not just the first 30 rolls
- Focus on pre-pity (1-${softPityThreshold}) for main peaks
- Sort peaks in ascending numerical order
- luckyString MUST be: "${shortcutString || '---'}"
- Output ONLY valid JSON`
}


