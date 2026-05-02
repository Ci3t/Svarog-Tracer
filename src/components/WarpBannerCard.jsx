import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Warp Banner Showcase — "Character Emerges from Void"
 * No box. No border. The character IS the element.
 * Image fades to transparent at the bottom. Name + stars float below.
 */

const Star = ({ filled, active }) => (
  <svg viewBox="0 0 24 24" className={`w-3 h-3 ${filled ? (active ? 'text-amber-400' : 'text-slate-600') : 'text-slate-800'}`} fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function WarpBannerCard({
  banner,
  isSelected,
  onClick,
  index,
  game,
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const glowRef = useRef(null);
  const burstRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isHsr = game === 'hsr';
  const isLightCone = banner.type === 'light_cone';
  const isWeapon = banner.type === 'weapon';

  // Entrance animation — rise from below with fade
  useEffect(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(
      wrapperRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: index * 0.08 }
    );
  }, [index]);

  // Selection burst particles
  useEffect(() => {
    if (!isSelected || !burstRef.current) return;
    const particles = burstRef.current.querySelectorAll('.burst-particle');
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      gsap.fromTo(p,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0,
          scale: 0,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.05,
        }
      );
    });
  }, [isSelected]);

  // 3D hover tilt (desktop only)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || window.matchMedia('(pointer: coarse)').matches) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(el, {
        rotateY: x * 10,
        rotateX: -y * 8,
        y: -10,
        duration: 0.3,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          scale: 1.08,
          x: -x * 12,
          duration: 0.3,
        });
      }

      if (glowRef.current) {
        gsap.to(glowRef.current, { opacity: 0.55, scale: 1.05, duration: 0.3 });
      }
    };

    const onLeave = () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, y: 0, duration: 0.5, ease: 'power2.out' });
      if (imgRef.current) gsap.to(imgRef.current, { scale: 1, x: 0, duration: 0.5 });
      if (glowRef.current) {
        gsap.to(glowRef.current, { opacity: isSelected ? 0.4 : 0, scale: 1, duration: 0.5 });
      }
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [isSelected]);

  const handleImgError = (e) => {
    if (isLightCone && banner.portrait && e.target.src === banner.portrait) {
      const githubPreview = banner.lcPreview || `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/image/light_cone_preview/${banner.characterId}.png`;
      if (githubPreview && e.target.src !== githubPreview) {
        e.target.src = githubPreview;
        return;
      }
    }
    setImgError(true);
    if (banner.portrait && e.target.src !== banner.image) {
      e.target.src = banner.image;
      setImgError(false);
    }
  };

  const handleImgLoad = () => setImgLoaded(true);

  const getGlowColor = () => {
    if (isSelected) return '245, 158, 11';
    if (isLightCone) return '59, 130, 246';
    return '168, 85, 247';
  };

  const maskStyle = {
    maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
  };

  return (
    <div
      ref={wrapperRef}
      onClick={onClick}
      className="group cursor-pointer relative flex flex-col items-center"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Image area — the character emerges here */}
      <div className="relative w-full aspect-[2/3]">
        {/* Background glow — appears behind the image */}
        <div
          ref={glowRef}
          className="absolute -inset-2 rounded-3xl pointer-events-none transition-opacity"
          style={{
            background: `radial-gradient(ellipse at 50% 80%, rgba(${getGlowColor()},0.45) 0%, transparent 65%)`,
            opacity: isSelected ? 0.4 : 0,
            filter: 'blur(20px)',
            zIndex: 0,
          }}
        />

        {/* The character image with bottom fade */}
        <div className="absolute inset-0 z-10" style={maskStyle}>
          {!imgError ? (
            <img
              ref={imgRef}
              src={banner.portrait || banner.image}
              alt={banner.name}
              className={`
                w-full h-full object-cover object-top
                transition-all duration-500 ease-out
                ${isSelected ? 'brightness-110' : 'brightness-95 group-hover:brightness-105'}
                ${imgLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              style={{ willChange: 'transform' }}
              onError={handleImgError}
              onLoad={handleImgLoad}
            />
          ) : null}

          {/* Placeholder */}
          {(imgError || !banner.image) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950">
              <span className="text-6xl font-black text-white/10">{banner.name?.charAt(0)}</span>
            </div>
          )}

          {/* Loading */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-slate-800/70 to-slate-950/70" />
          )}
        </div>

        {/* Top-left type badge */}
        <div className="absolute top-1 left-1 z-20">
          <span className={`
            text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded
            bg-black/40 backdrop-blur-sm border
            ${isLightCone || isWeapon
              ? 'border-blue-400/30 text-blue-300'
              : 'border-purple-400/25 text-purple-300'
            }
          `}>
            {isLightCone ? 'LC' : isWeapon ? 'WPN' : 'CHAR'}
          </span>
        </div>

        {/* Selected ring + burst container */}
        {isSelected && (
          <>
            {/* Amber outline */}
            <div
              className="absolute -inset-1 rounded-2xl pointer-events-none z-30"
              style={{
                border: '2px solid rgba(245,158,11,0.6)',
                boxShadow: '0 0 25px rgba(245,158,11,0.25), inset 0 0 15px rgba(245,158,11,0.08)',
              }}
            />
            {/* Particle burst origin */}
            <div ref={burstRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="burst-particle absolute w-1 h-1 rounded-full bg-amber-400"
                  style={{ top: 0, left: 0 }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info BELOW the image — not overlaid */}
      <div className="mt-1 flex flex-col items-center gap-1 z-20">
        {/* Rarity stars */}
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} filled={i < (banner.rarity || 5)} active={isSelected} />
          ))}
        </div>

        {/* Name */}
        <h3 className={`
          text-[11px] font-bold uppercase tracking-wider text-center leading-tight
          ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}
          transition-colors duration-300
        `}>
          {banner.name}
        </h3>

        {banner.collaboration && (
          <div className="text-[9px] text-amber-400/70 font-semibold uppercase tracking-wider">
            {banner.collaboration}
          </div>
        )}
      </div>
    </div>
  );
}
