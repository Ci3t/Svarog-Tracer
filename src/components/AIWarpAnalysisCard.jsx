import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Sparkles, Loader2, AlertCircle, Info } from 'lucide-react'

/**
 * AI Analysis Card for Warp Analyzer
 * Shows AI explanation of "lucky peaks" alongside traditional analysis
 */
export default function AIWarpAnalysisCard({ bannerId, bannerName, bannerType, luckyPeaks, shortcutString, winLossData, distribution, winChances }) {
  const [aiData, setAiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Prevent duplicate + concurrent calls
  const lastRequestSigRef = useRef('')
  const inFlightRef = useRef(false)
  const abortRef = useRef(null)

  // Stable userId (don't re-read localStorage every request)
  const userId = useMemo(() => {
    let id = localStorage.getItem('svarog_user_id')
    if (!id) {
      id = `user_${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem('svarog_user_id', id)
    }
    return id
  }, [])

  // Normalize peaks for stable signature (sort + stringify once)
  const signature = useMemo(() => {
    if (!bannerId || !Array.isArray(luckyPeaks) || luckyPeaks.length === 0) return ''
    const normPeaks = [...luckyPeaks].map(Number).sort((a, b) => a - b)
    return `${bannerId}-${JSON.stringify(normPeaks)}`
  }, [bannerId, luckyPeaks])

  // Stable API URL
  const apiBase = useMemo(() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    return isLocal ? '' : (import.meta.env.VITE_API_URL || 'https://ci3t.github.io/Svarog-Tracer')
  }, [])

  const fetchAIAnalysis = useCallback(async ({ signal } = {}) => {
    if (!bannerId || !luckyPeaks || luckyPeaks.length === 0) return false

    console.log('[AI Warp] Distribution data:', distribution ? `${Object.keys(distribution).length} rolls` : 'MISSING')

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBase}/api/banners?action=ai-analyze-warp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal, // This will be undefined if called via onClick, which is fine
        body: JSON.stringify({
          userId,
          bannerId,
          bannerName,
          bannerType,
          luckyPeaks,
          shortcutString,
          winLossData,
          distribution,
          winChances
        })
      })

      const text = await response.text()

      if (!response.ok) {
        let errorData
        try {
          errorData = JSON.parse(text)
        } catch {
          throw new Error(`Server error (${response.status}): ${text.slice(0, 120)}`)
        }

        // If your server returns retryAfter, surface it
        const retryAfter = errorData?.error?.retryAfter
        const msg = errorData?.error?.message || 'AI analysis failed'
        throw new Error(retryAfter ? `${msg} (retry in ${retryAfter}s)` : msg)
      }

      let result
      try {
        result = JSON.parse(text)
      } catch {
        throw new Error('Server returned malformed JSON')
      }

      if (!result.success) throw new Error(result.error?.message || 'AI analysis failed')

      setAiData(result.data)
      return true
    } catch (err) {
      // ignore aborts
      if (err?.name === 'AbortError') return false
      console.error('[AI Warp] Error:', err)
      setError(err.message)
      return false
    } finally {
      // Always stop loading, even if aborted
      setLoading(false)
    }
  }, [apiBase, userId, bannerId, bannerName, luckyPeaks, winLossData])

  useEffect(() => {
    if (!signature) return

    console.log('[AI Warp] Effect Triggered. Sig:', signature)

    // Block if we already did this signature (SUCCESSFULLY)
    if (lastRequestSigRef.current === signature) {
      console.log('[AI Warp] Loop Blocked: Already fetched for this data.')
      return
    }

    // Block concurrent request (StrictMode / rerenders)
    if (inFlightRef.current) {
      console.log('[AI Warp] In-flight blocked.')
      return
    }

    // Abort previous request if any
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    inFlightRef.current = true

    fetchAIAnalysis({ signal: controller.signal })
      .then((success) => {
        if (success) {
           lastRequestSigRef.current = signature
        }
      })
      .finally(() => {
        inFlightRef.current = false
      })

    return () => {
      console.log('[AI Warp] Cleanup/Abort')
      controller.abort()
      // Note: we don't set inFlight false here because the finally block handles it more reliably for the async chain
    }
  }, [signature, fetchAIAnalysis])
  
  // Don't return null, show empty state for debugging
  const hasData = luckyPeaks && luckyPeaks.length > 0
  
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-purple-300">AI Analysis</h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
      </div>
      
      {!hasData && (
        <div className="p-4 text-center border border-dashed border-gray-700 rounded bg-black/20">
          <p className="text-sm text-gray-400">Waiting for Lucky Peaks data...</p>
          <p className="text-xs text-gray-600 mt-1">Select a banner with data to analyze.</p>
        </div>
      )}

      {hasData && loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing banner data...</span>
        </div>
      )}
      
      {hasData && error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-300 font-medium">AI Analysis Unavailable</p>
            <p className="text-red-400/80 mt-1">{error}</p>
            <button 
                onClick={() => {
                   lastRequestSigRef.current = '' // Clear lock to allow retry
                   fetchAIAnalysis()
                }}
                className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-200 px-2 py-1 rounded transition-colors"
            >
                Try Again
            </button>
          </div>
        </div>
      )}
      
      {hasData && aiData && !loading && !error && (
        <div className="space-y-3">
          {/* Peak Rolls */}
          {aiData.peakRolls && (
            <div className="bg-black/20 rounded p-3 border border-purple-500/20">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-purple-300 mb-1">Peak Rolls</p>
                  <p className="text-sm text-gray-200 font-mono">{aiData.peakRolls}</p>
                </div>
              </div>
            </div>
          )}

          {/* Lucky String */}
          {aiData.luckyString && (
            <div className="bg-black/20 rounded p-3 border border-green-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-300 mb-1">Lucky String</p>
                  <p className="text-sm text-gray-200 font-mono">{aiData.luckyString}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pull Strategy */}
          {aiData.pullStrategy && (
            <div className="bg-black/20 rounded p-3 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-300 mb-1">💡 Pull Strategy</p>
                  <p className="text-sm text-gray-200">{aiData.pullStrategy}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          {aiData.reason && (
            <div className="bg-black/20 rounded p-3 border border-yellow-500/20">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-yellow-300 mb-1">Analysis</p>
                  <p className="text-sm text-gray-200">{aiData.reason}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Confidence */}
          {aiData.confidence && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Confidence:</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                <div 
                  className="bg-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${aiData.confidence * 100}%` }}
                />
              </div>
              <span>{Math.round(aiData.confidence * 100)}%</span>
            </div>
          )}
          
          {/* Powered by */}
          <div className="text-xs text-gray-500 flex items-center gap-1.5 pt-2 border-t border-gray-700/50">
            <Sparkles className="w-3 h-3" />
            <span>Powered by Gemini 1.5 Flash</span>
          </div>
        </div>
      )}
    </div>
  )
}
