export default function ModernNotesCard({
  notes,
  setNotes,
  prediction,
  region,
  patch,
  entries,
  themeColors = {
    button: "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600",
    textLight: "text-white"
  }
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
    <div className="theme-glass-card rounded-[2.5rem] bg-black/40 backdrop-blur-2xl p-8 relative overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Lab Observations
        </h2>
        <div className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md tracking-widest hidden sm:block">RESEARCH_DUMP</div>
      </div>

      {/* Textarea */}
      <div className="relative z-10">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Log findings here..."
          className="w-full h-40 bg-black/30 border border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-white/20 transition-all duration-300 resize-none custom-scrollbar font-medium"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-end gap-3 mt-6 relative z-10">
        <button
          onClick={() => {
            navigator.clipboard.writeText(buildSummary());
          }}
          className={`px-6 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${themeColors.button}`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
          Export Stream
        </button>
        <button
          onClick={() => {
            const blob = new Blob([buildSummary()], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `hsr_lab_dump_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="px-6 py-2.5 rounded-xl border border-white/5 bg-black/40 text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover:bg-white/5 hover:text-white"
        >
          Archive
        </button>
        <button
          onClick={() => setNotes("")}
          className="px-5 py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover:bg-rose-500/20 hover:text-white"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
