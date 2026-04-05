import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Store, Wallet, Gift, Trophy } from 'lucide-react';
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

function resolveAuthDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const picks = [
    metadata.global_name,
    metadata.full_name,
    identityData.global_name,
    metadata.user_name,
    identityData.username,
    metadata.preferred_username,
    metadata.name,
    user.email,
    user.id,
  ];
  for (const value of picks) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
}

function resolveAvatarUrl(user) {
  if (!user || typeof user !== 'object') return '';
  const metadata = user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const discordIdentity = identities.find((identity) => {
    const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase();
    return provider === 'discord';
  });
  const identityData = discordIdentity && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};
  const candidates = [metadata.avatar_url, metadata.avatar, identityData.avatar_url, identityData.picture];
  for (const value of candidates) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return withBaseUrl(normalized);
  }
  return '';
}

function panelStyle(extra = {}) {
  return {
    background: 'var(--theme-surface-1)',
    borderColor: 'var(--theme-border-soft)',
    color: 'var(--theme-text-primary)',
    ...extra,
  };
}

function subtlePanelStyle(extra = {}) {
  return {
    background: 'var(--theme-surface-2)',
    borderColor: 'var(--theme-border-soft)',
    color: 'var(--theme-text-primary)',
    ...extra,
  };
}

function formatTokenCount(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatMarketType(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'nameplate') return 'banner';
  return normalized || 'item';
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return '??';
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function SectionCard({ title, description, icon: Icon, action, children }) {
  return (
    <section className="rounded-xl border p-5 sm:p-6" style={panelStyle()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border" style={subtlePanelStyle({ color: 'var(--theme-accent)' })}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatTile({ label, value, hint, accent = false }) {
  return (
    <div className="rounded-lg border p-4" style={subtlePanelStyle()}>
      <div className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>{label}</div>
      <div className="mt-2 text-2xl font-semibold" style={accent ? { color: 'var(--theme-accent)' } : undefined}>{value}</div>
      {hint ? <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-soft)' }}>{hint}</div> : null}
    </div>
  );
}

function EquippedSlotRow({ label, item, clearing, locked, onClear }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item ? item.name : `No ${label.toLowerCase()} equipped`}</div>
      </div>
      <div className="flex items-center gap-2">
        {item ? <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getCosmeticAccentStyle(item.rarity)}>{item.rarity}</span> : null}
        <button
          type="button"
          disabled={!item || clearing || locked}
          onClick={onClear}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={subtlePanelStyle()}
        >
          {clearing ? 'Clearing...' : 'Clear'}
        </button>
      </div>
    </div>
  );
}

