export default function RegionHeatmap({ regionMatch }) {
  if (!regionMatch) return null;

  // ✅ New format: { region, similarity, sampleSize }
  const { region, similarity, sampleSize } = regionMatch;

  const pct = Math.round((similarity || 0) * 100);

  return (
    <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-3 space-y-2 mt-3">
      <div className="text-xs text-slate-300 mb-1">🌍 Region Match Heatmap</div>

      <div className="flex items-center gap-2 text-[11px]">
        <span className="w-20 text-slate-200">{region}</span>

        <div className="flex-1 bg-slate-800 h-2 rounded overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <span className="w-12 text-right text-slate-300">{pct}%</span>
      </div>

      <div className="text-[10px] text-slate-500 mt-1">
        Sample size: {sampleSize} rolls
      </div>
    </div>
  );
}
