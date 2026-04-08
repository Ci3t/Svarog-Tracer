import React from 'react';

// ==========================================
// QUANTUM NEON (Theme 1)
// ==========================================

export const QuantumNeonFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_#3b82f6]">
    <defs>
      <linearGradient id="qn-frame-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="20%" stopColor="#8b5cf6" />
        <stop offset="80%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Left Bracket */}
    <path d="M 30,5 L 10,5 L 5,20 L 5,80 L 10,95 L 30,95" fill="none" stroke="url(#qn-frame-grad)" strokeWidth="3" />
    <path d="M 25,15 L 15,15 L 12,25 L 12,75 L 15,85 L 25,85" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.6" />
    {/* Right Bracket */}
    <path d="M 70,5 L 90,5 L 95,20 L 95,80 L 90,95 L 70,95" fill="none" stroke="url(#qn-frame-grad)" strokeWidth="3" />
    <path d="M 75,15 L 85,15 L 88,25 L 88,75 L 85,85 L 75,85" fill="none" stroke="#2dd4bf" strokeWidth="1" opacity="0.6" />
    {/* Avatar Ring */}
    <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" />
    <circle cx="50" cy="50" r="42" fill="none" stroke="#8b5cf6" strokeWidth="1" />
  </svg>
);

export const QuantumNeonBanner = () => (
  <div className="relative w-full h-full bg-[#0a0f1d] overflow-hidden border border-[#1e3a8a] rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]">
    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.15 }} />
    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent" />
    {/* Moving Scanline */}
    <div className="absolute top-0 left-0 w-full h-1 bg-[#3b82f644] blur-sm animate-[move-y_4s_linear_infinite]" style={{ transform: 'translateY(-100%)' }} />
    {/* Floating Data Pulses */}
    <div className="absolute top-1/4 left-0 w-20 h-[1px] bg-[#2dd4bf] shadow-[0_0_10px_#2dd4bf] animate-[move-x_3s_linear_infinite]" />
    <div className="absolute top-3/4 right-0 w-32 h-[1px] bg-[#3b82f6] shadow-[0_0_10px_#3b82f6] animate-[move-x-reverse_5s_linear_infinite]" />
  </div>
);

export const QuantumNeonBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_12px_#38bdf8]">
    <defs>
      <linearGradient id="qn-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#1e3a6e" />
      </linearGradient>
    </defs>
    {/* Shield shape */}
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#qn-badge-g)" stroke="#38bdf8" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="4 3"/>
    {/* Svarog Eye Icon */}
    <ellipse cx="60" cy="62" rx="22" ry="14" fill="none" stroke="#38bdf8" strokeWidth="2.5"/>
    <circle cx="60" cy="62" r="8" fill="#1e40af" stroke="#7dd3fc" strokeWidth="2"/>
    <circle cx="60" cy="62" r="3" fill="#38bdf8" className="animate-pulse"/>
    <line x1="30" y1="62" x2="38" y2="62" stroke="#38bdf8" strokeWidth="1.5"/>
    <line x1="82" y1="62" x2="90" y2="62" stroke="#38bdf8" strokeWidth="1.5"/>
    {/* Label */}
    <text x="60" y="95" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#7dd3fc" letterSpacing="2">SVAROG</text>
    <text x="60" y="107" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#1d4ed8" letterSpacing="1">DIAGNOSTIC_OK</text>
    {/* Top gem */}
    <polygon points="60,6 66,14 60,18 54,14" fill="#38bdf8"/>
  </svg>
);


// ==========================================
// ASTRAL FORGE (Theme 2)
// ==========================================

export const AstralForgeFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]">
    <defs>
      <linearGradient id="af-frame-metal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#fcd34d" />
      </linearGradient>
    </defs>
    {/* Thick Armor Plating with Hollow Center */}
    <path d="M 5,5 h 90 v 90 h -90 z M 50,15 a 35,35 0 1 0 0,70 a 35,35 0 1 0 0,-70" fill="url(#af-frame-metal)" stroke="#4b5563" strokeWidth="2" fillRule="evenodd" />
    <circle cx="50" cy="50" r="37" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.4" />
    {/* Power Core Nodes */}
    <rect x="4" y="4" width="8" height="8" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
    <rect x="88" y="4" width="8" height="8" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
    <rect x="4" y="88" width="8" height="8" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
    <rect x="88" y="88" width="8" height="8" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
  </svg>
);

export const AstralForgeBanner = () => (
  <div className="relative w-full h-full bg-[#020617] overflow-hidden rounded-lg border-2 border-[#334155] shadow-[0_0_15px_rgba(0,0,0,0.8)]">
    {/* CSS Space Background */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#020617] to-black" />
    <div className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%] opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
    {/* Shooting Stars via CSS Shapes */}
    <div className="absolute top-[30%] left-[20%] w-[100px] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[20deg] mix-blend-screen opacity-60" />
    <div className="absolute top-[60%] left-[40%] w-[150px] h-[3px] bg-gradient-to-r from-transparent via-[#60a5fa] to-transparent rotate-[20deg] mix-blend-screen opacity-80" />
    <div className="absolute top-[40%] left-[60%] w-[80px] h-[2px] bg-gradient-to-r from-transparent via-white to-transparent rotate-[20deg] mix-blend-screen opacity-50" />
  </div>
);

