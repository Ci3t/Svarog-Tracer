import React from "react";
import { translateTo4 } from "../../utils/stringHelpers";

export default function ModernSessionTable({
  sessionTab,
  setSessionTab,
  entries,
  prevSessions,
  onDeleteEntry,
  onDeleteSession,
  onImportRolls, // NEW: Callback to import rolls from file
  isAutoImporting = false, // NEW: Track if import is in progress
}) {
  // pad 4/3/2 digit translated strings to 5 digits like 41 -> 41000
  function padTo5(str = "") {
    if (!str) return "—";
    return str.padEnd(5, "0");
  }

  // take any slice (s2/s3/s4/s5), translate to 4xxx, then pad
  function toTranslatedPadded(slice = "") {
    if (!slice) return "—";
    const t = translateTo4(slice);
    return padTo5(t);
  }

  // Download current session as TXT (same format as debug export)
  const handleDownloadCurrentSession = () => {
    if (entries.length === 0) return;

    const lines = ["=== Session Data Export ===", "", "--- Current Session ---"];
    
    entries.forEach((e) => {
      const timeStr = e.time && !isNaN(new Date(e.time).getTime())
        ? new Date(e.time).toLocaleTimeString()
        : "--:--:--";
      
      lines.push(
        `[${timeStr}] RAW: ${e.raw} | TRANSLATED: ${e.translated} | ` +
        `2-str: ${toTranslatedPadded(e.s2)} | 3-str: ${toTranslatedPadded(e.s3)} | ` +
        `4-str: ${toTranslatedPadded(e.s4)} | 5-str: ${toTranslatedPadded(e.s5)}`
      );
    });

    const txtContent = lines.join("\n");
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session_rolls_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download a specific history session as TXT
  // Rolls are in chronological order (oldest = earliest input, at top of file)
  const handleDownloadSession = (sess) => {
    if (!sess || !sess.entries || sess.entries.length === 0) return;

    const sessionNum = prevSessions.length - prevSessions.findIndex(s => s.id === sess.id);
    const startTime = new Date(sess.startedAt).toLocaleTimeString();
    const lines = [
      "=== Session Data Export ===",
      "",
      `--- Session #${sessionNum} (started ${startTime}) ---`,
    ];

    // entries are stored oldest-first — chronological order matches how they were entered
    sess.entries.forEach((e) => {
      const timeStr = e.time && !isNaN(new Date(e.time).getTime())
        ? new Date(e.time).toLocaleTimeString()
        : "--:--:--";
      lines.push(
        `[${timeStr}] RAW: ${e.raw} | TRANSLATED: ${e.translated} | ` +
        `2-str: ${toTranslatedPadded(e.s2)} | 3-str: ${toTranslatedPadded(e.s3)} | ` +
        `4-str: ${toTranslatedPadded(e.s4)} | 5-str: ${toTranslatedPadded(e.s5)}`
      );
    });

    const txtContent = lines.join("\n");
    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date(sess.startedAt).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    link.download = `session_${sessionNum}_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="astral-session-table bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Header with Tabs */}
      <div className="p-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Session Data
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-900/50 rounded-xl p-1">
            <button
              onClick={() => setSessionTab("current")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                sessionTab === "current"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setSessionTab("previous")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                sessionTab === "previous"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              History
            </button>
            <button
              onClick={() => setSessionTab("all")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                sessionTab === "all"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              All
            </button>
          </div>
            {sessionTab === "current" && entries.length > 0 && (
              <button
                onClick={handleDownloadCurrentSession}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download TXT
              </button>
            )}
            {/* Import File Button (debug mode only) */}
            {sessionTab === "current" && onImportRolls && (
              <label 
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all duration-200 flex items-center gap-2 ${
                  isAutoImporting 
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                    : "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                }`}
              >
                <svg className={`w-4 h-4 ${isAutoImporting ? "animate-bounce" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isAutoImporting ? "Importing..." : "Import TXT"}
                <input
                  type="file"
                  accept=".txt"
                  className="hidden"
                  disabled={isAutoImporting}
                  onChange={(e) => {
                    if (isAutoImporting) return;
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const text = String(reader.result || '');
                          // Parse: extract TRANSLATED values from Session Data Export
                          const lines = text.split('\n');
                          const rolls = [];
                          
                          for (const line of lines) {
                            // Match: [time] RAW: XX | TRANSLATED: XX | ...
                            const match = line.match(/TRANSLATED:\s*(\d{2,5})/);
                            if (match) {
                              // Take first 2 digits as the 2-str value
                              const value = match[1].slice(0, 2);
                              if (value.length === 2 && value.startsWith('4')) {
                                rolls.push(value);
                              }
                            }
                          }
                          
                          if (rolls.length === 0) {
                            alert('No valid TRANSLATED rolls found in file');
                            return;
                          }
                          
                          // Call the import handler with the rolls
                          onImportRolls(rolls);
                          alert(`Loaded ${rolls.length} rolls! They will be added one by one.`);
                        } catch (err) {
                          console.error('Import failed:', err);
                          alert('Failed to parse file: ' + err.message);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            )}
        </div>
      </div>

      {sessionTab === "current" ? (
        /* CURRENT SESSION TABLE */
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full min-w-[600px] text-xs sm:text-sm">
            <thead className="bg-slate-900/60 sticky top-0 backdrop-blur-sm">
              <tr className="text-left text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">Raw</th>
                <th className="py-3 px-4">Translated</th>
                <th className="py-3 px-4">2-str</th>
                <th className="py-3 px-4">3-str</th>
                <th className="py-3 px-4">4-str</th>
                <th className="py-3 px-4">5-str</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {[...entries].reverse().map((e) => (
                <tr
                  key={e.id}
                  className="theme-session-row hover:bg-slate-800/30 transition-colors duration-150"
                >
                  <td className="py-3 px-6 font-mono text-xs sm:text-sm text-slate-200">
                    {e.raw}
                  </td>
                  <td className="theme-data-value py-3 px-4 font-mono text-xs sm:text-sm">
                    <span className="astral-primary-display bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent font-semibold">
                      {e.translated}
                    </span>
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
                  <td className="py-3 px-6 text-right">
                    <button
                      onClick={() => onDeleteEntry(e.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors duration-150 p-1 hover:bg-red-500/10 rounded"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-slate-500 text-sm"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>No rolls yet. Start your session!</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : sessionTab === "previous" ? (
        /* HISTORY VIEW */
        <div className="p-6 space-y-3 max-h-[500px] overflow-auto">
          {prevSessions.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No previous sessions recorded.</span>
              </div>
            </div>
          )}
          {prevSessions.length > 0 && (
            <button
              onClick={() => onDeleteSession("ALL")}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors duration-150 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Delete all history
            </button>
          )}
          {prevSessions.map((sess, idx) => (
            <details
              key={sess.id}
              className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all duration-200"
            >
              <summary className="px-4 py-3 cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-800/30 transition-colors duration-150">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    5m Session #{prevSessions.length - idx} •{" "}
                    {new Date(sess.startedAt).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-800/50 rounded">{sess.region}</span>
                    <span className="px-2 py-0.5 bg-slate-800/50 rounded">Patch {sess.patch}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800/50 rounded">
                    {sess.entries.length} rows
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDownloadSession(sess);
                    }}
                    title="Download rolls as TXT"
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors duration-150 px-2 py-1 rounded hover:bg-emerald-500/10 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    TXT
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteSession(sess.id);
                    }}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors duration-150 px-2 py-1 rounded hover:bg-red-500/10"
                  >
                    delete
                  </button>
                </div>
              </summary>
              <div className="px-4 py-3 bg-slate-900/20">
                <table className="w-full text-[11px] sm:text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800/30">
                      <th className="text-left py-2 pr-2">Raw</th>
                      <th className="text-left py-2 pr-2">2-str</th>
                      <th className="text-left py-2 pr-2">Trend</th>
                      <th className="text-left py-2 pr-2">Time</th>
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
                      const secondHalfEntries = secondHalf.filter(entry => toTranslatedPadded(entry.s2).slice(0, 2) === value);
                      const secondCount = secondHalfEntries.length;
                      
                      let trend = '→';
                      let trendColor = 'text-slate-400';
                      if (secondCount > firstCount * 1.2) {
                        trend = '↑';
                        trendColor = 'text-green-400';
                      } else if (secondCount < firstCount * 0.8) {
                        trend = '↓';
                        trendColor = 'text-red-400';
                      }
                      
                      return (
                        <tr key={e.id} className="hover:bg-slate-800/20">
                          <td className="py-2 pr-2 font-mono text-slate-200">{e.raw}</td>
                          <td className="py-2 pr-2 font-mono text-violet-300">
                            {toTranslatedPadded(e.s2)}
                          </td>
                          <td className={`py-2 pr-2 ${trendColor} font-bold`}>{trend}</td>
                          <td className="py-2 pr-2 text-slate-500">
                            {e.time && !isNaN(new Date(e.time).getTime()) 
                              ? new Date(e.time).toLocaleTimeString() 
                              : '--:--:--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* BBP Mode Analysis for this session */}
                {sess.beastAnalysis && sess.beastAnalysis.distribution && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="text-lg">🦁</span>
                      BBP Mode Analysis
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div className="bg-slate-800/30 rounded-lg p-2">
                        <span className="text-slate-500 block mb-1">Commons:</span>
                        <span className="text-green-400 font-mono font-semibold">
                          {sess.beastAnalysis.commons.join(', ')}
                        </span>
                      </div>
                      <div className="bg-slate-800/30 rounded-lg p-2">
                        <span className="text-slate-500 block mb-1">Pattern:</span>
                        <span className="text-violet-300 font-semibold">
                          {sess.beastAnalysis.pattern}
                        </span>
                      </div>
                    </div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800/30">
                          <th className="text-left py-2 pr-2">Value</th>
                          <th className="text-left py-2 pr-2">Count</th>
                          <th className="text-left py-2 pr-2">%</th>
                          <th className="text-left py-2 pr-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/20">
                        {sess.beastAnalysis.distribution.map((item) => (
                          <tr key={item.value} className={item.status === 'common' ? 'bg-green-500/5' : ''}>
                            <td className="py-2 pr-2 font-mono font-bold text-slate-200">{item.value}</td>
                            <td className="py-2 pr-2 text-slate-300">{item.count}</td>
                            <td className="py-2 pr-2 text-slate-300">{item.pct.toFixed(1)}%</td>
                            <td className="py-2 pr-2">
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
            <thead className="bg-slate-900/60 sticky top-0 backdrop-blur-sm">
              <tr className="text-left text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">Raw</th>
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
                    className="hover:bg-slate-800/30 transition-colors duration-150"
                  >
                    <td className="py-3 px-6 font-mono text-xs sm:text-sm text-slate-200">
                      {e.raw}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs sm:text-sm">
                    <span className="astral-primary-display bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent font-semibold">
                        {e.translated}
                      </span>
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
