/**
 * AI Warp Analyzer Endpoint
 * Explains "lucky peaks" in banner data using Gemini AI
 * Uses admin key (shared service for all users)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai')

// AI Configuration (inline for now to avoid import issues)
const AI_CONFIG = {
  MODEL: 'gemini-2.5-flash',  // Free tier: 15 RPM, 1500 RPD
  TEMPERATURE: 0.7,
  MAX_OUTPUT_TOKENS: 200,
  TOP_P: 0.9
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Simple in-memory rate limiter (will add Redis later)
const requestCounts = new Map()

async function checkRateLimit(userId) {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const key = `${userId}:${minute}`
  
  const count = requestCounts.get(key) || 0
  requestCounts.set(key, count + 1)
  
  // Cleanup old keys
  for (const [k, v] of requestCounts.entries()) {
    const keyMinute = parseInt(k.split(':')[1])
    if (minute - keyMinute > 2) {
      requestCounts.delete(k)
    }
  }
  
  if (count >= 15) {
    return { ok: false, reason: 'USER_MINUTE_LIMIT', retryAfter: 60 }
  }
  
  return { ok: true, counts: { userMin: count + 1 } }
}

async function getUsageStats(userId) {
  return { globalToday: 0, userToday: 0 }
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' } 
    })
  }
  
  const startTime = Date.now()
  const { userId, bannerId, bannerName, luckyPeaks, winLossData } = req.body
  
  // Validation
  if (!userId || !bannerId || !luckyPeaks) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Missing required fields' }
    })
  }
  
  try {
    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId)
    
    if (!rateLimitResult.ok) {
      return res.status(429).json({
        success: false,
        error: {
          code: rateLimitResult.reason,
          message: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }
      })
    }
    
    // Build prompt
    const prompt = buildWarpAnalyzerPrompt({
      bannerId,
      bannerName,
      luckyPeaks,
      winLossData
    })
    
    // Call Gemini
    const model = genAI.getGenerativeModel({ 
      model: AI_CONFIG.MODEL,
      generationConfig: {
        temperature: AI_CONFIG.TEMPERATURE,
        maxOutputTokens: AI_CONFIG.MAX_OUTPUT_TOKENS,
        topP: AI_CONFIG.TOP_P,
      }
    })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse JSON response
    let aiData
    try {
      aiData = JSON.parse(text)
    } catch (parseError) {
      console.error('[AI Warp] JSON parse error:', text)
      return res.status(500).json({
        success: false,
        error: { code: 'INVALID_RESPONSE', message: 'AI returned invalid JSON' }
      })
    }
    
    // Get usage stats
    const stats = await getUsageStats(userId)
    
    // Success response
    return res.status(200).json({
      success: true,
      data: {
        explanation: aiData.explanation,
        recommendations: aiData.recommendations || [],
        confidence: aiData.confidence || 0.8
      },
      meta: {
        latency: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        modelUsed: AI_CONFIG.MODEL,
        usageToday: stats.globalToday
      }
    })
    
  } catch (error) {
    console.error('[AI Warp] Error:', error)
    
    // Handle specific errors
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Daily AI quota exhausted. Resets at midnight UTC.'
        }
      })
    }
    
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'AI analysis failed'
      }
    })
  }
}

/**
 * Build prompt for Warp Analyzer
 */
function buildWarpAnalyzerPrompt({ bannerId, bannerName, luckyPeaks, winLossData }) {
  const peaksStr = luckyPeaks.join(', ')
  const winRate = winLossData?.wins && winLossData?.losses
    ? ((winLossData.wins / (winLossData.wins + winLossData.losses)) * 100).toFixed(1)
    : 'N/A'
  
  return `You are analyzing gacha game banner data to explain "lucky peaks" to players.

Banner: ${bannerName || `ID ${bannerId}`}
Lucky Peak Rolls: ${peaksStr}
Overall Win Rate: ${winRate}%
Total Data: ${winLossData?.wins || 0} wins, ${winLossData?.losses || 0} losses

Task:
1. Explain in simple terms why these specific roll numbers (${peaksStr}) are considered "lucky peaks"
2. Provide 2-3 actionable recommendations for players

Keep explanation under 300 characters. Be clear and helpful.

Respond in JSON format:
{
  "explanation": "Why these peaks are lucky...",
  "recommendations": ["Pull singles to 6, then x10", "Best odds at rolls 6, 16, 26..."],
  "confidence": 0.0-1.0
}`
}
