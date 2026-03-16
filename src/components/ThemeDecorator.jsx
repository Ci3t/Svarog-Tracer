import React from 'react';

/**
 * ThemeDecorator
 * A flexible, non-destructive layer meant to be placed inside relative containers (like cards).
 * Uses Tailwind arbitrary variants to show/hide SVGs based on the active body theme class,
 * avoiding the need for prop-drilling.
 */
const ThemeDecorator = ({ type = 'card-top' }) => {
  if (type === 'card-top') {
    return (
      <>
        {/* GLACIAL ICE CAP - Only visible in .arctic-theme or .winter-theme */}
        <div 
          className="hidden [.arctic-theme_&]:block [.winter-theme_&]:block absolute top-0 left-0 w-full overflow-hidden z-30 pointer-events-none opacity-90 mix-blend-screen" 
          style={{ transform: 'translateY(-1px)' }}
        >
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="w-full h-auto drop-shadow-[0_4px_8px_rgba(255,255,255,0.4)]">
            {/* Soft underlying shadow/glow volume */}
            <path d="M0,0 L1000,0 L1000,30 Q900,60 850,25 T700,50 T550,20 T400,65 T250,25 T100,55 T0,20 Z" fill="rgba(255, 255, 255, 0.4)" filter="blur(4px)" />
            {/* Back layer - deeper ice */}
            <path d="M0,0 L1000,0 L1000,25 Q920,55 860,20 T710,45 T560,15 T410,60 T260,20 T110,50 T0,15 Z" fill="#e0f2fe" opacity="0.8" />
            {/* Mid layer - frosted ice */}
            <path d="M0,0 L1000,0 L1000,15 Q880,45 830,15 T680,35 T530,10 T380,45 T230,15 T80,40 T0,10 Z" fill="#f0f9ff" opacity="0.9" />
            {/* Front layer - pure white snow */}
            <path d="M0,0 L1000,0 L1000,10 Q850,30 800,10 T650,25 T500,5 T350,30 T200,10 T50,25 T0,5 Z" fill="#ffffff" />
          </svg>
        </div>

        {/* ASTRAL CONSTELLATION - Only visible in .astral-theme */}
        <div className="hidden [.astral-theme_&]:block absolute inset-0 pointer-events-none z-30 overflow-hidden mix-blend-screen rounded-inherit">
          {/* Top-Right Star Map */}
          <svg viewBox="0 0 100 100" className="absolute -top-4 -right-4 w-32 h-32 opacity-60">
            <path d="M80,20 L50,50 L20,30" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.5" />
            <path d="M50,50 L70,80" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.5" />
            <circle cx="80" cy="20" r="2" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
            <circle cx="80" cy="20" r="1" fill="#ffffff" />
            <circle cx="50" cy="50" r="1.5" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
            <circle cx="50" cy="50" r="0.8" fill="#ffffff" />
            <circle cx="20" cy="30" r="1.5" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
            <circle cx="20" cy="30" r="0.8" fill="#ffffff" />
            <circle cx="70" cy="80" r="2" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
            <circle cx="70" cy="80" r="1" fill="#ffffff" />
          </svg>
          
          {/* Bottom-Left subtle accent */}
          <svg viewBox="0 0 100 100" className="absolute -bottom-2 -left-2 w-24 h-24 opacity-40">
             <path d="M20,80 L50,60" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.5" />
             <circle cx="20" cy="80" r="1.5" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
             <circle cx="20" cy="80" r="0.8" fill="#ffffff" />
             <circle cx="50" cy="60" r="1" fill="#fbbf24" style={{ filter: 'blur(1px)' }} />
             <circle cx="50" cy="60" r="0.5" fill="#ffffff" />
          </svg>
        </div>
      </>
    );
  }

  return null;
};

export default ThemeDecorator;