export const AstralForgeBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_4px_18px_rgba(0,0,0,0.8)]">
    <defs>
      <linearGradient id="af-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1c1108" />
        <stop offset="100%" stopColor="#3b2000" />
      </linearGradient>
      <linearGradient id="af-gold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#fcd34d" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#af-badge-g)" stroke="url(#af-gold)" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#92400e" strokeWidth="1"/>
    {/* Relic Diamond */}
    <polygon points="60,36 78,58 60,80 42,58" fill="#1e1b4b" stroke="url(#af-gold)" strokeWidth="2.5"/>
    <polygon points="60,44 70,58 60,72 50,58" fill="none" stroke="#d8b4fe" strokeWidth="1" opacity="0.5"/>
    <circle cx="60" cy="58" r="5" fill="#fcd34d" className="animate-pulse"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#fbbf24" letterSpacing="2">RELIC</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#92400e" letterSpacing="1">ENHANCED</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#fcd34d"/>
  </svg>
);


// ==========================================
// HACKER NOIR (Theme 3)
// ==========================================

export const HackerNoirFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_#10b981]">
    {/* Mechanical Plating Background with Hollow Center */}
    <path d="M5,5 h90 v90 h-90 z M50,15 l30,20 v30 l-30,20 l-30,-20 v-30 z" fill="#064e3b" stroke="#10b981" strokeWidth="2" fillRule="evenodd" />
    {/* Data Blocks */}
    <rect x="10" y="10" width="20" height="80" fill="#022c22" />
    <rect x="70" y="10" width="20" height="80" fill="#022c22" />
    <path d="M 12,15 L 28,15 M 12,25 L 28,25 M 12,35 L 28,35 M 12,45 L 28,45" stroke="#34d399" strokeWidth="2" />
    <path d="M 72,15 L 88,15 M 72,25 L 88,25 M 72,35 L 88,35" stroke="#34d399" strokeWidth="2" />
    {/* Warning Corner Labels */}
    <path d="M 5,20 L 5,5 L 20,5" fill="none" stroke="#f59e0b" strokeWidth="3" />
    <path d="M 95,80 L 95,95 L 80,95" fill="none" stroke="#f59e0b" strokeWidth="3" />
    {/* Center Avatar Hex */}
    <polygon points="50,15 80,35 80,65 50,85 20,65 20,35" fill="none" stroke="#059669" strokeWidth="4" />
  </svg>
);

export const HackerNoirBanner = () => (
  <div className="relative w-full h-full bg-[#022c22] overflow-hidden rounded-lg border border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.3)]">
    {/* Matrix Numbers Matrix Fake */}
    <div className="absolute inset-0 flex" style={{ opacity: 0.3, color: '#34d399', fontSize: '8px', lineHeight: '1', fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>
      01010011 01010110 01000001 01010010 01001111 01000111 00110000 00110001 01011001 01011110 01011101 <br/>
      01000101 01010110 01000001 01010010 01001111 01000111 00110000 00110001 01011001 01011110 01011101 <br/>
      01000101 01010110 01000001 11010010 01001111 01000111 00110000 00110001 01011001 01011110 01011101 <br/>
      00010011 01010110 01000001 01010010 01001111 01000111 00110000 00110001 01011001 01011110 01011101 <br/>
      11010011 01010110 01000001 01010010 01001111 01000111 00110000 00110001 01011001 01011110 01011101 <br/>
    </div>
    {/* Center Skull SVG Trace */}
    <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none drop-shadow-[0_0_8px_#34d399]">
      <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] max-w-[200px]" fill="#10b981">
         <path d="M 50,10 C 35,10 25,20 25,35 L 25,60 C 25,65 30,70 30,70 L 35,90 L 65,90 L 70,70 C 70,70 75,65 75,60 L 75,35 C 75,20 65,10 50,10 Z M 35,45 C 33,45 30,42 30,40 C 30,38 33,35 35,35 C 37,35 40,38 40,40 C 40,42 37,45 35,45 Z M 65,45 C 63,45 60,42 60,40 C 60,38 63,35 65,35 C 67,35 70,38 70,40 C 70,42 67,45 65,45 Z M 40,75 L 45,75 L 45,80 L 40,80 Z M 50,75 L 55,75 L 55,80 L 50,80 Z M 60,75 L 65,75 L 65,80 L 60,80 Z" />
      </svg>
    </div>
  </div>
);

export const HackerNoirBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_14px_#10b981]">
    <defs>
      <linearGradient id="hn-badge-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#012212" />
        <stop offset="100%" stopColor="#022c22" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#hn-badge-g)" stroke="#10b981" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#065f46" strokeWidth="1"/>
    {/* Hex terminal graphic */}
    <rect x="32" y="38" width="56" height="44" rx="4" fill="#011a10" stroke="#059669" strokeWidth="1.5"/>
    <text x="60" y="54" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#34d399" letterSpacing="1">01011</text>
    <text x="60" y="63" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#10b981" letterSpacing="1">ERROR</text>
    <text x="60" y="72" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#065f46" letterSpacing="1">10110</text>
    <rect x="32" y="84" width="56" height="2" fill="#34d399" opacity="0.4" className="animate-pulse"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#34d399" letterSpacing="2">SILVER</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#065f46" letterSpacing="1">WOLF SCRIPT</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#10b981"/>
  </svg>
);


// ==========================================
// PHOENIX RISE (Theme 4)
// ==========================================

export const PhoenixRiseFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)] overflow-visible">
    <defs>
      <linearGradient id="pr-wing-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="pr-wing-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
    </defs>
    
    {/* Huge Left Wing */}
    <path d="M 30,50 Q 0,20 -20,40 Q 0,60 10,70 Q 0,80 20,80 Q 25,90 35,80 Z" fill="url(#pr-wing-gold)" stroke="#78350f" strokeWidth="1" />
    <path d="M 30,55 Q 0,35 -10,50 Q 5,65 15,70 Q 10,80 25,80 Z" fill="url(#pr-wing-red)" stroke="#450a0a" strokeWidth="1" />
    
    {/* Huge Right Wing */}
    <path d="M 70,50 Q 100,20 120,40 Q 100,60 90,70 Q 100,80 80,80 Q 75,90 65,80 Z" fill="url(#pr-wing-gold)" stroke="#78350f" strokeWidth="1" />
    <path d="M 70,55 Q 100,35 110,50 Q 95,65 85,70 Q 90,80 75,80 Z" fill="url(#pr-wing-red)" stroke="#450a0a" strokeWidth="1" />
    
    {/* Inner Sun Ring */}
    <circle cx="50" cy="50" r="40" fill="none" stroke="#fcd34d" strokeWidth="4" />
    <circle cx="50" cy="50" r="44" fill="none" stroke="#b45309" strokeWidth="2" />
  </svg>
);

