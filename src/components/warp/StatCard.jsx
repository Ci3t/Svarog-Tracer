import CountUp from "./CountUp";

export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  accentColor,
  delay = 0,
}) {
  return (
    <div
      className="relative group overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0.6) 100%)`,
        border: `1px solid ${accentColor}20`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accentColor}15 0%, transparent 70%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        }}
      />

      <div className="relative">
        {/* Icon + Label */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </div>
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
            {label}
          </span>
        </div>

        {/* Value with count-up */}
        <div className="text-2xl font-bold text-white mb-1">
          <CountUp end={value} duration={1200} delay={delay} />
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-slate-500">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
