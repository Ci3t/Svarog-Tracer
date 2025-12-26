import React from 'react';

/**
 * Betting Recommendation Card
 * Shows which columns to bet on based on pattern clarity
 */
export default function BettingRecommendationCard({ waveAnalysis, persistentAccuracy }) {
  if (!waveAnalysis?.bettingRecommendation) return null;

  const { bettingRecommendation, columnAnalysis } = waveAnalysis;
  const { suggestion, message, col2Status, col3Status, focus } = bettingRecommendation;

  // Get accuracy from persistent tracking
  const col2Acc = persistentAccuracy?.col2?.pct || 0;
  const col3Acc = persistentAccuracy?.col3?.pct || 0;

  // Status styling
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'bad': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'bad': return '❌';
      default: return '⚪';
    }
  };

  const getSuggestionColor = () => {
    if (focus === 'none') return 'text-red-400 bg-red-500/10 border-red-500/50';
    if (focus === 'both') return 'text-green-400 bg-green-500/10 border-green-500/50';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 mt-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-white">Betting Recommendation</h3>
      </div>

      {/* Column Status */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Col2 Status */}
        <div className={`border rounded-xl p-3 ${getStatusColor(col2Status)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Column 2</span>
            <span className="text-2xl">{getStatusIcon(col2Status)}</span>
          </div>
          <div className="text-sm opacity-90">
            {col2Status === 'good' ? (
              <>
                <div>Pattern: {columnAnalysis?.col2?.patternDetected?.type || 'detected'}</div>
                <div>Confidence: {Math.round((columnAnalysis?.col2?.confidence || 0) * 100)}%</div>
                <div>Accuracy: {col2Acc}%</div>
              </>
            ) : col2Status === 'bad' ? (
              <>
                <div>Status: Chaotic</div>
                <div>Confidence: {Math.round((columnAnalysis?.col2?.confidence || 0) * 100)}%</div>
                <div className="font-bold mt-1">SKIP</div>
              </>
            ) : (
              <div>Monitoring...</div>
            )}
          </div>
        </div>

        {/* Col3 Status */}
        <div className={`border rounded-xl p-3 ${getStatusColor(col3Status)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Column 3</span>
            <span className="text-2xl">{getStatusIcon(col3Status)}</span>
          </div>
          <div className="text-sm opacity-90">
            {col3Status === 'good' ? (
              <>
                <div>Pattern: {columnAnalysis?.col3?.patternDetected?.type || 'detected'}</div>
                <div>Confidence: {Math.round((columnAnalysis?.col3?.confidence || 0) * 100)}%</div>
                <div>Accuracy: {col3Acc}%</div>
              </>
            ) : col3Status === 'bad' ? (
              <>
                <div>Status: Chaotic</div>
                <div>Confidence: {Math.round((columnAnalysis?.col3?.confidence || 0) * 100)}%</div>
                <div className="font-bold mt-1">SKIP</div>
              </>
            ) : (
              <div>Monitoring...</div>
            )}
          </div>
        </div>
      </div>

      {/* Suggestion */}
      <div className={`border rounded-xl p-4 ${getSuggestionColor()}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">💡</span>
          <span className="font-bold text-lg">{suggestion}</span>
        </div>
        <div className="text-sm opacity-90">
          {message}
        </div>
      </div>
    </div>
  );
}