export const PhoenixRiseBanner = () => (
  <div className="relative w-full h-full bg-[#fef3c7] overflow-hidden rounded-lg shadow-[0_5px_15px_rgba(234,88,12,0.4)] border-2 border-[#fcd34d]">
    <div className="absolute inset-0 bg-gradient-to-t from-[#ea580c] via-[#fde047] to-[#fffbeb]" />
    {/* CSS Sun Rays */}
    <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20"
         style={{ background: 'conic-gradient(from 0deg, transparent 0 20deg, #b45309 20deg 40deg, transparent 40deg 60deg, #b45309 60deg 80deg, transparent 80deg 100deg, #b45309 100deg 120deg, transparent 120deg 140deg, #b45309 140deg 160deg, transparent 160deg 180deg, #b45309 180deg 200deg, transparent 200deg 220deg, #b45309 220deg 240deg, transparent 240deg 260deg, #b45309 260deg 280deg, transparent 280deg 300deg, #b45309 300deg 320deg, transparent 320deg 340deg, #b45309 340deg 360deg)' }} />
    
    {/* Phoenix Emblem Silhouette */}
    <div className="absolute inset-0 flex items-center justify-center opacity-90 drop-shadow-[0_5px_5px_rgba(120,53,15,0.6)]">
      <svg viewBox="0 0 100 100" className="h-[80%] max-w-[200px]" fill="#9a3412">
        <path d="M 50,15 L 45,30 Q 20,20 10,40 Q 30,50 40,55 L 50,85 L 60,55 Q 70,50 90,40 Q 80,20 55,30 Z M 48,10 Q 50,0 52,10 L 52,15 L 48,15 Z" />
      </svg>
    </div>
  </div>
);

export const PhoenixRiseBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_4px_20px_rgba(234,88,12,0.8)]">
    <defs>
      <linearGradient id="pr-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1c0900" />
        <stop offset="100%" stopColor="#431407" />
      </linearGradient>
      <linearGradient id="pr-fire" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#pr-badge-g)" stroke="url(#pr-fire)" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#7c2d12" strokeWidth="1"/>
    {/* SAM Mech Core */}
    <path d="M60,36 L72,52 L68,74 L60,82 L52,74 L48,52 Z" fill="#431407" stroke="url(#pr-fire)" strokeWidth="2.5"/>
    <path d="M60,46 L67,56 L65,68 L60,72 L55,68 L53,56 Z" fill="#b45309" className="animate-pulse"/>
    <circle cx="60" cy="58" r="4" fill="#fde047"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#fb923c" letterSpacing="2">OVERLOAD</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#7c2d12" letterSpacing="1">SAM_CORE_v2</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#fde047"/>
  </svg>
);


