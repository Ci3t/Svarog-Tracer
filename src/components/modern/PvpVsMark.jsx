import React from 'react';

const THEME_TINTS = {
  modern: {
    primary: '#7dd3fc',
    secondary: '#fbbf24',
    accentA: '#38bdf8',
    accentB: '#f59e0b',
    shadow: '0 0 18px rgba(125, 211, 252, 0.18)',
  },
  arctic: {
    primary: '#c4f1ff',
    secondary: '#8ec5ff',
    accentA: '#6ee7ff',
    accentB: '#60a5fa',
    shadow: '0 0 20px rgba(96, 165, 250, 0.18)',
  },
  crimson: {
    primary: '#ffd2e0',
    secondary: '#ffb36b',
    accentA: '#ff4d7a',
    accentB: '#ff8b3d',
    shadow: '0 0 20px rgba(255, 77, 122, 0.2)',
  },
  astral: {
    primary: '#fff0b8',
    secondary: '#ffd37a',
    accentA: '#f6df9b',
    accentB: '#e3c072',
    shadow: '0 0 18px rgba(227, 192, 114, 0.18)',
  },
};

function getSizeClass(size) {
  if (size === 'sm') return 'text-[1.6rem]';
  if (size === 'lg') return 'text-[3.4rem]';
  return 'text-[3.1rem]';
}

export default function PvpVsMark({ theme = 'modern', size = 'md', className = '' }) {
  const tint = THEME_TINTS[theme] || THEME_TINTS.modern;

  return (
    <div
      className={`relative inline-flex select-none items-center justify-center ${className}`}
      style={{ filter: tint.shadow }}
      aria-hidden="true"
    >
      <span
        className={`relative z-[3] inline-block skew-x-[-10deg] font-black leading-none tracking-[-0.06em] text-transparent ${getSizeClass(size)}`}
        style={{
          backgroundImage: `linear-gradient(165deg, ${tint.primary} 0%, #ffffff 42%, ${tint.secondary} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        VS
      </span>
      <span
        className={`absolute inset-0 z-[1] inline-block skew-x-[-10deg] font-black leading-none tracking-[-0.06em] ${getSizeClass(size)}`}
        style={{
          color: tint.accentA,
          opacity: 0.48,
          clipPath: 'polygon(0 16%, 100% 16%, 100% 46%, 0 46%)',
          transform: 'translateX(-2px)',
        }}
      >
        VS
      </span>
      <span
        className={`absolute inset-0 z-[2] inline-block skew-x-[-10deg] font-black leading-none tracking-[-0.06em] ${getSizeClass(size)}`}
        style={{
          color: tint.accentB,
          opacity: 0.44,
          clipPath: 'polygon(0 58%, 100% 58%, 100% 86%, 0 86%)',
          transform: 'translateX(2px)',
        }}
      >
        VS
      </span>
    </div>
  );
}
