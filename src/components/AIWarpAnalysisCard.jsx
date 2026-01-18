import React, { useState, useEffect } from 'react'
import { Sparkles, Loader2, AlertCircle, Info } from 'lucide-react'

/**
 * AI Analysis Card for Warp Analyzer
 * Shows AI explanation of "lucky peaks" alongside traditional analysis
 */
export default function AIWarpAnalysisCard({ bannerId, bannerName, luckyPeaks, winLossData }) {
  const [aiData, setAiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!bannerId || !luckyPeaks || luckyPeaks.length === 0) {
      return
    }
    
    fetchAIAnalysis()
  }, [bannerId, luckyPeaks])
  
  async function fetchAIAnalysis() {
    setLoading(true)
    setError(null)
    
    // Generate anonymous user ID
    let userId = localStorage.getItem('svarog_user_id')
    if (!userId) {
      userId = `user_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('svarog_user_id', userId)
    }
    
    try {
      const response = await fetch('/api/ai-analyze-warp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          bannerId,
          bannerName,
          luckyPeaks,
          winLossData
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error?.message || 'AI analysis failed')
      }
      
      setAiData(result.data)
    } catch (err) {
      console.error('[AI Warp] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Don't render if no peaks
  if (!luckyPeaks || luckyPeaks.length === 0) {
    return null
  }
  
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-purple-300">AI Analysis</h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
      </div>
      
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing banner data...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-300 font-medium">AI Analysis Unavailable</p>
            <p className="text-red-400/80 mt-1">{error}</p>
            <p className="text-gray-400 text-xs mt-2">Traditional analysis still available above.</p>
          </div>
        </div>
      )}
      
      {aiData && !loading && !error && (
        <div className="space-y-3">
          {/* Explanation */}
          <div className="bg-black/20 rounded p-3 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-200 leading-relaxed">
                {aiData.explanation}
              </p>
            </div>
          </div>
          
          {/* Recommendations */}
          {aiData.recommendations && aiData.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-purple-300 mb-2">💡 Recommendations:</p>
              <ul className="space-y-1.5">
                {aiData.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
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
            <span>Powered by Gemini 2.5 Flash</span>
          </div>
        </div>
      )}
    </div>
  )
}