// ==========================================
// VOID LATTICE (Theme 5)
// ==========================================
export const VoidLatticeFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_#7e22ce]">
    <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#9333ea" strokeWidth="4" />
    <polygon points="50,15 85,32 85,68 50,85 15,68 15,32" fill="none" stroke="#d8b4fe" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M 5,25 L 15,32 M 95,25 L 85,32 M 95,75 L 85,68 M 5,75 L 15,68" stroke="#9333ea" strokeWidth="3" />
  </svg>
);
export const VoidLatticeBanner = () => (
  <div className="relative w-full h-full bg-[#1e1b4b] overflow-hidden border border-[#7e22ce] rounded-lg shadow-[0_0_20px_rgba(126,34,206,0.3)]">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#a855f7]/20 to-transparent skew-x-[-45deg] animate-[spin_5s_linear_infinite]" style={{ transformOrigin: 'center', width: '200%', left: '-50%' }} />
    <svg viewBox="0 0 100 100" className="absolute w-[150%] h-[150%] opacity-20 -top-1/4 -left-1/4 mix-blend-overlay">
       <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="#d8b4fe" strokeWidth="2" />
       <polygon points="50,20 80,50 50,80 20,50" fill="none" stroke="#d8b4fe" strokeWidth="1" />
       <polygon points="50,30 70,50 50,70 30,50" fill="none" stroke="#d8b4fe" strokeWidth="3" />
    </svg>
  </div>
);
export const VoidLatticeBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_20px_#a855f7]">
    <defs>
      <linearGradient id="vl-badge-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0d0520" />
        <stop offset="100%" stopColor="#1a0838" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#vl-badge-g)" stroke="#a855f7" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#581c87" strokeWidth="1"/>
    {/* Void diamond lattice */}
    <polygon points="60,34 80,55 60,76 40,55" fill="none" stroke="#c084fc" strokeWidth="2"/>
    <polygon points="60,40 73,55 60,70 47,55" fill="#2e1065" stroke="#a855f7" strokeWidth="1.5"/>
    <circle cx="60" cy="55" r="5" fill="#d8b4fe" className="animate-pulse"/>
    <line x1="60" y1="34" x2="60" y2="26" stroke="#c084fc" strokeWidth="1.5"/>
    <line x1="80" y1="55" x2="88" y2="55" stroke="#c084fc" strokeWidth="1.5"/>
    <line x1="40" y1="55" x2="32" y2="55" stroke="#c084fc" strokeWidth="1.5"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#c084fc" letterSpacing="2">VOID_IX</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#581c87" letterSpacing="1">NIHILITY</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#a855f7"/>
  </svg>
);

// ==========================================
// SOLARIS OVERCLOCK (Theme 6)
// ==========================================
export const SolarisFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_#f97316]">
    <circle cx="50" cy="50" r="42" fill="none" stroke="#ea580c" strokeWidth="4" strokeDasharray="30 5" className="animate-[spin_4s_linear_infinite]" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 5" className="animate-[spin_3s_linear_reverse_infinite]" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="#c2410c" strokeWidth="1" />
    {/* Solar Flares */}
    <path d="M 50,0 Q 55,20 50,20 Q 45,20 50,0 Z M 100,50 Q 80,45 80,50 Q 80,55 100,50 Z M 50,100 Q 55,80 50,80 Q 45,80 50,100 Z M 0,50 Q 20,45 20,50 Q 20,55 0,50 Z" fill="#fb923c" />
  </svg>
);
export const SolarisBanner = () => (
  <div className="relative w-full h-full bg-[#450a0a] overflow-hidden rounded-lg shadow-[0_0_20px_rgba(234,88,12,0.4)] border-b-4 border-[#ea580c]">
    <div className="absolute top-0 w-full h-[80%] bg-gradient-to-t from-[#c2410c] to-[#fef08a] opacity-80" />
    {/* Solar Flare Animations */}
    <div className="absolute bottom-0 left-1/4 w-12 h-32 bg-orange-400 opacity-30 blur-2xl animate-[float-up_5s_ease-in-out_infinite]" />
    <div className="absolute bottom-0 left-2/3 w-20 h-40 bg-yellow-400 opacity-20 blur-3xl animate-[float-up_7s_ease-in-out_1s_infinite]" />
    <div className="absolute bottom-0 right-10 w-8 h-24 bg-red-500 opacity-40 blur-xl animate-[float-up_4s_ease-in-out_2s_infinite]" />
    
    <div className="absolute bottom-0 w-full h-[50%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white via-[#fb923c] to-transparent opacity-90" />
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay" />
  </div>
);
export const SolarisBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_18px_#f59e0b]">
    <defs>
      <radialGradient id="sol-badge-g" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#431407" />
        <stop offset="100%" stopColor="#1c0900" />
      </radialGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#sol-badge-g)" stroke="#f59e0b" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#78350f" strokeWidth="1"/>
    {/* Nanook Destruction glyph */}
    <circle cx="60" cy="55" r="22" fill="none" stroke="#f59e0b" strokeWidth="2"/>
    <path d="M60,33 L60,77 M38,55 L82,55 M44,39 L76,71 M76,39 L44,71" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5"/>
    <polygon points="60,42 68,55 60,68 52,55" fill="#ea580c" className="animate-pulse"/>
    <circle cx="60" cy="55" r="5" fill="#fde047"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#f59e0b" letterSpacing="2">NANOOK</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#78350f" letterSpacing="1">RUIN_PATH</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#fde047"/>
  </svg>
);

