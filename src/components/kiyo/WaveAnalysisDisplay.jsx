// import React from "react";

/**
 * WaveAnalysisDisplay
 * - Shows two column cards (Column 2 + Column 3) produced by KiyoModeCard's analyzeWavePatterns memo.
 * - Defensive: never assume shape; avoid ReferenceErrors like "col2 is not defined".
 */
export default function WaveAnalysisDisplay({
  analyzeWavePatterns,
  smartPrefixPrediction,
  smartRecommendation,
}) {
  const cols = Array.isArray(analyzeWavePatterns?.columns)
    ? analyzeWavePatterns.columns
    : [];
  const col2 = cols[0] ?? null;
  const col3 = cols[1] ?? null;
  const hasData = Boolean(col2 && col3);

  const clampPct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  };

  const fmtPct = (v) => {
    const p = clampPct(v);
    if (p === null) return "—";
    return `${Math.round(p * 100)}%`;
  };

  const statusLabel = (col) => {
    const s = col?.status;
    if (s === "due_to_flip") return "EXPECTED TO FLIP";
    if (s === "likely_continue") return "EXPECTED TO CONTINUE";
    if (s === "suppressed") return "SUPPRESSED";
    return "—";
  };

  const targetLabel = (col) => {
    // flipLabel is the human label for the target side (e.g., "Low (1/2)")
    if (typeof col?.flipLabel === "string" && col.flipLabel.trim())
      return col.flipLabel;
    // fallback to current label if missing
    if (
      typeof col?.runAnalysis?.label === "string" &&
      col.runAnalysis.label.trim()
    )
      return col.runAnalysis.label;
    return "—";
  };
  const getSwapRate = (col) =>
    col?.swapRate ?? col?.fingerprint?.swapRate ?? null;

  const isDominanceLock = (col) => {
    const runLen = Number.isFinite(col?.runAnalysis?.length)
      ? col.runAnalysis.length
      : 0;
    const sr = getSwapRate(col);
    return runLen >= 5 && sr != null && sr <= 0.4;
  };

  // “Guaranteed flip” heuristic (tweakable):
  // Only when it says flip AND confidence is high AND not suppressed.
  const isGuaranteedFlip = (col) => {
    const conf = Number(col?.confidence);
    return (
      col?.status === "due_to_flip" &&
      Number.isFinite(conf) &&
      conf >= 0.85 &&
      col?.status !== "suppressed"
    );
  };

  const cardTheme = (col) => {
    const sessionType = col?.fingerprint?.type;
    const suppressed = col?.status === "suppressed";
    const lock = isDominanceLock(col);
    const guaranteedFlip = isGuaranteedFlip(col);
    const expectedFlip = col?.status === "due_to_flip";

    if (suppressed || sessionType === "chaotic") {
      return {
        shell:
          "border-rose-500/40 bg-rose-950/15 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/15 text-rose-200 border-rose-500/30",
        accentText: "text-rose-200",
      };
    }

    if (lock || sessionType === "sticky-dominant") {
      return {
        shell:
          "border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]",
        badge: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
        accentText: "text-emerald-200",
      };
    }

    if (guaranteedFlip) {
      return {
        shell:
          "border-fuchsia-500/40 bg-fuchsia-950/10 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]",
        badge: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30",
        accentText: "text-fuchsia-200",
      };
    }

    if (expectedFlip) {
      return {
        shell:
          "border-amber-500/40 bg-amber-950/10 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]",
        badge: "bg-amber-500/15 text-amber-200 border-amber-500/30",
        accentText: "text-amber-200",
      };
    }

    // default
    return {
      shell: "border-slate-700/40 bg-slate-900/40",
      badge: "bg-slate-900/60 text-slate-200 border-slate-700/50",
      accentText: "text-slate-200",
    };
  };

  const renderColumnCard = (col) => {
    // 🛡️ CRITICAL FIX: If col is missing, don't try to render or read properties
    if (!col || typeof col !== "object") return null;

    const runLen = Number.isFinite(col?.runAnalysis?.length)
      ? col.runAnalysis.length
      : 0;
    const currentLabel =
      typeof col?.runAnalysis?.label === "string" &&
      col.runAnalysis.label.trim()
        ? col.runAnalysis.label
        : "—";

    const confidence = fmtPct(col?.confidence);
    const swapRate =
      col?.swapRate != null
        ? col.swapRate
        : col?.fingerprint?.swapRate != null
        ? col.fingerprint.swapRate
        : null;

    const swap = swapRate == null ? "—" : `${Math.round(swapRate * 100)}%`;
    // One brutal footer line (per your UI rule). Prefer adaptiveNote (already composed in KiyoModeCard).
    const footer =
      typeof col?.adaptiveNote === "string" && col.adaptiveNote.trim()
        ? col.adaptiveNote
        : typeof col?.flipStatus?.message === "string" &&
          col.flipStatus.message.trim()
        ? col.flipStatus.message
        : "";

    const sessionType =
      typeof col?.fingerprint?.type === "string" && col.fingerprint.type.trim()
        ? col.fingerprint.type
        : null;

    const expected = statusLabel(col);
    const expectedTarget = targetLabel(col);
    const theme = cardTheme(col);
    const isSuppressed = col?.status === "suppressed";

    return (
      <div
        key={`col-${col.column ?? col.name ?? Math.random()}`}
        className={`rounded-2xl border p-4 shadow ${theme.shell}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100">
              {col?.name ?? `Column ${col?.column ?? ""}`}
            </div>
            <div className="text-xs text-slate-400">{col?.label ?? ""}</div>
          </div>

          {/* Confidence chip */}
          <div
            className={`rounded-full border px-2 py-1 text-xs ${theme.badge}`}
          >
            Conf: {confidence}
          </div>
          <div
            className={`rounded-full border px-2 py-1 text-xs ${theme.badge}`}
          >
            Swap: {swap}
          </div>
        </div>

        {/* Current state + run */}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Current</div>
            <div className="truncate text-lg font-extrabold text-white">
              {currentLabel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Run</div>
            <div className="text-3xl font-extrabold text-white tabular-nums">
              {runLen}
            </div>
          </div>
        </div>

        {/* Expected block */}
        <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className={`text-xs font-bold ${theme.accentText}`}>
              {expected}
              {isSuppressed ? "" : ":"}
            </div>
            {sessionType && (
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                {sessionType}
              </div>
            )}
          </div>

          {!isSuppressed && (
            <div className="mt-1 text-sm font-bold text-white">
              {expectedTarget}
            </div>
          )}

          {/* One footer sentence */}
          {footer ? (
            <div className="mt-2 text-xs text-slate-300 italic">{footer}</div>
          ) : null}

          {/* Small risk / message line (optional) */}
          {typeof col?.message === "string" && col.message.trim() ? (
            <div className="mt-2 text-[11px] text-slate-400">{col.message}</div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderPrefix = () => {
    const p = smartPrefixPrediction;
    if (!p) return null;

    const main = p?.prediction ?? p?.main ?? null;
    const mainConf = p?.confidence ?? p?.mainConfidence ?? null;
    const alt = p?.altPrediction ?? p?.alt ?? null;
    const altConf = p?.altConfidence ?? null;
    const prefix = p?.prefix ?? p?.activePrefix ?? null;
    
    // Cascading predictor data
    const source = p?.source || 'unknown';
    const reasoning = p?.reasoning || '';

    const hasSomething = Boolean(main || alt || prefix);
    if (!hasSomething) return null;
    
    // Data source badge
    const sourceColor = 
      source === 'live' ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' :
      source === 'import' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30' :
      source === 'sheet' ? 'bg-amber-500/15 text-amber-200 border-amber-500/30' :
      'bg-slate-500/15 text-slate-200 border-slate-500/30';
      
    const sourceLabel =
      source === 'live' ? '✓ Live Rolls' :
      source === 'import' ? '✓ Import Data' :
      source === 'sheet' ? '⚠️ Sheet Data' :
      'Mixed';

    return (
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-100">
              Smart Prefix Predictor
            </div>
            {prefix ? (
              <div className="text-xs text-slate-400">Analyzing: {prefix}</div>
            ) : null}
          </div>
          
          {/* Data Source Badge */}
          <div className={`rounded-full border px-2 py-1 text-xs ${sourceColor}`}>
            {sourceLabel}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
            <div className="text-xs text-slate-400">Main</div>
            <div className="text-lg font-extrabold text-white">
              {main ?? "—"}{" "}
              <span className="text-xs font-normal text-slate-300">
                {mainConf != null ? `(${fmtPct(mainConf)})` : ""}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/40 bg-slate-950/20 p-3">
            <div className="text-xs text-slate-400">Alt</div>
            <div className="text-lg font-extrabold text-white">
              {alt ?? "—"}{" "}
              <span className="text-xs font-normal text-slate-300">
                {altConf != null ? `(${fmtPct(altConf)})` : ""}
              </span>
            </div>
          </div>
        </div>
        
        {/* Reasoning */}
        {reasoning && (
          <div className="mt-3 text-xs text-cyan-300 italic">
            {reasoning}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Column Status + Recommendation */}
      {hasData && analyzeWavePatterns?.bettingRecommendation && (
        <>
          {/* Column Status - Side by side with all info inline */}
          <div className="grid grid-cols-2 gap-2">
            {/* Column 2 Status */}
            <div className={`border rounded-lg p-2 ${
              analyzeWavePatterns.bettingRecommendation.col2Status === 'good'
                ? 'bg-green-500/10 border-green-500/30'
                : analyzeWavePatterns.bettingRecommendation.col2Status === 'bad'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-500/10 border-slate-500/30'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">Column 2</span>
                <span className="text-sm">
                  {analyzeWavePatterns.bettingRecommendation.col2Status === 'good' ? '✅' : 
                   analyzeWavePatterns.bettingRecommendation.col2Status === 'bad' ? '❌' : '⚪'}
                </span>
              </div>
              <div className={`text-[10px] mt-1 ${
                analyzeWavePatterns.bettingRecommendation.col2Status === 'good'
                  ? 'text-green-300'
                  : analyzeWavePatterns.bettingRecommendation.col2Status === 'bad'
                  ? 'text-red-300'
                  : 'text-slate-300'
              }`}>
                {analyzeWavePatterns.bettingRecommendation.col2Status === 'good' ? (
                  <div className="space-y-0.5">
                    <div>Pattern: {analyzeWavePatterns.columnAnalysis?.col2?.patternDetected?.type || 'detected'}</div>
                    <div>Conf: {Math.round((col2?.confidence || 0) * 100)}%</div>
                  </div>
                ) : analyzeWavePatterns.bettingRecommendation.col2Status === 'bad' ? (
                  <div className="font-bold">Status: Chaotic - SKIP</div>
                ) : (
                  <div>Monitoring...</div>
                )}
              </div>
            </div>

            {/* Column 3 Status */}
            <div className={`border rounded-lg p-2 ${
              analyzeWavePatterns.bettingRecommendation.col3Status === 'good'
                ? 'bg-green-500/10 border-green-500/30'
                : analyzeWavePatterns.bettingRecommendation.col3Status === 'bad'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-500/10 border-slate-500/30'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">Column 3</span>
                <span className="text-sm">
                  {analyzeWavePatterns.bettingRecommendation.col3Status === 'good' ? '✅' : 
                   analyzeWavePatterns.bettingRecommendation.col3Status === 'bad' ? '❌' : '⚪'}
                </span>
              </div>
              <div className={`text-[10px] mt-1 ${
                analyzeWavePatterns.bettingRecommendation.col3Status === 'good'
                  ? 'text-green-300'
                  : analyzeWavePatterns.bettingRecommendation.col3Status === 'bad'
                  ? 'text-red-300'
                  : 'text-slate-300'
              }`}>
                {analyzeWavePatterns.bettingRecommendation.col3Status === 'good' ? (
                  <div className="space-y-0.5">
                    <div>Pattern: {analyzeWavePatterns.columnAnalysis?.col3?.patternDetected?.type || 'detected'}</div>
                    <div>Conf: {Math.round((col3?.confidence || 0) * 100)}%</div>
                  </div>
                ) : analyzeWavePatterns.bettingRecommendation.col3Status === 'bad' ? (
                  <div className="font-bold">Status: Chaotic - SKIP</div>
                ) : (
                  <div>Monitoring...</div>
                )}
              </div>
            </div>
          </div>

          {/* Compact Recommendation - Smaller */}
          <div className={`border rounded-lg p-2 ${
            analyzeWavePatterns.bettingRecommendation.focus === 'none' 
              ? 'bg-red-500/10 border-red-500/50' 
              : analyzeWavePatterns.bettingRecommendation.focus === 'both'
              ? 'bg-green-500/10 border-green-500/50'
              : 'bg-yellow-500/10 border-yellow-500/50'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span className={`text-xs font-bold ${
                analyzeWavePatterns.bettingRecommendation.focus === 'none' 
                  ? 'text-red-400' 
                  : analyzeWavePatterns.bettingRecommendation.focus === 'both'
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}>
                {analyzeWavePatterns.bettingRecommendation.suggestion}
              </span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 opacity-90">
              {analyzeWavePatterns.bettingRecommendation.message}
            </div>
          </div>
        </>
      )}

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[col2, col3].map(renderColumnCard)}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700/30 bg-slate-900/30 p-6 text-slate-300">
          ⏳ Waiting for wave data…
        </div>
      )}

      {/* 2-STR and 3-STR Predictions Side by Side */}
      {smartRecommendation && (smartRecommendation.prediction2str || smartRecommendation.prediction3str) && (
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
      )}
    </div>
  );
}
