import { useMemo } from "react";
import { Users, Trophy, Target, TrendingUp, Percent } from "lucide-react";
import PityChart from "./PityChart";
import StatCard from "./StatCard";
import PatchInfo from "./PatchInfo";

export default function ChartStage({
  banner,
  data,
  game,
  gameColor,
  softPityStart,
  softPityEnd,
  isLoading,
}) {
  const stats = useMemo(() => {
    if (!data?.stats) return null;
    const s = data.stats;
    return {
      totalPulls: s.total_pulls_5 || 0,
      users: s.users || 0,
      avgPity: s.avg_pity_5 || s.total_pulls_before_5 / Math.max(s.total_pulls_5, 1) || 0,
      winRate: s.count_win_5 && s.count_lose_5
        ? s.count_win_5 / (s.count_win_5 + s.count_lose_5)
        : 0,
      chance5: s.avg_chance_5 || 0,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${gameColor}40`, borderTopColor: gameColor }}
          />
          <span className="text-sm text-slate-400 animate-pulse">
            Loading pity data...
          </span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a banner to view pity statistics
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Atmospheric background */}
      {banner?.image && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={banner.image}
            alt=""
            className="w-full h-full object-cover opacity-[0.08] blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950" />
        </div>
      )}

      <div className="relative flex flex-col h-full gap-6 p-6 overflow-y-auto">
        {/* Patch Info */}
        <PatchInfo game={game} />

        {/* Banner Title */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {banner?.name || "Unknown Banner"}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: gameColor }}
            />
            <span className="capitalize">{game}</span>
            {banner?.collaboration && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
                {banner.collaboration}
              </span>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            icon={<Target size={16} />}
            label="Total 5★"
            value={stats.totalPulls}
            subtitle="Recorded pulls"
            accentColor={gameColor}
            delay={0}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Contributors"
            value={stats.users}
            subtitle="Active users"
            accentColor={gameColor}
            delay={100}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Avg Pity"
            value={Math.round(stats.avgPity)}
            subtitle="Rolls to 5★"
            accentColor={gameColor}
            delay={200}
          />
          <StatCard
            icon={<Trophy size={16} />}
            label="Win Rate"
            value={Math.round(stats.winRate * 100)}
            subtitle="50/50 wins"
            accentColor={gameColor}
            suffix="%"
            delay={300}
          />
          <StatCard
            icon={<Percent size={16} />}
            label="Base Rate"
            value={(stats.chance5 * 100).toFixed(1)}
            subtitle="5★ chance"
            accentColor={gameColor}
            suffix="%"
            delay={400}
          />
        </div>

        {/* Pity Chart */}
        <div
          className="flex-1 rounded-2xl p-4"
          style={{
            background: `linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.3) 100%)`,
            border: `1px solid ${gameColor}15`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Pity Distribution
            </h3>
            {softPityStart && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: gameColor }}
                />
                <span className="text-slate-400">
                  Soft pity: {softPityStart}-{softPityEnd || "?"}
                </span>
              </div>
            )}
          </div>
          <PityChart
            data={data}
            gameColor={gameColor}
            softPityStart={softPityStart}
            softPityEnd={softPityEnd}
          />
        </div>
      </div>
    </div>
  );
}
