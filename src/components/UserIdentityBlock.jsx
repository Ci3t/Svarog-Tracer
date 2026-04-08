import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { getTitleTextStyle } from '../utils/titleCatalog';
import { getAvatarFrameStyle, getCosmeticAccentStyle } from '../utils/marketplaceCatalog';

function useAnimatedTitleEffect(title, rarity) {
  const titleStyle = useMemo(() => getTitleTextStyle(rarity), [rarity]);
  const titleRef = useRef(null);

  useLayoutEffect(() => {
    if (!titleRef.current || !title) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const normalized = String(rarity || 'common').trim().toLowerCase();
    const element = titleRef.current;
    const ctx = gsap.context(() => {
      gsap.killTweensOf(element);
      gsap.set(element, { clearProps: 'opacity,filter,backgroundPositionX' });

      if (normalized === 'mythic') {
        gsap.to(element, {
          backgroundPositionX: '240%',
          duration: 3.8,
          repeat: -1,
          ease: 'none',
        });
        gsap.to(element, {
          filter: 'drop-shadow(0 0 14px color-mix(in srgb, var(--theme-accent) 55%, transparent))',
          scale: 1.02,
          duration: 1.4,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        element.classList.add('rarity-mythic-glitch');
        return;
      }

      if (normalized === 'legendary') {
        gsap.to(element, {
          backgroundPositionX: '200%',
          duration: 4.8,
          repeat: -1,
          ease: 'none',
        });
        gsap.to(element, {
          filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--theme-accent) 35%, transparent))',
          duration: 1.8,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        element.classList.add('legendary-text-glow');
        return;
      }

      if (normalized === 'epic') {
        gsap.to(element, {
          opacity: 0.72,
          filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--theme-accent) 24%, transparent))',
          duration: 1.7,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }
    }, element);

    return () => ctx.revert();
  }, [rarity, title]);

  return { titleRef, titleStyle };
}

export function AnimatedTitleText({
  title,
  rarity = 'common',
  className = '',
}) {
  const { titleRef, titleStyle } = useAnimatedTitleEffect(title, rarity);

  if (!title) return null;

  const shimmerClass = rarity === 'mythic' ? 'rarity-mythic-shimmer' : rarity === 'legendary' ? 'rarity-legendary-shimmer' : '';

  return (
    <div 
      ref={titleRef} 
      data-text={title}
      className={`rarity-shimmer-container ${shimmerClass} ${className}`} 
      style={titleStyle}
    >
      {title}
      {shimmerClass && <div className="rarity-shimmer-overlay" />}
    </div>
  );
}

import { getSvgBannerByKey } from './cosmetics/SVGBanners';

