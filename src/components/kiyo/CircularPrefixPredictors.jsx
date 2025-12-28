import React from 'react';

// Circular Predictor Component for Kiyo Mode (similar to Live Session)
export default function CircularPrefixPredictors({ smartRecommendation }) {
  if (!smartRecommendation || (!smartRecommendation.prediction2str && !smartRecommendation.prediction3str)) {
    return null;
  }

  const fmtPct = (val) => {
    if (val === null || val === undefined) return 0;
    return Math.round(val * 100);
  };

  const renderCircularPredictor = (prediction, title, subtitle) => {
    if (!prediction) return null;

    const confidencePercent = fmtPct(prediction.confidence);
    
    // Calculate stroke dash for circular progress
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (confidencePercent / 100) * circumference;

    // Determine gradient colors based on data source
    const gradientId = title.includes('2') ? 'gradient2str' : 'gradient3str';
    const gradientColors = prediction.source === 'live' 
      ? { start: '#10b981', end: '#059669' } // Emerald for live
      : prediction.source === 'import'
      ? { start: '#06b6d4', end: '#0891b2' } // Cyan for import
      : { start: '#f59e0b', end: '#d97706' }; // Amber for sheet

    return (
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className={`rounded-full border px-2 py-1 text-xs ${
            prediction.source === 'live' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' :
            prediction.source === 'import' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' :
            'bg-amber-500/15 text-amber-200 border-amber-500/30'
          }`}>
            {prediction.source === 'live' ? '✓ Live' :
             prediction.source === 'import' ? '✓ Import' :
             '⚠️ Sheet'}
          </div>
        </div>

        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="relative w-40 h-40">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-800"
              />
              {/* Progress Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={`url(#${gradientId})`}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gradientColors.start} />
                  <stop offset="100%" stopColor={gradientColors.end} />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white mb-1">
                {prediction.prediction ?? "—"}
              </div>
              <div className="text-lg font-semibold text-purple-400">
                {confidencePercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Alternative */}
        {prediction.alt && (
          <div className="flex items-center justify-center">
            <div className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <span className="text-xs text-slate-500 mr-2">Alt:</span>
              <span className="text-lg font-bold text-slate-300">
                {prediction.alt}
              </span>
            </div>
          </div>
        )}

        {/* Reasoning */}
        {prediction.reasoning && (
          <div className="mt-3 text-xs text-cyan-300 italic text-center">
            {prediction.reasoning}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 2-String Predictor */}
      {smartRecommendation.prediction2str && renderCircularPredictor(
        smartRecommendation.prediction2str,
        '🎯 2-String Predictor',
        'Next 2nd digit'
      )}
      
      {/* 3-String Predictor */}
      {smartRecommendation.prediction3str && renderCircularPredictor(
        smartRecommendation.prediction3str,
        '🎯 3-String Predictor',
        smartRecommendation.prediction3str.prefix 
          ? `Analyzing: ${smartRecommendation.prediction3str.prefix}` 
          : 'Next 3rd digit'
      )}
    </div>
  );
}
