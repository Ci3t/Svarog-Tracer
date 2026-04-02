export default function ModernNotesCard({
  notes,
  setNotes,
  prediction,
  region,
  patch,
  entries,
}) {
  const buildSummary = () => `
🧠 HSR RNG Test Notes
Region: ${region}
Patch: ${patch}

Prediction: ${prediction?.prediction || "—"}
Alt: ${prediction?.alt || "—"}
Mode: ${prediction?.mode || "—"}

Recent Rolls: ${entries
    .slice(0, 8)
    .map((e) => e.translated)
    .join(", ")}

Notes:
${notes || "(none)"}
`;

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Test Notes
        </h2>
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>

      {/* Textarea */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write observations here (e.g. suggested 44 | got 31)..."
        className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200 resize-none"
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-2 mt-4">
        <button
          onClick={() => {
            navigator.clipboard.writeText(buildSummary());
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Copy Notes
          </div>
        </button>
        <button
          onClick={() => {
            const blob = new Blob([buildSummary()], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `notes_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 text-slate-100 text-xs font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Download
        </button>
        <button
          onClick={() => setNotes("")}
          className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
