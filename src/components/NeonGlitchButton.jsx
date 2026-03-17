import React from 'react';

export default function NeonGlitchButton({
  label,
  active = false,
  onClick,
  className = '',
  size = 'compact',
  type = 'button',
}) {
  const sizeClass =
    size === 'compact'
      ? 'px-3 py-2 sm:px-4 text-[10px] sm:text-[11px]'
      : 'px-7 py-3 text-xs sm:text-sm';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`neon-glitch-btn group relative inline-flex cursor-pointer border-none bg-transparent p-0 active:scale-[0.965] ${
        active ? 'neon-glitch-btn--active' : ''
      } ${className}`}
      aria-label={label}
    >
      <span
        className={`neon-glitch-shell relative flex items-center justify-center overflow-hidden border transition-all duration-200 ${sizeClass} [clip-path:polygon(10px_0%,100%_0%,calc(100%_-_10px)_100%,0%_100%)] ${
          active
            ? 'bg-cyan-400/18 border-cyan-300/65'
            : 'bg-fuchsia-900/20 border-fuchsia-500/45 group-hover:bg-fuchsia-800/30 group-hover:border-cyan-300/65'
        }`}
      >
        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[linear-gradient(115deg,rgba(169,102,255,.22),rgba(0,216,245,.10))]" />

        <span
          data-glitch={label}
          className={`neon-glitch-text relative inline-block font-black uppercase tracking-[0.2em] transition-colors duration-200 ${
            active ? 'text-cyan-100' : 'text-slate-50 group-hover:text-cyan-100'
          }`}
        >
          {label}
        </span>
      </span>

      <svg
        className="pointer-events-none absolute inset-0 z-10 overflow-visible"
        viewBox="0 0 200 46"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline className="neon-glitch-br neon-glitch-br-1" points="2,16 2,2 16,2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <polyline className="neon-glitch-br neon-glitch-br-2" points="184,2 198,2 198,16" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <polyline className="neon-glitch-br neon-glitch-br-3" points="2,30 2,44 16,44" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <polyline className="neon-glitch-br neon-glitch-br-4" points="184,44 198,44 198,30" fill="none" stroke="currentColor" strokeWidth="1.5" />

        <line className="neon-glitch-sl neon-glitch-sl-1" x1="0" y1="46" x2="200" y2="0" stroke="currentColor" strokeWidth="0.6" strokeDasharray="5 4" />
        <line className="neon-glitch-sl neon-glitch-sl-2" x1="5" y1="46" x2="200" y2="5" stroke="currentColor" strokeWidth="0.4" strokeDasharray="4 5" />

        <circle className="neon-glitch-sp neon-glitch-sp-1" cx="6" cy="4" r="2" fill="#5ef6ff" />
        <circle className="neon-glitch-sp neon-glitch-sp-2" cx="194" cy="42" r="2" fill="#5ef6ff" />
        <rect className="neon-glitch-sp neon-glitch-sp-3" x="0" y="0" width="4" height="4" fill="#d4aaff" />
        <rect className="neon-glitch-sp neon-glitch-sp-4" x="196" y="42" width="4" height="4" fill="#d4aaff" />
      </svg>
    </button>
  );
}
