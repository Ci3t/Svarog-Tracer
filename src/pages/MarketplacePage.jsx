import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  RefreshCw, 
  Store, 
  Wallet, 
  Gift, 
  Trophy, 
  Shield, 
  Monitor, 
  Cpu, 
  Layers, 
  Target, 
  Info, 
  ArrowRight,
  ChevronRight,
  BadgeCheck,
  Flame,
  Gamepad2,
  BookOpen,
  History
} from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { useProfileMarketplace } from '../hooks/useProfileMarketplace';
import { usePvpSeasonStats } from '../hooks/usePvpSeasonStats';
import { buildApiUrl } from '../utils/apiBase';
import { withBaseUrl } from '../utils/assetPaths';
import UserIdentityBlock, { AnimatedTitleText } from '../components/UserIdentityBlock';
import {
  getAvatarFrameStyle,
  getCosmeticAccentStyle,
  getMarketplaceItem,
  resolveEquippedCosmeticsFromMetadata,
} from '../utils/marketplaceCatalog';
import {
  getTitleBadgeStyle,
  getTitleDefinition,
  resolveEquippedTitleKeyFromMetadata,
} from '../utils/titleCatalog';

import { LOADOUT_PRESETS } from '../components/cosmetics/PremiumAssets';

/* HELPER: Resolve Discord and Profile Names */
function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata || {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discord = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord')?.identity_data || {};
  return metadata.global_name || metadata.full_name || discord.global_name || discord.username || metadata.user_name || user.email || user.id || '';
}

function resolveAvatarUrl(user) {
  if (!user) return '';
  const metadata = user.user_metadata || {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discord = identities.find(i => String(i?.provider || '').toLowerCase() === 'discord')?.identity_data || {};
  const candidates = [metadata.avatar_url, metadata.avatar, discord.avatar_url, discord.picture];
  for (const value of candidates) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return withBaseUrl(normalized);
  }
  return '';
}

const RARITY_LABELS = {
  mythic: 'Grade IV',
  legendary: 'Grade III',
  epic: 'Grade II',
  rare: 'Grade I',
  common: 'Standard'
};

const LORE_BITS = {
  frame: [
    "Retuned from Belobog's fragmentum-scouts.",
    "Integrated with Silvermane encryption protocols.",
    "Lattice-work hardened by IPC Logistics.",
    "A cold singularity-grade finish for elite tracers."
  ],
  badge: [
    "Marked for orbital deployment.",
    "Syncing with Trailblaze expedition logs.",
    "Field-tested in the Underworld circuits.",
    "Verified for overseas strategic oversight."
  ],
  nameplate: [
    "Prismatic strip with reinforced backing.",
    "Command-tier visual presence for active operators.",
    "Minimalist aesthetic for high-density HUDs.",
    "Refined for the Svarog Tracer identity."
  ],
  title: [
    "Bestowed upon those who breach the data-veil.",
    "A harmonic resonance from distant star-systems.",
    "Coded into the down-level physics of the matrix.",
    "Elevated identity for top-tier observers."
  ]
};

const formatTokenCount = (val) => new Intl.NumberFormat('en-US').format(Number(val || 0));

/* -------------------------------------------------------------------------- */
/*                               TACTICAL COMPONENTS                           */
/* -------------------------------------------------------------------------- */

const TacticalHeader = ({ tokens, displayName, themeAccent }) => (
  <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none" />
    <div className="flex items-center gap-5">
      <div className="relative h-14 w-14 rounded-full border border-white/20 bg-slate-900 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.05)]">
        <Store className="h-6 w-6 text-[var(--theme-accent)]" />
        <div className="absolute -inset-1 rounded-full border border-[var(--theme-accent-soft)] animate-ping opacity-20" />
      </div>
      <div>
        <h1 className="font-['Orbitron'] text-2xl font-black uppercase tracking-[0.25em] text-white">Marketplace</h1>
        <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1.5"><Monitor className="h-3 w-3" /> Cosmetic Shop</span>
          <span className="flex items-center gap-1.5"><Cpu className="h-3 w-3" /> Live Preview</span>
        </div>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-4">
      <div 
        className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-3 transition-all hover:border-[var(--theme-accent)]"
      >
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-widest text-slate-500">Wallet Balance</div>
          <div className="font-['Orbitron'] text-xl font-bold text-[var(--theme-accent)]">{formatTokenCount(tokens)}</div>
        </div>
        <div className="h-10 w-10 rounded-lg border border-[var(--theme-accent-soft)] bg-[var(--theme-accent-soft)]/20 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-[var(--theme-accent)]" />
        </div>
      </div>
    </div>
  </div>
);

