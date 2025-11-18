export default function FrequencyPanel({
  freqTab,
  setFreqTab,
  freq2,
  freq3,
  freq4,
  freq5,
}) {
  const list =
    freqTab === "2"
      ? freq2
      : freqTab === "3"
      ? freq3
      : freqTab === "4"
      ? freq4
      : freq5;

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-4 sm:p-6 border border-slate-700/50 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          String frequency
        </h3>
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 cursor-pointer self-start">
          {["2", "3", "4", "5"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFreqTab(tab)}
              className={`px-2 cursor-pointer py-1 rounded-md text-[11px] sm:text-[12px] font-medium transition-all ${
                freqTab === tab
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab}-str
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        All strings translated to 4xxx and padded to 5 digits so you can compare
        phases.
      </p>

      <div className="space-y-3 max-h-56 sm:max-h-72 overflow-auto">
        {list.length === 0 && (
          <p className="text-sm text-slate-600">Record a few rolls.</p>
        )}

        {list.map((item) => {
          const display = item.pattern.replace(/0+$/, "") || item.pattern;
          return (
            <div key={item.pattern} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-slate-200">
                  {display}
                </span>
                <span className="text-xs text-slate-400">{item.pct}%</span>
              </div>
              <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
