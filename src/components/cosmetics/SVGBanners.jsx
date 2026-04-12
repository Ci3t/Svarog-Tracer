import React from 'react';

export function NeuralScanline() {
  return (
    <pattern id="neural-scanline" width="100" height="2" patternUnits="userSpaceOnUse">
      <rect width="100" height="0.5" fill="var(--theme-accent, #22d3ee)" fillOpacity="0.08">
        <animate attributeName="y" values="0;2;0" dur="3s" repeatCount="indefinite" />
      </rect>
    </pattern>
  );
}

// Common base wrapper
export function BannerSvgWrapper({ children, className = '' }) {
  return (
    <svg 
      className={`absolute inset-0 h-full w-full pointer-events-none ${className}`} 
      preserveAspectRatio="none" 
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <NeuralScanline />
      </defs>
      {/* Global scanline overlay */}
      <rect width="100" height="100" fill="url(#neural-scanline)" opacity="0.4" />
      {children}
    </svg>
  );
}

export function QuantumNeonSVG() {
  return (
    <BannerSvgWrapper className="opacity-90">
      <defs>
        <linearGradient id="qn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff1b6b" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#45caff" stopOpacity="0.1" />
        </linearGradient>
        <pattern id="qn-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#ff6b9f" strokeWidth="0.2" strokeOpacity="0.15" />
        </pattern>
      </defs>
      
      {/* Background Plate */}
      <polygon points="0,0 100,0 100,100 0,100" fill="url(#qn-grad)" />
      <polygon points="0,0 100,0 100,100 0,100" fill="url(#qn-grid)" />
      
      {/* Neon Edge Highlights */}
      <polygon points="0,0 95,0 100,5 100,100 5,100 0,95" fill="none" stroke="#ff6b9f" strokeWidth="0.5" className="animate-pulse" />
      <path d="M 0,90 L 10,100 L 30,100" fill="none" stroke="#45caff" strokeWidth="1" />
      <path d="M 100,10 L 90,0 L 70,0" fill="none" stroke="#45caff" strokeWidth="1" />
      
      {/* Dynamic Data Bars */}
      <rect x="2" y="85" width="2" height="10" fill="#ff6b9f" opacity="0.8">
        <animate attributeName="height" values="10;2;8;10" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="5" y="90" width="1" height="5" fill="#45caff" opacity="0.6">
        <animate attributeName="height" values="5;1;4;5" dur="1.5s" repeatCount="indefinite" />
      </rect>
    </BannerSvgWrapper>
  );
}

export function HackerNoirSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <linearGradient id="hn-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0a192f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#042f2e" stopOpacity="0.8" />
        </linearGradient>
        <pattern id="hn-scanlines" width="10" height="2" patternUnits="userSpaceOnUse">
          <rect width="10" height="1" fill="#14b8a6" fillOpacity="0.1" />
        </pattern>
      </defs>
      
      <rect width="100" height="100" fill="url(#hn-grad)" />
      <rect width="100" height="100" fill="url(#hn-scanlines)" />
      
      {/* Glitching borders */}
      <path d="M 0,0 L 10,0 M 15,0 L 40,0 M 45,0 L 100,0" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.7">
         <animate attributeName="opacity" values="0.7;0.1;0.9;0.2;0.7" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M 0,100 L 20,100 M 25,100 L 70,100 M 75,100 L 100,100" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.7" />

      {/* Hex nodes */}
      <polygon points="90,10 92,6 96,6 98,10 96,14 92,14" fill="none" stroke="#34d399" strokeWidth="0.4" />
      <circle cx="94" cy="10" r="1" fill="#34d399" className="animate-ping" />
    </BannerSvgWrapper>
  );
}

export function AstralForgeSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <radialGradient id="af-grad" cx="50%" cy="50%" r="50%" fx="20%" fy="20%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      
      <rect width="100" height="100" fill="url(#af-grad)" />
      
      {/* Star points */}
      <circle cx="10" cy="20" r="0.5" fill="#fcd34d">
         <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="80" cy="15" r="0.3" fill="#fde68a">
         <animate attributeName="opacity" values="0;1;0" dur="2s" delay="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="80" r="0.8" fill="#f59e0b">
         <animate attributeName="opacity" values="0;1;0" dur="6s" repeatCount="indefinite" />
      </circle>
      
      {/* Heavy gold forging plate */}
      <path d="M -5,100 L 25,100 L 15,0 L -5,0 Z" fill="#fbfbfb" opacity="0.02" />
      <polygon points="0,0 15,0 5,100 0,100" fill="none" stroke="#fbbf24" strokeWidth="0.2" opacity="0.4" />
      <polygon points="100,100 85,100 95,0 100,0" fill="none" stroke="#fbbf24" strokeWidth="0.2" opacity="0.4" />

      {/* Constellation line */}
      <path d="M 10,20 L 30,50 L 80,15 L 90,80" fill="none" stroke="#fcd34d" strokeWidth="0.1" opacity="0.3" strokeDasharray="1 1" />
    </BannerSvgWrapper>
  );
}

