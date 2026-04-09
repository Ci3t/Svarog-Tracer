import { withBaseUrl } from './assetPaths';
import { resolveEquippedCosmeticsFromMetadata } from './marketplaceCatalog';

const PLAYGROUND_CLARA_MODELS = {
  default: {
    idle: 'clara-playground.png',
    speaking: 'clara-playground-gif.gif',
    madIdle: 'clara-playground-mad.png',
    madSpeaking: 'clara-mad-playground-gif.gif',
    supportsMad: true,
  },
  'clara-og-playground': {
    idle: 'clara-playground.png',
    speaking: 'clara-playground-gif.gif',
    madIdle: 'clara-playground-mad.png',
    madSpeaking: 'clara-mad-playground-gif.gif',
    supportsMad: true,
  },
  'clara-kimono-playground': {
    idle: 'companions/Clara/model/playground/clara-kimono.png',
    speaking: 'companions/Clara/model/playground/clara-kimono-gif.gif',
    supportsMad: false,
  },
  'clara-maid-playground': {
    idle: 'companions/Clara/model/playground/clara-maid.png',
    speaking: 'companions/Clara/model/playground/clara-maid-gif.gif',
    supportsMad: false,
  },
  'clara-science-playground': {
    idle: 'companions/Clara/model/playground/clara-science.png',
    speaking: 'companions/Clara/model/playground/clara-science-gif.gif',
    supportsMad: false,
  },
  'clara-snowy-playground': {
    idle: 'companions/Clara/model/playground/clara-snowy.png',
    speaking: 'companions/Clara/model/playground/clara-snowy-gif.gif',
    supportsMad: false,
  },
};

const GUIDE_CLARA_MODELS = {
  default: {
    idle: 'clara-prof-assistant.png',
    speaking: 'clara-prof-OandMouth.gif',
    sadIdle: 'clara-prof-assistant-sadface.png',
  },
  'clara-og-guide': {
    idle: 'clara-prof-assistant.png',
    speaking: 'clara-prof-OandMouth.gif',
    sadIdle: 'clara-prof-assistant-sadface.png',
  },
  'clara-kimono-guide': {
    idle: 'companions/Clara/model/guide/clara-half-kimono.png',
    speaking: 'companions/Clara/model/guide/clara-half-kimono-gif.gif',
  },
  'clara-snowy-guide': {
    idle: 'companions/Clara/model/guide/clara-half-snowy.png',
    speaking: 'companions/Clara/model/guide/clara-half-snowy-gif.gif',
  },
};

function normalizeMetadata(source) {
  return source && typeof source === 'object' ? source : {};
}

export function getEquippedClaraCosmetics(source) {
  const equipped = resolveEquippedCosmeticsFromMetadata(normalizeMetadata(source));
  return {
    playgroundKey: equipped.claraPlaygroundKey || '',
    guideKey: equipped.claraGuideKey || '',
  };
}

export function canUsePlaygroundClaraMad(source) {
  const { playgroundKey } = getEquippedClaraCosmetics(source);
  const model = PLAYGROUND_CLARA_MODELS[playgroundKey] || PLAYGROUND_CLARA_MODELS.default;
  return Boolean(model.supportsMad);
}

export function resolvePlaygroundClaraAsset(source, { speaking = false, mad = false } = {}) {
  const { playgroundKey } = getEquippedClaraCosmetics(source);
  const model = PLAYGROUND_CLARA_MODELS[playgroundKey] || PLAYGROUND_CLARA_MODELS.default;
  if (mad && model.supportsMad) {
    return withBaseUrl(speaking ? model.madSpeaking : model.madIdle);
  }
  return withBaseUrl(speaking ? model.speaking : model.idle);
}

export function resolveGuideClaraAsset(source, { speaking = false, sad = false } = {}) {
  const { guideKey } = getEquippedClaraCosmetics(source);
  const model = GUIDE_CLARA_MODELS[guideKey] || GUIDE_CLARA_MODELS.default;
  if (sad && model.sadIdle) {
    return withBaseUrl(model.sadIdle);
  }
  return withBaseUrl(speaking ? model.speaking : model.idle);
}

export function getClaraCompanionPreview(itemKey = '') {
  const normalized = String(itemKey || '').trim();
  if (PLAYGROUND_CLARA_MODELS[normalized]) {
    return withBaseUrl(PLAYGROUND_CLARA_MODELS[normalized].idle);
  }
  if (GUIDE_CLARA_MODELS[normalized]) {
    return withBaseUrl(GUIDE_CLARA_MODELS[normalized].idle);
  }
  return '';
}

export function getClaraCompanionSlotLabel(slot = '') {
  if (slot === 'clara_playground') return 'Playground Clara';
  if (slot === 'clara_guide') return 'Guide Clara';
  return 'Clara';
}
