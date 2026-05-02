import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Warp Banner Showcase — Advanced floating character display
 * Not a "card" — a floating showcase where the image is the hero.
 */

const Star = ({ className, filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={className}>
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
  const cardRef = useRef(null);
  const imgRef = useRef(null);
  const glowRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isHsr = game === 'hsr';
  const isCharacter = banner.type === 'character' || banner.type === 'standard' || banner.type === 'bangboo';
  const isLightCone = banner.type === 'light_cone';
  const isWeapon = banner.type === 'weapon';

  // Entrance animation — staggered rise with slight rotation
  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { y: 60, opacity: 0, scale: 0.9, rotateX: 8 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        rotateX: 0,
        duration: 0.7,
        ease: 'power4.out',
        delay: index * 0.08,
      }
    );
  }, [index]);

  // 3D Tilt + parallax (desktop only)
  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(card, {
        rotateY: x * 12,
        rotateX: -y * 12,
        y: -8,
        duration: 0.35,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          x: -x * 20,
          y: -y * 20,
          scale: 1.18,
          duration: 0.35,
          ease: 'power2.out',
        });
      }

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.6,
          scale: 1.1,
          duration: 0.35,
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
        });
      }

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: isSelected ? 0.5 : 0,
          scale: 1,
          duration: 0.6,
        });
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isSelected]);

  // Selection flash
  useEffect(() => {
    if (!isSelected || !cardRef.current) return;

    const tl = gsap.timeline();
    tl.to(cardRef.current, {
      filter: 'brightness(1.6) saturate(1.4)',
      duration: 0.06,
      yoyo: true,
      repeat: 3,
    }).to(cardRef.current, {
      filter: 'brightness(1.05) saturate(1.1)',
      duration: 0.4,
      ease: 'power2.out',
    });

    return () => { tl.kill(); };
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

  const getPlaceholderColor = () => {
    const hash = banner.name?.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) || 0;
    const hues = [200, 260, 320, 30, 160];
    return hues[Math.abs(hash) % hues.length];
  };

  const glowColor = isSelected
    ? 'rgba(245,158,11,0.5)'
    : isLightCone
    ? 'rgba(59,130,246,0.35)'
    : 'rgba(168,85,247,0.3)';

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className="group cursor-pointer relative"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Outer glow layer — behind everything */}
      <div
        ref={glowRef}
        className="absolute -inset-3 rounded-2xl transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
          opacity: isSelected ? 0.5 : 0,
          filter: 'blur(16px)',
          zIndex: 0,
        }}
      />

      {/* Main container — aspect ratio frame */}
      <div
        className={`
          relative rounded-2xl overflow-visible
          aspect-[2/3]
          transition-all duration-500
          ${isSelected ? 'z-20' : 'z-10'}
        `}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Image layer — can overflow the frame */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          {!imgError ? (
            <img
              ref={imgRef}
              src={banner.portrait || banner.image}
              alt={banner.name}
              className={`
                w-full h-full
                object-cover object-top
                transition-all duration-700 ease-out
                ${isSelected ? 'scale-100 brightness-105' : 'scale-100 brightness-90 group-hover:brightness-100'}
                ${imgLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              style={{
                imageRendering: 'auto',
                willChange: 'transform',
              }}
              onError={handleImgError}
              onLoad={handleImgLoad}
            />
          ) : null}

          {/* Placeholder fallback */}
          {(imgError || !banner.image) && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-2xl"
              style={{
                background: `linear-gradient(160deg, hsl(${getPlaceholderColor()}, 45%, 18%) 0%, hsl(${getPlaceholderColor()}, 35%, 8%) 100%)`,
              }}
            >
              <span className="text-5xl font-black text-white/15 uppercase">
                {banner.name?.charAt(0)}
              </span>
            </div>
          )}

          {/* Loading shimmer */}
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-950/60" />
          )}

          {/* LC decorative frame overlay */}
          {isLightCone && (
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-white/[0.06]">
              <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-blue-400/30 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-blue-400/30 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-blue-400/30 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-blue-400/30 rounded-br-2xl" />
            </div>
          )}

          {/* Very subtle bottom fade for text readability ONLY */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none z-10" />

          {/* Shine sweep on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent transition-transform duration-1000 ease-in-out pointer-events-none z-20 rounded-2xl" />
        </div>

        {/* Top-right: rarity indicator (mini) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-2 h-2 ${
                i < (banner.rarity || 5)
                  ? isSelected ? 'text-amber-400' : 'text-amber-500/60'
                  : 'text-white/10'
              }`}
              filled={i < (banner.rarity || 5)}
            />
          ))}
        </div>

        {/* Top-left: type badge */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <span className={`
            text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md
            backdrop-blur-md bg-black/30 border
            ${isLightCone || isWeapon
              ? 'border-blue-400/30 text-blue-300'
              : 'border-purple-400/30 text-purple-300'
            }
          `}>
            {isLightCone ? 'LC' : isWeapon ? 'WPN' : 'CHAR'}
          </span>
        </div>

        {/* Bottom: name panel */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
          <h3 className={`
            text-[11px] font-bold uppercase tracking-wider leading-tight
            drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
            ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}
            transition-colors duration-300
          `}>
            {banner.name}
          </h3>

          {banner.collaboration && (
            <div className="mt-0.5 text-[9px] text-amber-300/80 font-semibold uppercase tracking-wider drop-shadow-md">
              {banner.collaboration}
            </div>
          )}
        </div>

        {/* Selected ring border */}
        {isSelected && (
          <div
            className="absolute -inset-[2px] rounded-2xl pointer-events-none z-30"
            style={{
              border: '2px solid rgba(245,158,11,0.7)',
              boxShadow: '0 0 20px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.1)',
            }}
          />
        )}
      </div>
    </div>
  );
}
