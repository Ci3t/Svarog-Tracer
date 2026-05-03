import { useMemo, useState } from "react";

export default function PityChart({ data, gameColor, softPityStart, softPityEnd }) {
  const [hoveredBar, setHoveredBar] = useState(null);

  const entries = useMemo(() => {
    if (!data || !data.by_rollnum_pulls_5) return [];
    return Object.entries(data.by_rollnum_pulls_5)
      .map(([roll, count]) => ({
        roll: parseInt(roll),
        count,
        chance: data.by_rollnum_chance_5?.[roll] || 0,
      }))
      .sort((a, b) => a.roll - b.roll);
  }, [data]);

  const maxCount = useMemo(() => {
    return Math.max(...entries.map((e) => e.count), 1);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No pity data available
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Chart background grid */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="border-t border-slate-600" />
        ))}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[1px] h-80 px-2">
        {entries.map((entry, i) => {
          const heightPercent = (entry.count / maxCount) * 100;
          const isSoftPity =
            softPityStart &&
            softPityEnd &&
            entry.roll >= softPityStart &&
            entry.roll <= softPityEnd;
          const isHovered = hoveredBar === entry.roll;

          return (
            <div
              key={entry.roll}
              className="flex-1 flex flex-col justify-end relative group"
              onMouseEnter={() => setHoveredBar(entry.roll)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl z-50 whitespace-nowrap">
                  <div className="text-sm font-bold text-white">
                    Roll {entry.roll}
                  </div>
                  <div className="text-xs text-slate-400">
                    {entry.count.toLocaleString()} pulls ({(entry.chance * 100).toFixed(1)}%)
                  </div>
                  {isSoftPity && (
                    <div className="text-xs font-medium mt-1" style={{ color: gameColor }}>
                      Soft pity zone
                    </div>
                  )}
                </div>
              )}

              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-500 ease-out"
                style={{
                  height: `${Math.max(heightPercent, 0.5)}%`,
                  background: isSoftPity
                    ? `linear-gradient(180deg, ${gameColor} 0%, ${gameColor}88 100%)`
                    : `linear-gradient(180deg, ${gameColor}80 0%, ${gameColor}40 100%)`,
                  opacity: isHovered ? 1 : 0.7,
                  animation: `barGrow 0.6s ease-out ${i * 8}ms both`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-2 mt-2 text-[10px] text-slate-500">
        <span>1</span>
        <span>{Math.floor(entries.length / 4)}</span>
        <span>{Math.floor(entries.length / 2)}</span>
        <span>{Math.floor((entries.length * 3) / 4)}</span>
        <span>{entries.length}</span>
      </div>

      <style>{`
        @keyframes barGrow {
          from {
            transform: scaleY(0);
            transform-origin: bottom;
          }
          to {
            transform: scaleY(1);
            transform-origin: bottom;
          }
        }
      `}</style>
    </div>
  );
}
