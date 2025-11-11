export default function CaesarCard({ caesarInput, setCaesarInput }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Caesar shift
      </h3>
      <p className="text-xs text-slate-400 mb-2">
        Shift your 1–4 string so it starts with 4.
      </p>
      <div className="flex gap-2">
        <input
          value={caesarInput}
          onChange={(e) =>
            setCaesarInput(e.target.value.replace(/[^1-4]/g, ""))
          }
          placeholder="e.g. 234"
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
