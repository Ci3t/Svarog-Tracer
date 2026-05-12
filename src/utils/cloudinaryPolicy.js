export function shouldUseCloudinaryAssets() {
  const explicitUse = String(import.meta.env.VITE_USE_CLOUDINARY || '').trim().toLowerCase();
  const explicitDisable = String(import.meta.env.VITE_DISABLE_CLOUDINARY || '').trim().toLowerCase();

  if (explicitDisable === 'true') return false;
  return explicitUse === 'true';
}