function ShopItemCard({ item, actionBusy, locked, equippedKey, onPurchase, onEquip, onPreview }) {
  const accentStyle = getCosmeticAccentStyle(item.rarity || 'common');
  const isTitle = item.type === 'title';
  const isOwned = Boolean(item.owned);
  const isEquipped = !isTitle && String(equippedKey || '') === String(item.key || '');
  const actionLabel = !isOwned ? `Buy for ${formatTokenCount(item.cost)}` : isTitle ? 'Owned in Titles' : isEquipped ? 'Equipped' : 'Equip';

  return (
    <div
      className="rounded-lg border p-4"
      style={subtlePanelStyle()}
      onMouseEnter={() => onPreview?.(item)}
      onFocus={() => onPreview?.(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isTitle ? (
              <AnimatedTitleText title={item.name} rarity={item.rarity} className="text-sm font-medium" />
            ) : (
              <div className="text-sm font-medium">{item.name}</div>
            )}
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={accentStyle}>{item.rarity}</span>
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>{formatMarketType(item.type)}</span>
          </div>
          <div className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{item.description}</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Cost</div>
          <div className="mt-1 text-sm font-semibold">{formatTokenCount(item.cost)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={isOwned ? accentStyle : subtlePanelStyle()}>{isOwned ? 'Owned' : 'Available'}</span>
        <button
          type="button"
          disabled={actionBusy || locked || (isOwned && isTitle) || isEquipped}
          onClick={() => {
            if (!isOwned) {
              onPurchase?.(item.key);
              return;
            }
            if (!isTitle) {
              onEquip?.(item);
            }
          }}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={!isOwned || (!isTitle && !isEquipped) ? accentStyle : subtlePanelStyle()}
        >
          {actionBusy ? 'Working...' : actionLabel}
        </button>
      </div>
    </div>
  );
}

function RewardRow({ item, claiming, onClaim }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3" style={subtlePanelStyle()}>
      <div>
        <div className="text-sm font-medium">{item.name}</div>
        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.requirement}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getTitleBadgeStyle(item.rarity || 'common')}>{item.rarity}</span>
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>{item.rewardType}</span>
          {Number(item.grantTokens || 0) > 0 ? (
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium" style={subtlePanelStyle()}>
              +{formatTokenCount(item.grantTokens)} tokens
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        disabled={!item.unlocked || item.claimed || claiming}
        onClick={() => onClaim?.(item.key)}
        className="inline-flex items-center rounded-md border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        style={item.unlocked && !item.claimed ? getCosmeticAccentStyle(item.rarity || 'common') : subtlePanelStyle()}
      >
        {item.claimed ? 'Claimed' : claiming ? 'Claiming...' : item.unlocked ? 'Claim' : 'Locked'}
      </button>
    </div>
  );
}

export default function MarketplacePage() {
  const { user, replaceUser, getAuthHeader } = useAuth();
  const { data: marketplaceData, loading: marketplaceLoading, error: marketplaceError, refresh: refreshMarketplace } = useProfileMarketplace();
  const { data: seasonData, refresh: refreshStats } = usePvpSeasonStats();
  const [marketActionKey, setMarketActionKey] = useState('');
  const [marketActionError, setMarketActionError] = useState('');
  const [claimingRewardKey, setClaimingRewardKey] = useState('');
  const [rewardActionError, setRewardActionError] = useState('');
  const [previewItemKey, setPreviewItemKey] = useState('');

  const displayName = useMemo(() => resolveAuthDisplayName(user) || 'Trailblazer', [user]);
  const avatarUrl = useMemo(() => resolveAvatarUrl(user), [user]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const equippedTitleKey = useMemo(() => resolveEquippedTitleKeyFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedTitle = useMemo(() => getTitleDefinition(equippedTitleKey), [equippedTitleKey]);
  const equippedCosmetics = useMemo(() => resolveEquippedCosmeticsFromMetadata(user?.user_metadata || {}), [user?.user_metadata]);
  const equippedBadgeItem = useMemo(() => getMarketplaceItem(equippedCosmetics.badgeKey), [equippedCosmetics.badgeKey]);
  const equippedNameplateItem = useMemo(() => getMarketplaceItem(equippedCosmetics.nameplateKey), [equippedCosmetics.nameplateKey]);
  const equippedFrameItem = useMemo(() => getMarketplaceItem(equippedCosmetics.frameKey), [equippedCosmetics.frameKey]);
  const rewardTrack = useMemo(() => Array.isArray(seasonData?.profile?.rewardTrack) ? seasonData.profile.rewardTrack : [], [seasonData?.profile?.rewardTrack]);
  const walletBalance = Number(marketplaceData?.wallet?.tokenBalance || 0);
  const testingGrant = Number(marketplaceData?.wallet?.testingGrant || 0);
  const catalog = useMemo(() => Array.isArray(marketplaceData?.catalog) ? marketplaceData.catalog : [], [marketplaceData?.catalog]);
  const shopItems = useMemo(() => catalog.filter((item) => item.availableInShop !== false), [catalog]);
  const ownedCosmetics = useMemo(() => catalog.filter((item) => item.type !== 'title' && item.owned), [catalog]);
  const ownedTitles = useMemo(() => catalog.filter((item) => item.type === 'title' && item.owned), [catalog]);
  const marketBusy = marketActionKey !== '';
  const previewItem = useMemo(() => getMarketplaceItem(previewItemKey), [previewItemKey]);
  const previewTitle = previewItem?.type === 'title' ? previewItem : null;
  const previewBadge = previewItem?.slot === 'badge' ? previewItem : equippedBadgeItem;
  const previewBanner = previewItem?.slot === 'nameplate' ? previewItem : equippedNameplateItem;
  const previewFrame = previewItem?.slot === 'frame' ? previewItem : equippedFrameItem;

  const syncAfterAction = async (payload) => {
    if (payload?.user) {
      replaceUser?.(payload.user);
    }
    await Promise.allSettled([refreshMarketplace?.(), refreshStats?.()]);
  };

  const submitMarketplaceAction = async (body) => {
    const response = await fetch(buildApiUrl('/api/profile-marketplace'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Marketplace action failed.');
    }
    await syncAfterAction(payload);
    return payload;
  };

  const handlePurchase = async (itemKey) => {
    const normalizedKey = String(itemKey || '').trim();
    if (!normalizedKey) return;
    setMarketActionKey(`purchase:${normalizedKey}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({ action: 'purchase', itemKey: normalizedKey });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to purchase item.');
    } finally {
      setMarketActionKey('');
    }
  };

  const handleEquip = async (item) => {
    if (!item?.key || !item?.slot || item.type === 'title') return;
    setMarketActionKey(`equip:${item.key}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({ action: 'equip', itemKey: item.key, slot: item.slot });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to equip item.');
    } finally {
      setMarketActionKey('');
    }
  };

  const handleClearSlot = async (slot) => {
    const normalizedSlot = String(slot || '').trim();
    if (!normalizedSlot) return;
    setMarketActionKey(`clear:${normalizedSlot}`);
    setMarketActionError('');
    try {
      await submitMarketplaceAction({ action: 'clear', slot: normalizedSlot });
    } catch (error) {
      setMarketActionError(error?.message || 'Failed to clear slot.');
    } finally {
      setMarketActionKey('');
    }
  };

  const handleClaimReward = async (rewardKey) => {
    const normalizedKey = String(rewardKey || '').trim();
    if (!normalizedKey) return;
    setClaimingRewardKey(normalizedKey);
    setRewardActionError('');
    try {
      const response = await fetch(buildApiUrl('/api/profile-rewards'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ rewardKey: normalizedKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to claim reward.');
      }
      await Promise.allSettled([refreshStats?.(), refreshMarketplace?.()]);
    } catch (error) {
      setRewardActionError(error?.message || 'Failed to claim reward.');
    } finally {
      setClaimingRewardKey('');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-xl border p-5 sm:p-6" style={panelStyle()}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border" style={{ ...subtlePanelStyle(), ...getAvatarFrameStyle(equippedFrameItem?.key) }}>
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : <span className="text-lg font-semibold">{initials}</span>}
              </div>
              <div>
                <UserIdentityBlock
                  name={displayName}
                  title={equippedTitle?.name || ''}
                  rarity={equippedTitle?.rarity || 'common'}
                  badge={equippedBadgeItem?.name || ''}
                  badgeRarity={equippedBadgeItem?.rarity || 'common'}
                  nameplate={equippedNameplateItem?.name || ''}
                  nameplateRarity={equippedNameplateItem?.rarity || 'common'}
                  nameClassName="text-2xl font-semibold sm:text-3xl"
                  titleClassName="mt-1 text-[12px]"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium" style={subtlePanelStyle()}>
                    Wallet: {formatTokenCount(walletBalance)}
                  </span>
                  {testingGrant > 0 ? (
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium" style={subtlePanelStyle()}>
                      Test grant active
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { refreshMarketplace?.(); refreshStats?.(); }}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                style={subtlePanelStyle()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium" style={subtlePanelStyle()}>
                Back to Profile
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SectionCard title="Market" description="Shop cosmetics and market-only titles." icon={Store}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile label="Tokens" value={formatTokenCount(walletBalance)} hint={testingGrant > 0 ? `Seeded once for ciet: ${formatTokenCount(testingGrant)}` : 'Earn more through claimed rewards'} accent />
                <StatTile label="Owned titles" value={ownedTitles.length} hint="Market purchases only" />
                <StatTile label="Owned cosmetics" value={ownedCosmetics.length} hint="Frames, badges, nameplates" />
              </div>

              {marketActionError ? <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>{marketActionError}</div> : null}
              {marketplaceError ? <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>{marketplaceError}</div> : null}

              <div className="grid gap-3 lg:grid-cols-3">
                <EquippedSlotRow label="Frame" item={equippedFrameItem} clearing={marketActionKey === 'clear:frame'} locked={marketBusy} onClear={() => handleClearSlot('frame')} />
                <EquippedSlotRow label="Badge" item={equippedBadgeItem} clearing={marketActionKey === 'clear:badge'} locked={marketBusy} onClear={() => handleClearSlot('badge')} />
                <EquippedSlotRow label="Banner" item={equippedNameplateItem} clearing={marketActionKey === 'clear:nameplate'} locked={marketBusy} onClear={() => handleClearSlot('nameplate')} />
              </div>

              <div className="rounded-lg border p-4" style={subtlePanelStyle()}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Hover preview</div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      Hover any shop item to preview how it changes your visible identity card.
                    </div>
                  </div>
                  {previewItem ? (
                    <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getCosmeticAccentStyle(previewItem.rarity || 'common')}>
                      Previewing {previewItem.name}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[18px] border px-4 py-4" style={{ ...panelStyle(), borderColor: 'var(--theme-border-strong)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border" style={{ ...subtlePanelStyle(), ...getAvatarFrameStyle(previewFrame?.key) }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold">{initials}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <UserIdentityBlock
                          name={displayName}
                          title={previewTitle?.name || equippedTitle?.name || ''}
                          rarity={previewTitle?.rarity || equippedTitle?.rarity || 'common'}
                          badge={previewBadge?.name || ''}
                          badgeRarity={previewBadge?.rarity || 'common'}
                          nameplate={previewBanner?.name || ''}
                          nameplateRarity={previewBanner?.rarity || 'common'}
                          nameClassName="text-base font-semibold"
                          titleClassName="mt-1 text-[12px]"
                        />
                        <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: 'var(--theme-text-muted)' }}>
                          Friend list preview
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={subtlePanelStyle()}>
                      Online
                    </span>
                  </div>
                </div>
              </div>

              {marketplaceLoading && shopItems.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  Loading market inventory...
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                {shopItems.map((item) => {
                  const equippedKey = item.slot === 'frame'
                    ? equippedFrameItem?.key
                    : item.slot === 'badge'
                      ? equippedBadgeItem?.key
                      : item.slot === 'nameplate'
                        ? equippedNameplateItem?.key
                        : '';
                  return (
                    <ShopItemCard
                      key={item.key}
                      item={item}
                      actionBusy={marketActionKey === `purchase:${item.key}` || marketActionKey === `equip:${item.key}`}
                      locked={marketBusy}
                      equippedKey={equippedKey}
                      onPurchase={handlePurchase}
                      onEquip={handleEquip}
                      onPreview={(itemData) => setPreviewItemKey(itemData?.key || '')}
                    />
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Rewards" description="Claimed rewards now feed the same wallet and cosmetic loadout system." icon={Gift}>
            <div className="space-y-4">
              {rewardActionError ? <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.32)', background: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5' }}>{rewardActionError}</div> : null}

              {rewardTrack.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-center" style={{ borderColor: 'var(--theme-border-soft)', color: 'var(--theme-text-muted)' }}>
                  No seasonal rewards are visible yet for this account.
                </div>
              ) : rewardTrack.map((item) => (
                <RewardRow key={item.key} item={item} claiming={claimingRewardKey === item.key} onClaim={handleClaimReward} />
              ))}

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Owned market titles</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ownedTitles.length === 0 ? (
                    <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No market titles owned yet.</span>
                  ) : ownedTitles.map((item) => (
                    <div key={item.key} className="inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold" style={getTitleBadgeStyle(item.rarity || 'common')}>
                      <AnimatedTitleText title={item.name} rarity={item.rarity} className="text-[11px]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border px-4 py-4" style={subtlePanelStyle()}>
                <div className="text-sm font-medium">Owned cosmetics</div>
                <div className="mt-3 space-y-2">
                  {ownedCosmetics.length === 0 ? (
                    <div className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>No cosmetics owned yet.</div>
                  ) : ownedCosmetics.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={subtlePanelStyle()}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>{formatMarketType(item.type)}</div>
                      </div>
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={getCosmeticAccentStyle(item.rarity)}>{item.rarity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="What changed" description="Reward claims now do more than flip a flag." icon={Trophy}>
          <div className="grid gap-3 md:grid-cols-3">
            <StatTile label="Currency rewards" value="Live" hint="Caches grant tokens into the wallet now" accent />
            <StatTile label="Cosmetic rewards" value="Equipable" hint="Claimed frames, badges, and nameplates join loadout" />
            <StatTile label="Title market" value="Ready" hint="Bought titles unlock in the Titles section" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
