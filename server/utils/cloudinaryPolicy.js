export function shouldUseCloudinaryAssets() {
  const env = globalThis.process?.env || {};
  const explicitDisable = String(env.DISABLE_CLOUDINARY || '').trim().toLowerCase();
  const explicitUse = String(env.CLOUDINARY_ASSETS_ENABLED || '').trim().toLowerCase();

  if (explicitDisable === 'true') return false;
  return explicitUse === 'true';
}
