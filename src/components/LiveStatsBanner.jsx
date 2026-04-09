import React, { useEffect, useMemo, useRef } from 'react';
import { usePresenceContext } from '../contexts/PresenceContext';
import gsap from 'gsap';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

export default function LiveStatsBanner({ sessionTheme = 'modern' }) {
  const { stats } = usePresenceContext();
  const bannerRef = useRef(null);
  const marqueeRef = useRef(null);
  const timelineRef = useRef(null);
  const palette = getSessionThemeConfig(sessionTheme).liveStats;

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (typeof num !== 'number') return String(num);
    return num.toLocaleString('en-US');
  };

  // Pulse animation for stat updates
  useEffect(() => {
    const elements = bannerRef.current?.querySelectorAll('.stat-number');
    if (!elements) return;

    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { scale: 1.2, filter: 'brightness(1.5)', color: '#22d3ee' },
        { scale: 1, filter: 'brightness(1)', color: 'inherit', duration: 0.6, ease: 'power2.out' },
      );
    });
  }, [stats.active, stats.online, stats.today, stats.total]);

  // GSAP Marquee logic
  useEffect(() => {
    if (!marqueeRef.current) return;

    const marquee = marqueeRef.current;
    
    // Clean up previous timeline if any
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const duration = 40; // Speed adjustment
    
    // Simple marquee: animate the container's X based on its width
    // We animate to -50% because we doubled the content
    timelineRef.current = gsap.to(marquee, {
      xPercent: -50,
      duration,
      ease: 'none',
      repeat: -1,
      overwrite: 'auto',
    });

    return () => {
      if (timelineRef.current) timelineRef.current.kill();
    };
  }, [stats.loading, stats.online, stats.active, stats.today, stats.total]);

  const handleMouseEnter = () => timelineRef.current?.pause();
  const handleMouseLeave = () => timelineRef.current?.play();

  const statItems = useMemo(() => ([
    {
      key: 'online',
      icon: 'USR_LINK',
      value: formatNumber(stats.online),
      valueStyle: {
        color: palette.onlineColor,
        fontWeight: '800',
        fontSize: '15px',
        textShadow: palette.onlineGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'ACTIVE_USERS',
    },
    {
      key: 'active',
      icon: 'LIVE_TRK',
      value: formatNumber(stats.active),
      valueStyle: {
        color: palette.activeColor,
        fontWeight: '900',
        fontSize: '15px',
        textShadow: palette.activeGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'PREDICTIONS_RUNNING',
    },
    {
      key: 'today',
      icon: 'HST_DATA',
      value: formatNumber(stats.today),
      valueStyle: {
        color: palette.todayColor,
        fontWeight: '900',
        fontSize: '15px',
        textShadow: palette.todayGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'DAILY_OPTIMIZATIONS',
    },
    {
      key: 'total',
      icon: 'SYS_TTL',
      value: formatNumber(stats.total),
      valueStyle: {
        color: palette.totalColor,
        fontWeight: '900',
        fontSize: '15px',
        textShadow: palette.totalGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'TOTAL_RECORDS_PROCESSED',
    },
  ]), [palette, stats]);

  if (stats.loading || stats.error) {
    return null;
  }

  // Double the items for seamless loop
  const doubledItems = [...statItems, ...statItems];

  return (
    <div
      ref={bannerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="live-stats-banner relative w-full overflow-hidden border-b border-white/5 bg-slate-950/40 backdrop-blur-md z-[999]"
      style={{ minHeight: '36px' }}
    >
      {/* Tactical HUD Overlays */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-950/80 to-transparent z-10 pointer-events-none" />
      
      <div
        ref={marqueeRef}
        className="flex items-center whitespace-nowrap py-1.5 px-4 gap-12 w-max"
      >
        {doubledItems.map((item, idx) => (
          <div 
            key={`${item.key}-${idx}`} 
            className="flex items-center gap-4 group"
          >
            {/* Tactical Divider */}
            <div className="w-px h-3 bg-white/10 group-first:hidden" />
            
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] font-black tracking-widest text-cyan-400/60 font-mono">
                {item.icon}
              </span>
              <span 
                className="stat-number transition-all duration-300" 
                style={item.valueStyle}
              >
                {item.value}
              </span>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
                {item.label}
              </span>
            </div>

            {/* Pulsing Dot for Live Stats */}
            {item.key === 'active' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            )}
          </div>
        ))}
      </div>

      <style>{`
        .stat-number { font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}
