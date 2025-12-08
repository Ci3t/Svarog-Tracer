import React, { useState } from "react";
import RawInputHelper from "./kiyo/RawInputHelper";
import WavePairingTable from "./kiyo/WavePairingTable";
import WaveAccuracyDisplay from "./kiyo/WaveAccuracyDisplay";

export default function AdvancedToolsSection({
  waveAccuracy,
  kiyoAccuracy,
  pairingViz,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-300">
              Advanced Tools
            </div>
            <div className="text-xs text-slate-400">
              Accuracy stats • Raw input • Wave pairing
            </div>
          </div>
        </div>
        <span className="text-slate-400">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-slate-700">
          {/* Wave Accuracy Display */}
          <WaveAccuracyDisplay
            waveAccuracy={waveAccuracy}
            kiyoAccuracy={kiyoAccuracy}
          />

          {/* Raw Input Helper */}
          <RawInputHelper />

          {/* Wave Pairing Table */}
          {pairingViz && <WavePairingTable pairingViz={pairingViz} />}
        </div>
      )}
    </div>
  );
}
