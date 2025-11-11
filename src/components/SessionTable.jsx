// src/components/SessionTable.jsx
import React from "react";
import { translateTo4 } from "../utils/stringHelpers"; // 👈 use the shared one

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
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex gap-2 bg-slate-900/50 rounded-lg p-1 cursor-pointer">
          <button
            onClick={() => setSessionTab("current")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              sessionTab === "current"
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Current Session
          </button>
          <button
            onClick={() => setSessionTab("previous")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              sessionTab === "previous"
                ? "bg-violet-500 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {sessionTab === "current" ? (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full">
            <thead className="bg-slate-900/60 sticky top-0">
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-3 px-6 font-mono text-sm text-slate-200">
                    {e.raw}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-violet-300">
                    {e.translated}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-200">
                    {toTranslatedPadded(e.s2)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-300">
                    {toTranslatedPadded(e.s3)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400">
                    {toTranslatedPadded(e.s4)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-500">
                    {toTranslatedPadded(e.s5)}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(e.time).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      onClick={() => onDeleteEntry(e.id)}
                      className="text-xs text-slate-500 hover:text-red-400 cursor-pointer"
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
      ) : (
        <div className="p-6 space-y-3 max-h-[500px] overflow-auto">
          {prevSessions.length === 0 && (
            <p className="text-sm text-slate-500">
              No previous sessions recorded.
            </p>
          )}
          {prevSessions.map((sess, idx) => (
            <details
              key={sess.id}
              className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden"
            >
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-slate-800/30">
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
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left py-1 pr-2">Raw</th>
                      <th className="text-left py-1 pr-2">2-str</th>
                      <th className="text-left py-1 pr-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/20">
                    {sess.entries.map((e) => (
                      <tr key={e.id}>
                        <td className="py-1 pr-2 font-mono">{e.raw}</td>
                        <td className="py-1 pr-2 font-mono">
                          {toTranslatedPadded(e.s2)}
                        </td>
                        <td className="py-1 pr-2 text-slate-500">
                          {new Date(e.time).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
          {prevSessions.length > 0 && (
            <button
              onClick={() => onDeleteSession("ALL")}
              className="text-xs text-slate-400 hover:text-red-400"
            >
              Delete all history
            </button>
          )}
        </div>
      )}
    </div>
  );
}