export function PhoenixRiseSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <linearGradient id="pr-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ea580c" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      
      <rect width="100" height="100" fill="url(#pr-grad)" />
      
      {/* Embers moving up */}
      <circle cx="20" cy="100" r="1.5" fill="#f97316" filter="blur(1px)">
         <animate attributeName="cy" values="100; -10" dur="5s" repeatCount="indefinite" />
         <animate attributeName="cx" values="20; 25; 15; 20" dur="5s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="1;0" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="100" r="1" fill="#fef08a">
         <animate attributeName="cy" values="100; -5" dur="3s" repeatCount="indefinite" />
         <animate attributeName="cx" values="60; 55; 65; 60" dur="3s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="1;0" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="85" cy="100" r="2" fill="#ea580c" filter="blur(2px)">
         <animate attributeName="cy" values="100; -20" dur="7s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="0.8;0" dur="7s" repeatCount="indefinite" />
      </circle>

      {/* Geometric Phoenix Wings */}
      <path d="M 50,100 L 70,30 L 100,50 Z" fill="#fdba74" opacity="0.05" />
      <path d="M 50,100 L 30,30 L 0,50 Z" fill="#fdba74" opacity="0.05" />
      <path d="M 0,90 L 100,90" fill="none" stroke="#f97316" strokeWidth="0.3" strokeDasharray="4 2" />
    </BannerSvgWrapper>
  );
}

export function HazardWarningSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <pattern id="hw-stripes" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#f97316" strokeWidth="4" opacity="0.15" />
        </pattern>
        <linearGradient id="hw-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#431407" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      
      <rect width="100" height="100" fill="url(#hw-grad)" />
      <rect width="100" height="100" fill="url(#hw-stripes)" />
      
      {/* Heavy plates */}
      <polygon points="0,0 20,0 15,100 0,100" fill="#000000" opacity="0.5" />
      <path d="M 18,0 L 20,0 L 15,100 L 13,100 Z" fill="#f97316" />
      
      <polygon points="100,0 90,0 80,100 100,100" fill="#000000" opacity="0.5" />
      <path d="M 88,0 L 90,0 L 80,100 L 78,100 Z" fill="#f97316" />

      {/* Warning Text Decor */}
      <text x="5" y="50" fill="#f97316" fontSize="8" fontFamily="monospace" transform="rotate(-90 5,50)" opacity="0.6">RESTRICTED</text>
    </BannerSvgWrapper>
  );
}

export function NeuralVoidSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <radialGradient id="nv-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b0764" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      
      <rect width="100" height="100" fill="url(#nv-grad)" />
      
      {/* Biological/Neural web curves */}
      <path d="M 0,20 Q 30,80 60,30 T 100,70" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.4">
         <animate attributeName="d" values="M 0,20 Q 30,80 60,30 T 100,70; M 0,30 Q 40,20 70,60 T 100,50; M 0,20 Q 30,80 60,30 T 100,70" dur="8s" repeatCount="indefinite" />
      </path>
      <path d="M 0,80 Q 40,10 80,60 T 100,20" fill="none" stroke="#d8b4fe" strokeWidth="0.2" opacity="0.3">
         <animate attributeName="d" values="M 0,80 Q 40,10 80,60 T 100,20; M 0,70 Q 50,90 90,30 T 100,40; M 0,80 Q 40,10 80,60 T 100,20" dur="10s" repeatCount="indefinite" />
      </path>

      {/* Pulsing Synapse Nodes */}
      <circle cx="30" cy="50" r="1.5" fill="#e9d5ff">
         <animate attributeName="r" values="1.5; 3; 1.5" dur="3s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="0.8; 0.2; 0.8" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="40" r="1.5" fill="#e9d5ff">
         <animate attributeName="r" values="1.5; 2.5; 1.5" dur="4s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="0.9; 0.3; 0.9" dur="4s" repeatCount="indefinite" />
      </circle>
    </BannerSvgWrapper>
  );
}

