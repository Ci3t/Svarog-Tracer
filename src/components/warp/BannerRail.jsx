import React, { useState, useRef, useEffect } from 'react';
import { useGameTheme } from './GameTheme';
import WarpBannerCard from '../WarpBannerCard';

/**
 * Banner Rail — Vertical left sidebar showing available banners
 * Premium: Glass morphism, hover reveals, active state glow
 */
export default function BannerRail({ 
  banners, 
  selectedBannerId, 
  onSelectBanner, 
  onFetchBanner,
  game,
  bannerType,
  onChangeBannerType,
  loading 
}) {
  const theme = useGameTheme(game);
  const railRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);

  const activeBanners = banners.filter(b => {
    if (bannerType === 'character') {
      return b.type === 'character' || b.type === 'standard' || b.type === 'bangboo';
    }
    return b.type === 'light_cone' || b.type === 'weapon';
  });

  const handleBannerImageError = (event, fallback) => {
    if (fallback && event.currentTarget.src !== fallback) {
      event.currentTarget.src = fallback;
      return;
    }
    event.currentTarget.style.opacity = '0';
  };

  return (
    <div className="flex flex-col h-full w-full lg:w-72 xl:w-80 shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: theme.color }}
          />
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
            Active Banners
          </span>
          <span className="ml-auto text-[10px] text-white/30 font-mono">
            {activeBanners.length}
          </span>
        </div>

        {/* Type Toggle */}
        <div className="flex p-0.5 bg-white/5 rounded-lg">
          <button
            onClick={() => onChangeBannerType('character')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
              bannerType === 'character' 
                ? 'text-white shadow-lg' 
                : 'text-white/30 hover:text-white/60'
            }`}
            style={bannerType === 'character' ? { backgroundColor: theme.color } : {}}
          >
            {game === 'hsr' ? 'Chars' : game === 'zzz' ? 'Agents' : 'Chars'}
          </button>
          <button
            onClick={() => onChangeBannerType(game === 'hsr' ? 'light_cone' : 'weapon')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
              bannerType !== 'character' 
                ? 'text-white shadow-lg' 
                : 'text-white/30 hover:text-white/60'
            }`}
            style={bannerType !== 'character' ? { backgroundColor: theme.color } : {}}
          >
            {game === 'hsr' ? 'LCs' : 'Weps'}
          </button>
        </div>
      </div>

      {/* Banner List */}
      <div 
        ref={railRef}
        className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {activeBanners.map((banner, index) => {
          const isSelected = selectedBannerId === banner.id;
          const isHovered = hoveredId === banner.id;
          
          return (
            <div
              key={banner.id}
              onClick={() => {
                onSelectBanner(banner.id);
                onFetchBanner(banner.id);
              }}
              onMouseEnter={() => setHoveredId(banner.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'ring-2 scale-[1.02]' 
                  : 'hover:scale-[1.01] hover:bg-white/5'
              }`}
              style={isSelected ? { ringColor: theme.color } : {}}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <img 
                  src={banner.portrait || banner.image} 
                  alt=""
                  className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                  loading="lazy"
                  onError={(event) => handleBannerImageError(event, banner.fallbackImage || banner.starRailStationImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
              </div>

              {/* Selection glow */}
              {isSelected && (
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ 
                    background: `linear-gradient(90deg, ${theme.color}40, transparent)`,
                  }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-3 p-3">
                {/* Thumbnail */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  <img 
                    src={banner.image} 
                    alt={banner.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(event) => handleBannerImageError(event, banner.fallbackImage || banner.starRailStationImage)}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate leading-tight">
                    {banner.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${theme.color}20`,
                        color: theme.color 
                      }}
                    >
                      {banner.type === 'light_cone' ? 'LC' : banner.type === 'weapon' ? 'WPN' : '5★'}
                    </span>
                    {banner.collaboration && (
                      <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
                        Collab
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                <div 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isSelected ? 'scale-100' : 'scale-0'
                  }`}
                  style={{ backgroundColor: theme.color }}
                />
              </div>
            </div>
          );
        })}

        {activeBanners.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-white/30">No banners available</p>
          </div>
        )}
      </div>
    </div>
  );
}
