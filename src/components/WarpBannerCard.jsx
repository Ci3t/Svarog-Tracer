import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Warp Banner Card with GSAP animations
 * Premium gacha-style card for HSR banners
 */

const Star = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
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
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const isHsr = game === 'hsr';
  const isCharacter = banner.type === 'character' || banner.type === 'standard' || banner.type === 'bangboo';
  const isLightCone = banner.type === 'light_cone';
  const isWeapon = banner.type === 'weapon';

  // Determine aspect ratio based on game and type
  const aspectClass = isHsr && isLightCone ? 'aspect-[3/2]' : 'aspect-[2/3]';

  // Entrance animation
  useEffect(() => {
    if (!cardRef.current) return;
    
    gsap.fromTo(
      cardRef.current,
      {
        y: 40,
        opacity: 0,
        scale: 0.95,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power3.out',
        delay: index * 0.06,
      }
    );
  }, [index]);

  // 3D Tilt on hover (desktop only)
  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.matchMedia('(pointer: coarse)').matches) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(card, {
        rotateY: x * 8,
        rotateX: -y * 8,
        scale: 1.03,
        duration: 0.3,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          x: -x * 14,
          y: -y * 14,
          scale: isHsr && isCharacter ? 1.45 : 1.08,
          duration: 0.3,
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      });

      if (imgRef.current) {
        gsap.to(imgRef.current, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.5,
        });
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Glitch effect on selection
  useEffect(() => {
    if (!isSelected || !cardRef.current) return;

    const tl = gsap.timeline();
    tl.to(cardRef.current, {
      filter: 'brightness(1.5) saturate(1.5)',
      duration: 0.05,
      yoyo: true,
      repeat: 3,
    }).to(cardRef.current, {
      filter: 'brightness(1) saturate(1)',
      duration: 0.2,
      ease: 'power2.out',
    });

    return () => {
      tl.kill();
    };
  }, [isSelected]);

  const handleImgError = (e) => {
    // LC fallback chain: Cloudinary portrait → GitHub preview → GitHub icon
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

  const handleImgLoad = () => {
    setImgLoaded(true);
  };

  // Generate placeholder color from banner name
  const getPlaceholderColor = () => {
    const hash = banner.name?.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) || 0;
    const hues = [200, 260, 320, 30, 160];
    return hues[Math.abs(hash) % hues.length];
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`
        group cursor-pointer relative rounded-xl overflow-hidden border-2 transition-all duration-300
        ${aspectClass}
        ${isSelected
          ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.35)] scale-[1.02] z-10'
          : 'border-slate-800/80 hover:border-amber-500/40 hover:scale-[1.01]'
        }
        bg-slate-900/60 backdrop-blur-sm
      `}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      {/* Image or Placeholder */}
      <div className="absolute inset-0">
        {!imgError ? (
          <img
            ref={imgRef}
            src={banner.portrait || banner.image}
            alt={banner.name}
            className={`
              w-full h-full transition-all duration-700
              ${isHsr && isCharacter ? 'object-cover object-[center_8%]' : 'object-cover'}
              ${isSelected ? 'grayscale-0 scale-[1.35]' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.12]'}
              ${imgLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onError={handleImgError}
            onLoad={handleImgLoad}
          />
        ) : null}

        {/* Placeholder fallback */}
        {(imgError || !banner.image) && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${getPlaceholderColor()}, 40%, 15%) 0%, hsl(${getPlaceholderColor()}, 30%, 8%) 100%)`,
            }}
          >
            <span className="text-4xl font-black text-white/10 uppercase">
              {banner.name?.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Loading shimmer */}
      {!imgLoaded && !imgError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800/50 to-slate-900/50" />
      )}

      {/* Shine sweep effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 ease-in-out pointer-events-none z-20" />

      {/* Gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-transparent z-10" />

      {/* Rarity glow for 5-star (HSR only) */}
      {isHsr && banner.rarity === 5 && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
        </div>
      )}

      {/* Bottom info panel */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
        {/* Rarity stars */}
        <div className="flex gap-0.5 mb-1.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-2.5 h-2.5 ${
                isSelected
                  ? i < (banner.rarity || 5) ? 'text-amber-400' : 'text-slate-700'
                  : 'text-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Name */}
        <h3 className={`text-xs font-bold uppercase tracking-wider leading-tight ${
          isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
        }`}>
          {banner.name}
        </h3>

        {/* Collaboration tag */}
        {banner.collaboration && (
          <div className="mt-1 text-[9px] text-amber-400/70 font-medium uppercase tracking-wider">
            {banner.collaboration}
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-20">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]" />
        </div>
      )}

      {/* Type badge (top left) */}
      <div className="absolute top-2 left-2 z-20">
        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
          isLightCone || isWeapon
            ? 'bg-blue-500/20 text-blue-400/80'
            : 'bg-purple-500/20 text-purple-400/80'
        }`}>
          {isLightCone ? 'LC' : isWeapon ? 'WPN' : 'CHAR'}
        </span>
      </div>
    </div>
  );
}
