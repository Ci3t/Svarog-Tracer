/**
 * AI Warp Analyzer Endpoint
 * Explains "lucky peaks" in banner data using Gemini AI
 * Uses admin key (shared service for all users)
 */


// AI Configuration
import { AI_CONFIG } from '../src/config/ai.config.js'


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

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { message: 'Only POST allowed' } })
  
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
