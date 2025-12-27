import React, { useMemo, useState, useRef } from "react";
import PredictionCard from "./PredictionCard";
import { predictNext3, predictNext4 } from "../utils/predictNext";
import { predictNext2BBPMode } from "../utils/bbp-mode-2str"; // 🔥 UPDATED: Use BBP mode
import { predictNext3BBPMode } from "../utils/bbp-mode-3str"; // 🔥 NEW
import { get2StrPatchInfo } from "../utils/twoStrHistoricalData";

export default function NextPrediction({ entries, suggestTab, setSuggestTab }) {
  // local state for region + imported rolls (txt)
  const [region, setRegion] = useState("ALL");
  const [importedRolls, setImportedRolls] = useState([]);
  const fileInputRef = useRef(null);

  // sort oldest → newest
  const ordered = useMemo(
    () => [...entries].sort((a, b) => new Date(a.time) - new Date(b.time)),
    [entries]
  );

  // build each stream from session entries
  // 🔥 CRITICAL FIX: Use TRANSLATED values for 2-str, not raw s2
  const rolls2 = useMemo(
    () => ordered
      .map((e) => (e.translated || '').slice(0, 2)) // Use translated 4xxx format
      .filter((r) => r && r.length === 2),
    [ordered]
  );
  // 🔥 NEW: Use TRANSLATED values for 3-str as well
  const rolls3 = useMemo(
    () => ordered
      .map((e) => (e.translated || '').slice(0, 3)) // Use translated 4xxx format
      .filter((r) => r && r.length === 3),
    [ordered]
  );
  const rolls4 = useMemo(
    () => ordered.map((e) => e.s4).filter((r) => r && r.length >= 4),
    [ordered]
  );

  // live session s2 + any imported txt rolls
  const all2Rolls = useMemo(
    () => [...rolls2, ...importedRolls],
    [rolls2, importedRolls]
  );

  // compute patch label for current region from sheet metadata
  const patchLabel = useMemo(() => {
    const info = get2StrPatchInfo(region);
    if (!info || !info.length) return "Patch: —";

    const patches = Array.from(
      new Set(info.map((p) => p.patch).filter(Boolean))
    );

    if (!patches.length) return "Patch: —";

    patches.sort((a, b) => {
      const [amaj, amin] = a.split(".").map(Number);
      const [bmaj, bmin] = b.split(".").map(Number);
      return amaj === bmaj ? amin - bmin : amaj - bmaj;
    });

    if (patches.length === 1) return `Patch: ${patches[0]}`;
    return `Patch: ${patches[0]} – ${patches[patches.length - 1]}`;
  }, [region]);

  const prediction = useMemo(() => {
    switch (suggestTab) {
      case "3":
        // 🔥 NEW: Use BBP Mode for 3-str
        return predictNext3BBPMode(rolls3);
      case "4":
        return predictNext4(rolls4);
      default:
        // 🔥 UPDATED: Use BBP Mode for 2-str instead of predictNext2Smart
        return predictNext2BBPMode(all2Rolls);
    }
  }, [suggestTab, rolls3, rolls4, all2Rolls]);

  // --- export s2 to txt ---
  const handleExportTxt = () => {
    if (!all2Rolls.length) return;
    const text = all2Rolls.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "svarog-2str-session.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // --- import s2 from txt ---
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

  return (
    <div className="space-y-2">
      {/* extra controls only matter for 2-str tab */}
      {suggestTab === "2" && (
        <div className="mb-2 space-y-1">
          {/* Top row: Region + buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Region */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-slate-400">
                Region data
              </span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-slate-900/70 border border-slate-700 text-[11px] rounded-md px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-400"
              >
                <option value="ALL">Global (ALL)</option>
                <option value="America">America</option>
                <option value="EU">EU</option>
                <option value="ASIA">Asia</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportTxt}
                className="text-[11px] px-2 py-1 rounded-md border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-violet-400 hover:text-violet-100 transition-colors"
              >
                Download s2 txt
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] px-2 py-1 rounded-md border border-violet-600/70 bg-violet-700/30 text-violet-50 hover:bg-violet-600/40 transition-colors"
              >
                Import s2 txt
              </button>

              {importedRolls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setImportedRolls([])}
                  className="text-[11px] px-2 py-1 rounded-md border border-red-600/60 bg-red-800/20 text-red-200 hover:bg-red-700/40 transition-colors"
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

          {/* Patch + Imported info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{patchLabel}</span>
            {importedRolls.length > 0 && (
              <span>Imported: {importedRolls.length} rolls</span>
            )}
          </div>
        </div>
      )}

      <PredictionCard
        prediction={prediction}
        suggestTab={suggestTab}
        setSuggestTab={setSuggestTab}
        rollCount={suggestTab === "2" ? all2Rolls.length : suggestTab === "3" ? rolls3.length : rolls4.length}
        minRolls={6}
      />
    </div>
  );
}
