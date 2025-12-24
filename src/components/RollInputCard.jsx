import React, { useState } from "react";
import { sanitizeRollInput } from "../utils/stringHelpers";
import LongStringLabCard from "./LongStringLabCard";
import KiyoModeCard from "./KiyoModeCard"; // 🔥 NEW

export default function RollInputCard({
  rollInput,
  setRollInput,
  onAdd,
  entriesCount,
  onSendLongStringToDebug,
  entries, // 🔥 NEW: pass entries for Kiyo Mode
  debugLogs,
  onSendKiyoDebugData,
  onSendToDebug,
  pendingKiyoSnapshotsRef,
}) {
  const [activeTab, setActiveTab] = useState("live"); // live | long | kiyo

  return (
    <div 
      className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl"
      style={{
        position: 'sticky',
        top: '0',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            {activeTab === "live"
              ? "Live roll input"
              : activeTab === "long"
              ? "Long string lab"
              : "Kiyo Mode (EU)"}
          </h2>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 cursor-default whitespace-nowrap">
          {entriesCount} rolls
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("live")}
          className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition ${
            activeTab === "live"
              ? "bg-violet-600 text-white border-violet-400 shadow"
              : "bg-slate-900/50 text-slate-300 border-slate-700 hover:text-white"
          }`}
        >
          Live input
        </button>

        <button
          onClick={() => setActiveTab("long")}
          className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition ${
            activeTab === "long"
              ? "bg-violet-600 text-white border-violet-400 shadow"
              : "bg-slate-900/50 text-slate-300 border-slate-700 hover:text-white"
          }`}
        >
          Long string
        </button>

        {/* 🔥 NEW: Kiyo Mode Tab */}
        <button
          onClick={() => setActiveTab("kiyo")}
          className={`px-3 py-1.5 rounded-full text-xs border cursor-pointer transition ${
            activeTab === "kiyo"
              ? "bg-emerald-600 text-white border-emerald-400 shadow"
              : "bg-slate-900/50 text-slate-300 border-slate-700 hover:text-white"
          }`}
        >
          🌊 Kiyo Mode
        </button>
      </div>

      {/* LIVE INPUT TAB */}
      {activeTab === "live" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={rollInput}
              onChange={(e) => setRollInput(sanitizeRollInput(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && onAdd()}
              placeholder="Enter roll: 42, 234, 3441..."
              className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <button
              onClick={onAdd}
              className="w-full sm:w-auto px-6 cursor-pointer py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all"
            >
              Add
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-3">
            Input only digits 1–4. We auto-split and pad to 5 digits for 2/3/4/5
            string views.
          </p>
        </>
      )}

      {/* LONG STRING TAB */}
      {activeTab === "long" && (
        <div className="mt-2">
          <LongStringLabCard onSendToDebug={onSendLongStringToDebug} />
        </div>
      )}

      {/* 🔥 NEW: KIYO MODE TAB */}
      {activeTab === "kiyo" && (
        <div className="mt-2">
          <KiyoModeCard
            key={`kiyo-${entries.length}`}
            entries={entries}
            onSendToDebug={onSendToDebug}
            debugLogs={debugLogs}
            onSendKiyoDebugData={onSendKiyoDebugData}
            pendingKiyoSnapshotsRef={pendingKiyoSnapshotsRef}
          />
        </div>
      )}
    </div>
  );
}
