/**
 * AI Warp Analyzer Endpoint
 * Explains "lucky peaks" in banner data using Gemini AI
 * Uses admin key (shared service for all users)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// AI Configuration (inline for now to avoid import issues)
const AI_CONFIG = {
  MODEL: 'gemini-2.5-flash',  // User requested model
  TEMPERATURE: 0.7,
  MAX_OUTPUT_TOKENS: 200,
  TOP_P: 0.9
}

// Initialize Gemini with debug logging
let genAI
try {
  console.log('[API] Initializing Gemini...')
  if (!process.env.GEMINI_API_KEY) {
    console.error('[API] ERROR: GEMINI_API_KEY is missing in process.env')
  } else {
    console.log('[API] Key found:', process.env.GEMINI_API_KEY.substring(0, 5) + '...')
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
} catch (e) {
  console.error('[API] Init Error:', e)
}

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
  const { userId, bannerId, bannerName, luckyPeaks, winLossData } = req.body
  
  if (!userId || !bannerId || !luckyPeaks) {
    return res.status(400).json({ success: false, error: { message: 'Missing required fields' } })
  }
  
  try {
    const rateLimit = await checkRateLimit(userId)
    if (!rateLimit.ok) return res.status(429).json({ success: false, error: { message: 'Rate limit exceeded' } })
    
    const prompt = buildWarpAnalyzerPrompt({ bannerId, bannerName, luckyPeaks, winLossData })
    console.log('[API] Calling Gemini REST API (4096 tokens, temp 0)...')
    
    // DIRECT REST CALL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`
    
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Force determinism
          maxOutputTokens: 4096, // Huge budget to ensure JSON finishes
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
      return res.status(500).json({
        success: false,
        error: { code: 'INVALID_JSON', message: 'API response was not valid JSON', debug: cleanedText.substring(0, 100) }
      })
    }
    
    // Extract text
    const aiText = resultData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!aiText) throw new Error("No candidates in Gemini response")
    
    let aiPayload
    try {
      aiPayload = JSON.parse(aiText)
    } catch (e) {
      aiPayload = { explanation: aiText, recommendations: [], confidence: 0.5 }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        explanation: aiPayload.explanation || aiText,
        recommendations: aiPayload.recommendations || [],
        confidence: aiPayload.confidence || 0.8
      },
      meta: { latency: Date.now() - startTime, modelUsed: AI_CONFIG.MODEL }
    })
    
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } })
  }
}

function buildWarpAnalyzerPrompt({ bannerId, bannerName, luckyPeaks, winLossData }) {
  const peaksStr = luckyPeaks.join(', ')
  return `Act as a Gacha Analyst.
Banner: ${bannerName || bannerId}
Lucky Peaks: ${peaksStr}
Win Rate: ${winLossData?.wins || 0}W/${winLossData?.losses || 0}L

Task: 
1. Explain why pulls at ${peaksStr} are lucky.
2. Give 2 strat tips.

Rules:
- NO internal monologue/thinking.
- Output ONLY valid JSON.
- Finish the JSON object completely.

Structure:
{
  "explanation": "concise string",
  "recommendations": ["tip1", "tip2"],
  "confidence": 0.95
}`
}
