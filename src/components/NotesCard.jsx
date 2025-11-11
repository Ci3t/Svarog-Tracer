export default function NotesCard({
  notes,
  setNotes,
  prediction,
  region,
  patch,
  entries,
}) {
  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
        Test notes
      </h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write observations here (e.g. suggested 44 | got 31)..."
        className="w-full h-28 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => {
            const summary = `
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
            navigator.clipboard.writeText(summary);
          }}
          className="px-3 py-1 rounded-md bg-violet-500 hover:bg-violet-400 text-slate-100 text-xs cursor-pointer"
        >
          Copy notes
        </button>
        <button
          onClick={() => setNotes("")}
          className="px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs cursor-pointer"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
