// src/components/LongStringLabCard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { decodeLongString } from "../utils/stringHelpers.js";
import { getModeBreakdown } from "../utils/predictNext.js";
import { predictNext2Smart } from "../utils/enhanced-2str-predictor";
import { get2StrPatchInfo } from "../utils/twoStrHistoricalData";

export default function LongStringLabCard({ onSendToDebug }) {
  const [input, setInput] = useState("");

  // ✅ NEW: region + imported rolls
  const [region, setRegion] = useState("ALL");
  const [importedRolls, setImportedRolls] = useState([]);
  const fileInputRef = useRef(null);

  // ✅ Mini performance stats
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [correctPredictions, setCorrectPredictions] = useState(0);

  // decode to pairs + 2-str rolls
  const { cleaned, pairs, rolls } = useMemo(
    () => decodeLongString(input),
    [input]
  );

  const allRolls = useMemo(
    () => [...rolls, ...importedRolls],
    [rolls, importedRolls]
  );

  // ✅ SMART sandbox prediction (region-aware now)
  const labPrediction = useMemo(() => {
    if (!allRolls.length) return null;
    return predictNext2Smart(allRolls, { region });
  }, [allRolls, region]);

  const altSandboxPct = useMemo(() => {
    if (!labPrediction || !labPrediction.alt) return null;
    const candidates = Array.isArray(labPrediction.candidates)
      ? labPrediction.candidates
      : [];
    const match = candidates.find(
      (c) => String(c.value) === String(labPrediction.alt)
    );
    return match ? match.pct : null;
  }, [labPrediction]);

  // ✅ Auto performance tracking
  const prevRollCountRef = useRef(0);
  const lastPredictionRef = useRef(null);

  useEffect(() => {
    if (!labPrediction || !labPrediction.prediction) return;

    if (allRolls.length > prevRollCountRef.current) {
      const newActual = allRolls[allRolls.length - 1];

      if (lastPredictionRef.current) {
        setTotalPredictions((t) => t + 1);

        if (newActual === lastPredictionRef.current) {
          setCorrectPredictions((c) => c + 1);
        }
      }

      lastPredictionRef.current = labPrediction.prediction;
      prevRollCountRef.current = allRolls.length;
    }
  }, [allRolls, labPrediction]);

  // 🔥 AUTO-SEND to debug
  const prevDebugCountRef = useRef(0);
  useEffect(() => {
    if (!onSendToDebug) return;

    if (rolls.length <= prevDebugCountRef.current) {
      prevDebugCountRef.current = rolls.length;
      return;
    }

    const newRolls = rolls.slice(prevDebugCountRef.current);
    prevDebugCountRef.current = rolls.length;

    if (newRolls.length) {
      onSendToDebug(newRolls);
    }
  }, [rolls, onSendToDebug]);

  // ✅ Patch label from region
  const patchLabel = useMemo(() => {
    const info = get2StrPatchInfo(region);
    if (!info || !info.length) return "Patch: —";

    const patches = Array.from(
      new Set(info.map((p) => p.patch).filter(Boolean))
    );

    if (!patches.length) return "Patch: —";

    patches.sort((a, b) => {
      const [aM, aN] = a.split(".").map(Number);
      const [bM, bN] = b.split(".").map(Number);
      return aM === bM ? aN - bN : aM - bM;
    });

    if (patches.length === 1) return `Patch: ${patches[0]}`;
    return `Patch: ${patches[0]} – ${patches[patches.length - 1]}`;
  }, [region]);

  // ✅ TXT IMPORT
  const handleImportChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).map((l) => l.trim());
      const valid = lines.filter((l) => /^[1-4]{2}$/.test(l));
      if (!valid.length) return;
      setImportedRolls((prev) => [...prev, ...valid]);
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  // ✅ TXT EXPORT
  const handleExportTxt = () => {
    if (!allRolls.length) return;
    const text = allRolls.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sandbox-2str-session.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const accuracyPct =
    totalPredictions > 0
      ? Math.round((correctPredictions / totalPredictions) * 100)
      : 0;

  return (
    <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-4 sm:p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-200">
          🧪 Long String Lab (SMART)
        </h3>
      </div>

      {/* Region + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase text-slate-400">Region:</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded text-xs px-2 py-1 text-slate-100"
          >
            <option value="ALL">Global</option>
            <option value="America">America</option>
            <option value="EU">EU</option>
            <option value="ASIA">Asia</option>
          </select>
          <span className="text-[11px] text-slate-500">{patchLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTxt}
            className="text-[11px] px-2 py-1 border border-slate-700 rounded bg-slate-900 text-slate-200"
          >
            Download txt
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] px-2 py-1 border border-violet-600 rounded bg-violet-700/40 text-violet-100"
          >
            Import txt
          </button>

          {importedRolls.length > 0 && (
            <button
              onClick={() => setImportedRolls([])}
              className="text-[11px] px-2 py-1 border border-red-600 rounded bg-red-700/30 text-red-200"
            >
              Clear imported ({importedRolls.length})
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Example: 41242323"
        className="w-full rounded-lg bg-slate-950/70 border border-slate-700/60 px-3 py-1.5 text-xs text-slate-100 font-mono"
      />

      {/* Decoded Rolls */}
      <div className="text-[11px] text-slate-400">
        Rolls:{" "}
        <span className="text-emerald-300 font-mono">{allRolls.join(" ")}</span>
      </div>

      {/* ✅ SMART Prediction */}
      {labPrediction && labPrediction.prediction && (
        <div className="bg-slate-950/60 border border-emerald-600/30 rounded-lg p-3">
          <div className="text-emerald-300 font-mono text-sm">
            Main: {labPrediction.prediction} (
            {Math.round((labPrediction.confidence || 0) * 100)}%)
          </div>

          {labPrediction.alt && (
            <div className="text-amber-300 font-mono text-xs mt-1">
              Alt: {labPrediction.alt}
              {altSandboxPct != null && ` (${altSandboxPct}%)`}
            </div>
          )}

          <div className="text-[10px] text-slate-400 mt-1">
            {Math.round(labPrediction.liveShare * 100)}% live /{" "}
            {Math.round(labPrediction.sheetShare * 100)}% sheet
          </div>

          <div className="text-[10px] text-purple-300 mt-0.5">
            Mode: {labPrediction.mode}
          </div>

          {/* ✅ Performance Mini Stats */}
          <div className="text-[10px] text-slate-400 mt-1">
            Sandbox accuracy: {correctPredictions}/{totalPredictions} (
            {accuracyPct}%)
          </div>
        </div>
      )}
    </div>
  );
}
