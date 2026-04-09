import React, { useEffect, useMemo, useRef } from 'react';
import { usePresenceContext } from '../contexts/PresenceContext';
import gsap from 'gsap';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

export default function LiveStatsBanner({ sessionTheme = 'modern' }) {
  const { stats } = usePresenceContext();
  const bannerRef = useRef(null);
  const palette = getSessionThemeConfig(sessionTheme).liveStats;

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (typeof num !== 'number') return String(num);
    return num.toLocaleString('en-US');
  };

  useEffect(() => {
    const elements = bannerRef.current?.querySelectorAll('.stat-number');
    if (!elements) return;

    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { scale: 1.35, filter: 'brightness(1.85)' },
        { scale: 1, filter: 'brightness(1)', duration: 0.45, ease: 'power2.out' },
      );
    });
  }, [stats.active, stats.online, stats.today, stats.total]);

  const statItems = useMemo(() => ([
    {
      key: 'online',
      icon: 'PEOPLE',
      value: formatNumber(stats.online),
      valueStyle: {
        color: palette.onlineColor,
        fontWeight: '800',
        fontSize: '17px',
        textShadow: palette.onlineGlow,
        fontFamily: 'monospace',
      },
      label: 'Online',
      labelStyle: { opacity: 0.8, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', color: palette.labelColor },
    },
    {
      key: 'active',
      icon: 'LIVE',
      value: formatNumber(stats.active),
      valueStyle: {
        color: palette.activeColor,
        fontWeight: '900',
        fontSize: '17px',
        textShadow: palette.activeGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'Prediction Now',
      labelStyle: { opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor },
    },
    {
      key: 'today',
      icon: 'DAY',
      value: formatNumber(stats.today),
      valueStyle: {
        color: palette.todayColor,
        fontWeight: '900',
        fontSize: '17px',
        textShadow: palette.todayGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'Today Predictions',
      labelStyle: { opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor },
    },
    {
      key: 'total',
      icon: 'TOTAL',
      value: formatNumber(stats.total),
      valueStyle: {
        color: palette.totalColor,
        fontWeight: '900',
        fontSize: '17px',
        textShadow: palette.totalGlow,
        fontFamily: "'JetBrains Mono', monospace",
      },
      label: 'Total Predictions',
      labelStyle: { opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor },
    },
  ]), [palette.activeColor, palette.activeGlow, palette.labelColor, palette.onlineColor, palette.onlineGlow, palette.todayColor, palette.todayGlow, palette.totalColor, palette.totalGlow, stats.active, stats.online, stats.today, stats.total]);

  if (stats.loading || stats.error) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className="live-stats-banner"
      style={{
        width: '100%',
        background: palette.bannerBackground,
        borderBottom: `1px solid ${palette.borderColor}`,
        overflowX: 'auto',
        overflowY: 'hidden',
        position: 'relative',
        zIndex: 999,
        minHeight: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backdropFilter: 'blur(8px)',
        scrollbarWidth: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '2.25rem',
          width: 'max-content',
          minWidth: '100%',
          padding: '0.45rem 1rem',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
        }}
      >
        {statItems.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '0 0 auto' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.22em', color: palette.labelColor, opacity: 0.7 }}>
              {item.icon}
            </span>
            <span className="stat-number" style={item.valueStyle}>{item.value}</span>
            <span style={item.labelStyle}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
