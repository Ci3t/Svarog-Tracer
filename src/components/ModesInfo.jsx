export default function ModesInfo() {
  return (
    <div className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 space-y-2">
      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
        Prediction modes
      </h3>
      <ul className="text-[11px] text-slate-400 space-y-1 leading-relaxed">
        <li>
          <span className="text-slate-200">mono</span> – last 4 rolls are the
          same → Unity RNG looks “stuck”, so repeat it.
        </li>
        <li>
          <span className="text-slate-200">stable</span> – one value clearly
          dominates the current 5m window → use that.
        </li>
        <li>
          <span className="text-slate-200">branch</span> – window was stable,
          but the last roll was a 1-time different value → assume RNG branched
          there and follow it.
        </li>
        <li>
          <span className="text-slate-200">rotation</span> – we detected a short
          repeating cycle (like 41→43→44) → pick the next in the cycle.
        </li>
        <li>
          <span className="text-slate-200">cyclic / phase-memory</span> – last
          few rolls look like a pattern we already saw in this session → reuse
          that phase and continue it.
        </li>
        <li>
          <span className="text-slate-200">transition</span> – fallback Markov:
          “after these last 2 numbers we usually see X”.
        </li>
      </ul>
      <p className="text-[10px] text-slate-500 pt-1">
        Confidence = how strong this 5m window points to that number. If it’s
        &lt;60%, do 2–3 more tests.
      </p>
    </div>
  );
}