export default function UserIdentityBlock({
  name,
  title,
  rarity = 'common',
  badge = '',
  badgeRarity = 'common',
  nameplate = '',
  nameplateRarity = 'common',
  nameClassName = 'text-sm font-medium',
  titleClassName = 'mt-1 text-[11px]',
  align = 'left',
  theme = 'default',
  nameplateKey = '',
}) {
  const { titleRef, titleStyle } = useAnimatedTitleEffect(title, rarity);
  const badgeStyle = useMemo(() => getCosmeticAccentStyle(badgeRarity), [badgeRarity]);
  
  const isMythic = nameplateRarity === 'mythic' || rarity === 'mythic';
  const isLegendary = nameplateRarity === 'legendary' || rarity === 'legendary';

  const nameplateStyle = useMemo(() => {
    if (!nameplate) return null;
    const accent = getCosmeticAccentStyle(nameplateRarity);
    return {
      ...accent,
      padding: '14px 22px',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '100%',
      backgroundColor: '#050510', // Deep base so SVGs pop
      borderRadius: isMythic ? '0px' : '14px',
      boxShadow: isMythic
        ? '0 0 50px rgba(255, 107, 159, 0.3), inset 0 0 25px rgba(255, 107, 159, 0.2)'
        : isLegendary
          ? '0 0 40px rgba(246, 183, 60, 0.25), inset 0 0 20px rgba(246, 183, 60, 0.15)'
          : '0 0 15px rgba(0,0,0,0.4)',
    };
  }, [nameplate, nameplateRarity, isMythic, isLegendary]);

  const containerClasses = [
    align === 'right' ? 'text-right' : '',
    isMythic ? 'rarity-mythic-banner-bg banner-clip-shard' : '',
    isMythic || isLegendary ? 'rarity-shimmer-container' : '',
    'gamer-hud-glass-panel'
  ].filter(Boolean).join(' ');

  const bannerBorderClass = isMythic ? 'rarity-mythic-border-box' : isLegendary ? 'rarity-legendary-border-box' : '';
  const isBadgeElite = badgeRarity === 'mythic' || badgeRarity === 'legendary';

  return (
    <div className={bannerBorderClass}>
      <div className={containerClasses} style={nameplateStyle || undefined}>
        
        {/* === PREMIUM SVG BACKDROP === */}
        {nameplate && (
          <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
             {getSvgBannerByKey(nameplateKey || theme, theme)}
          </div>
        )}

        {/* Global Shading for readability */}
        {nameplate && <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />}
        
        {/* === TEXT & CONTENT LAYER === */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div 
            className={`${nameClassName} gamer-prestige-name drop-shadow-md`} 
            style={{ '--theme-accent': nameplateStyle?.color || 'var(--theme-accent)' }}
          >
            {name}
          </div>
          {badge ? (
            <div className={isBadgeElite ? 'cyber-electric-badge' : ''}>
              <span
                className="inline-flex items-center rounded-md border border-white/20 bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                style={{ ...badgeStyle, textShadow: '0 0 8px currentColor' }}
              >
                {badge}
              </span>
            </div>
          ) : null}
        </div>
        
        {title ? (
          <div 
            ref={titleRef} 
            className={`relative z-10 ${titleClassName} ${isMythic ? 'gamer-mythic-chroma mythic-text-glow' : isLegendary ? 'legendary-text-glow' : 'drop-shadow-md text-slate-300'}`} 
            style={{ ...titleStyle, fontWeight: '800', letterSpacing: '0.05em' }}
          >
            {title}
            {isMythic && <div className="kinetic-title-bg" style={{ '--theme-accent': nameplateStyle?.color }} />}
          </div>
        ) : null}

        {/* Mythic/Legendary Shimmer Overlay */}
        {(isMythic || isLegendary) && <div className="rarity-shimmer-overlay z-20 pointer-events-none" />}
      </div>
    </div>
  );
}

export function UserIdentityCard({
  name,
  title,
  rarity = 'common',
  badge = '',
  badgeRarity = 'common',
  nameplate = '',
  nameplateRarity = 'common',
  nameplateKey = '',
  avatarUrl = '',
  frameKey = '',
  subtitle = '',
  sideLabel = '',
  rightSlot = null,
  className = '',
  nameClassName = 'text-base font-bold text-white',
  titleClassName = 'mt-1 text-[11px]',
}) {
  const avatarStyle = useMemo(() => getAvatarFrameStyle(frameKey), [frameKey]);
  const avatarFallback = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  const hasIdentityDecor = Boolean(nameplate || title || badge);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 ${className}`}>
      {hasIdentityDecor ? (
        <>
          <div className="absolute inset-0 opacity-90 pointer-events-none">
            {getSvgBannerByKey(nameplateKey || 'default', 'default')}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/35 pointer-events-none" />
        </>
      ) : null}
      <div className="relative z-10 flex items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className="h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-black/40"
            style={avatarStyle}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
                {avatarFallback}
              </div>
            )}
          </div>
          <div className="min-w-0">
            {sideLabel ? (
              <div className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                {sideLabel}
              </div>
            ) : null}
            <UserIdentityBlock
              name={name}
              title={title}
              rarity={rarity}
              badge={badge}
              badgeRarity={badgeRarity}
              nameplate={nameplate}
              nameplateRarity={nameplateRarity}
              nameplateKey={nameplateKey}
              nameClassName={nameClassName}
              titleClassName={titleClassName}
            />
            {subtitle ? (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  );
}
