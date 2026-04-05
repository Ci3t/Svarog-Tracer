import {
  TITLE_DEFINITIONS,
  TITLE_DEFINITION_MAP,
  getTitleDefinition,
} from './progressionCatalog.js';

export {
  TITLE_DEFINITIONS,
  TITLE_DEFINITION_MAP,
  getTitleDefinition,
};

export function resolveEquippedTitleKeyFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '';
  const key = String(metadata.svarog_equipped_title || '').trim();
  return TITLE_DEFINITION_MAP.has(key) ? key : '';
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
      backgroundImage: 'linear-gradient(90deg, #ff6b9f 0%, #ffd166 24%, #ffffff 44%, #ff8661 66%, #ff6b9f 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      backgroundSize: '220% 100%',
      backgroundPosition: '0% 50%',
      textShadow: '0 0 14px rgba(255, 107, 159, 0.24)',
      letterSpacing: '0.08em',
      fontWeight: 700,
      display: 'inline-block',
    };
  }
  if (normalized === 'legendary') {
    return {
      color: 'transparent',
      backgroundImage: 'linear-gradient(90deg, #f6b73c 0%, #f8d58b 30%, #fff2c2 50%, #f3a64a 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      backgroundSize: '200% 100%',
      backgroundPosition: '0% 50%',
      textShadow: '0 0 10px rgba(246, 183, 60, 0.22)',
      letterSpacing: '0.06em',
      fontWeight: 700,
      display: 'inline-block',
    };
  }
  if (normalized === 'epic') {
    return {
      color: '#c792ff',
      textShadow: '0 0 8px rgba(199, 146, 255, 0.24)',
      letterSpacing: '0.05em',
      fontWeight: 600,
      display: 'inline-block',
    };
  }
  if (normalized === 'rare') {
    return {
      color: '#5fd7ff',
      textShadow: '0 0 6px rgba(95, 215, 255, 0.16)',
      letterSpacing: '0.04em',
      fontWeight: 600,
      display: 'inline-block',
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
  return {
    borderColor: 'var(--theme-border-soft)',
    background: 'transparent',
    color: 'var(--theme-text-muted)',
  };
}
