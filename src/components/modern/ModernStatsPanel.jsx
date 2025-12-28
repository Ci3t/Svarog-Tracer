import React, { useMemo, useState } from "react";

// Detect line from last entry's RAW input (last digit)
function detectLineFromEntry(entry) {
  if (!entry?.raw) return null;
  const lastDigit = Number(entry.raw[entry.raw.length - 1]);
  return [1, 2, 3, 4].includes(lastDigit) ? lastDigit : null;
}

// Caesar shift for ANY length string (2-str, 3-str, 4-str)
function caesarShiftForLine(prediction, line) {
  if (!prediction || !line) return null;

  const cleanPred = String(prediction).replace(/[^1-4]/g, "");
  if (!cleanPred) return null;

  const lineDigit = Number(line);
  if (lineDigit < 1 || lineDigit > 4) return null;

  const digits = cleanPred.split("").map(Number);

  // Shift so that the first digit becomes `line`
  const shift = (lineDigit - digits[0] + 4) % 4;

  const shifted = digits
    .map((d) => {
      const z = d - 1; // convert to 0-3
      const s = (z + shift) % 4; // apply shift
      return (s + 1).toString(); // convert back to 1-4
    })
    .join("");

  return shifted;
}

export default function ModernStatsPanel({
  entries,
  prediction2,
  prediction3,
  prediction4,
  currentRegion,
  currentPatch,
}) {
  const [manualLine, setManualLine] = useState("");
  const [activeTab, setActiveTab] = useState("2"); // 2, 3, or 4

  // Select active prediction based on tab
  const prediction =
    activeTab === "3"
      ? prediction3
      : activeTab === "4"
      ? prediction4
      : prediction2;

  // Extract prediction data
  const mainPred = prediction?.prediction || null;
  const mainPct = Math.round((prediction?.confidence || 0) * 100);
  const alt = prediction?.alt || null;
  const mode = prediction?.mode || "—";

  // Auto-detect line from last roll's LAST DIGIT (from RAW)
  const autoLine = useMemo(() => {
    if (!entries || !entries.length) return null;
    return detectLineFromEntry(entries[0]); // newest first
  }, [entries]);

  // For MAIN/ALT display: always use auto-detected line
  const autoShiftedMain =
    mainPred && autoLine ? caesarShiftForLine(mainPred, autoLine) : mainPred;

  const autoShiftedAlt =
    alt && autoLine ? caesarShiftForLine(alt, autoLine) : alt;

  // For LINE HELPER: use manual if set, otherwise auto
  const manualEffectiveLine = manualLine ? Number(manualLine) : autoLine;

  const manualShiftedMain =
    mainPred && manualEffectiveLine
      ? caesarShiftForLine(mainPred, manualEffectiveLine)
      : null;

  const manualShiftedAlt =
    alt && manualEffectiveLine
      ? caesarShiftForLine(alt, manualEffectiveLine)
      : null;

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Stats & Line Helper
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {currentRegion} • Patch {currentPatch}
          </p>
        </div>

        {/* Stream tabs */}
        <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
          {["2", "3", "4"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab}-str
            </button>
          ))}
        </div>
      </div>

      {/* AUTO-SHIFTED STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-2">Main Prediction</div>
          <div className="text-4xl font-mono font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {autoShiftedMain ?? "—"}
          </div>
          <div className="text-[11px] text-slate-400">
            Confidence: <span className="text-violet-300 font-semibold">{mainPct}%</span>
          </div>
        </div>

        <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-2">Alternative</div>
          <div className="text-4xl font-mono font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
            {autoShiftedAlt ?? "—"}
          </div>
          <div className="text-[11px] text-slate-400">
            Mode: <span className="text-slate-200 font-medium">{mode}</span>
          </div>
        </div>
      </div>

      {/* Auto-shift indicator */}
      {autoLine && mainPred && (
        <div className="text-[10px] text-amber-400 bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-900/30 mb-6">
          ✨ Auto: Last line {autoLine} • {mainPred} → {autoShiftedMain}
          {alt && ` • ${alt} → ${autoShiftedAlt}`}
        </div>
      )}

      {/* LINE HELPER SECTION */}
      <div className="pt-6 border-t border-slate-700/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">🎯</span>
            Line Helper (Manual)
          </span>
          {autoLine && !manualLine && (
            <span className="text-[11px] text-slate-400">
              Last line:{" "}
              <span className="text-amber-300 font-bold">{autoLine}</span>
            </span>
          )}
        </div>

        {/* Line selection buttons */}
        <div className="flex gap-3 items-center mb-4">
          <label className="text-xs text-slate-400 w-20 shrink-0">
            Your line:
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((line) => (
              <button
                key={line}
                onClick={() => setManualLine(String(line))}
                className={`w-12 h-12 rounded-xl text-sm font-bold transition-all duration-200 ${
                  (manualLine ? Number(manualLine) : null) === line
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-105"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-700 border border-slate-700/50 hover:scale-105"
                }`}
              >
                {line}
              </button>
            ))}
            {manualLine && (
              <button
                onClick={() => setManualLine("")}
                className="px-4 text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Manual shifted results */}
        {manualLine &&
        manualEffectiveLine &&
        (manualShiftedMain || manualShiftedAlt) ? (
          <div className="space-y-3">
            {/* Shifted Main */}
            {manualShiftedMain && (
              <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-xl p-4 border border-violet-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-violet-300 font-semibold uppercase tracking-wider">
                    Main → What to Click
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {mainPred} @ line {manualEffectiveLine} ={" "}
                    {manualShiftedMain}
                  </span>
                </div>
                <div className="text-4xl font-mono font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent text-center tracking-wider">
                  {manualShiftedMain}
                </div>
              </div>
            )}

            {/* Shifted Alt */}
            {manualShiftedAlt && (
              <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl p-4 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                    Alt → Backup Option
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {alt} @ line {manualEffectiveLine} = {manualShiftedAlt}
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent text-center tracking-wider">
                  {manualShiftedAlt}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/50">
            Click a line number to see manual Caesar shift
          </div>
        )}

        {/* Explanation */}
        <div className="mt-4 text-[10px] text-slate-500 leading-relaxed bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
          <p className="mb-1">
            <span className="text-amber-400 font-semibold">How it works:</span>{" "}
            Top shows auto-shifted based on your last roll. Manual section lets
            you override for different lines.
          </p>
          <p className="text-[9px]">
            Example: Predictor says <span className="font-mono">42</span>, last
            roll was <span className="font-mono">31</span> (line 1) → shows{" "}
            <span className="font-mono text-violet-300">13</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
