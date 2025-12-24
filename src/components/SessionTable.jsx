import React from "react";
import { translateTo4 } from "../utils/stringHelpers"; // 👈 use the shared one
import LiveTrackingTable from "./LiveTrackingTable";

export default function SessionTable({
  sessionTab,
  setSessionTab,
  entries,
  prevSessions,
  onDeleteEntry,
  onDeleteSession,
}) {
  // pad 4/3/2 digit translated strings to 5 digits like 41 -> 41000
  function padTo5(str = "") {
    if (!str) return "—";
    return str.padEnd(5, "0");
  }

  // take any slice (s2/s3/s4/s5), translate to 4xxx, then pad
  function toTranslatedPadded(slice = "") {
    if (!slice) return "—";
    const t = translateTo4(slice); // "41", "432", ...
    return padTo5(t);
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
      <div className="p-4 sm:p-6 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 bg-slate-900/50 rounded-lg p-1 cursor-pointer">
          <button
            onClick={() => setSessionTab("current")}
            className={`px-3 sm:px-4 cursor-pointer py-2 rounded-lg text-xs sm:text-sm font-medium ${
              sessionTab === "current"
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setSessionTab("previous")}
            className={`px-3 sm:px-4 cursor-pointer py-2 rounded-lg text-xs sm:text-sm font-medium ${
              sessionTab === "previous"
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            History
          </button>
          <button
            onClick={() => setSessionTab("all")}
            className={`px-3 sm:px-4 cursor-pointer py-2 rounded-lg text-xs sm:text-sm font-medium ${
              sessionTab === "all"
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {sessionTab === "current" ? (
        /* CURRENT SESSION TABLE */
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full min-w-[600px] text-xs sm:text-sm">
            <thead className="bg-slate-900/60 sticky top-0">
              <tr className="text-left text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Raw</th>
                <th className="py-3 px-4">Translated</th>
                <th className="py-3 px-4">2-str</th>
                <th className="py-3 px-4">3-str</th>
                <th className="py-3 px-4">4-str</th>
                <th className="py-3 px-4">5-str</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 sm:px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {[...entries].reverse().map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-3 px-4 sm:px-6 font-mono text-xs sm:text-sm text-slate-200">
                    {e.raw}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs sm:text-sm text-violet-300">
                    {e.translated}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-200">
                    {toTranslatedPadded(e.s2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-300">
                    {toTranslatedPadded(e.s3)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-400">
                    {toTranslatedPadded(e.s4)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-500">
                    {toTranslatedPadded(e.s5)}
                  </td>
                  <td className="py-3 px-4 text-[11px] sm:text-xs text-slate-500">
                    {e.time && !isNaN(new Date(e.time).getTime()) 
                      ? new Date(e.time).toLocaleTimeString() 
                      : '--:--:--'}
                  </td>
                  <td className="py-3 px-4 sm:px-6 text-right">
                    <button
                      onClick={() => onDeleteEntry(e.id)}
                      className="text-[11px] sm:text-xs text-slate-500 hover:text-red-400 cursor-pointer"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-slate-500 text-sm"
                  >
                    No rolls yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : sessionTab === "previous" ? (
        /* HISTORY VIEW */
        <div className="p-4 sm:p-6 space-y-3 max-h-[500px] overflow-auto">
          {prevSessions.length === 0 && (
            <p className="text-sm text-slate-500">
              No previous sessions recorded.
            </p>
          )}
          {prevSessions.length > 0 && (
            <button
              onClick={() => onDeleteSession("ALL")}
              className="text-xs cursor-pointer text-slate-400 hover:text-red-400"
            >
              Delete all history
            </button>
          )}
          {prevSessions.map((sess, idx) => (
            <details
              key={sess.id}
              className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden"
            >
              <summary className="px-4 py-3 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-800/30">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    5m Session #{prevSessions.length - idx} •{" "}
                    {new Date(sess.startedAt).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-slate-500">
                    {sess.region} • Patch {sess.patch}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {sess.entries.length} rows
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteSession(sess.id);
                    }}
                    className="text-xs text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    delete
                  </button>
                </div>
              </summary>
              <div className="px-4 py-3">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left py-1 pr-2">Raw</th>
                      <th className="text-left py-1 pr-2">2-str</th>
                      <th className="text-left py-1 pr-2">Trend</th>
                      <th className="text-left py-1 pr-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/20">
                    {sess.entries.map((e, idx) => {
                      // Calculate trend for this value in this session
                      const mid = Math.floor(sess.entries.length / 2);
                      const firstHalf = sess.entries.slice(0, mid);
                      const secondHalf = sess.entries.slice(mid);
                      const value = toTranslatedPadded(e.s2).slice(0, 2);
                      const firstCount = firstHalf.filter(entry => toTranslatedPadded(entry.s2).slice(0, 2) === value).length;
                      const secondCount = secondHalf.filter(entry => toTranslatedPadded(entry.s2).slice(0, 2) === value).length;
                      
                      let trend = '→';
                      if (secondCount > firstCount * 1.2) trend = '↑';
                      else if (secondCount < firstCount * 0.8) trend = '↓';
                      
                      return (
                        <tr key={e.id}>
                          <td className="py-1 pr-2 font-mono">{e.raw}</td>
                          <td className="py-1 pr-2 font-mono">
                            {toTranslatedPadded(e.s2)}
                          </td>
                          <td className="py-1 pr-2 text-slate-400">{trend}</td>
                          <td className="py-1 pr-2 text-slate-500">
                            {e.time && !isNaN(new Date(e.time).getTime()) 
                              ? new Date(e.time).toLocaleTimeString() 
                              : '--:--:--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* 🦁 BBP Mode Analysis for this session */}
                {sess.beastAnalysis && sess.beastAnalysis.distribution && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      🦁 BBP Mode Analysis
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-slate-500">Commons:</span>{' '}
                        <span className="text-green-400 font-mono">
                          {sess.beastAnalysis.commons.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pattern:</span>{' '}
                        <span className="text-violet-300">
                          {sess.beastAnalysis.pattern}
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left py-1 pr-2">Value</th>
                          <th className="text-left py-1 pr-2">Count</th>
                          <th className="text-left py-1 pr-2">%</th>
                          <th className="text-left py-1 pr-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/20">
                        {sess.beastAnalysis.distribution.map((item) => (
                          <tr key={item.value} className={item.status === 'common' ? 'bg-green-500/5' : ''}>
                            <td className="py-1 pr-2 font-mono font-bold">{item.value}</td>
                            <td className="py-1 pr-2">{item.count}</td>
                            <td className="py-1 pr-2">{item.pct.toFixed(1)}%</td>
                            <td className="py-1 pr-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.status === 'common' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-slate-700/30 text-slate-500'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        /* ALL VIEW (current + history flattened) */
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full min-w-[600px] text-xs sm:text-sm">
            <thead className="bg-slate-900/60 sticky top-0">
              <tr className="text-left text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Raw</th>
                <th className="py-3 px-4">Translated</th>
                <th className="py-3 px-4">2-str</th>
                <th className="py-3 px-4">3-str</th>
                <th className="py-3 px-4">4-str</th>
                <th className="py-3 px-4">5-str</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {[...entries, ...prevSessions.flatMap((s) => s.entries || [])]
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4 sm:px-6 font-mono text-xs sm:text-sm text-slate-200">
                      {e.raw}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs sm:text-sm text-violet-300">
                      {e.translated}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-200">
                      {toTranslatedPadded(e.s2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-300">
                      {toTranslatedPadded(e.s3)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-400">
                      {toTranslatedPadded(e.s4)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] sm:text-xs text-slate-500">
                      {toTranslatedPadded(e.s5)}
                    </td>
                    <td className="py-3 px-4 text-[11px] sm:text-xs text-slate-500">
                      {e.time && !isNaN(new Date(e.time).getTime()) 
                        ? new Date(e.time).toLocaleTimeString() 
                        : '--:--:--'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