// ==========================================
// GLITCH PROTOCOL (Theme 7)
// ==========================================
export const GlitchFrame = () => (
  <div className="w-full h-full relative" style={{clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)'}}>
    <div className="absolute inset-0 border-[6px] border-[#06b6d4] opacity-50 translate-x-1" />
    <div className="absolute inset-0 border-[6px] border-[#ec4899] opacity-50 -translate-x-1" />
    <div className="absolute inset-1 border-[4px] border-[#2dd4bf]" style={{clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)'}} />
    <div className="absolute top-0 right-1/4 w-[6px] h-full bg-[#06b6d4] mix-blend-overlay opacity-80" style={{ transform: 'skewX(20deg)', animation: 'pulse 0.2s infinite' }} />
  </div>
);
export const GlitchBanner = () => (
  <div className="relative w-full h-full bg-[#082f49] overflow-hidden rounded-lg border border-[#06b6d4] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
    <div className="absolute w-[110%] h-[5px] bg-[#ec4899] top-1/3 opacity-80 backdrop-blur-md mix-blend-screen" style={{ transform: 'skewX(-20deg)', animation: 'ping 1s infinite alternate' }} />
    <div className="absolute w-[110%] h-[15px] bg-[#2dd4bf] bottom-1/4 opacity-60 backdrop-blur-sm mix-blend-screen" style={{ transform: 'skewX(40deg)', animation: 'pulse 0.5s infinite' }} />
  </div>
);
export const GlitchBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_14px_#06b6d4]">
    <defs>
      <linearGradient id="gl-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0a1628" />
        <stop offset="100%" stopColor="#020b18" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#gl-badge-g)" stroke="#ec4899" strokeWidth="2.5"/>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="none" stroke="#06b6d4" strokeWidth="1" transform="translate(2 2)"/>
    {/* Glitch terminal */}
    <rect x="30" y="36" width="60" height="52" rx="3" fill="#041018" stroke="#06b6d4" strokeWidth="1.5"/>
    <rect x="30" y="36" width="60" height="8" rx="3" fill="#06b6d455"/>
    <text x="60" y="49" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#ec4899" letterSpacing="1">PROTOCOL ERR</text>
    <text x="60" y="62" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#2dd4bf">0xDEAD</text>
    <text x="60" y="74" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#06b6d4">EXCEPTION_0x1337</text>
    <rect x="30" y="78" width="60" height="2" fill="#ec4899" opacity="0.4" className="animate-pulse"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#06b6d4" letterSpacing="2">GLITCH</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#164e63" letterSpacing="1">SYSTEM_ERR</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#06b6d4"/>
  </svg>
);

// ==========================================
// SINGULARITY MATRIX (Theme 8)
// ==========================================
export const SingularityFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_white]">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#000" strokeWidth="8" />
    <circle cx="50" cy="50" r="45" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 4" />
    <ellipse cx="50" cy="50" rx="60" ry="15" transform="rotate(-30 50 50)" fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.8" />
    <ellipse cx="50" cy="50" rx="55" ry="10" transform="rotate(-30 50 50)" fill="none" stroke="#94a3b8" strokeWidth="1" opacity="0.4" />
  </svg>
);
export const SingularityBanner = () => (
  <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.2)] border border-white/20">
    <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle_at_center,_transparent_10%,_#fff_12%,_#000_15%,_transparent_40%)] opacity-80" />
    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
  </div>
);
export const SingularityBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_15px_#94a3b8]">
    <defs>
      <radialGradient id="sg-badge-g" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#111" />
        <stop offset="100%" stopColor="#000" />
      </radialGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#sg-badge-g)" stroke="#e2e8f0" strokeWidth="2.5"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#334155" strokeWidth="1"/>
    {/* Star-warp burst */}
    <path d="M60,36 L63,50 L72,42 L64,53 L78,53 L64,57 L72,68 L63,60 L60,74 L57,60 L48,68 L56,57 L42,53 L56,53 L48,42 L57,50 Z" fill="#f1f5f9" className="animate-pulse"/>
    <circle cx="60" cy="55" r="6" fill="white"/>
    <circle cx="60" cy="55" r="28" fill="none" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3 4" className="animate-[spin_20s_linear_infinite]"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#e2e8f0" letterSpacing="2">PROTOCOL</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#475569" letterSpacing="1">WARP_TICKET</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#e2e8f0"/>
  </svg>
);

// ==========================================
// PLASMA OVERLOAD (Theme 9)
// ==========================================
export const PlasmaOverloadFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_#38bdf8]">
    <circle cx="50" cy="50" r="44" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="10 20" className="animate-[spin_4s_linear_infinite]" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="5 10" className="animate-[spin_2s_linear_reverse_infinite]" />
    <circle cx="50" cy="50" r="47" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.6" strokeDasharray="2 4" />
    <path d="M 50,0 L 50,10 M 100,50 L 90,50 M 50,100 L 50,90 M 0,50 L 10,50" stroke="#0ea5e9" strokeWidth="4" />
  </svg>
);
export const PlasmaOverloadBanner = () => (
  <div className="relative w-full h-full bg-[#082f49] overflow-hidden rounded-lg border-b-4 border-[#0ea5e9] shadow-[0_0_20px_#0ea5e944]">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30" />
    <div className="absolute top-1/2 w-[200%] h-1 bg-[#38bdf8] opacity-60 shadow-[0_0_15px_#38bdf8]" style={{ transform: 'translateY(-50%) skewX(-30deg)', animation: 'pulse 1s ease-in-out infinite' }} />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#22d3ee]/10 to-transparent" />
  </div>
);
export const PlasmaOverloadBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_16px_#38bdf8]">
    <defs>
      <linearGradient id="po-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#021520" />
        <stop offset="100%" stopColor="#0c2d42" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#po-badge-g)" stroke="#0ea5e9" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#0c4a6e" strokeWidth="1"/>
    {/* Electric diamond */}
    <polygon points="60,34 80,55 60,76 40,55" fill="none" stroke="#7dd3fc" strokeWidth="2.5"/>
    <circle cx="60" cy="55" r="10" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2"/>
    <circle cx="60" cy="55" r="4" fill="#bae6fd" className="animate-ping"/>
    <path d="M45,55 L38,55 M75,55 L82,55 M60,40 L60,33 M60,70 L60,77" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#38bdf8" letterSpacing="2">PLASMA</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#0c4a6e" letterSpacing="1">MAX_AMP_LVL</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#38bdf8"/>
  </svg>
);