export function GlitchOverflowSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <linearGradient id="go-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#083344" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      
      <rect width="100" height="100" fill="url(#go-grad)" />
      
      {/* Glitching solid blocks */}
      <rect x="0" y="10" width="100" height="2" fill="#06b6d4" opacity="0.5">
         <animate attributeName="opacity" values="0;0.5;0;0;0.8;0" dur="2.1s" repeatCount="indefinite" />
         <animate attributeName="y" values="10;80;40;10" dur="0.8s" repeatCount="indefinite" />
      </rect>

      {/* Chromatic aberration lines */}
      <path d="M 0,30 L 100,30" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.6">
        <animate attributeName="stroke-width" values="0.8;3;0.8" dur="0.2s" repeatCount="indefinite" />
      </path>
      <path d="M 0,32 L 100,32" fill="none" stroke="#3b82f6" strokeWidth="0.8" opacity="0.6">
        <animate attributeName="stroke-width" values="0.8;2;0.8" dur="0.3s" repeatCount="indefinite" />
      </path>

      {/* Text artifacts */}
      <text x="80" y="80" fill="#22d3ee" fontSize="12" fontFamily="monospace" fontWeight="900" opacity="0.3">
        ERROR
        <animate attributeName="x" values="80; 78; 82; 80" dur="0.1s" repeatCount="indefinite" />
      </text>
    </BannerSvgWrapper>
  );
}

export function PhosphorusMatrixSVG() {
  return (
    <BannerSvgWrapper>
      <defs>
        <pattern id="pm-scanlines" width="4" height="2" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000000" fillOpacity="0.6" />
        </pattern>
      </defs>
      
      <rect width="100" height="100" fill="#022c22" />
      
      {/* Falling green code blocks (abstracted to lines) */}
      <path d="M 10,0 L 10,50 M 30,-20 L 30,30 M 50,40 L 50,90 M 70,10 L 70,60 M 90,-40 L 90,10" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.3">
         <animate attributeName="transform" values="translate(0,-50); translate(0,100)" dur="4s" repeatCount="indefinite" />
      </path>
      <path d="M 20,-30 L 20,20 M 40,-10 L 40,40 M 60,30 L 60,80 M 80,0 L 80,50 M 95,-50 L 95,0" fill="none" stroke="#4ade80" strokeWidth="0.8" opacity="0.5">
         <animate attributeName="transform" values="translate(0,-50); translate(0,100)" dur="2s" repeatCount="indefinite" />
      </path>

      <rect width="100" height="100" fill="url(#pm-scanlines)" />
      
      {/* CRT Vignette */}
      <rect width="100" height="100" fill="none" stroke="#000" strokeWidth="8" opacity="0.5" />
    </BannerSvgWrapper>
  );
}

export function getSvgBannerByKey(key, theme) {
  // Strip marketplace item suffix so 'quantum-neon-banner' resolves the same as 'quantum-neon'
  const normalizedKey = String(key || '').replace(/-(?:banner|frame|badge|title)$/, '');
  if (normalizedKey === 'quantum-neon' || theme === 'neon') return <QuantumNeonSVG />;
  if (normalizedKey === 'astral-forge' || theme === 'forge') return <AstralForgeSVG />;
  if (normalizedKey === 'hacker-noir' || theme === 'noir') return <HackerNoirSVG />;
  if (normalizedKey === 'phoenix-rise' || theme === 'phoenix') return <PhoenixRiseSVG />;
  if (normalizedKey === 'glitch-protocol' || normalizedKey === 'glitch-overflow' || theme === 'glitch') return <GlitchOverflowSVG />;
  if (normalizedKey === 'void-lattice' || normalizedKey === 'void-neural' || theme === 'neural') return <NeuralVoidSVG />;
  if (normalizedKey === 'tactical-warning' || theme === 'warning') return <HazardWarningSVG />;
  if (normalizedKey === 'phosphorus-matrix' || normalizedKey === 'singularity-matrix' || theme === 'matrix') return <PhosphorusMatrixSVG />;
  
  // Default minimal high-tech line
  return (
    <BannerSvgWrapper>
      <rect width="100" height="100" fill="transparent" />
      <path d="M 0,0 L 100,0 M 0,100 L 100,100" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.2" />
      <polygon points="100,0 80,0 100,20" fill="#334155" opacity="0.3" />
    </BannerSvgWrapper>
  );
}