const IdentityTerminal = ({ user, displayName, credentials, preview, avatarUrl, initials }) => {
  const { title, badge, banner, frame } = preview;
  
  const resolvePreset = (item) => {
    if (!item?.key) return LOADOUT_PRESETS['quantum-neon'];
    const presetKey = item.key.replace('-banner', '').replace('-frame', '').replace('-badge', '').replace('-title', '');
    return LOADOUT_PRESETS[presetKey] || LOADOUT_PRESETS['quantum-neon'];
  };

  const FramePreset = frame ? resolvePreset(frame) : resolvePreset({key: 'quantum-neon'});
  const BannerPreset = banner ? resolvePreset(banner) : resolvePreset({key: 'quantum-neon'});
  const BadgePreset = badge ? resolvePreset(badge) : resolvePreset({key: 'quantum-neon'});

  const isMixed = (FramePreset.title !== BannerPreset.title) || (BannerPreset.title !== BadgePreset.title);
  const dominantColor = BannerPreset.color;

  return (
    <div className="sticky top-10 flex flex-col gap-6 rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur-2xl shadow-2xl">
      <div className="flex items-center gap-2 font-['Orbitron'] text-[10px] uppercase tracking-[0.2em]" style={{color: dominantColor}}>
        <Target className="h-3.5 w-3.5" /> Preview
      </div>

      <div className="relative group">
        <div className="absolute inset-0 opacity-50 blur-3xl pointer-events-none transition-opacity group-hover:opacity-100" style={{ backgroundColor: `${dominantColor}15` }} />
        
        <div className="relative rounded-3xl border border-white/10 bg-[#0a050f] p-6 shadow-[inset_0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          
          <div className="flex flex-col items-center text-center relative z-10 w-full group">
            
            {/* AVATAR + FRAME ASSEMBLY */}
            <div className="relative mb-10 h-28 w-28 flex items-center justify-center">
              <div className="absolute inset-[-24px] pointer-events-none z-10">
                <FramePreset.frame />
              </div>
              <div className="h-24 w-24 rounded-full overflow-hidden border border-white/10 relative z-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <div className="h-full w-full bg-slate-900 flex items-center justify-center font-['Orbitron'] text-2xl font-black">{initials}</div>
                )}
              </div>
            </div>

            {/* NAMEPLATE / BANNER ASSEMBLY */}
            <div className="relative w-[110%] h-[60px] mb-6 shadow-xl">
              <BannerPreset.banner />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                 <span className="font-['Orbitron'] text-sm font-black uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
                   {displayName}
                 </span>
                 {title && (
                   <div className="mt-1 scale-[0.85] origin-top">
                     <AnimatedTitleText 
                       title={title.name} 
                       rarity={title.rarity} 
                       className="font-black uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,0,0,1)]" 
                     />
                   </div>
                 )}
              </div>
            </div>

            {/* BADGE ASSEMBLY */}
            <div className="relative h-20 w-20 mb-2">
               <BadgePreset.badge />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 w-full">
              <div className="rounded-lg border border-white/5 bg-black/40 backdrop-blur-md p-2 text-center">
                <div className="text-[8px] uppercase tracking-widest text-slate-500">Status</div>
                <div className="mt-1 text-[10px] font-bold text-emerald-400 mr-2 uppercase drop-shadow-[0_0_5px_currentColor]">Equipped</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/40 backdrop-blur-md p-2 text-center">
                <div className="text-[8px] uppercase tracking-widest text-slate-500">Theme</div>
                <div style={{color: isMixed ? '#cbd5e1' : dominantColor}} className="mt-1 text-[10px] font-bold uppercase drop-shadow-[0_0_5px_currentColor]">
                  {isMixed ? 'Custom Mix' : BannerPreset.title}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-4">Current Loadout</div>
        <div className="space-y-3">
          {['frame', 'badge', 'banner'].map(slot => {
            const item = preview[slot] || credentials[slot];
            return (
              <div key={slot} className="flex items-center justify-between text-[11px] p-2 rounded-lg border border-white/5 bg-black/30">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">{slot}</span>
                <span className="font-bold text-slate-300 uppercase truncate max-w-[150px]">{item?.name || 'Standard'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MarketMatrixCard = ({ item, actionBusy, locked, equippedKey, onPurchase, onEquip, onPreview }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef(null);
  const backRef = useRef(null);
  const accent = getCosmeticAccentStyle(item.rarity || 'common');
  
  const isTitle = item.type === 'title';
  const isOwned = Boolean(item.owned);
  const isEquipped = String(equippedKey || '').trim() === String(item.key || '').trim();

  const presetKey = item.key.replace('-banner', '').replace('-frame', '').replace('-badge', '').replace('-title', '');
  const Preset = LOADOUT_PRESETS[presetKey] || LOADOUT_PRESETS['quantum-neon'];

  // GSAP 3D Flip Logic
  useEffect(() => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      rotateY: isFlipped ? 180 : 0,
      duration: 0.6,
      ease: "power2.inOut",
      transformPerspective: 1000,
    });
  }, [isFlipped]);

  const handleAction = (e) => {
    e.stopPropagation();
    if (!isOwned) {
      onPurchase?.(item.key);
    } else if (!isTitle && !isEquipped) {
      onEquip?.(item);
    }
  };

  const getLore = () => {
    const list = LORE_BITS[item.slot || 'title'] || LORE_BITS.title;
    return list[item.key.length % list.length];
  };

  return (
    <div 
      className="relative h-[320px] w-full [perspective:1000px] group cursor-pointer"
      onMouseEnter={() => onPreview?.(item)}
      onFocus={() => onPreview?.(item)}
      data-market-item="true"
    >
      <div 
        ref={cardRef}
        className="relative h-full w-full transition-all duration-600 [transform-style:preserve-3d]"
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] rounded-2xl border border-white/10 bg-[#120a17] p-5 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all group-hover:border-white/30 group-hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-10 -right-10 h-32 w-32 blur-[60px] opacity-30 pointer-events-none" style={{ backgroundColor: Preset.color }} />
          
          {/* LOADOUT OPTION LABEL HEADER */}
          <div className="flex items-center justify-between mb-4 relative z-10 w-full mb-auto pb-4 border-b border-white/5">
             <div className="font-['Orbitron'] text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">ITEM PREVIEW</div>
             <div className="text-[10px] font-bold uppercase" style={{ color: Preset.color }}>{Preset.title}</div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center relative my-4">
             {/* THE ACTUAL PREMIUM ASSET */}
             {item.slot === 'nameplate' && (
                <div className="w-full h-[70px] pointer-events-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative z-10">
                   <Preset.banner />
                </div>
             )}

             {item.slot === 'badge' && (
                <div className="h-[100px] w-[86px] pointer-events-none relative z-10">
                   <Preset.badge />
                </div>
             )}

             {item.slot === 'frame' && (
                <div className="h-[90px] w-[90px] pointer-events-none relative z-10 flex items-center justify-center relative">
                   <div className="absolute inset-[-20px] z-10"><Preset.frame /></div>
                   <div className="h-[75px] w-[75px] rounded-full bg-slate-800" />
                </div>
             )}
          </div>

          <div className="flex items-end justify-between mb-2 relative z-10 w-full border-t border-white/5 pt-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{RARITY_LABELS[item.rarity]}</span>
            <div className={`rounded-md border px-2 py-1 text-[8px] font-bold uppercase tracking-widest ${
              isEquipped ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : isOwned ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-white/10 bg-white/5 text-slate-500'
            }`}>
              {isEquipped ? 'Equipped' : isOwned ? 'Owned' : 'Market'}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest text-slate-600">Cost</span>
                <span className="font-['Orbitron'] text-sm font-bold text-white">{formatTokenCount(item.cost)}</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsFlipped(true)}
                className="flex items-center gap-1.5 py-1 px-2 rounded-md border border-white/5 bg-black/40 backdrop-blur-md text-[9px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              >
                <Info className="h-3 w-3" /> Lore
              </button>
            </div>

            <button
              type="button"
              disabled={actionBusy || locked || isEquipped}
              onClick={handleAction}
              className="w-full py-2.5 rounded-lg border font-['Orbitron'] text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed group/btn overflow-hidden relative shadow-[0_5px_15px_rgba(0,0,0,0.4)] backdrop-blur-md"
              style={!isOwned || (!isTitle && !isEquipped) ? { borderColor: accent.borderColor, color: accent.color, backgroundColor: `${accent.color}20` } : { borderColor: 'rgba(255,255,255,0.1)', color: '#64748b', backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 drop-shadow-[0_0_5px_currentColor]">{actionBusy ? 'Processing...' : isEquipped ? 'Active' : isOwned ? 'Equip' : 'Authorize Buy'}</span>
            </button>
          </div>
        </div>

        {/* BACK SIDE (Specs/Lore) */}
        <div 
          ref={backRef}
          className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border border-white/20 bg-slate-900 p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 font-['Orbitron'] text-[10px] font-black uppercase tracking-widest text-[var(--theme-accent)]">
              <Cpu className="h-4 w-4" /> Tech Intel
            </div>
            <button 
              type="button"
              onClick={() => setIsFlipped(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <History className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">Tactical Log</div>
              <p className="text-[11px] leading-relaxed italic text-slate-300 font-medium">"{getLore()}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-600 mb-1">Batch</div>
                <div className="text-[10px] font-mono text-slate-400">MAR-X-{item.key.slice(0,4).toUpperCase()}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-600 mb-1">Stability</div>
                <div className="text-[10px] font-mono text-emerald-400">99.8%</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-600 mb-1">Rarity</div>
                <div className="text-[10px] font-bold uppercase" style={{ color: accent.color }}>{item.rarity}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-600 mb-1">Type</div>
                <div className="text-[10px] font-medium uppercase text-white">{item.type}</div>
              </div>
            </div>
          </div>

          <div className="mt-auto text-[8px] uppercase tracking-[0.3em] text-slate-700 text-center">
            SVAROG_DIAG_OK
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN PAGE                                     */
/* -------------------------------------------------------------------------- */

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { user, replaceUser, getAuthHeader } = useAuth();
  const { data: marketplaceData, loading: marketplaceLoading, error: marketplaceError, refresh: refreshMarketplace, refreshSilent: refreshMarketplaceSilent } = useProfileMarketplace();
  const { data: seasonData, refresh: refreshStats } = usePvpSeasonStats();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [marketActionKey, setMarketActionKey] = useState('');
  const [marketActionError, setMarketActionError] = useState('');
  const [previewItemKey, setPreviewItemKey] = useState('');

  // GSAP: Initial Module Entrance
  useEffect(() => {
    const targets = document.querySelectorAll("[data-market-item]");
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 30,
        rotateX: -15,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "all"
      });
    });
    return () => ctx.revert();
  }, [marketplaceLoading, activeCategory]);

  const displayName = useMemo(() => resolveAuthDisplayName(user), [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initials = useMemo(() => displayName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2), [displayName]);
  
  const equippedTitleKey = useMemo(() => resolveEquippedTitleKeyFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedTitle = useMemo(() => getTitleDefinition(equippedTitleKey), [equippedTitleKey]);
  const equippedCosmetics = useMemo(() => {
    const fromMeta = resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {});
    const fromApi = marketplaceData?.equipped && typeof marketplaceData.equipped === 'object' ? marketplaceData.equipped : {};
    return {
      badgeKey: fromApi.badgeKey || fromMeta.badgeKey || '',
      nameplateKey: fromApi.nameplateKey || fromMeta.nameplateKey || '',
      frameKey: fromApi.frameKey || fromMeta.frameKey || '',
    };
  }, [user?.user_metadata, marketplaceData?.equipped]);
  const credentials = useMemo(() => ({
    badge: getMarketplaceItem(equippedCosmetics.badgeKey),
    banner: getMarketplaceItem(equippedCosmetics.nameplateKey),
    frame: getMarketplaceItem(equippedCosmetics.frameKey),
    title: equippedTitle,
  }), [equippedCosmetics, equippedTitle]);

  const walletBalance = Number(marketplaceData?.wallet?.tokenBalance || 0);
  const catalog = useMemo(() => Array.isArray(marketplaceData?.catalog) ? marketplaceData.catalog : [], [marketplaceData?.catalog]);
  const shopItems = useMemo(() => catalog.filter(it => it.availableInShop !== false), [catalog]);
  const readyRewardsCount = useMemo(
    () => (seasonData?.profile?.rewardTrack || []).filter((entry) => entry.unlocked && !entry.claimed).length,
    [seasonData?.profile?.rewardTrack]
  );
  const ownedCount = useMemo(
    () => catalog.filter((entry) => entry.owned).length,
    [catalog]
  );
  
  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return shopItems;
    return shopItems.filter(it => it.type === activeCategory || it.slot === activeCategory);
  }, [shopItems, activeCategory]);

  const previewItem = useMemo(() => getMarketplaceItem(previewItemKey), [previewItemKey]);
  const previewData = {
    title: previewItem?.type === 'title' ? previewItem : null,
    badge: previewItem?.slot === 'badge' ? previewItem : null,
    banner: previewItem?.slot === 'nameplate' ? previewItem : null,
    frame: previewItem?.slot === 'frame' ? previewItem : null
  };

  const syncAfterAction = async (payload) => {
    // Optimistically update user state without triggering a full re-mount
    if (payload?.user) replaceUser?.(payload.user);
    // Use silent refresh so the page does NOT reset/flash on buy or equip
    await Promise.allSettled([refreshMarketplaceSilent?.(), refreshStats?.()]);
  };

  const submitMarketplaceAction = async (body) => {
    const response = await fetch(buildApiUrl('/api/profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Marketplace action failed.');
    await syncAfterAction(payload);
    return payload;
  };

  const handlePurchase = async (itemKey) => {
    setMarketActionKey(`purchase:${itemKey}`);
    setMarketActionError('');
    try {
      const payload = await submitMarketplaceAction({ action: 'purchase', itemKey });
      // Show success toast inline without page navigation
      if (payload) {
        setMarketActionError('');
      }
    } catch (error) {
      setMarketActionError(error.message);
    } finally {
      setMarketActionKey('');
    }
  };

  const handleEquip = async (item) => {
    setMarketActionKey(`equip:${item.key}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({ action: 'equip', itemKey: item.key, slot: item.slot });
    } catch (error) {
      setMarketActionError(error.message);
    } finally {
      setMarketActionKey('');
    }
  };

  const categories = [
    { id: 'all', label: 'All Items', icon: Store },
    { id: 'frame', label: 'Frames', icon: Shield },
    { id: 'badge', label: 'Badges', icon: BadgeCheck },
    { id: 'nameplate', label: 'Banners', icon: Layers },
    { id: 'title', label: 'Titles', icon: Trophy },
  ];

  return (
    <div className="min-h-screen relative bg-transparent px-4 py-8 sm:px-8 lg:px-12">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-[var(--theme-accent-soft)] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1600px] relative z-10">
        <TacticalHeader tokens={walletBalance} displayName={displayName} themeAccent="var(--theme-accent)" />

        <div className="grid gap-10 xl:grid-cols-[280px_1fr_320px]">
          {/* NAVIGATION SIDEBAR */}
          <aside className="space-y-4">
            <div className="flex items-center gap-2 mb-4 font-['Orbitron'] text-[10px] uppercase tracking-[0.2em] text-slate-500">
              <History className="h-3.5 w-3.5" /> Categories
            </div>
            <nav className="flex flex-col gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`group flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-300 ${active ? 'border-[var(--theme-accent)] bg-[var(--theme-accent-soft)]/10 text-white shadow-[0_0_15px_var(--theme-accent-soft)]' : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={`h-4 w-4 transition-colors ${active ? 'text-[var(--theme-accent)]' : 'text-slate-600 group-hover:text-slate-400'}`} />
                      <span className="font-['Orbitron'] text-[11px] font-bold uppercase tracking-widest">{cat.label}</span>
                    </div>
                    {active && <div className="h-1.5 w-1.5 rounded-full bg-[var(--theme-accent)] shadow-[0_0_8px_var(--theme-accent)]" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-10 rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
              <div className="font-['Orbitron'] text-[10px] font-black uppercase tracking-widest text-slate-600">Quick Actions</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
                  <div className="text-[8px] uppercase tracking-widest text-slate-600">Owned</div>
                  <div className="mt-1 font-['Orbitron'] text-lg font-bold text-white">{ownedCount}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
                  <div className="text-[8px] uppercase tracking-widest text-slate-600">Ready</div>
                  <div className="mt-1 font-['Orbitron'] text-lg font-bold text-emerald-300">{readyRewardsCount}</div>
                </div>
              </div>
              {readyRewardsCount > 0 ? (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.05] px-3 py-3 text-[10px] leading-relaxed text-emerald-100/90">
                  You have {readyRewardsCount} reward {readyRewardsCount === 1 ? 'item' : 'items'} ready to claim from your profile progress tab.
                </div>
              ) : null}
              <button 
                onClick={() => { refreshMarketplace(); refreshStats(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back to Profile
              </button>
            </div>
          </aside>

          {/* MAIN MATRIX GRID */}
          <main>
            {marketActionError && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[11px] text-rose-300 font-medium">
                <Info className="h-4 w-4" /> Error: {marketActionError}
              </div>
            )}

            {marketplaceLoading ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-600 uppercase tracking-[0.3em] font-black text-xs">
                <div className="mb-4 h-12 w-12 rounded-full border-2 border-slate-800 border-t-[var(--theme-accent)] animate-spin" />
                Loading Marketplace...
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map(item => (
                  <MarketMatrixCard
                    key={item.key}
                    item={item}
                    actionBusy={marketActionKey === `purchase:${item.key}` || marketActionKey === `equip:${item.key}`}
                    locked={marketActionKey !== ''}
                    equippedKey={item.slot === 'title' || item.type === 'title' ? equippedTitleKey : (item.slot === 'nameplate' ? credentials.banner?.key : credentials[item.slot]?.key)}
                    onPurchase={handlePurchase}
                    onEquip={handleEquip}
                    onPreview={(it) => setPreviewItemKey(it?.key || '')}
                  />
                ))}
              </div>
            )}
            
            {filteredItems.length === 0 && !marketplaceLoading && (
              <div className="flex flex-col items-center justify-center h-[400px] text-slate-600 font-['Orbitron'] text-[10px] uppercase tracking-widest">
                No items in this category.
              </div>
            ) }
          </main>

          {/* IDENTITY PREVIEW TERMINAL */}
          <aside className="hidden xl:block">
            <IdentityTerminal
              user={user}
              displayName={displayName}
              credentials={credentials}
              preview={previewData}
              avatarUrl={avatarUrl}
              initials={initials}
            />
            
            <div className="mt-8 rounded-2xl border border-orange-500/10 bg-orange-500/[0.02] p-5">
              <div className="flex items-center gap-2 text-orange-400/80 mb-2">
                <Gift className="h-4 w-4" />
                <span className="font-['Orbitron'] text-[10px] font-black uppercase tracking-widest">Reward Reminder</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider">
                Claim season rewards in profile to add more tokens here.
              </p>
              <button 
                onClick={() => navigate('/caverns')}
                className="mt-4 flex items-center gap-2 text-[10px] font-bold text-orange-200 hover:text-orange-400 transition-colors uppercase tracking-widest"
              >
                Go to Caverns <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
