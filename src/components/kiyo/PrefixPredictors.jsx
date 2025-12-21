import React from 'react';

export default function PrefixPredictors({ smartRecommendation }) {
  if (!smartRecommendation || (!smartRecommendation.prediction2str && !smartRecommendation.prediction3str)) {
    return null;
  }

  const fmtPct = (val) => {
    if (val === null || val === undefined) return "—";
    return `${Math.round(val * 100)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 2-STR Card */}
      {smartRecommendation.prediction2str && (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/30 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-bold text-slate-100">2-String Predictor</div>
              <div className="text-xs text-slate-400">Next 2nd digit</div>
            </div>
            <div className={`rounded-full border px-2 py-1 text-xs ${
              smartRecommendation.prediction2str.source === 'live' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' :
              smartRecommendation.prediction2str.source === 'import' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' :
              'bg-amber-500/15 text-amber-200 border-amber-500/30'
            }`}>
              {smartRecommendation.prediction2str.source === 'live' ? '✓ Live' :
               smartRecommendation.prediction2str.source === 'import' ? '✓ Import' :
               '⚠️ Sheet'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
              <div className="text-xs text-slate-400">Main</div>
              <div className="text-lg font-extrabold text-white">
                {smartRecommendation.prediction2str.prediction ?? "—"}{" "}
                <span className="text-xs font-normal text-slate-300">
                  ({fmtPct(smartRecommendation.prediction2str.confidence)})
                </span>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
              <div className="text-xs text-slate-400">Alt</div>
              <div className="text-lg font-extrabold text-white">
                {smartRecommendation.prediction2str.alt ?? "—"}
              </div>
            </div>
          </div>
          
          {smartRecommendation.prediction2str.reasoning && (
            <div className="mt-3 text-xs text-cyan-300 italic">
              {smartRecommendation.prediction2str.reasoning}
            </div>
          )}
        </div>
      )}
      
      {/* 3-STR Card */}
      {smartRecommendation.prediction3str && (
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/30 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-bold text-slate-100">3-String Predictor</div>
              <div className="text-xs text-slate-400">
                {smartRecommendation.prediction3str.prefix ? `Analyzing: ${smartRecommendation.prediction3str.prefix}` : 'Next 3rd digit'}
              </div>
            </div>
            <div className={`rounded-full border px-2 py-1 text-xs ${
              smartRecommendation.prediction3str.source === 'live' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' :
              smartRecommendation.prediction3str.source === 'import' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' :
              'bg-amber-500/15 text-amber-200 border-amber-500/30'
            }`}>
              {smartRecommendation.prediction3str.source === 'live' ? '✓ Live' :
               smartRecommendation.prediction3str.source === 'import' ? '✓ Import' :
               '⚠️ Sheet'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
              <div className="text-xs text-slate-400">Main</div>
              <div className="text-lg font-extrabold text-white">
                {smartRecommendation.prediction3str.prediction ?? "—"}{" "}
                <span className="text-xs font-normal text-slate-300">
                  ({fmtPct(smartRecommendation.prediction3str.confidence)})
                </span>
              </div>
            </div>
            
            <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
              <div className="text-xs text-slate-400">Alt</div>
              <div className="text-lg font-extrabold text-white">
                {smartRecommendation.prediction3str.alt ?? "—"}
              </div>
            </div>
          </div>
          
          {smartRecommendation.prediction3str.reasoning && (
            <div className="mt-3 text-xs text-cyan-300 italic">
              {smartRecommendation.prediction3str.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
