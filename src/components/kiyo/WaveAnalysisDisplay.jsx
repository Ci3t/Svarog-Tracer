// import React from "react";

/**
 * WaveAnalysisDisplay
 * - Shows two column cards (Column 2 + Column 3) produced by KiyoModeCard's analyzeWavePatterns memo.
 * - Defensive: never assume shape; avoid ReferenceErrors like "col2 is not defined".
 */
export default function WaveAnalysisDisplay({
  analyzeWavePatterns,
  smartPrefixPrediction,
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

    const hasSomething = Boolean(main || alt || prefix);
    if (!hasSomething) return null;

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
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/30 p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-cyan-200">
              Wave Analysis
            </div>
            <div className="text-xs text-slate-400">
              Table-adaptive state machine (Column 2 + Column 3)
            </div>
          </div>
          {analyzeWavePatterns?.windowQuality ? (
            <div className="text-xs text-slate-300">
              Window:{" "}
              <span className="font-bold">
                {analyzeWavePatterns.windowQuality}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[col2, col3].map(renderColumnCard)}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700/30 bg-slate-900/30 p-6 text-slate-300">
          ⏳ Waiting for wave data…
        </div>
      )}

      {renderPrefix()}
    </div>
  );
}
