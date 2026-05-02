import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Warp Banner Showcase — "Character Emerges from Void"
 * v2: Face zoom, breathing idle, chromatic hover, element badge
 */

const Star = ({ filled, active }) => (
  <svg viewBox="0 0 24 24" className={`w-3 h-3 ${filled ? (active ? 'text-amber-400' : 'text-slate-600') : 'text-slate-800'}`} fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

function getHsrElementUrl(element) {
  if (!element) return null;
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return null;
  const normalized = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_48/svarog-tracer/game/hsr/element_icon/${normalized}`;
}

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
  const breatheRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isHsr = game === 'hsr';
  const isLightCone = banner.type === 'light_cone';
  const isWeapon = banner.type === 'weapon';

  const elementUrl = isHsr ? getHsrElementUrl(banner.element) : null;

  // Entrance animation — rise from below with scale + blur reveal
  useEffect(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(
      wrapperRef.current,
      { y: 60, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out', delay: index * 0.1 }
    );
    if (imgRef.current) {
      gsap.fromTo(imgRef.current,
        { scale: 1.35, filter: 'blur(8px)' },
        { scale: 1.25, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out', delay: index * 0.1 + 0.15 }
      );
    }
  }, [index]);

  // Selection burst particles
  useEffect(() => {
    if (!isSelected || !burstRef.current) return;
    const particles = burstRef.current.querySelectorAll('.burst-particle');
    particles.forEach((p, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const dist = 50 + Math.random() * 40;
      gsap.fromTo(p,
        { x: 0, y: 0, opacity: 1, scale: 1.2 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0,
          scale: 0,
          duration: 0.7,
          ease: 'power2.out',
          delay: 0.05,
        }
      );
    });
  }, [isSelected]);

  // Idle breathing for selected card
  useEffect(() => {
    if (!isSelected || !imgRef.current) {
      if (breatheRef.current) { breatheRef.current.kill(); breatheRef.current = null; }
      return;
    }
    breatheRef.current = gsap.to(imgRef.current, {
      scale: 1.30,
      duration: 2.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });
    return () => { if (breatheRef.current) { breatheRef.current.kill(); } };
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
        rotateY: x * 14,
        rotateX: -y * 10,
        y: -14,
        duration: 0.3,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          scale: 1.38,
          x: -x * 18,
          y: -y * 10,
          duration: 0.3,
        });
      }

      if (glowRef.current) {
        gsap.to(glowRef.current, { opacity: 0.65, scale: 1.08, duration: 0.3 });
      }
    };

    const onLeave = () => {
      gsap.to(el, { rotateY: 0, rotateX: 0, y: 0, duration: 0.5, ease: 'power2.out' });
      if (imgRef.current) {
        gsap.to(imgRef.current, {
          scale: isSelected ? 1.25 : 1,
          x: 0,
          y: 0,
          duration: 0.5,
        });
      }
      if (glowRef.current) {
        gsap.to(glowRef.current, { opacity: isSelected ? 0.45 : 0, scale: 1, duration: 0.5 });
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
    maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
  };

  return (
    <div
      ref={wrapperRef}
      onClick={onClick}
      className="group cursor-pointer relative flex flex-col items-center"
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Image area — the character emerges here */}
      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-2xl">
        {/* Background glow — appears behind the image */}
        <div
          ref={glowRef}
          className="absolute -inset-4 rounded-3xl pointer-events-none transition-opacity"
          style={{
            background: `radial-gradient(ellipse at 50% 70%, rgba(${getGlowColor()},0.5) 0%, transparent 60%)`,
            opacity: isSelected ? 0.45 : 0,
            filter: 'blur(24px)',
            zIndex: 0,
          }}
        />

        {/* The character image with bottom fade + face zoom */}
        <div className="absolute inset-0 z-10" style={maskStyle}>
          {!imgError ? (
            <img
              ref={imgRef}
              src={banner.portrait || banner.image}
              alt={banner.name}
              className={`
                w-full h-full object-cover object-[center_8%]
                transition-all duration-500 ease-out
                ${isSelected ? 'brightness-110 contrast-110' : 'brightness-95 contrast-100 group-hover:brightness-105 group-hover:contrast-105'}
                ${imgLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              style={{
                willChange: 'transform',
                transform: 'scale(1.25)',
              }}
              onError={handleImgError}
              onLoad={handleImgLoad}
            />
          ) : null}

          {/* Chromatic aberration overlay on hover */}
          <div
            className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,0,0,0.06) 45%, rgba(0,255,255,0.06) 50%, transparent 55%)',
              mixBlendMode: 'screen',
            }}
          />

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
        <div className="absolute top-2 left-2 z-30">
          <span className={`
            text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded
            bg-black/50 backdrop-blur-md border
            ${isLightCone || isWeapon
              ? 'border-blue-400/40 text-blue-300'
              : 'border-purple-400/30 text-purple-300'
            }
          `}>
            {isLightCone ? 'LC' : isWeapon ? 'WPN' : 'CHAR'}
          </span>
        </div>

        {/* Top-right element icon */}
        {elementUrl && (
          <div className="absolute top-2 right-2 z-30">
            <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center p-1">
              <img
                src={elementUrl}
                alt={banner.element}
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>
        )}

        {/* Selected ring + burst container */}
        {isSelected && (
          <>
            {/* Amber outline */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none z-30"
              style={{
                border: '2px solid rgba(245,158,11,0.7)',
                boxShadow: '0 0 30px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.1)',
              }}
            />
            {/* Particle burst origin */}
            <div ref={burstRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="burst-particle absolute w-1.5 h-1.5 rounded-full bg-amber-400"
                  style={{ top: 0, left: 0 }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info BELOW the image — not overlaid */}
      <div className="mt-2 flex flex-col items-center gap-1 z-20">
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
