/**
 * Rate Limiter for AI API calls
 * Uses Upstash Redis for serverless-compatible rate limiting
 */

import { Redis } from '@upstash/redis'
import { AI_CONFIG } from '../../src/config/ai.config.js'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const LIMITS = AI_CONFIG.RATE_LIMITS

/**
 * Check and enforce rate limits
 * @param {string} userId - Anonymous user ID
 * @returns {Promise<{ok: boolean, reason?: string, retryAfter?: number, counts?: object}>}
 */
export async function checkRateLimit(userId) {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const day = Math.floor(now / 86400000)
  
  // Redis keys
  const globalMinuteKey = `rl:global:${minute}`
  const globalDayKey = `rl:global:${day}`
  const userMinuteKey = `rl:user:${userId}:${minute}`
  const userDayKey = `rl:user:${userId}:${day}`
  
  try {
    // ATOMIC: Increment first, then check (prevents race conditions)
    const results = await redis.pipeline()
      .incr(globalMinuteKey)
      .incr(globalDayKey)
      .incr(userMinuteKey)
      .incr(userDayKey)
      .expire(globalMinuteKey, 120)
      .expire(globalDayKey, 86400 * 2)
      .expire(userMinuteKey, 120)
      .expire(userDayKey, 86400 * 2)
      .exec()
    
    // Parse results (Upstash returns [[null, value], ...])
    const globalMin = Number(results[0][1] ?? 0)
    const globalDay = Number(results[1][1] ?? 0)
    const userMin = Number(results[2][1] ?? 0)
    const userDay = Number(results[3][1] ?? 0)
    
    // Check if limits exceeded (after increment)
    if (globalMin > LIMITS.GLOBAL_PER_MINUTE) {
      return { 
        ok: false, 
        reason: 'GLOBAL_MINUTE_LIMIT', 
        retryAfter: 60 
      }
    }
    if (globalDay > LIMITS.GLOBAL_PER_DAY) {
      return { 
        ok: false, 
        reason: 'GLOBAL_DAY_LIMIT', 
        retryAfter: 86400 
      }
    }
    if (userMin > LIMITS.PER_USER_PER_MINUTE) {
      return { 
        ok: false, 
        reason: 'USER_MINUTE_LIMIT', 
        retryAfter: 60 
      }
    }
    if (userDay > LIMITS.PER_USER_PER_DAY) {
      return { 
        ok: false, 
        reason: 'USER_DAY_LIMIT', 
        retryAfter: 86400 
      }
    }
    
    return { 
      ok: true, 
      counts: { globalMin, globalDay, userMin, userDay } 
    }
  } catch (error) {
    console.error('[Rate Limiter] Redis error:', error)
    // Fail open (allow request) if Redis is down
    return { ok: true, counts: {} }
  }
}

/**
 * Get current usage stats for a user
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function getUsageStats(userId) {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const day = Math.floor(now / 86400000)
  
  const globalDayKey = `rl:global:${day}`
  const userDayKey = `rl:user:${userId}:${day}`
  
  try {
    const [globalDay, userDay] = await redis.mget([globalDayKey, userDayKey])
    
    return {
      globalToday: Number(globalDay ?? 0),
      userToday: Number(userDay ?? 0),
      globalLimit: LIMITS.GLOBAL_PER_DAY,
      userLimit: LIMITS.PER_USER_PER_DAY
    }
  } catch (error) {
    console.error('[Rate Limiter] Stats error:', error)
    return {
      globalToday: 0,
      userToday: 0,
      globalLimit: LIMITS.GLOBAL_PER_DAY,
      userLimit: LIMITS.PER_USER_PER_DAY
    }
  }
}