// ==========================================
// VOID VORTEX (Theme 10)
// ==========================================
export const VoidVortexFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_18px_#a855f7]">
    <path
      d="M 50,6 A 44,44 0 1 1 50,94 A 44,44 0 1 1 50,6"
      fill="none"
      stroke="#7e22ce"
      strokeWidth="6"
      strokeDasharray="15 5"
      className="animate-[spin_10s_linear_infinite]"
    />
    <path
      d="M 50,12 A 38,38 0 1 0 50,88 A 38,38 0 1 0 50,12"
      fill="none"
      stroke="#c084fc"
      strokeWidth="2"
      strokeDasharray="2 10"
      className="animate-[spin_6s_linear_reverse_infinite]"
    />
    <circle cx="50" cy="50" r="48" fill="none" stroke="#581c87" strokeWidth="1" />
  </svg>
);
export const VoidVortexBanner = () => (
  <div className="relative w-full h-full bg-black overflow-hidden rounded-xl border border-purple-900/50">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3b0764_0%,_transparent_70%)] animate-pulse" />
    <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,_transparent_0deg,_#a855f7_20deg,_transparent_40deg)] opacity-20 animate-[spin_15s_linear_infinite]" />
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
  </div>
);
export const VoidVortexBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_20px_#d8b4fe]">
    <defs>
      <radialGradient id="vv-badge-g" cx="50%" cy="40%" r="70%">
        <stop offset="0%" stopColor="#1e1b4b" />
        <stop offset="100%" stopColor="#0c0a24" />
      </radialGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#vv-badge-g)" stroke="#a855f7" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#3b0764" strokeWidth="1"/>
    {/* Recollection Eye */}
    <path d="M30,55 Q60,32 90,55 Q60,78 30,55" fill="none" stroke="#d8b4fe" strokeWidth="2.5"/>
    <circle cx="60" cy="55" r="13" fill="#2d1f6e" stroke="#c084fc" strokeWidth="2"/>
    <circle cx="60" cy="55" r="6" fill="#7e22ce"/>
    <circle cx="60" cy="55" r="2.5" fill="#f5f3ff" className="animate-pulse"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#c084fc" letterSpacing="2">RECOLLECT</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#3b0764" letterSpacing="1">BLACK_SWAN</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#a855f7"/>
  </svg>
);

// ==========================================
// CYBER SAMURAI (Theme 11)
// ==========================================
export const CyberSamuraiFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_#dc2626]">
    <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="4" />
    <path d="M50,0 L50,15 M50,100 L50,85 M0,50 L15,50 M100,50 L85,50" stroke="#f87171" strokeWidth="6" />
    <circle cx="50" cy="50" r="35" fill="none" stroke="#7f1d1d" strokeWidth="2" strokeDasharray="5 5" />
  </svg>
);
export const CyberSamuraiBanner = () => (
  <div className="relative w-full h-full bg-[#450a0a] overflow-hidden rounded-md border-b-4 border-[#dc2626]">
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum-dark.png')] opacity-30 mix-blend-overlay" />
    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#dc2626] opacity-50 shadow-[0_0_10px_#dc2626]" />
  </div>
);
export const CyberSamuraiBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_12px_#dc2626]">
    <defs>
      <linearGradient id="cs-badge-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#450a0a" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#cs-badge-g)" stroke="#dc2626" strokeWidth="3"/>
    <path d="M60,14 L100,35 L100,88 Q100,122 60,126 Q20,122 20,88 L20,35 Z" fill="none" stroke="#fca5a5" strokeWidth="1" opacity="0.3"/>
    <path d="M40,40 L80,40 L60,100 Z" fill="#991b1b" stroke="#fca5a5" strokeWidth="2"/>
    <circle cx="60" cy="55" r="8" fill="#dc2626" className="animate-pulse"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#fca5a5" letterSpacing="2">BUSHIDO</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#dc2626" letterSpacing="1">RONIN_v4</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#dc2626"/>
  </svg>
);

// ==========================================
// DEEP DIVE (Theme 12)
// ==========================================
export const DeepDiveFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_#2563eb]">
    <circle cx="50" cy="50" r="48" fill="none" stroke="#1d4ed8" strokeWidth="4" />
    <circle cx="50" cy="50" r="42" fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="2 8" />
    <circle cx="50" cy="5" r="5" fill="#93c5fd" />
    <circle cx="50" cy="95" r="5" fill="#93c5fd" />
  </svg>
);
export const DeepDiveBanner = () => (
  <div className="relative w-full h-full bg-[#0f172a] overflow-hidden rounded-xl border border-[#3b82f6]">
    <div className="absolute -bottom-1/2 -left-1/4 w-[150%] h-full bg-[#1e40af] rounded-[100%] opacity-40 blur-xl animate-pulse" />
    <div className="absolute -top-1/2 -right-1/4 w-[120%] h-[120%] bg-[#0284c7] rounded-[100%] opacity-30 blur-2xl" />
  </div>
);
export const DeepDiveBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_12px_#3b82f6]">
    <defs>
      <linearGradient id="dd-badge-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#dd-badge-g)" stroke="#3b82f6" strokeWidth="3"/>
    <circle cx="60" cy="55" r="25" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3"/>
    <path d="M40,55 Q60,75 80,55 Q60,35 40,55" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="2"/>
    <text x="60" y="97" fontSize="9" fontFamily="monospace" fontWeight="700" textAnchor="middle" fill="#93c5fd" letterSpacing="2">ABYSSAL</text>
    <text x="60" y="109" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#1d4ed8" letterSpacing="1">DIVE_GEAR</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#3b82f6"/>
  </svg>
);

