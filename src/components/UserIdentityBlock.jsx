import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { getTitleTextStyle } from '../utils/titleCatalog';
import { getCosmeticAccentStyle } from '../utils/marketplaceCatalog';

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
          backgroundPositionX: '220%',
          duration: 4.8,
          repeat: -1,
          ease: 'none',
        });
        gsap.to(element, {
          filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--theme-accent) 45%, transparent))',
          duration: 1.9,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
        return;
      }

      if (normalized === 'legendary') {
        gsap.to(element, {
          backgroundPositionX: '200%',
          duration: 5.8,
          repeat: -1,
          ease: 'none',
        });
        gsap.to(element, {
          filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--theme-accent) 28%, transparent))',
          duration: 2.2,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
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

  return (
    <div ref={titleRef} className={className} style={titleStyle}>
      {title}
    </div>
  );
}

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
}) {
  const { titleRef, titleStyle } = useAnimatedTitleEffect(title, rarity);
  const badgeStyle = useMemo(() => getCosmeticAccentStyle(badgeRarity), [badgeRarity]);
  const nameplateStyle = useMemo(() => {
    if (!nameplate) return null;
    const accent = getCosmeticAccentStyle(nameplateRarity);
    return {
      ...accent,
      padding: '10px 12px',
      borderRadius: '12px',
      width: 'fit-content',
      maxWidth: '100%',
      boxShadow: nameplateRarity === 'mythic'
        ? '0 0 18px rgba(255, 107, 159, 0.16)'
        : nameplateRarity === 'legendary'
          ? '0 0 14px rgba(246, 183, 60, 0.14)'
          : nameplateRarity === 'epic'
            ? '0 0 12px rgba(199, 146, 255, 0.14)'
            : nameplateRarity === 'rare'
              ? '0 0 10px rgba(95, 215, 255, 0.12)'
              : 'none',
      background: nameplateRarity === 'mythic'
        ? 'linear-gradient(135deg, rgba(255,107,159,0.18), rgba(255,209,102,0.10))'
        : nameplateRarity === 'legendary'
          ? 'linear-gradient(135deg, rgba(246,183,60,0.16), rgba(246,183,60,0.08))'
          : nameplateRarity === 'epic'
            ? 'linear-gradient(135deg, rgba(199,146,255,0.16), rgba(199,146,255,0.08))'
            : accent.background,
    };
  }, [nameplate, nameplateRarity]);

  return (
    <div className={align === 'right' ? 'text-right' : ''} style={nameplateStyle || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <div className={nameClassName}>{name}</div>
        {badge ? (
          <span
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold"
            style={badgeStyle}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {title ? (
        <div ref={titleRef} className={titleClassName} style={titleStyle}>
          {title}
        </div>
      ) : null}
    </div>
  );
}
