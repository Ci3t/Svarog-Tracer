import {
  TITLE_DEFINITIONS,
  TITLE_DEFINITION_MAP,
  getTitleDefinition as getProgressionTitleDefinition,
} from './progressionCatalog.js';
import { MARKETPLACE_ITEM_MAP } from './marketplaceCatalog.js';

export {
  TITLE_DEFINITIONS,
  TITLE_DEFINITION_MAP,
};

/**
 * Resolves a title definition by key, checking both the progression catalog
 * and the marketplace catalog (for purchased marketplace titles).
 */
export function getTitleDefinition(key) {
  const normalized = String(key || '').trim();
  return getProgressionTitleDefinition(normalized) || MARKETPLACE_ITEM_MAP.get(normalized) || null;
}

export function resolveEquippedTitleKeyFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '';
  const key = String(metadata.svarog_equipped_title || '').trim();
  // Accept keys from both progression-earned titles and marketplace cosmetic titles
  return (TITLE_DEFINITION_MAP.has(key) || MARKETPLACE_ITEM_MAP.has(key)) ? key : '';
}

export function resolveEquippedTitleFromUser(user) {
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata : {};
  const key = resolveEquippedTitleKeyFromMetadata(metadata);
  return getTitleDefinition(key);
}

export function getTitleTextStyle(rarity = 'common') {
  const normalized = String(rarity || 'common').trim().toLowerCase();
  if (normalized === 'mythic') {
    return {
      color: 'transparent',
      backgroundImage: 'linear-gradient(90deg, #ff6b9f 0%, #ff9dbe 20%, #ffd166 45%, #ffffff 50%, #ffd166 55%, #ff8661 80%, #ff6b9f 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      backgroundSize: '240% 100%',
      backgroundPosition: '0% 50%',
      textShadow: '0 0 20px rgba(255, 107, 159, 0.4), 0 0 10px rgba(255, 255, 255, 0.25)',
      letterSpacing: '0.12em',
      fontWeight: 900,
      display: 'inline-block',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      filter: 'drop-shadow(0 0 10px rgba(255,107,159,0.3))',
    };
  }
  if (normalized === 'legendary') {
    return {
      color: 'transparent',
      backgroundImage: 'linear-gradient(90deg, #f6b73c 0%, #f8d58b 25%, #fff2c2 50%, #f8d58b 75%, #f6b73c 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      backgroundSize: '200% 100%',
      backgroundPosition: '0% 50%',
      textShadow: '0 0 15px rgba(246, 183, 60, 0.35), 0 0 8px rgba(255, 255, 255, 0.15)',
      letterSpacing: '0.1em',
      fontWeight: 900,
      display: 'inline-block',
      fontStyle: 'italic',
      textTransform: 'uppercase',
    };
  }
  if (normalized === 'epic') {
    return {
      color: '#c792ff',
      textShadow: '0 0 12px rgba(199, 146, 255, 0.5), 0 0 6px rgba(255, 255, 255, 0.2)',
      letterSpacing: '0.08em',
      fontWeight: 800,
      display: 'inline-block',
      textTransform: 'uppercase',
    };
  }
  if (normalized === 'rare') {
    return {
      color: '#5fd7ff',
      textShadow: '0 0 8px rgba(95, 215, 255, 0.4)',
      letterSpacing: '0.06em',
      fontWeight: 800,
      display: 'inline-block',
    };
  }
  if (normalized === 'reward') {
    return {
      color: '#fbbf24',
      textShadow: '0 0 10px rgba(251, 191, 36, 0.4)',
      letterSpacing: '0.1em',
      fontWeight: 900,
      display: 'inline-block',
      textTransform: 'uppercase',
    };
  }
  return {
    color: '#d2d8e4',
    letterSpacing: '0.03em',
    fontWeight: 500,
    display: 'inline-block',
  };
}

export function getTitleBadgeStyle(rarity = 'common') {
  const normalized = String(rarity || 'common').trim().toLowerCase();
  if (normalized === 'mythic') {
    return {
      borderColor: 'rgba(255, 107, 159, 0.42)',
      background: 'rgba(255, 107, 159, 0.12)',
      color: '#ff9dbe',
    };
  }
  if (normalized === 'legendary') {
    return {
      borderColor: 'rgba(246, 183, 60, 0.42)',
      background: 'rgba(246, 183, 60, 0.12)',
      color: '#f6d27b',
    };
  }
  if (normalized === 'epic') {
    return {
      borderColor: 'rgba(199, 146, 255, 0.38)',
      background: 'rgba(199, 146, 255, 0.11)',
      color: '#c792ff',
    };
  }
  if (normalized === 'rare') {
    return {
      borderColor: 'rgba(95, 215, 255, 0.34)',
      background: 'rgba(95, 215, 255, 0.08)',
      color: '#5fd7ff',
    };
  }
  if (normalized === 'reward') {
    return {
      borderColor: 'rgba(251, 191, 36, 0.4)',
      background: 'rgba(251, 191, 36, 0.1)',
      color: '#fbbf24',
    };
  }
  return {
    borderColor: 'var(--theme-border-soft)',
    background: 'transparent',
    color: 'var(--theme-text-muted)',
  };
}