// ==========================================
// NEBULA VOYAGER (Theme 13 - Mythic)
// ==========================================
export const NebulaVoyagerFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_#d8b4fe]">
    <defs>
      <linearGradient id="nv-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7e22ce" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="none" stroke="url(#nv-grad)" strokeWidth="6" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="#f5f3ff" strokeWidth="1" strokeDasharray="1 10" className="animate-[spin_20s_linear_infinite]" />
    <path d="M50,10 L55,0 L45,0 Z" fill="#f5f3ff" transform="rotate(45 50 50)" />
    <path d="M50,10 L55,0 L45,0 Z" fill="#f5f3ff" transform="rotate(135 50 50)" />
    <path d="M50,10 L55,0 L45,0 Z" fill="#f5f3ff" transform="rotate(225 50 50)" />
    <path d="M50,10 L55,0 L45,0 Z" fill="#f5f3ff" transform="rotate(315 50 50)" />
  </svg>
);
export const NebulaVoyagerBanner = () => (
  <div className="relative w-full h-full bg-[#020617] overflow-hidden rounded-xl border border-purple-500/30">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_#4c1d95_0%,_transparent_50%)] animate-pulse" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_#1e3a8a_0%,_transparent_50%)] animate-pulse" style={{animationDelay: '-2s'}} />
    <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
    <div className="absolute top-1/2 left-[-10%] w-[120%] h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent rotate-[5deg] blur-sm animate-[move-y_5s_ease-in-out_infinite]" />
  </div>
);
export const NebulaVoyagerBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_15px_#a855f7]">
    <defs>
      <linearGradient id="nv-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2e1065" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#nv-badge-g)" stroke="#d8b4fe" strokeWidth="3"/>
    <circle cx="60" cy="55" r="18" fill="none" stroke="#f5f3ff" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[spin_10s_linear_infinite]"/>
    <path d="M60,35 L68,55 L60,75 L52,55 Z" fill="#c084fc" className="animate-pulse"/>
    <text x="60" y="100" fontSize="10" fontFamily="monospace" fontWeight="900" textAnchor="middle" fill="#f5f3ff" letterSpacing="3">NEBULA</text>
    <text x="60" y="112" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#a855f7" letterSpacing="1">VOYAGER_01</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#f5f3ff"/>
  </svg>
);

// ==========================================
// STELLAR ECHO (Theme 14 - Legendary)
// ==========================================
export const StellarEchoFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_#fbbf24]">
    <circle cx="50" cy="50" r="48" fill="none" stroke="#b45309" strokeWidth="4" />
    <path d="M10,50 L30,50 M70,50 L90,50 M50,10 L50,30 M50,70 L50,90" stroke="#f6e05e" strokeWidth="2" strokeLinecap="round" />
    <circle cx="50" cy="50" r="35" fill="none" stroke="#d97706" strokeWidth="1" strokeDasharray="5 10" className="animate-[spin_15s_linear_infinite]" />
    <polygon points="50,15 55,25 45,25" fill="#fbbf24" />
    <polygon points="50,85 55,75 45,75" fill="#fbbf24" />
  </svg>
);
export const StellarEchoBanner = () => (
  <div className="relative w-full h-full bg-[#1c1917] overflow-hidden rounded-xl border border-amber-500/20">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#78350f_0%,_transparent_80%)] opacity-60" />
    <div className="absolute top-1/2 left-[-50%] w-[200%] h-full bg-[conic-gradient(from_0deg,_transparent_0deg,_#fbbf2422_20deg,_transparent_40deg)] animate-[spin_10s_linear_infinite]" />
    <div className="absolute inset-0 bg-black/20" />
    <div className="absolute top-2 right-4 w-4 h-4 bg-amber-400 rounded-full blur-xl animate-pulse" />
  </div>
);
export const StellarEchoBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_12px_#fbbf24]">
    <defs>
      <linearGradient id="se-badge-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#451a03" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#se-badge-g)" stroke="#fbbf24" strokeWidth="3"/>
    <circle cx="60" cy="55" r="22" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2 6" className="animate-[spin_12s_linear_reverse_infinite]"/>
    <path d="M60,35 L75,55 L60,75 L45,55 Z" fill="#f6e05e" stroke="#b45309" strokeWidth="2"/>
    <text x="60" y="100" fontSize="10" fontFamily="monospace" fontWeight="900" textAnchor="middle" fill="#fbbf24" letterSpacing="3">STELLAR</text>
    <text x="60" y="112" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#d97706" letterSpacing="1">RESONANCE_LV3</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#fbbf24"/>
  </svg>
);

