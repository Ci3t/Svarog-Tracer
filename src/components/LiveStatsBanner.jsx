import React, { useEffect, useRef } from 'react';
import { usePresenceContext } from '../contexts/PresenceContext';
import gsap from 'gsap';
import { getSessionThemeConfig } from '../theme/sessionThemeConfig';

export default function LiveStatsBanner({ sessionTheme = 'modern' }) {
  const { stats } = usePresenceContext();
  const bannerRef = useRef(null);
  const textRef = useRef(null);
  const palette = getSessionThemeConfig(sessionTheme).liveStats;
  
  // Format numbers with commas, handle all cases
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (typeof num !== 'number') return String(num);
    return num.toLocaleString('en-US');
  };
  
  // GSAP single-pass scroll animation (right to left, restart)
  useEffect(() => {
    if (!textRef.current || !bannerRef.current) return;
    
    const banner = bannerRef.current;
    const text = textRef.current;
    
    // Reset position
    gsap.set(text, { x: banner.offsetWidth });
    
    // Animate from right edge to fully off left edge
    const animation = gsap.to(text, {
      x: -text.offsetWidth,
      duration: 25, // Slower for readability
      ease: 'none',
      repeat: -1,
      repeatDelay: 0,
    });
    
    return () => {
      animation.kill();
    };
  }, []);
  
  // Number count-up animation when stats change
  useEffect(() => {
    const elements = bannerRef.current?.querySelectorAll('.stat-number');
    if (!elements) return;
    
    elements.forEach(el => {
      gsap.fromTo(el, 
        { scale: 1.4, filter: 'brightness(2)' },
        { scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'back.out(2)' }
      );
    });
  }, [stats.active, stats.online, stats.today, stats.total]);
  
  if (stats.loading || stats.error) {
    return null; // Hide banner if API unavailable
  }

  return (
    <div 
      ref={bannerRef}
      className="live-stats-banner"
      style={{
        width: '100%',
        background: palette.bannerBackground,
        borderBottom: `1px solid ${palette.borderColor}`,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 999,
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={textRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4rem',
          whiteSpace: 'nowrap',
          fontSize: '14px',
          fontWeight: '600',
          color: '#fff',
          position: 'absolute',
        }}
      >
        {/* Active Users */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '18px' }}>👥</span>
          <span className="stat-number" style={{ 
            color: palette.onlineColor,
            fontWeight: '800',
            fontSize: '17px',
            textShadow: palette.onlineGlow,
            fontFamily: 'monospace'
          }}>
            {formatNumber(stats.online)}
          </span>
          <span style={{ opacity: 0.8, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px', color: palette.labelColor }}>Online</span>
        </div>

        {/* Predicting Now */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <span className="stat-number" style={{ 
            color: palette.activeColor,
            fontWeight: '900',
            fontSize: '17px',
            textShadow: palette.activeGlow,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {formatNumber(stats.active)}
          </span>
          <span style={{ opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor }}>Prediction Now</span>
        </div>
        
        {/* Today */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          <span className="stat-number" style={{ 
            color: palette.todayColor,
            fontWeight: '900',
            fontSize: '17px',
            textShadow: palette.todayGlow,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {formatNumber(stats.today)}
          </span>
          <span style={{ opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor }}>Today Predictions</span>
        </div>
        
        {/* Total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '18px' }}>🎲</span>
          <span className="stat-number" style={{ 
            color: palette.totalColor,
            fontWeight: '900',
            fontSize: '17px',
            textShadow: palette.totalGlow,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            {formatNumber(stats.total)}
          </span>
          <span style={{ opacity: 0.8, textTransform: 'uppercase', fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: palette.labelColor }}>Total Predictions</span>
        </div>
      </div>
    </div>
  );
}