// ==========================================
// AETHER BLADE (Theme 15 - Epic)
// ==========================================
export const AetherBladeFrame = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_#06b6d4]">
    <path d="M10,10 L90,10 L90,90 L10,90 Z" fill="none" stroke="#0891b2" strokeWidth="4" />
    <path d="M0,0 L20,20 M100,0 L80,20 M0,100 L20,80 M100,100 L80,80" stroke="#22d3ee" strokeWidth="3" />
    <rect x="15" y="15" width="70" height="70" fill="none" stroke="#ec4899" strokeWidth="1" strokeDasharray="5 5" className="animate-pulse" />
  </svg>
);
export const AetherBladeBanner = () => (
  <div className="relative w-full h-full bg-[#082f49] overflow-hidden rounded-xl border border-cyan-500/20">
    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 via-transparent to-pink-900/20" />
    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[move-y_3s_linear_infinite]" />
    <div className="absolute top-0 left-1/4 w-[2px] h-full bg-pink-500/30 blur-sm" />
    <div className="absolute bottom-4 right-4 text-[10px] font-mono text-cyan-400/40 uppercase">BLADE_PROTOCOL_ENGAGED</div>
  </div>
);
export const AetherBladeBadge = () => (
  <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-[0_0_12px_#06b6d4]">
    <defs>
      <linearGradient id="ab-badge-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#083344" />
        <stop offset="100%" stopColor="#164e63" />
      </linearGradient>
    </defs>
    <path d="M60,5 L110,30 L110,90 Q110,130 60,135 Q10,130 10,90 L10,30 Z" fill="url(#ab-badge-g)" stroke="#06b6d4" strokeWidth="3"/>
    <path d="M30,55 L90,55" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" className="animate-pulse"/>
    <path d="M60,30 L60,80" stroke="#06b6d4" strokeWidth="2" strokeDasharray="2 4"/>
    <text x="60" y="100" fontSize="10" fontFamily="monospace" fontWeight="900" textAnchor="middle" fill="#22d3ee" letterSpacing="3">AETHER</text>
    <text x="60" y="112" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#0891b2" letterSpacing="1">BLADE_SYNC</text>
    <polygon points="60,6 66,14 60,18 54,14" fill="#06b6d4"/>
  </svg>
);
export const LOADOUT_PRESETS = {
  'quantum-neon': {
    frame: QuantumNeonFrame, banner: QuantumNeonBanner, badge: QuantumNeonBadge, title: 'Quantum Neon', color: '#38bdf8'
  },
  'astral-forge': {
    frame: AstralForgeFrame, banner: AstralForgeBanner, badge: AstralForgeBadge, title: 'Astral Forge', color: '#fbbf24'
  },
  'hacker-noir': {
    frame: HackerNoirFrame, banner: HackerNoirBanner, badge: HackerNoirBadge, title: 'Hacker Noir', color: '#34d399'
  },
  'phoenix-rise': {
    frame: PhoenixRiseFrame, banner: PhoenixRiseBanner, badge: PhoenixRiseBadge, title: 'Phoenix Rise', color: '#fb923c'
  },
  'void-lattice': {
    frame: VoidLatticeFrame, banner: VoidLatticeBanner, badge: VoidLatticeBadge, title: 'Void Lattice', color: '#a855f7'
  },
  'solaris-overclock': {
    frame: SolarisFrame, banner: SolarisBanner, badge: SolarisBadge, title: 'Solaris Overclock', color: '#ea580c'
  },
  'glitch-protocol': {
    frame: GlitchFrame, banner: GlitchBanner, badge: GlitchBadge, title: 'Glitch Protocol', color: '#06b6d4'
  },
  'singularity-matrix': {
    frame: SingularityFrame, banner: SingularityBanner, badge: SingularityBadge, title: 'Singularity Matrix', color: '#e2e8f0'
  },
  'cyber-samurai': {
    frame: CyberSamuraiFrame, banner: CyberSamuraiBanner, badge: CyberSamuraiBadge, title: 'Cyber Samurai', color: '#dc2626'
  },
  'deep-dive': {
    frame: DeepDiveFrame, banner: DeepDiveBanner, badge: DeepDiveBadge, title: 'Deep Dive', color: '#1d4ed8'
  },
  'nebula-voyager': {
    frame: NebulaVoyagerFrame, banner: NebulaVoyagerBanner, badge: NebulaVoyagerBadge, title: 'Nebula Voyager', color: '#a855f7'
  },
  'stellar-echo': {
    frame: StellarEchoFrame, banner: StellarEchoBanner, badge: StellarEchoBadge, title: 'Stellar Echo', color: '#fbbf24'
  },
  'aether-blade': {
    frame: AetherBladeFrame, banner: AetherBladeBanner, badge: AetherBladeBadge, title: 'Aether Blade', color: '#06b6d4'
  },
  'plasma-overload': {
    frame: PlasmaOverloadFrame, banner: PlasmaOverloadBanner, badge: PlasmaOverloadBadge, title: 'Plasma Overload', color: '#0ea5e9'
  },
  'void-vortex': {
    frame: VoidVortexFrame, banner: VoidVortexBanner, badge: VoidVortexBadge, title: 'Void Vortex', color: '#a855f7'
  }
};
